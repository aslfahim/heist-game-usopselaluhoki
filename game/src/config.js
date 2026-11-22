// The Grand Library Heist — tuning and the library floor plan.
// One tile is 32 px; the whole map is exactly one 1280x800 screen, so the
// judge's cover frame can show the entire heist at once: the reading room,
// the stacks, the rare-manuscript wing, the entrance hall and the exit.
// Legend: # wall, . floor, ~ rug (muffles footsteps), B bookcase (solid,
// blocks sight), T reading table (solid, low: does not block sight),
// S knockable book stack, D locked wing door (needs the librarian's key),
// E main exit doors, F Gutenberg folio, M illuminated manuscript,
// K librarian's key, G guard spawn, C ceiling camera, P thief start.
export const TILE = 32;
export const COLS = 40;
export const ROWS = 25;
export const VIEW_W = COLS * TILE;
export const VIEW_H = ROWS * TILE;

export const MAP = [
  '########################################',
  '#.........' + '...#......' + '.....C#...' + '.........#',
  '#..M......' + '...#......' + '......#...' + '.......F.#',
  '#........B' + 'BB.#.BBBB.' + '.BBBB.#...' + '.........#',
  '#.........' + '...#......' + '......D...' + '...G.....#',
  '#.....G...' + '..........' + '......#...' + '.........#',
  '#.BB......' + '...#.BBBS.' + '.BBBB.#...' + '.........#',
  '#.........' + '...#......' + '......#...' + '.........#',
  '#.........' + '...#......' + '......####' + '##########',
  '#.........' + '...#.BBBB.' + '.BBBB.....' + '.........#',
  '#.........' + '...#......' + '......#...' + '.........#',
  '######.###' + '###.......' + '..........' + '.........#',
  '#.C.TT.TT.' + '.....BBBB.' + '.BBBS.....' + '.........#',
  '#.........' + '..........' + '..........' + '.........#',
  '#...~~~~~~' + '.........G' + '..........' + '.........#',
  '#...~~~~G~' + '.....BBBB.' + '.BBBB.....' + '.........#',
  '#.K.~~~~~~' + '..........' + '....M.....' + '.........#',
  '#.........' + '.....S....' + '..........' + '.........#',
  '#.........' + '..........' + '..........' + '.........#',
  '#.........' + 'M.........' + '..........' + '.........#',
  '######.###' + '###..G....' + '..........' + '.........#',
  '#.........' + '..........' + '....~~~~~~' + '~......C.#',
  '#.........' + 'P.........' + '....~~~~~~' + '~........#',
  '#.........' + '..........' + '..........' + '.........#',
  '##########' + '#########E' + 'E#########' + '##########',
];

// Movement speeds, in tiles per second.
export const SPEED = {
  thiefWalk: 3.4,
  thiefRun: 5.4,
  thiefSneak: 1.9,
  guardPatrol: 1.7,
  guardChase: 4.7,
  guardInvestigate: 2.8,
};

// The shush (noise) meter: running is loud, sneaking is silent, rugs hush.
export const NOISE = {
  runPerSec: 42,
  walkPerSec: 9,
  sneakPerSec: 0,
  rugFactor: 0.3,
  decayPerSec: 26,
  knockBurst: 46,
  investigateAt: 58,
  investigateRadiusTiles: 13,
};

// The alarm meter: being seen fills it; hiding drains it.
export const ALARM = {
  guardPerSec: 26,
  cameraPerSec: 20,
  decayPerSec: 9,
  graceSeconds: 1.2,
  caughtAt: 100,
};

// Vision: how far and how wide a guard or a camera can see.
export const VISION = {
  guardRangeTiles: 7,
  guardHalfAngleDeg: 36,
  cameraRangeTiles: 8,
  cameraHalfAngleDeg: 30,
  chaseMemorySec: 3,
  investigateSec: 2.2,
};

// Loot values for the getaway payoff screen.
export const LOOT_VALUE = { folio: 500, manuscript: 150, key: 0 };
export const TIME_BONUS_PER_SEC = 2;
