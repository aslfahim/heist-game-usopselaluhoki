// input.js — keyboard and mouse. WASD or arrows to move, Shift to run
// (loud), C or Ctrl to sneak (silent), Space to knock a book stack.
// The mouse clicks the title screen's Start and knocks a nearby stack.
export function makeInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    // Set by the main loop each frame from the held keys.
    move: { x: 0, y: 0, run: false, sneak: false },
    knockPressed: false,
    startPressed: false,
    restartPressed: false,
    // Where the mouse last clicked, in canvas pixels.
    click: null,
  };

  function keyName(e) {
    // Lower-case everything: 'Shift', 'Control' and 'ArrowUp' must match
    // the lowercase names the game polls for.
    return e.key.toLowerCase();
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === ' ' && !e.repeat) input.knockPressed = true;
    if ((k === 'enter' || k === ' ') && !e.repeat) input.startPressed = true;
    if (k === 'r' && !e.repeat) input.restartPressed = true;
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.click = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
    input.startPressed = true;
  });

  input.poll = () => {
    const left = keys.has('a') || keys.has('arrowleft');
    const right = keys.has('d') || keys.has('arrowright');
    const up = keys.has('w') || keys.has('arrowup');
    const down = keys.has('s') || keys.has('arrowdown');
    input.move.x = (right ? 1 : 0) - (left ? 1 : 0);
    input.move.y = (down ? 1 : 0) - (up ? 1 : 0);
    input.move.run = keys.has('shift');
    input.move.sneak = keys.has('c') || keys.has('control');
    return input.move;
  };

  // Call once per frame after the game has read the edge-triggered flags.
  input.consumeEdges = () => {
    input.knockPressed = false;
    input.startPressed = false;
    input.restartPressed = false;
    input.click = null;
  };

  return input;
}
