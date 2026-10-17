import { areaOf, isBlocked, stepInArea } from "./area.ts";
import { CAROUSEL_AT, RIDE_IDS, RIDES } from "./amusementPark.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS, isRoomId } from "./rooms.ts";
import { SPEEDWAY_SPOTS } from "./speedway/spots.ts";
import { courtToRoom } from "./dome.ts";
import { FOOD_VENUES } from "./food/venues.ts";
import {
  clerkSpot as galleriaClerk,
  STALLS as GALLERIA_STALLS,
  STORES as GALLERIA_STORES,
} from "./galleria.ts";
import { SPOTS as HOOP_SPOTS } from "./hoops.ts";
import { hotspotsIn } from "./hotspots.ts";
import { RENTAL as RINK_RENTAL } from "./rollerRink.ts";
import { DROP_IN } from "./skatepark.ts";
import { TEE as RANGE_TEE } from "./drivingRange.ts";
import { SPOT as PENALTY_SPOT } from "./stadium.ts";
import { HOLE_XS as LINKS_HOLE_XS } from "./lagoonLinks.ts";
import { MIC } from "./karaoke.ts";
import { FISH_SPOT as MARINA_FISH_SPOT } from "./marina.ts";
import { seatsIn } from "./seats.ts";
import { pointInPolygon, type Vec2 } from "./walk.ts";

test("every room is registered under its own id", () => {
  assert.deepEqual(Object.keys(ROOMS).sort(), [
    "amusement-park",
    "apartment",
    "aquarium",
    "arcade-bar",
    "boba-matcha",
    "bowling",
    "catwalk",
    "city",
    "courtside",
    "dome",
    "driving-range",
    "filipino-joint",
    "galleria",
    "gridiron",
    "gym",
    "haunted-house",
    "ice-rink",
    "jail",
    "kamayan-hall",
    "karaoke",
    "la-noche",
    "marina",
    "mermaid-cove",
    "mini-golf",
    "plaza",
    "pulse",
    "roller-rink",
    "rooftop-bar",
    "skate-diner",
    "skatepark",
    "speedway",
    "stadium",
    "sugar-rush",
    "ube-bakery",
    "velvet-room",
    "violet-hour",
    "warehouse",
    "water-park",
  ]);
  for (const [id, room] of Object.entries(ROOMS)) assert.equal(room.id, id);
});

test("isRoomId accepts registered rooms only", () => {
  assert.equal(isRoomId("velvet-room"), true);
  assert.equal(isRoomId("plaza"), true);
  assert.equal(isRoomId("amusement-park"), true);
  assert.equal(isRoomId("water-park"), true);
  assert.equal(isRoomId("speedway"), true);
  for (const value of ["toString", "constructor", "Plaza", "", null, 1, {}]) {
    assert.equal(isRoomId(value), false, String(value));
  }
});

test("the Velvet Room keeps the player out of the bar and the booth", () => {
  const { walkable, spawn } = ROOMS["velvet-room"];
  // The prototype start point and the open dance floor stay walkable.
  assert.equal(pointInPolygon(walkable, spawn.position), true);
  assert.deepEqual(spawn.position, [0.9, 1.6]);
  assert.equal(pointInPolygon(walkable, [-2.4, 1.5]), true);
  // Bar counter runs x -3.9..2.3 at z -4.7 with stools at z -4.05.
  for (const x of [-3.9, -2.3, -0.8, 0.5, 2.3]) {
    assert.equal(pointInPolygon(walkable, [x, -4.05]), false);
    assert.equal(pointInPolygon(walkable, [x, -4.7]), false);
  }
  // The booth seats everything within 1.9 m of its centre.
  const booth: Vec2 = [4.2, 0.7];
  for (let a = 0; a < 360; a += 5) {
    const r = (a * Math.PI) / 180;
    const p: Vec2 = [
      booth[0] + 1.89 * Math.cos(r),
      booth[1] + 1.89 * Math.sin(r),
    ];
    assert.equal(pointInPolygon(walkable, p), false, `booth edge at ${a}°`);
  }
  // Walls: side walls at x = +-6, back wall at z = -6.
  for (const p of [
    [-5.9, 0],
    [5.9, 4],
    [0, -5.9],
    [0, 5.9],
  ] satisfies Vec2[]) {
    assert.equal(pointInPolygon(walkable, p), false);
  }
});

