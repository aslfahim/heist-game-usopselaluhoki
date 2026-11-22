// level.js — reads the floor plan into the things the game needs:
// solid tiles, sight-blocking tiles, loot, spawns, doors and the exit.
import { COLS, MAP, ROWS, TILE } from './config.js';

// Tiles the thief and the guards can never step on.
const SOLID = new Set(['#', 'B', 'T', 'S', 'D']);
// Tiles that stop a guard's or camera's line of sight.
const SIGHT_BLOCK = new Set(['#', 'B', 'D']);
// Tiles anyone may walk across (loot and spawns sit on floor).
const WALKABLE = new Set(['.', '~', 'F', 'M', 'K', 'G', 'C', 'P', 'E']);

// The wing door is the one tile whose solidity changes during play: it
// starts locked and solid, and opens for the key-holder. The game flips
// this flag; the map itself never changes.
let doorOpen = false;

export function setDoorOpen(open) {
  doorOpen = open;
}

export function tileAt(col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
  return MAP[row][col];
}

export function isSolid(col, row) {
  const tile = tileAt(col, row);
  if (tile === 'D') return !doorOpen;
  return SOLID.has(tile);
}

export function blocksSight(col, row) {
  const tile = tileAt(col, row);
  if (tile === 'D') return !doorOpen;
  return SIGHT_BLOCK.has(tile);
}

export function isRug(col, row) {
  return tileAt(col, row) === '~';
}

// Pixel position of the centre of a tile.
export function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

// Circle-vs-tile collision: slide along walls instead of sticking.
export function moveWithCollision(pos, dx, dy, radius) {
  const next = { x: pos.x + dx, y: pos.y + dy };
  if (!hitsSolid(next.x, pos.y, radius)) pos.x = next.x;
  if (!hitsSolid(pos.x, next.y, radius)) pos.y = next.y;
  return pos;
}

function hitsSolid(x, y, radius) {
  const corners = [
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x - radius, y + radius],
    [x + radius, y + radius],
  ];
  return corners.some(([cx, cy]) => {
    const col = Math.floor(cx / TILE);
    const row = Math.floor(cy / TILE);
    return isSolid(col, row);
  });
}

// Bresenham over tiles: true when nothing sight-blocking stands between
// two pixel points. Reading tables are low, so they never block a cone.
export function hasLineOfSight(ax, ay, bx, by) {
  const x0 = Math.floor(ax / TILE);
  const y0 = Math.floor(ay / TILE);
  const x1 = Math.floor(bx / TILE);
  const y1 = Math.floor(by / TILE);
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (let guard = 0; guard < 200; guard++) {
    if (x === x1 && y === y1) return true;
    if (blocksSight(x, y) && !(x === x0 && y === y0)) return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return true;
}

// Scan the plan once and collect everything the game places on it.
export function parseLevel() {
  doorOpen = false;
  const loot = [];
  const guards = [];
  const cameras = [];
  const stacks = [];
  let player = null;
  let door = null;
  const exits = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = MAP[row][col];
      const at = tileCenter(col, row);
      if (ch === 'F') loot.push({ kind: 'folio', name: 'Gutenberg Folio', col, row, x: at.x, y: at.y, taken: false });
      if (ch === 'M') loot.push({ kind: 'manuscript', name: 'Illuminated Manuscript', col, row, x: at.x, y: at.y, taken: false });
      if (ch === 'K') loot.push({ kind: 'key', name: "Librarian's Key", col, row, x: at.x, y: at.y, taken: false });
      if (ch === 'G') guards.push({ col, row, x: at.x, y: at.y });
      if (ch === 'C') cameras.push({ col, row, x: at.x, y: at.y });
      if (ch === 'S') stacks.push({ col, row, x: at.x, y: at.y, knocked: false });
      if (ch === 'P') player = { x: at.x, y: at.y };
      if (ch === 'D') door = { col, row, x: at.x, y: at.y, open: false };
      if (ch === 'E') exits.push({ col, row, x: at.x, y: at.y });
    }
  }
  return { loot, guards, cameras, stacks, player, door, exits };
}

// Patrol routes, hand-picked per guard spawn so each one covers a room.
// Guard order is the map's row-major scan: wing, archive, stacks,
// reading room, entrance hall.
export function patrolFor(spawnIndex, spawn) {
  const routes = [
    // Wing guard: paces the rare-manuscript wing past the folio.
    [{ col: 28, row: 4 }, { col: 37, row: 4 }],
    // Archive guard: walks the top-left archive past the manuscript.
    [{ col: 2, row: 5 }, { col: 12, row: 5 }],
    // Stacks guard: walks the cross-aisle between the bookcases. Its beat
    // stops at row 14, so its cone never reaches the main doors below.
    [{ col: 19, row: 2 }, { col: 19, row: 14 }],
    // Reading-room guard: crosses the rugs between the tables.
    [{ col: 2, row: 15 }, { col: 11, row: 15 }],
    // Entrance-hall guard: sweeps the hall in front of the exit. Its first
    // waypoint is east of its spawn, so it starts facing away from the
    // main doors where the thief slips in.
    [{ col: 16, row: 20 }, { col: 37, row: 20 }],
  ];
  const route = routes[spawnIndex % routes.length];
  return route.map((w) => tileCenter(w.col, w.row));
}

// Camera sweep: each camera pivots around a home direction.
export function cameraSweepFor(index) {
  const sweeps = [
    { homeDeg: 90, sweepDeg: 55, periodSec: 3.4 },
    { homeDeg: 0, sweepDeg: 70, periodSec: 4.2 },
    { homeDeg: 180, sweepDeg: 60, periodSec: 3.8 },
  ];
  return sweeps[index % sweeps.length];
}

export { WALKABLE };
