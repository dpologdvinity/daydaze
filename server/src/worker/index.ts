// The Worker entry: routes /api and /ws requests, checks the Origin on anything
// but plain GETs, reads sessions from D1, and handles guests, accounts, cloud
// saves, friends, blocks, reports and admin bans. Room sockets are forwarded to
// the room copy's Durable Object with an identity header only this gateway
// sets. Every response gets the security headers; error bodies are fixed codes.

import type { RoomId } from "../../../src/game/rooms.ts";
import {
  createDefaultSave,
  generateGuestName,
  loadSave,
  serializeSave,
} from "../../../src/game/save.ts";
import {
  clearSessionCookie,
  readSessionToken,
  SESSION_MAX_AGE_SECONDS,
  sessionCookie,
} from "../cookies.ts";
import type { AuthAction, LimitScope } from "../authLimits.ts";
import { checkLogin, hashPassword } from "../passwords.ts";
import { matchRoute, type Route } from "../routes.ts";
import {
  applySecurityHeaders,
  isAllowedOrigin,
  parseAllowedOrigins,
} from "../security.ts";
import {
  hashToken,
  newPlayerId,
  newSessionToken,
  randomUnit,
} from "../sessions.ts";
import {
  MAX_SAVE_BYTES,
  parseBan,
  parseBlock,
  parseCredentials,
  parseIdentity,
  parseReport,
  parseSave,
  parseTarget,
  type Identity,
  type RoomCopy,
} from "../validation.ts";
import { friendLists, type FriendRoom } from "../../../src/net/friends.ts";
import {
  DIRECTORY_NAME,
  IDENTITY_HEADER,
  roomObjectName,
  homeObjectName,
} from "./roomInstance.ts";

export { Directory } from "./directory.ts";
export { RateLimiter } from "./rateLimiter.ts";
export { RoomInstance } from "./roomInstance.ts";

const MAX_JSON_BYTES = 4096;

type Session = Identity & { tokenHash: string };

function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
}
/** Error bodies are fixed codes only: never request input or internals. */
function error(status: number, code: string, headers?: HeadersInit): Response {
  return json({ error: code }, status, headers);
}

/**
 * A 429 when this IP address, or the given player, is over its budget for
 * `action`; otherwise null.
 */
async function rateLimited(
  env: Env,
  request: Request,
  action: AuthAction,
  key = "",
  playerId?: string,
): Promise<Response | null> {
  const scopes: [string, LimitScope][] = [
    [clientIp(request) ?? "unknown", "address"],
  ];
  if (playerId) scopes.push([`player:${playerId}`, "player"]);
  for (const [name, scope] of scopes) {
    const retryAfter = await env.RATE_LIMITER.getByName(name).take(
      action,
      key,
      scope,
    );
    if (retryAfter > 0)
      return error(429, "rate-limited", { "Retry-After": String(retryAfter) });
  }
  return null;
}

function roomStub(env: Env, roomId: RoomId, copy: number) {
  return env.ROOMS.getByName(roomObjectName(roomId, copy));
}

function clientIp(request: Request): string | null {
  return request.headers.get("CF-Connecting-IP");
}

/** Reads a body up to `limit` UTF-8 bytes; null when larger. */
async function readText(
  request: Request,
  limit: number,
): Promise<string | null> {
  if (Number(request.headers.get("Content-Length") ?? 0) > limit) return null;
  const text = await request.text();
  return new TextEncoder().encode(text).length <= limit ? text : null;
}

async function readJson(request: Request): Promise<unknown> {
  const text = await readText(request, MAX_JSON_BYTES);
  try {
    return JSON.parse(text ?? "null");
  } catch {
    return null;
  }
}

async function currentSession(
  request: Request,
  env: Env,
): Promise<Session | null> {
  const token = readSessionToken(request.headers.get("Cookie"));
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const row = await env.DB.prepare(
    `SELECT s.player_id AS id,
            COALESCE(u.username, s.guest_name) AS name,
            s.user_id IS NULL AS isGuest,
            COALESCE(u.is_admin, 0) AS isAdmin
       FROM sessions s LEFT JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(tokenHash, Date.now())
    .first();
  // SQLite returns 0/1 for booleans.
  const identity = parseIdentity(
    row && { ...row, isGuest: row.isGuest === 1, isAdmin: row.isAdmin === 1 },
  );
  return identity && { ...identity, tokenHash };
}

async function isBanned(
  env: Env,
  playerId: string | null,
  ip: string | null,
): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT 1 FROM bans WHERE player_id = ? OR ip = ? LIMIT 1",
  )
    .bind(playerId, ip)
    .first();
  return row !== null;
}

/** Stores a new session and returns its Set-Cookie header. */
async function startSession(
  env: Env,
  request: Request,
  playerId: string,
  account: { userId: string } | { guestName: string },
): Promise<string> {
  const token = newSessionToken();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO sessions
       (token_hash, player_id, user_id, guest_name, ip, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      await hashToken(token),
      playerId,
      "userId" in account ? account.userId : null,
      "guestName" in account ? account.guestName : null,
      clientIp(request),
      now,
      now + SESSION_MAX_AGE_SECONDS * 1000,
    )
    .run();
  return sessionCookie(token);
}

/** Ends a friendship, or turns down or takes back a request. */
async function unfriend(env: Env, a: string, b: string): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM friend_requests
     WHERE (from_id = ?1 AND to_id = ?2) OR (from_id = ?2 AND to_id = ?1)`,
  )
    .bind(a, b)
    .run();
}

