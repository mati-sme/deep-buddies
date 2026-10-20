# Pacing simulation results (v4: guided first dive, whole-number economy, goals)

A bot plays real runs through the same `World` class the game uses. It digs down; detours for any ore, flasks and chests it can see; uses dynamite and flares; and after each run buys the cheapest upgrade it can afford. It caves in when the Relic gain is at least 50% of all Relics earned so far, or after 6 runs in a row without buying anything. Each run also counts 12 s of camp time. Pip wanders and explores on his own.

What changed in v4 (`node sim/pacing.js 45 70`):
- **Run 1 is the guided tutorial dive.** It has a fixed tutorial layout near the surface: ore in reach, a chest, and extra oil until the tutorial ends. It pays about 340 coins and buys 4 upgrades straight away. Before v4 it paid 6 coins and bought nothing.
- **Coins are whole numbers.** The economy was multiplied by 10 (prices too), so there are no fractions.
- **Stone (25 m) comes at run 3** (was run 11) and **Granite (50 m) at run 14** (was run 44).
- **The first cave-in comes at 1.4 h** of play (was 2.4 h).
- **Full completion takes 34.4 days** at 45 min/day (was 36.7 days). The long game is essentially unchanged; only the first hour got faster.

## Engaged player, 45 min/day (`node sim/pacing.js 45 70`)
```
First runs:
run 1: 17.9s, depth 15m, ore 9, chests 2 (Pip 1), coins 341, bought 4 (had 411), goal #4
run 2: 24.0s, depth 23m, ore 10, chests 1 (Pip 1), coins 277, bought 4 (had 666), goal #6
run 3: 26.8s, depth 27m, ore 10, chests 2 (Pip 1), coins 395, bought 3 (had 657), goal #7
run 4: 26.6s, depth 29m, ore 10, chests 1 (Pip 1), coins 376, bought 1 (had 429), goal #7
run 5: 32.2s, depth 31m, ore 12, chests 1 (Pip 1), coins 354, bought 2 (had 573), goal #7
run 6: 36.8s, depth 34m, ore 12, chests 1 (Pip 1), coins 377, bought 1 (had 455), goal #7
run 7: 29.4s, depth 31m, ore 12, chests 1 (Pip 1), coins 340, bought 1 (had 517), goal #7
run 8: 29.6s, depth 30m, ore 11, chests 1 (Pip 1), coins 383, bought 2 (had 611), goal #7
run 9: 35.8s, depth 33m, ore 8, chests 1 (Pip 1), coins 498, bought 1 (had 509), goal #7
run 10: 35.9s, depth 29m, ore 9, chests 1 (Pip 1), coins 416, bought 1 (had 605), goal #7

Milestones (45 min/day of play):
  first upgrade bought                             run     1  day   0.0  (0.0 h played)
  reached Stone (25 m)                             run     3  day   0.0  (0.0 h played)
  reached Granite (50 m)                           run    14  day   0.2  (0.2 h played)
  reached Crystal Caves (75 m)                     run    58  day   1.4  (1.0 h played)
  reached Fungal Grotto (100 m)                    run    73  day   1.9  (1.4 h played)
  first cave-in (+8 relics)                        run    73  day   1.9  (1.4 h played)
  cave-in #5 (+24 relics, shaft depth 123m best)   run   255  day   6.6  (5.0 h played)
  reached Magma Depths (125 m)                     run   291  day   7.6  (5.7 h played)
  reached Frozen Rift (150 m)                      run   359  day   9.9  (7.5 h played)
  reached Ancient Ruins (175 m)                    run   364  day  10.2  (7.7 h played)
  buddy evolution 1: Drill Pip                     run   364  day  10.2  (7.7 h played)
  cave-in #10 (+239 relics, shaft depth 196m best) run   405  day  11.8  (8.8 h played)
  reached Sunken Temple (200 m)                    run   419  day  12.4  (9.3 h played)
  reached The Abyss (225 m)                        run   435  day  13.1  (9.8 h played)
  reached Starlit Hollow (250 m)                   run   448  day  13.7  (10.3 h played)
  reached The Heart (275 m)                        run   458  day  14.1  (10.6 h played)
  buddy evolution 2: Crystal Pip                   run   479  day  15.2  (11.4 h played)
  buddy evolution 3: Ember Pip                     run   554  day  18.9  (14.2 h played)
  cave-in #25 (+11687 relics, shaft depth 435m best) run   581  day  20.2  (15.2 h played)
  buddy evolution 4: Star Pip                      run   714  day  26.7  (20.0 h played)
  cave-in #50 (+18159 relics, shaft depth 489m best) run   786  day  30.5  (22.9 h played)
  reached Deep Void 9 (500 m)                      run   807  day  31.6  (23.7 h played)
  ALL prestige nodes maxed (full completion)       run   858  day  34.4  (25.8 h played)
```

## Casual, 25 min/day (`node sim/pacing.js 25 70`)
```
  first cave-in (+8 relics)                        run    73  day   3.4  (1.4 h played)
  buddy evolution 1: Drill Pip                     run   358  day  17.9  (7.5 h played)
  buddy evolution 2: Crystal Pip                   run   481  day  27.1  (11.3 h played)
  buddy evolution 3: Ember Pip                     run   565  day  34.6  (14.4 h played)
  buddy evolution 4: Star Pip                      run   700  day  46.6  (19.4 h played)
  ALL prestige nodes maxed (full completion)       run   868  day  62.5  (26.0 h played)
```

## Heavy, 90 min/day (`node sim/pacing.js 90 70`)
```
  first cave-in (+8 relics)                        run    73  day   0.9  (1.4 h played)
  buddy evolution 1: Drill Pip                     run   385  day   5.4  (8.2 h played)
  buddy evolution 2: Crystal Pip                   run   492  day   7.7  (11.6 h played)
  buddy evolution 3: Ember Pip                     run   568  day   9.6  (14.4 h played)
  buddy evolution 4: Star Pip                      run   704  day  12.9  (19.4 h played)
  ALL prestige nodes maxed (full completion)       run   872  day  17.4  (26.1 h played)
```

## Shaft width (v3 landscape)
Landscape screens get a wider world (more columns). The same 45 min/day sim was run with `SIM_W` set to each width:

| Columns | Full completion |
|---|---|
| 11 (portrait) | day 36.8 |
| 26 (phone landscape) | day 37.6 |
| 40 (max, ultrawide) | day 36.5 |

The differences are within run-to-run noise. Runs go down, so extra columns add almost no reachable ore. Light radius is measured in tiles, so it doesn't change either. No rebalance was needed.
The shaft-width numbers were measured on v3 and were not re-run for v4.
