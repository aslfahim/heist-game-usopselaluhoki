# The Grand Library Heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/aslfahim/heist-game-usopselaluhoki/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/aslfahim/heist-game-usopselaluhoki/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down stealth heist game for make.fun's **"Make the best heist game"** bounty ($50 in USDC).

Midnight in the old grand library. The Gutenberg Folio waits in the locked rare-manuscript wing, guarded by patrolling wardens with lantern cones and sweeping ceiling cameras. Sneak through the stacks, the reading room and the archive stairs — running is loud, rugs hush your steps, and a knocked-over book stack pulls a guard away at the cost of noise. Find the librarian's key, take the Folio (and the illuminated manuscripts on the way), then slip out through the main doors for the getaway payoff.

## How to play

- **WASD / arrows** — move
- **SHIFT** — run (fast, but loud: the SHUSH meter climbs)
- **C** — sneak (slow, silent)
- **SPACE** — knock over a nearby book stack to distract a guard
- **R** — restart after being caught or escaping

Watch the cones before you move: a guard or camera that sees you fills the **ALARM** meter, with one grace second to break line of sight before the alarm spikes. At 100, the whole building wakes and the heist is over.

## Run it

Serve `game/` with any static server and open `game/index.html` in desktop Chrome — the game makes zero network requests. Screenshot scenes can be staged with `?scene=cover|wing|caught|getaway`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-game.ts` library.

## License

MIT — see [LICENSE](LICENSE).
