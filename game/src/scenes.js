// scenes.js — staged mid-heist states for the screenshots. Each scene is
// a real state of the game's own code: the same thief, guards, cameras and
// meters, just placed so one frame shows the whole heist — the room, the
// thief crossing it, guards with cones, cameras, a loot target and the
// alarm meter. Open the game with ?scene=cover (and so on) to stage one.
import { TILE } from './config.js';
import { setDoorOpen, tileCenter } from './level.js';

function placeThief(game, col, row, facing) {
  const at = tileCenter(col, row);
  game.thief.x = at.x;
  game.thief.y = at.y;
  game.thief.facing = facing;
}

function placeGuard(game, index, col, row, facing, state) {
  const guard = game.guards[index];
  if (!guard) return;
  const at = tileCenter(col, row);
  guard.x = at.x;
  guard.y = at.y;
  guard.facing = facing;
  guard.state = state || 'patrol';
  guard.stateTime = 0;
}

// The cover: the thief slips between the stacks while two guards sweep
// their cones across the aisle, a camera watches from above, the Folio
// glows in the rare wing and the alarm meter sits half full.
export function stageCover(game) {
  game.phase = 'playing';
  placeThief(game, 19, 13, -Math.PI / 2);
  placeGuard(game, 3, 19, 10, Math.PI / 2, 'patrol');
  placeGuard(game, 0, 31, 4, Math.PI, 'patrol');
  placeGuard(game, 2, 6, 15, 0, 'patrol');
  placeGuard(game, 4, 22, 20, Math.PI, 'patrol');
  placeGuard(game, 1, 8, 5, 0, 'patrol');
  game.cameras[0].time = 1.1;
  game.cameras[1].time = 0.4;
  game.cameras[2].time = 2.0;
  game.meters.alarm = 42;
  game.meters.noise = 61;
  game.meters.message = 'A guard heard something — stay low and mind the cones.';
  game.meters.messageTime = 99;
  game.thief.manuscripts = 1;
  const manuscript = game.loot.find((l) => l.kind === 'manuscript' && l.col === 3 && l.row === 2);
  if (manuscript) manuscript.taken = true;
  game.elapsed = 87;
}

// The rare wing: the thief has the key, the door stands open, the wing
// guard paces past the glowing Folio.
export function stageWing(game) {
  game.phase = 'playing';
  game.thief.hasKey = true;
  game.door.open = true;
  setDoorOpen(true);
  placeThief(game, 29, 4, 0);
  placeGuard(game, 0, 34, 4, Math.PI, 'patrol');
  placeGuard(game, 3, 19, 8, Math.PI / 2, 'patrol');
  placeGuard(game, 2, 5, 15, 0, 'patrol');
  game.cameras[0].time = 0.2;
  game.meters.alarm = 18;
  game.meters.noise = 12;
  game.meters.message = 'The wing door is open — the Gutenberg Folio is within reach.';
  game.meters.messageTime = 99;
  game.elapsed = 143;
}

// The caught moment: a guard's cone touches the thief in the reading room,
// the grace warning flashing, the alarm meter nearly full.
export function stageCaught(game) {
  game.phase = 'playing';
  placeThief(game, 6, 14, Math.PI / 2);
  placeGuard(game, 2, 6, 16, -Math.PI / 2, 'chase');
  game.guards[2].lastSeen = { x: game.thief.x, y: game.thief.y };
  game.guards[2].lastSeenAge = 0;
  placeGuard(game, 4, 18, 20, Math.PI, 'patrol');
  placeGuard(game, 3, 19, 12, Math.PI / 2, 'patrol');
  game.meters.alarm = 88;
  game.meters.noise = 74;
  game.meters.spottedBy = 'Warden Cress';
  game.meters.graceLeft = 0.6;
  game.meters.message = 'SPOTTED — break line of sight!';
  game.meters.messageTime = 99;
  game.elapsed = 112;
}

// The getaway: the Folio taken, the thief at the main doors, alarm fading.
export function stageGetaway(game) {
  game.phase = 'playing';
  const folio = game.loot.find((l) => l.kind === 'folio');
  if (folio) folio.taken = true;
  game.thief.hasFolio = true;
  game.thief.manuscripts = 3;
  game.thief.hasKey = true;
  game.meters.score = 500 + 3 * 150;
  placeThief(game, 19, 22, Math.PI / 2);
  placeGuard(game, 4, 26, 21, Math.PI, 'patrol');
  placeGuard(game, 3, 19, 16, -Math.PI / 2, 'patrol');
  game.meters.alarm = 22;
  game.meters.noise = 8;
  game.meters.message = 'Folio secured — slip out through the main doors!';
  game.meters.messageTime = 99;
  game.elapsed = 198;
}

export const SCENES = {
  cover: stageCover,
  wing: stageWing,
  caught: stageCaught,
  getaway: stageGetaway,
};
