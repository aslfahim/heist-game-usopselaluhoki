// actors.js — the thief, the patrolling guards and the ceiling cameras.
// A guard reads the room before it moves: it patrols, it chases only what
// its cone actually touches, and it investigates a noise it heard.
import { ALARM, SPEED, TILE, VISION } from './config.js';
import { hasLineOfSight, moveWithCollision, tileCenter } from './level.js';

const TAU = Math.PI * 2;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// True when the watcher can see the thief: in range, inside the cone,
// and with a clear line of sight past the bookcases.
export function canSee(watcher, rangePx, halfAngle, tx, ty) {
  const dx = tx - watcher.x;
  const dy = ty - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > rangePx) return false;
  if (dist < TILE * 0.6) return hasLineOfSight(watcher.x, watcher.y, tx, ty);
  const diff = Math.abs(angleDiff(angleTo(watcher.x, watcher.y, tx, ty), watcher.facing));
  if (diff > halfAngle) return false;
  return hasLineOfSight(watcher.x, watcher.y, tx, ty);
}

export function makeThief(start) {
  return {
    x: start.x,
    y: start.y,
    radius: 12,
    facing: -Math.PI / 2,
    moving: false,
    running: false,
    sneaking: false,
    onRug: false,
    hasKey: false,
    hasFolio: false,
    manuscripts: 0,
    loot: 0,
  };
}

export function updateThief(thief, move, dt) {
  const speedTiles = move.sneak
    ? SPEED.thiefSneak
    : move.run
      ? SPEED.thiefRun
      : SPEED.thiefWalk;
  const speed = speedTiles * TILE;
  const len = Math.hypot(move.x, move.y);
  thief.moving = len > 0.01;
  thief.running = move.run && thief.moving;
  thief.sneaking = move.sneak && thief.moving;
  if (thief.moving) {
    const nx = (move.x / len) * speed * dt;
    const ny = (move.y / len) * speed * dt;
    moveWithCollision(thief, nx, ny, thief.radius);
    thief.facing = Math.atan2(move.y, move.x);
  }
  return thief;
}

export function makeGuard(spawn, waypoints, name) {
  return {
    name,
    x: spawn.x,
    y: spawn.y,
    radius: 13,
    facing: 0,
    waypoints,
    waypointIndex: 0,
    state: 'patrol', // patrol | chase | investigate | look
    stateTime: 0,
    target: null,
    lastSeen: null,
    lastSeenAge: 99,
    pauseTime: 0,
    speed: SPEED.guardPatrol,
    seenFlash: 0,
  };
}

function guardTarget(guard) {
  if (guard.state === 'chase' && guard.lastSeen) return guard.lastSeen;
  if (guard.state === 'investigate' && guard.target) return guard.target;
  return guard.waypoints[guard.waypointIndex];
}

export function updateGuard(guard, thief, dt, onSpot) {
  const rangePx = VISION.guardRangeTiles * TILE;
  const halfAngle = (VISION.guardHalfAngleDeg * Math.PI) / 180;
  const sees = canSee(guard, rangePx, halfAngle, thief.x, thief.y);
  guard.stateTime += dt;
  guard.lastSeenAge += dt;
  if (sees) {
    guard.lastSeen = { x: thief.x, y: thief.y };
    guard.lastSeenAge = 0;
    guard.seenFlash = 0.12;
    onSpot(guard, dt);
  }
  if (guard.seenFlash > 0) guard.seenFlash -= dt;

  if (guard.state === 'patrol') {
    if (sees && guard.lastSeenAge < 0.45) {
      guard.state = 'chase';
      guard.stateTime = 0;
    }
  } else if (guard.state === 'chase') {
    if (!sees && guard.lastSeenAge > VISION.chaseMemorySec) {
      guard.state = 'patrol';
      guard.stateTime = 0;
    }
  } else if (guard.state === 'investigate') {
    if (sees) {
      guard.state = 'chase';
      guard.stateTime = 0;
    } else if (guard.stateTime > VISION.investigateSec + 2.4) {
      guard.state = 'patrol';
      guard.stateTime = 0;
    }
  } else if (guard.state === 'look') {
    if (sees) {
      guard.state = 'chase';
      guard.stateTime = 0;
    } else if (guard.stateTime > VISION.investigateSec) {
      guard.state = 'patrol';
      guard.stateTime = 0;
    }
  }

  // Walk toward the current target, pausing at each patrol waypoint.
  const target = guardTarget(guard);
  let speed = SPEED.guardPatrol;
  if (guard.state === 'chase') speed = SPEED.guardChase;
  if (guard.state === 'investigate') speed = SPEED.guardInvestigate;
  if (guard.state === 'look') speed = 0;
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 6) {
    const step = speed * TILE * dt;
    const mx = (dx / dist) * Math.min(step, dist);
    const my = (dy / dist) * Math.min(step, dist);
    moveWithCollision(guard, mx, my, guard.radius);
    guard.facing = Math.atan2(dy, dx);
  } else if (guard.state === 'patrol') {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
  } else if (guard.state === 'investigate') {
    guard.state = 'look';
    guard.stateTime = 0;
  }
  return guard;
}

// Send a guard to look at a spot: a knocked book stack, or a loud noise.
export function distractGuard(guard, x, y) {
  if (guard.state === 'chase') return;
  guard.state = 'investigate';
  guard.stateTime = 0;
  guard.target = { x, y };
}

export function makeCamera(spot, sweep, name) {
  return {
    name,
    x: spot.x,
    y: spot.y,
    home: (sweep.homeDeg * Math.PI) / 180,
    sweep: (sweep.sweepDeg * Math.PI) / 180,
    period: sweep.periodSec,
    facing: (sweep.homeDeg * Math.PI) / 180,
    time: 0,
    blink: 0,
  };
}

export function updateCamera(camera, thief, dt, onSpot) {
  camera.time += dt;
  const swing = Math.sin((camera.time / camera.period) * TAU);
  camera.facing = camera.home + swing * camera.sweep;
  camera.blink += dt;
  const rangePx = VISION.cameraRangeTiles * TILE;
  const halfAngle = (VISION.cameraHalfAngleDeg * Math.PI) / 180;
  if (canSee(camera, rangePx, halfAngle, thief.x, thief.y)) {
    onSpot(camera, dt);
  }
  return camera;
}

export function guardNames() {
  return ['Warden Ash', 'Warden Bramble', 'Warden Cress', 'Warden Dusk', 'Warden Ember'];
}

export function cameraNames() {
  return ['Dome Cam A', 'Dome Cam B', 'Dome Cam C'];
}

export { ALARM };