/** The Durable Object of a room copy: an apartment's by its owner, or a
 * numbered copy's. */
function stubFor(env: Env, room: RoomCopy) {
  return room.owner
    ? env.ROOMS.getByName(homeObjectName(room.owner))
    : roomStub(env, room.roomId, room.copy);
}

/** Whether two players are friends (each asked the other) and neither has
 * blocked the other. */
async function areFriends(env: Env, a: string, b: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM friend_requests
        WHERE (from_id = ?1 AND to_id = ?2) OR (from_id = ?2 AND to_id = ?1))
       AS asks,
       (SELECT COUNT(*) FROM blocks
        WHERE (blocker_id = ?1 AND blocked_id = ?2)
           OR (blocker_id = ?2 AND blocked_id = ?1)) AS blocks`,
  )
    .bind(a, b)
    .first();
  return row?.asks === 2 && row?.blocks === 0;
}

async function friendsOf(env: Env, id: string) {
  const ids = async (sql: string) =>
    (await env.DB.prepare(sql).bind(id).all()).results.flatMap((row) =>
      typeof row.other === "string" ? [row.other] : [],
    );
  const sentTo = await ids(
    "SELECT to_id AS other FROM friend_requests WHERE from_id = ? LIMIT 1000",
  );
  const receivedFrom = await ids(
    "SELECT from_id AS other FROM friend_requests WHERE to_id = ? LIMIT 1000",
  );
  const everyone = JSON.stringify([...new Set([...sentTo, ...receivedFrom])]);
  // an account's username, or a guest's name while their session lasts
  const { results } = await env.DB.prepare(
    `SELECT id, username AS name FROM users
     WHERE id IN (SELECT value FROM json_each(?1))
     UNION ALL
     SELECT player_id AS id, guest_name AS name FROM sessions
     WHERE player_id IN (SELECT value FROM json_each(?1))
       AND guest_name IS NOT NULL AND expires_at > ?2`,
  )
    .bind(everyone, Date.now())
    .all();
  const names = new Map<string, string>();
  for (const { id: other, name } of results)
    if (typeof other === "string" && typeof name === "string")
      names.set(other, name);
  // only mutual friends see where each other are
  const received = new Set(receivedFrom);
  const mutual = sentTo.filter((other) => received.has(other));
  const rooms = new Map<string, FriendRoom>(
    (await env.DIRECTORY.getByName(DIRECTORY_NAME).where(mutual)).map(
      ({ id: other, roomId, copy }) => [other, { roomId, copy }],
    ),
  );
  return friendLists(sentTo, receivedFrom, names, rooms);
}

function publicIdentity({ id, name, isGuest, isAdmin }: Identity): Identity {
  return { id, name, isGuest, isAdmin };
}

async function handle(
  route: Route,
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const session = await currentSession(request, env);
  switch (route.kind) {
    case "guest": {
      if (session?.isGuest) return json(publicIdentity(session));
      const limited = await rateLimited(env, request, "guest");
      if (limited) return limited;
      if (await isBanned(env, null, clientIp(request)))
        return error(403, "banned");
      const identity: Identity = {
        id: newPlayerId("g"),
        name: generateGuestName(randomUnit),
        isGuest: true,
        isAdmin: false,
      };
      const cookie = await startSession(env, request, identity.id, {
        guestName: identity.name,
      });
      return json(identity, 201, { "Set-Cookie": cookie });
    }
    case "signup": {
      const credentials = parseCredentials(await readJson(request));
      if (!credentials) return error(400, "invalid-credentials");
      const limited = await rateLimited(env, request, "signup");
      if (limited) return limited;
      const { username, password } = credentials;
      // Hash before the lookup so a taken name answers no faster than a free one.
      const passwordHash = await hashPassword(password);
      const taken = await env.DB.prepare(
        "SELECT 1 FROM users WHERE username_key = ?",
      )
        .bind(username.toLowerCase())
        .first();
      if (taken) return error(409, "username-taken");
      const identity: Identity = {
        id: newPlayerId("u"),
        name: username,
        isGuest: false,
        isAdmin: false,
      };
      await env.DB.prepare(
        `INSERT INTO users (id, username, username_key, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(
          identity.id,
          username,
          username.toLowerCase(),
          passwordHash,
          Date.now(),
        )
        .run();
      // Upgrading a guest ends the guest session; the client uploads its save next.
      if (session?.isGuest)
        await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
          .bind(session.tokenHash)
          .run();
      const cookie = await startSession(env, request, identity.id, {
        userId: identity.id,
      });
      return json(identity, 201, { "Set-Cookie": cookie });
    }
    case "login": {
      const credentials = parseCredentials(await readJson(request));
      if (!credentials) return error(401, "wrong-credentials");
      const limited = await rateLimited(
        env,
        request,
        "login",
        credentials.username.toLowerCase(),
      );
      if (limited) return limited;
      const user = await env.DB.prepare(
        "SELECT id, username, password_hash, is_admin FROM users WHERE username_key = ?",
      )
        .bind(credentials.username.toLowerCase())
        .first();
      const identity = parseIdentity(
        user && {
          id: user.id,
          name: user.username,
          isGuest: false,
          isAdmin: user.is_admin === 1,
        },
      );
      const stored =
        identity && typeof user?.password_hash === "string"
          ? user.password_hash
          : null;
      // Unknown users cost a full hash too, and get the same answer.
      if (!(await checkLogin(credentials.password, stored)) || !identity)
        return error(401, "wrong-credentials");
      if (await isBanned(env, identity.id, clientIp(request)))
        return error(403, "banned");
      const cookie = await startSession(env, request, identity.id, {
        userId: identity.id,
      });
      return json(identity, 200, { "Set-Cookie": cookie });
    }
    case "logout":
      if (session)
        await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
          .bind(session.tokenHash)
          .run();
      return new Response(null, {
        status: 204,
        headers: { "Set-Cookie": clearSessionCookie() },
      });
    case "rooms":
      return json(
        await env.DIRECTORY.getByName(DIRECTORY_NAME).list(route.roomId),
      );
  }

  if (!session) return error(401, "no-session");
  switch (route.kind) {
    case "me":
      return json(publicIdentity(session));
    case "save-get": {
      if (session.isGuest) return error(403, "guest-saves-are-local");
      const row = await env.DB.prepare(
        "SELECT data FROM saves WHERE user_id = ?",
      )
        .bind(session.id)
        .first();
      const data = typeof row?.data === "string" ? row.data : null;
      const save = data
        ? loadSave(data, session.name)
        : createDefaultSave(session.name);
      return new Response(serializeSave(save), {
        headers: { "Content-Type": "application/json" },
      });
    }
    case "save-put": {
      if (session.isGuest) return error(403, "guest-saves-are-local");
      const raw = await readText(request, MAX_SAVE_BYTES);
      const save = raw === null ? null : parseSave(raw, session.name);
      if (!save) return error(400, "invalid-save");
      await env.DB.prepare(
        `INSERT INTO saves (user_id, data, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE
           SET data = excluded.data, updated_at = excluded.updated_at`,
      )
        .bind(session.id, serializeSave(save), Date.now())
        .run();
      return json(save);
    }
    case "report": {
      const report = parseReport(await readJson(request));
      if (!report) return error(400, "invalid-report");
      const limited = await rateLimited(env, request, "report", "", session.id);
      if (limited) return limited;
      const chat = await stubFor(env, report).recentChat();
      await env.DB.prepare(
        `INSERT INTO reports
           (reporter_id, target_id, reason, room_id, copy, chat, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          session.id,
          report.targetId,
          report.reason,
          report.roomId,
          report.copy,
          JSON.stringify(chat),
          Date.now(),
        )
        .run();
      return new Response(null, { status: 201 });
    }
    case "admin-reports": {
      if (!session.isAdmin) return error(403, "forbidden");
      const { results } = await env.DB.prepare(
        `SELECT id, reporter_id, target_id, reason, room_id, copy, chat, created_at
         FROM reports ORDER BY created_at DESC LIMIT 50`,
      ).all();
      return json({ reports: results });
    }
    case "admin-ban": {
      if (!session.isAdmin) return error(403, "forbidden");
      const ban = parseBan(await readJson(request));
      if (!ban || ban.targetId === session.id) return error(400, "invalid-ban");
      // A guest id dies with its session, so a guest ban also covers their
      // last address; accounts are banned by id only.
      const last = ban.targetId.startsWith("g_")
        ? await env.DB.prepare(
            `SELECT ip FROM sessions WHERE player_id = ? AND ip IS NOT NULL
             ORDER BY created_at DESC LIMIT 1`,
          )
            .bind(ban.targetId)
            .first()
        : null;
      const ip = typeof last?.ip === "string" ? last.ip : null;
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO bans (player_id, ip, reason, created_at) VALUES (?, ?, ?, ?)",
        ).bind(ban.targetId, ip, ban.reason, Date.now()),
        // Signed out everywhere; login and new guest sessions check bans.
        env.DB.prepare("DELETE FROM sessions WHERE player_id = ?").bind(
          ban.targetId,
        ),
      ]);
      const kicked = await env.DIRECTORY.getByName(
        DIRECTORY_NAME,
      ).kickEverywhere(ban.targetId);
      return json({ banned: ban.targetId, addressBanned: ip !== null, kicked });
    }
    case "block": {
      const block = parseBlock(await readJson(request));
      if (!block || block.targetId === session.id)
        return error(400, "invalid-block");
      const limited = await rateLimited(env, request, "block", "", session.id);
      if (limited) return limited;
      await env.DB.prepare(
        `INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at)
         VALUES (?, ?, ?)`,
      )
        .bind(session.id, block.targetId, Date.now())
        .run();
      await unfriend(env, session.id, block.targetId);
      if (block.room)
        await stubFor(env, block.room).block(session.id, block.targetId);
      return new Response(null, { status: 204 });
    }
    case "friend": {
      const targetId = parseTarget(await readJson(request));
      if (!targetId || targetId === session.id)
        return error(400, "invalid-friend");
      const limited = await rateLimited(env, request, "friend", "", session.id);
      if (limited) return limited;
      // blocked either way, the request quietly goes nowhere
      await env.DB.prepare(
        `INSERT OR IGNORE INTO friend_requests (from_id, to_id, created_at)
         SELECT ?1, ?2, ?3 WHERE NOT EXISTS (
           SELECT 1 FROM blocks
           WHERE (blocker_id = ?1 AND blocked_id = ?2)
              OR (blocker_id = ?2 AND blocked_id = ?1))`,
      )
        .bind(session.id, targetId, Date.now())
        .run();
      return new Response(null, { status: 204 });
    }
    case "unfriend": {
      const targetId = parseTarget(await readJson(request));
      if (!targetId) return error(400, "invalid-friend");
      await unfriend(env, session.id, targetId);
      return new Response(null, { status: 204 });
    }
    case "friends":
      return json(await friendsOf(env, session.id));
    case "ws": {
      if (request.headers.get("Upgrade") !== "websocket")
        return error(426, "expected-websocket");
      if (await isBanned(env, session.id, clientIp(request)))
        return error(403, "banned");
      // Overwrite whatever the client sent: only the gateway vouches for identity.
      const headers = new Headers(request.headers);
      headers.set(IDENTITY_HEADER, JSON.stringify(publicIdentity(session)));
      return roomStub(env, route.roomId, route.copy).fetch(
        new Request(url, { headers }),
      );
    }
    case "home": {
      if (request.headers.get("Upgrade") !== "websocket")
        return error(426, "expected-websocket");
      if (await isBanned(env, session.id, clientIp(request)))
        return error(403, "banned");
      // your own place, or a friend's (the apartment itself checks that
      // they're home and the door is unlocked)
      if (
        session.id !== route.ownerId &&
        !(await areFriends(env, session.id, route.ownerId))
      )
        return error(403, "not-friends");
      const headers = new Headers(request.headers);
      headers.set(IDENTITY_HEADER, JSON.stringify(publicIdentity(session)));
      return env.ROOMS.getByName(homeObjectName(route.ownerId)).fetch(
        new Request(url, { headers }),
      );
    }
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const route = matchRoute(request.method, url.pathname);
    let response: Response;
    if (!route) response = error(404, "not-found");
    else if (
      (request.method !== "GET" || route.kind === "ws") &&
      !isAllowedOrigin(
        request.headers.get("Origin"),
        url.origin,
        parseAllowedOrigins(env.ALLOWED_ORIGINS),
      )
    )
      response = error(403, "bad-origin");
    else
      try {
        response = await handle(route, request, env, url);
      } catch (cause) {
        // Logged for us; the client only ever sees the code.
        console.error(cause);
        response = error(500, "server-error");
      }
    if (response.webSocket) return response;
    // Copy first: responses passed through from a Durable Object are immutable.
    const secured = new Response(response.body, response);
    applySecurityHeaders(secured.headers);
    return secured;
  },
} satisfies ExportedHandler<Env>;
