// render.js (continued) — actors, cones, HUD and the title / caught /
// getaway screens. The HUD is drawn on the canvas so the screenshots
// carry the alarm meter and the shush meter in the frame itself.
import { COLS, MAP, ROWS, TILE, VIEW_H, VIEW_W } from './config.js';
import { tileAt } from './level.js';

// A tiny deterministic hash: same tile, same books, every run.
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967295;
}

const SPINE_COLORS = ['#a33b2e', '#c08a2d', '#2d5a3a', '#2d4a6e', '#6e3a5e', '#8a6a2d', '#3a6e5a'];
const FLOOR_A = '#3a2a1a';
const FLOOR_B = '#33241a';
const RUG = '#6e1f24';
const RUG_EDGE = '#c08a2d';
const WALL = '#4a4038';
const WALL_TOP = '#6a5c4c';

function drawFloor(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = tileAt(col, row);
      const x = col * TILE;
      const y = row * TILE;
      const shade = (col + row) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === '~') {
        ctx.fillStyle = RUG;
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        ctx.strokeStyle = RUG_EDGE;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
      }
      // Plank seams on the bare floor.
      if (ch === '.' || ch === 'P' || ch === 'G' || ch === 'C') {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + TILE - 0.5);
        ctx.lineTo(x + TILE, y + TILE - 0.5);
        ctx.stroke();
      }
      if (ch === 'B') drawBookcase(ctx, col, row);
      if (ch === 'T') drawTable(ctx, col, row);
    }
  }
}

function drawBookcase(ctx, col, row) {
  const x = col * TILE;
  const y = row * TILE;
  ctx.fillStyle = '#241708';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#4a2f14';
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  // Three shelves of book spines, colours from the tile hash.
  for (let shelf = 0; shelf < 3; shelf++) {
    const sy = y + 5 + shelf * 9;
    let bx = x + 3;
    while (bx < x + TILE - 4) {
      const w = 3 + Math.floor(hash2(col * 7 + shelf, bx) * 4);
      const color = SPINE_COLORS[Math.floor(hash2(bx, col + shelf * 31) * SPINE_COLORS.length)];
      ctx.fillStyle = color;
      ctx.fillRect(bx, sy, Math.min(w, x + TILE - 3 - bx), 7);
      bx += w + 1;
    }
  }
}

function drawTable(ctx, col, row) {
  const x = col * TILE;
  const y = row * TILE;
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(x + 2, y + 4, TILE - 4, TILE - 8);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(x + 4, y + 6, TILE - 8, TILE - 12);
  // An open book and a green reading lamp on every table.
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(x + 10, y + 12, 12, 8);
  ctx.strokeStyle = '#8a7a5a';
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 12);
  ctx.lineTo(x + 16, y + 20);
  ctx.stroke();
  ctx.fillStyle = '#2d5a3a';
  ctx.beginPath();
  ctx.arc(x + 24, y + 10, 4, 0, Math.PI * 2);
  ctx.fill();
  const glow = ctx.createRadialGradient(x + 24, y + 10, 2, x + 24, y + 10, 46);
  glow.addColorStop(0, 'rgba(255,214,120,0.28)');
  glow.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 22, y - 36, 92, 92);
}

