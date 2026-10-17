# Pacing simulation results

A bot plays real runs through the same `World` class the game uses: it digs down, detours for ore, flasks and chests it can see, uses dynamite and flares, and buys the cheapest affordable upgrade after each run. It caves in when the Relic gain is at least 50% of all Relics earned so far, or when it has gone 6 runs without buying anything. Each run also counts 12 s of camp time.

## Engaged player, 45 min/day (`node sim/pacing.js 45 70`)
```

First runs:
run 1: 12.0s, depth 10m, ore 4, coins 6
run 2: 12.0s, depth 7m, ore 3, coins 3
run 3: 12.0s, depth 8m, ore 2, coins 14
run 4: 16.0s, depth 14m, ore 6, coins 12
run 5: 20.0s, depth 17m, ore 10, coins 15
run 6: 22.0s, depth 22m, ore 7, coins 11
run 7: 16.0s, depth 16m, ore 10, coins 13
run 8: 18.0s, depth 22m, ore 8, coins 13

Milestones (45 min/day of play):
  first upgrade bought                             run     1  day   0.0  (0.0 h played)
  reached Stone (25 m)                             run    11  day   0.1  (0.1 h played)
  reached Granite (50 m)                           run    44  day   0.6  (0.4 h played)
  reached Crystal Caves (75 m)                     run   116  day   2.2  (1.7 h played)
  reached Fungal Grotto (100 m)                    run   141  day   3.0  (2.3 h played)
  first cave-in (+8 relics)                        run   141  day   3.0  (2.3 h played)
  cave-in #5 (+21 relics, shaft depth 119m best)   run   430  day   9.3  (7.0 h played)
  reached Magma Depths (125 m)                     run   481  day  10.6  (7.9 h played)
  reached Frozen Rift (150 m)                      run   577  day  13.5  (10.1 h played)
  buddy evolution 1: Drill Pip                     run   612  day  14.6  (10.9 h played)
  reached Ancient Ruins (175 m)                    run   637  day  15.3  (11.5 h played)
  cave-in #10 (+180 relics, shaft depth 183m best) run   638  day  15.4  (11.5 h played)
  reached Sunken Temple (200 m)                    run   677  day  16.7  (12.5 h played)
  reached The Abyss (225 m)                        run   694  day  17.4  (13.1 h played)
  reached Starlit Hollow (250 m)                   run   696  day  17.5  (13.1 h played)
  reached The Heart (275 m)                        run   710  day  18.1  (13.5 h played)
  reached Deep Void 1 (300 m)                      run   733  day  19.0  (14.2 h played)
  reached Deep Void 2 (325 m)                      run   734  day  19.0  (14.3 h played)
  buddy evolution 2: Crystal Pip                   run   734  day  19.0  (14.3 h played)
  reached Deep Void 3 (350 m)                      run   744  day  19.5  (14.6 h played)
  reached Deep Void 4 (375 m)                      run   753  day  19.9  (14.9 h played)
  reached Deep Void 5 (400 m)                      run   780  day  21.1  (15.8 h played)
  reached Deep Void 6 (425 m)                      run   802  day  22.0  (16.5 h played)
  buddy evolution 3: Ember Pip                     run   825  day  22.9  (17.2 h played)
  cave-in #25 (+11061 relics, shaft depth 435m best) run   843  day  23.7  (17.8 h played)
  reached Deep Void 7 (450 m)                      run   891  day  25.7  (19.3 h played)
  buddy evolution 4: Star Pip                      run   984  day  29.5  (22.1 h played)
  reached Deep Void 8 (475 m)                      run   995  day  30.0  (22.5 h played)
  cave-in #50 (+17180 relics, shaft depth 480m best) run  1048  day  32.3  (24.2 h played)
  reached Deep Void 9 (500 m)                      run  1069  day  33.3  (24.9 h played)
  ALL prestige nodes maxed (full completion)       run  1136  day  36.4  (27.3 h played)
```

## Casual, 25 min/day
```
  first cave-in (+8 relics)                        run   141  day   5.4  (2.3 h played)
  buddy evolution 1: Drill Pip                     run   583  day  24.6  (10.3 h played)
  buddy evolution 2: Crystal Pip                   run   721  day  33.6  (14.0 h played)
  buddy evolution 3: Ember Pip                     run   796  day  39.5  (16.4 h played)
  buddy evolution 4: Star Pip                      run   939  day  50.1  (20.9 h played)
  ALL prestige nodes maxed (full completion)       run  1107  day  63.7  (26.5 h played)
```

## Heavy, 90 min/day
```
  first cave-in (+8 relics)                        run   141  day   1.5  (2.3 h played)
  buddy evolution 1: Drill Pip                     run   599  day   7.1  (10.6 h played)
  buddy evolution 2: Crystal Pip                   run   715  day   9.2  (13.8 h played)
  buddy evolution 3: Ember Pip                     run   800  day  11.1  (16.6 h played)
  buddy evolution 4: Star Pip                      run   959  day  14.4  (21.6 h played)
  ALL prestige nodes maxed (full completion)       run  1103  day  17.6  (26.5 h played)
```
