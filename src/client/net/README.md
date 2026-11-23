# src/client/net

The online UI and its client-side stores. `online.ts` and `session.ts` hold the single `OnlineSession` from `src/net/client/` (the framework-free browser client); everything else here reaches the server through it. Rules and codecs for each feature are in `src/game/` and `src/net/`. Online play is opt-in: `?online=1`, or a valid invite link (`?join=room.copy`), switches it on; without either the game stays single-player.

## Files

| File                                   | What it does                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `session.ts`                           | Creates and holds the singleton `OnlineSession`; parses invite links (`?join=room.copy`)                   |
| `online.ts`                            | Keeps the session joined to the player's current room                                                      |
| `OnlinePeers.tsx`                      | Draws every other player (doll or car, name, buzz tag, chat bubble) and sends your own position and action |
| `ConnectionNote.tsx`                   | The HUD line saying why the game is offline or reconnecting                                                |
| `devNetLog.ts` (+ `devNetLog.test.ts`) | Development only: a log of every WebSocket frame for the dev panel                                         |
| `account.ts`                           | Account state and sign-up, login and logout calls with readable errors                                     |
| `AccountPanel.tsx`                     | The account form in the Friends panel                                                                      |
| `cloudSave.ts`                         | Syncs a signed-in player's save with their account: pull on start, then delayed pushes                     |
| `progress.ts`                          | Reports earned progress to the server, which owns XP and title; the local save is paid first               |
| `friends.ts`                           | The friends list store                                                                                     |
| `FriendsPanel.tsx`                     | Account controls, room copies, the strict chat setting and friend lists                                    |
| `chatPrefs.ts`                         | The chat filter setting and the one function that applies it to others' lines                              |
| `peerCard.ts`                          | Store for the open player card and your persisted mute list (validated on load)                            |
| `PeerCard.tsx`                         | The card for a tapped player: friend, party, ride, race, duet, cards, dance, cook-off, mute, block, report |
| `RoomCopies.tsx`                       | Lists the copies of the current room with head counts and switches between them                            |
| `InviteButton.tsx`                     | "Copy invite link" on the room card                                                                        |
| `home.ts`                              | Apartment visits: your apartment is your own room copy, and your layout is sent on joining                 |
| `party.ts`                             | Parties over the room's game relay; followers follow the leader through doors                              |
| `PartyPanel.tsx`                       | Party invites, members and the way out                                                                     |
| `together.ts`                          | Paired emotes (slow dance and friends): the invite, answer and stop handshake                              |
| `TogetherPanel.tsx`                    | The popup for two-player emotes                                                                            |
| `ride.ts`                              | Passengers: a driver offers a friend a ride                                                                |
| `RidePanel.tsx`                        | Ride offers and who is riding with you                                                                     |
| `raceFriend.ts`                        | Racing a friend at the Speedway over the game relay                                                        |
| `RacePanel.tsx`                        | Race asks, the wait and the result                                                                         |
| `duel.ts`                              | Crazy Eights between two players over the game relay                                                       |
| `DuelPanel.tsx`                        | The Crazy Eights panel: invite, wait, then the table                                                       |
| `karaokeDuet.ts`                       | Karaoke duets over the game relay                                                                          |
| `cookOff.ts`                           | The two-player cook-off over the game relay                                                                |
| `CookOffInvite.tsx`                    | The popup for a cook-off challenge; accepting goes to Kamayan Hall                                         |
| `ReportsPanel.tsx`                     | Admin-only moderation list of recent reports with preceding chat lines                                     |

## Notes

- Mutes persist in `localStorage` and are validated on load; when storage is blocked they last only the visit.
- `ride`, `party`, `together`, `karaokeDuet`, `raceFriend`, `duel` and `cookOff` all use the room's game relay, so they only work while online play has you in a room copy.
