// systems.js — the shush meter, the alarm meter, loot and the getaway.
// Noise is the game's twist: running is loud, rugs hush footsteps, and a
// knocked-over book stack is a loud distraction that pulls a guard away.
import { ALARM, LOOT_VALUE, NOISE, TILE } from './config.js';
import { isRug } from './level.js';
import { distractGuard } from './actors.js';

export function makeMeters() {
  return {
    noise: 0,
    alarm: 0,
    // The fair caught moment: first the guard spots you, then you get one
    // grace second to break line of sight before the alarm spikes.
    spottedBy: null,
    graceLeft: 0,
    caught: false,
    caughtBy: null,
    won: false,
    startTime: 0,
    endTime: 0,
    score: 0,
    message: '',
    messageTime: 0,
  };
}

export function updateNoise(meters, thief, dt) {
  const col = Math.floor(thief.x / TILE);
  const row = Math.floor(thief.y / TILE);
  thief.onRug = isRug(col, row);
  let rate = 0;
  if (thief.moving) {
    if (thief.sneaking) rate = NOISE.sneakPerSec;
    else if (thief.running) rate = NOISE.runPerSec;
    else rate = NOISE.walkPerSec;
    if (thief.onRug) rate *= NOISE.rugFactor;
  }
  meters.noise += rate * dt;
  meters.noise -= NOISE.decayPerSec * dt;
  if (meters.noise < 0) meters.noise = 0;
  if (meters.noise > 100) meters.noise = 100;
  return meters.noise;
}

// A loud thief is heard: the nearest guard in earshot comes to look.
export function noiseHeard(meters, thief, guards) {
  if (meters.noise < NOISE.investigateAt) return null;
  let best = null;
  let bestDist = NOISE.investigateRadiusTiles * TILE;
  for (const guard of guards) {
    const d = Math.hypot(guard.x - thief.x, guard.y - thief.y);
    if (d < bestDist) {
      best = guard;
      bestDist = d;
    }
  }
  if (best) {
    distractGuard(best, thief.x, thief.y);
    meters.noise = 40;
    return best;
  }
  return null;
}

// A guard or camera is looking at the thief right now.
export function spotted(meters, watcher, dt, kind) {
  meters.alarm += (kind === 'camera' ? ALARM.cameraPerSec : ALARM.guardPerSec) * dt;
  if (meters.alarm > ALARM.caughtAt) meters.alarm = ALARM.caughtAt;
  if (!meters.spottedBy) {
    meters.spottedBy = watcher.name;
    meters.graceLeft = ALARM.graceSeconds;
  }
}

// Called every frame once all watchers have had their say.
export function updateAlarm(meters, anyoneSees, dt) {
  if (anyoneSees) {
    if (meters.spottedBy && meters.graceLeft > 0) {
      meters.graceLeft -= dt;
      if (meters.graceLeft <= 0) {
        meters.alarm = Math.min(ALARM.caughtAt, meters.alarm + 45);
        meters.message = 'CAUGHT IN THE OPEN!';
        meters.messageTime = 1.2;
      }
    }
  } else {
    meters.spottedBy = null;
    meters.graceLeft = 0;
    meters.alarm -= ALARM.decayPerSec * dt;
    if (meters.alarm < 0) meters.alarm = 0;
  }
  if (meters.alarm >= ALARM.caughtAt && !meters.caught) {
    meters.caught = true;
    meters.caughtBy = meters.spottedBy || 'the alarm';
    meters.endTime = meters.startTime + 0;
  }
  if (meters.messageTime > 0) meters.messageTime -= dt;
  return meters;
}

// Pick up whatever loot the thief is standing on.
export function collectLoot(meters, thief, loot) {
  for (const item of loot) {
    if (item.taken) continue;
    const d = Math.hypot(thief.x - item.x, thief.y - item.y);
    if (d > TILE * 0.75) continue;
    item.taken = true;
    if (item.kind === 'folio') {
      thief.hasFolio = true;
      meters.score += LOOT_VALUE.folio;
      meters.message = 'THE GUTENBERG FOLIO IS YOURS — GET TO THE MAIN DOORS!';
      meters.messageTime = 3;
    } else if (item.kind === 'manuscript') {
      thief.manuscripts += 1;
      meters.score += LOOT_VALUE.manuscript;
      meters.message = 'Illuminated manuscript pocketed (+150).';
      meters.messageTime = 2;
    } else if (item.kind === 'key') {
      thief.hasKey = true;
      meters.message = "Librarian's key taken — the rare wing is open.";
      meters.messageTime = 2.5;
    }
  }
}

// Knock over the nearest book stack: loud, but the closest guard walks
// over to look at the mess instead of at you.
export function knockStack(meters, thief, stacks, guards) {
  let best = null;
  let bestDist = TILE * 1.6;
  for (const stack of stacks) {
    if (stack.knocked) continue;
    const d = Math.hypot(thief.x - stack.x, thief.y - stack.y);
    if (d < bestDist) {
      best = stack;
      bestDist = d;
    }
  }
  if (!best) return null;
  best.knocked = true;
  meters.noise = Math.min(100, meters.noise + NOISE.knockBurst);
  let guard = null;
  let guardDist = 14 * TILE;
  for (const g of guards) {
    const d = Math.hypot(g.x - best.x, g.y - best.y);
    if (d < guardDist) {
      guard = g;
      guardDist = d;
    }
  }
  if (guard) distractGuard(guard, best.x, best.y);
  meters.message = 'CRASH! A book stack topples — a guard goes to look.';
  meters.messageTime = 2;
  return best;
}

// The locked wing door swings open the moment the key-holder bumps it:
// distance is measured to the door tile itself, not its centre, so
// walking into the door while carrying the key always opens it.
export function tryDoor(thief, door) {
  if (!door || door.open) return false;
  if (!thief.hasKey) return false;
  const half = TILE / 2;
  const cx = Math.max(door.x - half, Math.min(thief.x, door.x + half));
  const cy = Math.max(door.y - half, Math.min(thief.y, door.y + half));
  const d = Math.hypot(thief.x - cx, thief.y - cy);
  if (d > thief.radius + 4) return false;
  door.open = true;
  return true;
}

// Stepping out of the main doors with the folio ends the heist.
export function checkExit(meters, thief, exits) {
  if (!thief.hasFolio || meters.won) return false;
  for (const exit of exits) {
    const d = Math.hypot(thief.x - exit.x, thief.y - exit.y);
    if (d < TILE * 0.8) {
      meters.won = true;
      return true;
    }
  }
  return false;
}

export function finalScore(meters, elapsedSec) {
  const timeBonus = Math.max(0, Math.round((240 - elapsedSec) * 2));
  return meters.score + timeBonus;
}