test("the Plaza is a concave street about 24 m by 14 m", () => {
  const { walkable } = ROOMS.plaza;
  const xs = walkable.map(([x]) => x);
  const zs = walkable.map(([, z]) => z);
  assert.equal(Math.max(...xs) - Math.min(...xs), 24);
  assert.equal(Math.max(...zs) - Math.min(...zs), 14);
  // A concave polygon turns both left and right as you walk its edges.
  const n = walkable.length;
  const turns = walkable.map(([bx, bz], i) => {
    const [ax, az] = walkable[(i + n - 1) % n];
    const [cx, cz] = walkable[(i + 1) % n];
    return Math.sign((bx - ax) * (cz - bz) - (bz - az) * (cx - bx));
  });
  assert.ok(turns.includes(1) && turns.includes(-1), "should be concave");
});

test("every room has a name and at least one portal", () => {
  for (const room of Object.values(ROOMS)) {
    assert.ok(room.name.length > 0);
    assert.ok(room.portals.length > 0);
    for (const portal of room.portals) {
      assert.ok(portal.radius > 0);
      assert.ok(portal.label.length > 0);
    }
  }
});

test("the Amusement Park is a walkable midway with its gate at the front", () => {
  const room = ROOMS["amusement-park"];
  const area = areaOf(room);
  assert.equal(pointInPolygon(room.walkable, room.spawn.position), true);
  // every boarding ring is on open ground, clear of the rides
  for (const id of RIDE_IDS) {
    const spot = RIDES[id].spot;
    assert.equal(pointInPolygon(room.walkable, spot), true, id);
    assert.equal(isBlocked(area, spot), false, id);
  }
  // the rides themselves are solid: no walking through a ride
  assert.equal(isBlocked(area, CAROUSEL_AT), true);
  assert.equal(isBlocked(area, [-6.5, -10]), true);
  assert.equal(isBlocked(area, [8, -16]), true);
  assert.equal(isBlocked(area, [0, -45]), true);
  // the fairground between them, and the back lot past the arch, are open
  assert.equal(isBlocked(area, [0, -30]), false);
  assert.equal(pointInPolygon(room.walkable, [0, -30]), true);
});

test("the Plaza gate and the park's exit lead to each other", () => {
  const gate = ROOMS.plaza.portals.find((p) => p.target === "amusement-park");
  assert.ok(gate, "plaza has a gate");
  assert.equal(pointInPolygon(ROOMS.plaza.walkable, gate.position), true);
  assert.deepEqual(
    gate.targetSpawn.position,
    ROOMS["amusement-park"].spawn.position,
  );
  const exit = ROOMS["amusement-park"].portals.find(
    (p) => p.target === "plaza",
  );
  assert.ok(exit, "park has an exit");
  assert.equal(
    pointInPolygon(ROOMS["amusement-park"].walkable, exit.position),
    true,
  );
  // arriving back in the Plaza must not drop the player straight into the gate
  const [gx, gz] = gate.position;
  const [ax, az] = exit.targetSpawn.position;
  assert.ok(Math.hypot(ax - gx, az - gz) > gate.radius);
  assert.equal(
    pointInPolygon(ROOMS.plaza.walkable, exit.targetSpawn.position),
    true,
  );
});

test("the Plaza portal to the Speedway lands on the Speedway's walkable floor", () => {
  const gate = ROOMS.plaza.portals.find((p) => p.target === "speedway");
  assert.ok(gate, "plaza has a Speedway portal");
  assert.equal(pointInPolygon(ROOMS.plaza.walkable, gate.position), true);
  assert.equal(
    pointInPolygon(ROOMS.speedway.walkable, gate.targetSpawn.position),
    true,
  );
  const exit = ROOMS.speedway.portals.find((p) => p.target === "plaza");
  assert.ok(exit, "the Speedway has a way back to the Plaza");
  assert.equal(pointInPolygon(ROOMS.speedway.walkable, exit.position), true);
  assert.equal(
    pointInPolygon(ROOMS.plaza.walkable, exit.targetSpawn.position),
    true,
  );
});

test("every Speedway spot lies on the walkable floor", () => {
  assert.deepEqual(SPEEDWAY_SPOTS.map((s) => s.id).sort(), [
    "bumper-cars",
    "race-boardwalk",
    "race-oval",
  ]);
  for (const spot of SPEEDWAY_SPOTS) {
    assert.equal(
      pointInPolygon(ROOMS.speedway.walkable, spot.position),
      true,
      spot.id,
    );
  }
});

