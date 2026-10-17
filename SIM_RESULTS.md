# Pacing simulation results (v2: Pip wanders on his own)

A bot plays real runs through the same `World` class the game uses: it digs down, detours for ore, flasks and chests it can see, uses dynamite and flares, and buys the cheapest affordable upgrade after each run. It caves in when the Relic gain is at least 50% of all Relics earned so far, or when it has gone 6 runs without buying anything. Each run also counts 12 s of camp time. Since v2, Pip explores on his own instead of following. His contribution barely changed (full completion went from 36.4 to 36.7 days at 45 min/day), so no rebalance was needed.

## Engaged player, 45 min/day (`node sim/pacing.js 45 70`)
```

First runs:
run 1: 12.0s, depth 10m, ore 4, coins 6
run 2: 12.0s, depth 7m, ore 3, coins 3
run 3: 12.0s, depth 8m, ore 2, coins 14
run 4: 16.0s, depth 14m, ore 6, coins 12
run 5: 21.1s, depth 19m, ore 10, coins 15
run 6: 22.0s, depth 22m, ore 7, coins 11
run 7: 16.0s, depth 16m, ore 10, coins 13
run 8: 18.0s, depth 22m, ore 8, coins 13

Milestones (45 min/day of play):
  first upgrade bought                             run     1  day   0.0  (0.0 h played)
  reached Stone (25 m)                             run    11  day   0.1  (0.1 h played)
  reached Granite (50 m)                           run    44  day   0.6  (0.4 h played)
  reached Crystal Caves (75 m)                     run   102  day   1.9  (1.4 h played)
  reached Fungal Grotto (100 m)                    run   144  day   3.2  (2.4 h played)
  first cave-in (+8 relics)                        run   144  day   3.2  (2.4 h played)
  cave-in #5 (+20 relics, shaft depth 118m best)   run   425  day   9.2  (6.9 h played)
  reached Magma Depths (125 m)                     run   471  day  10.4  (7.8 h played)
  reached Frozen Rift (150 m)                      run   563  day  13.1  (9.8 h played)
  reached Ancient Ruins (175 m)                    run   599  day  14.3  (10.7 h played)
  buddy evolution 1: Drill Pip                     run   599  day  14.3  (10.7 h played)
  cave-in #10 (+206 relics, shaft depth 189m best) run   624  day  15.2  (11.4 h played)
  reached Sunken Temple (200 m)                    run   647  day  15.9  (11.9 h played)
  reached The Abyss (225 m)                        run   682  day  17.3  (13.0 h played)
  reached Starlit Hollow (250 m)                   run   683  day  17.4  (13.0 h played)
  reached The Heart (275 m)                        run   696  day  18.0  (13.5 h played)
  reached Deep Void 1 (300 m)                      run   717  day  18.9  (14.2 h played)
  buddy evolution 2: Crystal Pip                   run   718  day  18.9  (14.2 h played)
  reached Deep Void 2 (325 m)                      run   723  day  19.2  (14.4 h played)
  reached Deep Void 3 (350 m)                      run   725  day  19.3  (14.4 h played)
  reached Deep Void 4 (375 m)                      run   735  day  19.7  (14.8 h played)
  reached Deep Void 5 (400 m)                      run   761  day  21.0  (15.7 h played)
  reached Deep Void 6 (425 m)                      run   784  day  22.0  (16.5 h played)
  buddy evolution 3: Ember Pip                     run   806  day  23.0  (17.2 h played)
  cave-in #25 (+11506 relics, shaft depth 433m best) run   824  day  23.8  (17.8 h played)
  reached Deep Void 7 (450 m)                      run   872  day  25.8  (19.4 h played)
  buddy evolution 4: Star Pip                      run   966  day  29.9  (22.4 h played)
  reached Deep Void 8 (475 m)                      run   977  day  30.4  (22.8 h played)
  cave-in #50 (+18159 relics, shaft depth 487m best) run  1030  day  32.9  (24.6 h played)
  reached Deep Void 9 (500 m)                      run  1054  day  33.9  (25.5 h played)
  ALL prestige nodes maxed (full completion)       run  1110  day  36.7  (27.5 h played)
```

## Casual, 25 min/day
```
  first cave-in (+8 relics)                        run   144  day   5.7  (2.4 h played)
  buddy evolution 1: Drill Pip                     run   602  day  25.9  (10.8 h played)
  buddy evolution 2: Crystal Pip                   run   736  day  35.2  (14.7 h played)
  buddy evolution 3: Ember Pip                     run   810  day  41.2  (17.2 h played)
  buddy evolution 4: Star Pip                      run   963  day  53.0  (22.1 h played)
  ALL prestige nodes maxed (full completion)       run  1123  day  66.5  (27.7 h played)
```

## Heavy, 90 min/day
```
  first cave-in (+8 relics)                        run   145  day   1.6  (2.4 h played)
  buddy evolution 1: Drill Pip                     run   625  day   7.6  (11.4 h played)
  buddy evolution 2: Crystal Pip                   run   766  day  10.2  (15.4 h played)
  buddy evolution 3: Ember Pip                     run   840  day  11.9  (17.8 h played)
  buddy evolution 4: Star Pip                      run   992  day  15.2  (22.8 h played)
  ALL prestige nodes maxed (full completion)       run  1152  day  18.9  (28.4 h played)
```