function drawStack(ctx, stack) {
  if (stack.knocked) {
    // Books scattered on the floor where the stack fell.
    ctx.fillStyle = '#a33b2e';
    ctx.fillRect(stack.x - 14, stack.y + 4, 12, 6);
    ctx.fillStyle = '#2d5a3a';
    ctx.fillRect(stack.x - 2, stack.y + 8, 12, 6);
    ctx.fillStyle = '#c08a2d';
    ctx.fillRect(stack.x - 10, stack.y - 6, 12, 6);
    return;
  }
  ctx.fillStyle = '#4a2f14';
  ctx.fillRect(stack.x - 9, stack.y - 12, 18, 24);
  for (let i = 0; i < 4; i++) {
    const color = SPINE_COLORS[Math.floor(hash2(stack.col * 3 + i, stack.row) * SPINE_COLORS.length)];
    ctx.fillStyle = color;
    ctx.fillRect(stack.x - 8, stack.y - 11 + i * 6, 16, 5);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SPACE', stack.x, stack.y - 16);
}

function drawLoot(ctx, item, time) {
  const pulse = 0.6 + 0.35 * Math.sin(time * 3 + item.col);
  if (item.kind === 'folio') {
    const glow = ctx.createRadialGradient(item.x, item.y, 2, item.x, item.y, 34);
    glow.addColorStop(0, `rgba(255,210,90,${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(255,210,90,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(item.x - 34, item.y - 34, 68, 68);
    ctx.fillStyle = '#8a1f1f';
    ctx.fillRect(item.x - 11, item.y - 14, 22, 28);
    ctx.fillStyle = '#e8c860';
    ctx.fillRect(item.x - 9, item.y - 12, 18, 24);
    ctx.fillStyle = '#8a1f1f';
    ctx.fillRect(item.x - 9, item.y - 2, 18, 2);
    ctx.fillStyle = '#fff2b0';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FOLIO', item.x, item.y - 20);
  } else if (item.kind === 'manuscript') {
    ctx.fillStyle = `rgba(180,220,255,${pulse})`;
    ctx.beginPath();
    ctx.arc(item.x, item.y, 5 + 2 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8c890';
    ctx.fillRect(item.x - 7, item.y - 9, 14, 18);
    ctx.strokeStyle = '#6a4a1a';
    ctx.strokeRect(item.x - 7, item.y - 9, 14, 18);
  } else if (item.kind === 'key') {
    ctx.fillStyle = `rgba(255,230,140,${pulse})`;
    ctx.beginPath();
    ctx.arc(item.x, item.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c860';
    ctx.fillRect(item.x - 2, item.y - 2, 12, 3);
    ctx.fillRect(item.x + 8, item.y - 2, 3, 6);
    ctx.fillRect(item.x + 8, item.y + 2, 3, 6);
  }
}

function drawDoor(ctx, door) {
  if (!door) return;
  const x = door.col * TILE;
  const y = door.row * TILE;
  if (door.open) {
    ctx.fillStyle = '#1a120a';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#c08a2d';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OPEN', x + TILE / 2, y + TILE / 2 + 3);
    return;
  }
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(x + 3, y + 2, TILE - 6, TILE - 4);
  ctx.fillStyle = '#e8c860';
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff2b0';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LOCKED', x + TILE / 2, y - 4);
}

function drawExit(ctx, exits) {
  for (const exit of exits) {
    const x = exit.col * TILE;
    const y = exit.row * TILE;
    ctx.fillStyle = '#0f2a1a';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#2d5a3a';
    ctx.fillRect(x + 2, y, TILE - 4, TILE - 6);
    ctx.fillStyle = '#7ae8a0';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', x + TILE / 2, y + TILE - 10);
  }
}

function drawCone(ctx, x, y, facing, halfAngle, range, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fill();
}

function drawGuard(ctx, guard, time) {
  const seen = guard.state === 'chase';
  const color = seen ? 'rgba(255,60,40,0.30)' : 'rgba(255,220,90,0.20)';
  drawCone(ctx, guard.x, guard.y, guard.facing, 0.63, 224, color);
  // Body: navy uniform, brass buttons, a cap.
  ctx.fillStyle = '#1e2a4a';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c860';
  ctx.fillRect(guard.x - 2, guard.y - 8, 4, 16);
  ctx.fillStyle = '#f0d8b0';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e2a4a';
  ctx.fillRect(guard.x - 7, guard.y - 10, 14, 5);
  // A lantern swings from the belt.
  const sway = Math.sin(time * 2 + guard.x) * 3;
  ctx.strokeStyle = '#c08a2d';
  ctx.beginPath();
  ctx.moveTo(guard.x + 10, guard.y + 4);
  ctx.lineTo(guard.x + 14 + sway, guard.y + 10);
  ctx.stroke();
  ctx.fillStyle = '#ffd678';
  ctx.beginPath();
  ctx.arc(guard.x + 14 + sway, guard.y + 11, 3, 0, Math.PI * 2);
  ctx.fill();
  // Name and state, so the judge can read the patrol at a glance.
  ctx.fillStyle = seen ? '#ff6a50' : '#e8e0c8';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  const label = guard.state === 'chase' ? '!' : guard.state === 'investigate' ? '?' : guard.name;
  ctx.fillText(label, guard.x, guard.y - 20);
  if (guard.seenFlash > 0) {
    ctx.strokeStyle = '#ff4030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCamera(ctx, camera, time) {
  const blink = Math.floor(time * 2) % 2 === 0;
  drawCone(ctx, camera.x, camera.y, camera.facing, 0.52, 256, 'rgba(255,120,60,0.16)');
  ctx.fillStyle = '#2a2a2e';
  ctx.fillRect(camera.x - 8, camera.y - 8, 16, 10);
  ctx.fillStyle = blink ? '#ff4030' : '#801818';
  ctx.beginPath();
  ctx.arc(camera.x + 8, camera.y - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6a6a6e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(camera.x, camera.y - 8);
  ctx.lineTo(camera.x + Math.cos(camera.facing) * 12, camera.y + Math.sin(camera.facing) * 12);
  ctx.stroke();
}

function drawThief(ctx, thief, time) {
  const bob = thief.moving ? Math.sin(time * 10) * 1.5 : 0;
  // A soft shadow, then the hooded cloak.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(thief.x, thief.y + 11, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#23232e';
  ctx.beginPath();
  ctx.arc(thief.x, thief.y + bob, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3a4e';
  ctx.beginPath();
  ctx.arc(thief.x, thief.y - 2 + bob, 8, 0, Math.PI * 2);
  ctx.fill();
  // Eyes in the hood, looking where the thief faces.
  const ex = Math.cos(thief.facing) * 3;
  const ey = Math.sin(thief.facing) * 3;
  ctx.fillStyle = '#ffd678';
  ctx.beginPath();
  ctx.arc(thief.x - 3 + ex, thief.y - 3 + ey, 1.8, 0, Math.PI * 2);
  ctx.arc(thief.x + 3 + ex, thief.y - 3 + ey, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // A sack on the back once loot is carried.
  if (thief.loot > 0 || thief.hasFolio) {
    ctx.fillStyle = '#8a6a2d';
    ctx.beginPath();
    ctx.arc(thief.x - 8, thief.y + 6 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e8e0c8';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('YOU', thief.x, thief.y - 20);
}

function drawMeter(ctx, x, y, w, label, value, color, bg) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 6, y - 6, w + 12, 26);
  ctx.fillStyle = '#e8e0c8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y + 4);
  ctx.fillStyle = bg;
  ctx.fillRect(x + 92, y - 4, w - 92, 12);
  ctx.fillStyle = color;
  ctx.fillRect(x + 92, y - 4, Math.max(0, (w - 92) * Math.min(1, value / 100)), 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(x + 92, y - 4, w - 92, 12);
}

function drawHud(ctx, game, time) {
  const { meters, thief } = game;
  ctx.fillStyle = 'rgba(10,8,6,0.82)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  const alarmColor = meters.alarm > 66 ? '#ff4030' : meters.alarm > 33 ? '#ff9a30' : '#c03a30';
  drawMeter(ctx, 12, 12, 250, 'ALARM', meters.alarm, alarmColor, '#3a1414');
  const noiseColor = meters.noise > 58 ? '#c060ff' : '#7a9ae8';
  drawMeter(ctx, 300, 12, 250, 'SHUSH', meters.noise, noiseColor, '#141a3a');
  ctx.fillStyle = '#e8e0c8';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  const lootText = `LOOT ${thief.manuscripts}/3 MSS · ${thief.hasFolio ? 'FOLIO ✓' : 'FOLIO ✗'} · ${thief.hasKey ? 'KEY ✓' : 'KEY ✗'}`;
  ctx.fillText(lootText, 590, 16);
  const objective = thief.hasFolio
    ? '→ Escape through the main doors!'
    : thief.hasKey
      ? '→ Take the Gutenberg Folio in the rare wing.'
      : '→ Find the librarian’s key, then the Folio.';
  ctx.fillStyle = '#ffd678';
  ctx.fillText(objective, 590, 30);
  ctx.fillStyle = '#e8e0c8';
  ctx.textAlign = 'right';
  ctx.fillText(`TIME ${Math.floor(game.elapsed)}s`, VIEW_W - 12, 16);
  ctx.fillText('WASD move · SHIFT run (loud) · C sneak · SPACE knock stack', VIEW_W - 12, 30);

  if (meters.spottedBy && meters.graceLeft > 0) {
    const flash = Math.floor(time * 8) % 2 === 0;
    if (flash) {
      ctx.fillStyle = '#ff4030';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`SPOTTED BY ${meters.spottedBy.toUpperCase()} — BREAK LINE OF SIGHT!`, VIEW_W / 2, 72);
    }
  }
  if (meters.messageTime > 0 && meters.message) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const w = ctx.measureText(meters.message).width + 24;
    ctx.fillRect((VIEW_W - w) / 2, VIEW_H - 52, w, 26);
    ctx.fillStyle = '#ffd678';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(meters.message, VIEW_W / 2, VIEW_H - 34);
  }
}

function drawWalls(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (tileAt(col, row) !== '#') continue;
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = '#4a4038';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#6a5c4c';
      ctx.fillRect(x, y, TILE, 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
}

function drawScreen(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,6,4,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, 300);
  ctx.fillStyle = '#e8e0c8';
  ctx.font = '18px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 350 + i * 30));
  ctx.fillStyle = '#ffd678';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Press R to play again', VIEW_W / 2, 350 + lines.length * 30 + 24);
}

export function render(ctx, game, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  // Floor, rugs and furniture first.
  drawFloor(ctx, time);
  drawWalls(ctx);
  drawDoor(ctx, game.door);
  drawExit(ctx, game.exits);
  for (const stack of game.stacks) drawStack(ctx, stack);
  for (const item of game.loot) if (!item.taken) drawLoot(ctx, item, time);
  // Cones under the actors, so the danger reads before the people do.
  for (const camera of game.cameras) drawCamera(ctx, camera, time);
  for (const guard of game.guards) drawGuard(ctx, guard, time);
  drawThief(ctx, game.thief, time);
  drawHud(ctx, game, time);
  if (game.phase === 'title') {
    drawScreen(ctx, 'THE GRAND LIBRARY HEIST', [
      'Midnight in the old grand library. The Gutenberg Folio waits in the rare-manuscript wing.',
      'Guards patrol with lanterns. Cameras sweep the stacks. Running is loud — rugs hush your steps.',
      'Sneak, read the cones, knock a book stack to pull a guard away, grab the Folio and leave by the main doors.',
      'WASD / arrows to move · SHIFT to run · C to sneak · SPACE to knock a stack · Click Start or press Enter.',
    ], '#ffd678');
  } else if (game.phase === 'caught') {
    drawScreen(ctx, 'CAUGHT!', [
      `The alarm hit 100 — ${game.meters.caughtBy || 'the library'} raised the whole building.`,
      `Loot carried: ${game.thief.manuscripts} manuscript(s)${game.thief.hasFolio ? ' and the Folio' : ''}. Score ${game.meters.score}.`,
      'Next time: watch the cones, walk the rugs, and knock a stack before you cross a lit aisle.',
    ], '#ff4030');
  } else if (game.phase === 'won') {
    drawScreen(ctx, 'THE GETAWAY!', [
      'You slip out of the main doors into the night, the Gutenberg Folio safe in your sack.',
      `Manuscripts: ${game.thief.manuscripts}/3 · Time: ${Math.floor(game.elapsed)}s · Final score: ${game.finalScore}.`,
      'The librarian will find an empty case in the morning — and a single shushed note.',
    ], '#7ae8a0');
  }
}

export { MAP, COLS, ROWS };