test("the Haunted House winds from its door to the back room and out again", () => {
  const room = ROOMS["haunted-house"];
  const area = areaOf(room);
  // a short S: in at the front, round the walls' gaps to the back
  let pos: Vec2 = room.spawn.position;
  for (const goal of [
    [-5.5, 0.9],
    [-5.5, -1],
    [5.5, -2.7],
    [5, -5],
  ] as const) {
    for (let k = 0; k < 400; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.2,
      `reached ${goal}`,
    );
  }
  const back = room.portals[0];
  assert.equal(back.target, "amusement-park");
  const park = areaOf(ROOMS["amusement-park"]);
  assert.equal(isBlocked(park, back.targetSpawn.position), false);
  assert.ok(
    pointInPolygon(ROOMS["amusement-park"].walkable, back.targetSpawn.position),
  );
});

test("the Skylark's lift lands on its deck, and every seat and spot is reachable from it", () => {
  const room = ROOMS["rooftop-bar"];
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  for (const goal of [
    [-6.35, 0.5],
    [-6.35, 2.5],
    [-2.1, -3.35],
    [2.6, -3.5],
    [5.4, -2.2],
  ] as const) {
    let pos: Vec2 = room.spawn.position;
    for (let k = 0; k < 600; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

test("Sugar Rush's door opens onto its floor, and its chairs, stools and decks are reachable", () => {
  const room = ROOMS["sugar-rush"];
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  for (const goal of [
    [-4.7, -1.6],
    [-4.7, 2.4],
    [3.85, -1.3],
    [3.85, 2.3],
    [0, -3.8],
  ] as const) {
    let pos: Vec2 = room.spawn.position;
    for (let k = 0; k < 600; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

test("Bassline's door opens onto its floor, and its stools, benches and decks are reachable", () => {
  const room = ROOMS.warehouse;
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  for (const goal of [
    [-5.35, -0.6],
    [-5.35, 2.2],
    [6.4, -1.8],
    [6.4, 3.2],
    [2.2, -3.8],
  ] as const) {
    let pos: Vec2 = room.spawn.position;
    for (let k = 0; k < 600; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

test("the Karaoke Loft's door opens onto its floor, and the mic and booths are reachable", () => {
  const room = ROOMS.karaoke;
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  const goals: Vec2[] = [MIC, ...seatsIn("karaoke").map((s) => s.approach)];
  for (const goal of goals) {
    let pos: Vec2 = room.spawn.position;
    for (let k = 0; k < 600; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

test("Glow Bowl's door opens onto the concourse, and its benches and lanes are reachable", () => {
  const room = ROOMS.bowling;
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  const goals: Vec2[] = [
    [1.1, 2.6],
    ...seatsIn("bowling").map((s) => s.approach),
  ];
  for (const goal of goals) {
    let pos: Vec2 = room.spawn.position;
    for (let k = 0; k < 600; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

test("Player 2's door opens onto its floor, and every cabinet, stool and the bar game are reachable", () => {
  const room = ROOMS["arcade-bar"];
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  const goals: Vec2[] = [
    ...hotspotsIn("arcade-bar").map((h) => h.position),
    ...seatsIn("arcade-bar").map((s) => s.approach),
  ];
  assert.equal(hotspotsIn("arcade-bar").length, 6);
  for (const goal of goals) {
    assert.equal(isBlocked(area, goal), false, `clear at ${goal}`);
    let pos: Vec2 = room.spawn.position;
    for (let k = 0; k < 600; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

test("La Noche's door opens onto its floor, and its stools and tables are reachable", () => {
  const room = ROOMS["la-noche"];
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  const goals: Vec2[] = [
    [0, -3.2],
    ...seatsIn("la-noche").map((s) => s.approach),
  ];
  for (const goal of goals) {
    let pos: Vec2 = room.spawn.position;
    for (let k = 0; k < 600; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

test("Lagoon Links' gate opens onto the concourse, and every tee and the bench are reachable", () => {
  const room = ROOMS["mini-golf"];
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  // in front of each tee, on the concourse, and the bench seats
  const goals: Vec2[] = [
    ...LINKS_HOLE_XS.map((x): Vec2 => [x, 4.3]),
    ...seatsIn("mini-golf").map((s) => s.approach),
  ];
  for (const goal of goals) {
    let pos: Vec2 = room.spawn.position;
    for (let k = 0; k < 600; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

test("the Dome and the Stadium: every spot, the benches and the penalty spot are reachable", () => {
  for (const [id, goals] of [
    [
      "dome",
      [
        ...HOOP_SPOTS.map((s) => courtToRoom(s.at)),
        ...seatsIn("dome").map((s) => s.approach),
      ],
    ],
    ["stadium", [PENALTY_SPOT, ...seatsIn("stadium").map((s) => s.approach)]],
  ] as const) {
    const room = ROOMS[id];
    const area = areaOf(room);
    assert.equal(isBlocked(area, room.spawn.position), false);
    for (const goal of goals) {
      let pos: Vec2 = room.spawn.position;
      for (let k = 0; k < 800; k++) pos = stepInArea(area, pos, goal, 0.05);
      assert.ok(
        Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
        `${id} reached ${goal}`,
      );
    }
  }
});

test("Lechon and Kamayan Hall: every seat at the boodle table and the sofa is reachable", () => {
  const room = ROOMS["kamayan-hall"];
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  for (const goal of seatsIn("kamayan-hall").map((s) => s.approach)) {
    let pos: Vec2 = room.spawn.position;
    // the far side's benches are reached round the table's west end
    const route: Vec2[] =
      goal[1] < -1.6 ? [[-5.4, 1.2], [-5.4, -3.6], goal] : [goal];
    for (const via of route)
      for (let k = 0; k < 400; k++) pos = stepInArea(area, pos, via, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

test("the Galleria's food court stalls are real venues", () => {
  for (const stall of GALLERIA_STALLS)
    assert.ok(
      FOOD_VENUES.some((v) => v.id === stall.venue),
      stall.venue,
    );
});

test("the Galleria: every clerk, bench and food court seat is reachable from the doors", () => {
  const room = ROOMS.galleria;
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  const goals: Vec2[] = [
    ...GALLERIA_STORES.map((s) => galleriaClerk(s)).map(([x, z]): Vec2 => [
      x,
      z + 0.7,
    ]),
    ...seatsIn("galleria").map((s) => s.approach),
  ];
  for (const goal of goals) {
    assert.equal(isBlocked(area, goal), false, `clear at ${goal}`);
    let pos: Vec2 = room.spawn.position;
    // the food court's far chairs are reached up its east aisle
    const route: Vec2[] = goal[0] > 9 ? [[11.2, 7.6], goal] : [goal];
    for (const via of route)
      for (let k = 0; k < 800; k++) pos = stepInArea(area, pos, via, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

test("the Roller Disco: the rental clerk and the benches are reachable", () => {
  const room = ROOMS["roller-rink"];
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  for (const goal of [
    [RINK_RENTAL[0] + 0.7, RINK_RENTAL[1]] as Vec2,
    ...seatsIn("roller-rink").map((s) => s.approach),
  ]) {
    let pos: Vec2 = room.spawn.position;
    for (let k = 0; k < 800; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

test("Concrete Wave: the drop-in, the bleachers and the edges are reachable", () => {
  const room = ROOMS.skatepark;
  const area = areaOf(room);
  assert.equal(isBlocked(area, room.spawn.position), false);
  for (const goal of [
    DROP_IN,
    ...seatsIn("skatepark").map((s) => s.approach),
  ]) {
    assert.equal(isBlocked(area, goal), false, `clear at ${goal}`);
    let pos: Vec2 = room.spawn.position;
    for (let k = 0; k < 800; k++) pos = stepInArea(area, pos, goal, 0.05);
    assert.ok(
      Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
      `reached ${goal}`,
    );
  }
});

for (const id of [
  "gridiron",
  "driving-range",
  "gym",
  "marina",
  "courtside",
  "mermaid-cove",
  "skate-diner",
] as const) {
  test(`${id}: every seat is reachable from the door`, () => {
    const room = ROOMS[id];
    const area = areaOf(room);
    assert.equal(isBlocked(area, room.spawn.position), false);
    for (const goal of seatsIn(id).map((s) => s.approach)) {
      let pos: Vec2 = room.spawn.position;
      for (let k = 0; k < 800; k++) pos = stepInArea(area, pos, goal, 0.05);
      assert.ok(
        Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.3,
        `reached ${goal}`,
      );
    }
  });
}

test("the driving range's tee is on its floor and clear", () => {
  const area = areaOf(ROOMS["driving-range"]);
  assert.equal(isBlocked(area, RANGE_TEE), false);
});

test("the marina's fishing spot is on the dock and clear", () => {
  const area = areaOf(ROOMS.marina);
  assert.equal(isBlocked(area, MARINA_FISH_SPOT), false);
  assert.equal(isBlocked(area, ROOMS.marina.spawn.position), false);
});
