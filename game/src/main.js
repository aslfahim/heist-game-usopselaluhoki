// main.js — builds the heist and runs it: title, playing, caught, won.
// The loop is fixed-step at 60 Hz with an accumulator, so the game plays
// the same on any machine and the screenshots stage deterministically.
import { VIEW_H, VIEW_W } from './config.js';
import { cameraNames, guardNames, makeCamera, makeGuard, makeThief, updateCamera, updateGuard } from './actors.js';
import { cameraSweepFor, parseLevel, patrolFor, setDoorOpen } from './level.js';
import { checkExit, collectLoot, finalScore, knockStack, makeMeters, noiseHeard, spotted, tryDoor, updateAlarm, updateNoise } from './systems.js';
import { render } from './render.js';
import { makeInput } from './input.js';
import { SCENES } from './scenes.js';
import { updateThief } from './actors.js';

export function createGame() {
  const level = parseLevel();
  const guardNamesList = guardNames();
  const guards = level.guards.map((spawn, i) =>
    makeGuard(spawn, patrolFor(i, spawn), guardNamesList[i % guardNamesList.length]),
  );
  const cameraNamesList = cameraNames();
  const cameras = level.cameras.map((spot, i) =>
    makeCamera(spot, cameraSweepFor(i), cameraNamesList[i % cameraNamesList.length]),
  );
  const game = {
    phase: 'title', // title | playing | caught | won
    frozen: false, // a staged screenshot scene does not advance
    thief: makeThief(level.player),
    guards,
    cameras,
    loot: level.loot,
    stacks: level.stacks,
    door: level.door,
    exits: level.exits,
    meters: makeMeters(),
    elapsed: 0,
    finalScore: 0,
    time: 0,
  };
  return game;
}

function resetGame(game) {
  const fresh = createGame();
  Object.assign(game, fresh);
  game.phase = 'playing';
  game.meters.startTime = game.time;
}

function update(game, dt, input) {
  if (game.phase !== 'playing' || game.frozen) return;
  game.elapsed += dt;
  const move = input.poll();
  updateThief(game.thief, move, dt);
  updateNoise(game.meters, game.thief, dt);

  let anyoneSees = false;
  const onSpot = (watcher, step, kind) => {
    anyoneSees = true;
    spotted(game.meters, watcher, step, kind);
  };
  for (const guard of game.guards) {
    updateGuard(guard, game.thief, dt, (g, step) => onSpot(g, step, 'guard'));
  }
  for (const camera of game.cameras) {
    updateCamera(camera, game.thief, dt, (c, step) => onSpot(c, step, 'camera'));
  }
  updateAlarm(game.meters, anyoneSees, dt);

  if (game.meters.noise >= 58) {
    const heard = noiseHeard(game.meters, game.thief, game.guards);
    if (heard) {
      game.meters.message = `${heard.name} heard something — it is coming to look.`;
      game.meters.messageTime = 2;
    }
  }
  if (input.knockPressed) knockStack(game.meters, game.thief, game.stacks, game.guards);
  if (tryDoor(game.thief, game.door)) {
    setDoorOpen(true);
    game.meters.message = 'The rare wing creaks open.';
    game.meters.messageTime = 2;
  }
  collectLoot(game.meters, game.thief, game.loot);
  if (checkExit(game.meters, game.thief, game.exits)) {
    game.phase = 'won';
    game.finalScore = finalScore(game.meters, game.elapsed);
    game.meters.endTime = game.elapsed;
  }
  if (game.meters.caught) {
    game.phase = 'caught';
    game.meters.endTime = game.elapsed;
  }
}

export function start() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const game = createGame();
  const input = makeInput(canvas);

  // ?scene=cover stages a composed mid-heist frame for the screenshots.
  // ?autoplay=1 skips the title screen (used by the screenshot driver).
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('scene');
  const autoplay = params.get('autoplay') === '1';
  // ?bare=1 hides the page header and help text so the canvas fills the
  // whole viewport — used by the screenshot driver.
  if (params.get('bare') === '1') document.body.classList.add('bare');
  if (scene && SCENES[scene]) {
    SCENES[scene](game);
    game.frozen = true;
  } else if (autoplay) {
    game.phase = 'playing';
  }

  // Exposed for the screenshot driver and for play-testing in the console.
  window.__game = game;

  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    game.time += dt;
    if (game.phase === 'title' && (input.startPressed || autoplay)) {
      game.phase = 'playing';
    }
    if (input.restartPressed && game.phase !== 'title') resetGame(game);
    acc += dt;
    while (acc >= STEP) {
      update(game, STEP, input);
      acc -= STEP;
    }
    input.consumeEdges();
    render(ctx, game, game.time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return game;
}
