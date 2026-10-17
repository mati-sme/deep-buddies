# Deep Buddies ⛏️🐾

A cozy pixel mining game for phone and desktop. You dig down a lantern-lit mine with **Pip the mole**. Grab ore before your lantern runs out, then spend the coins on a mine-cart **Upgrade Map**. Once a shaft is deep enough, a **Cave-in** gives you Relics for the **Relic Map**, where Pip evolves.

Play: https://mati-sme.github.io/deep-buddies/

## How it plays
- **Timed runs.** Every run lasts as long as your lantern oil: 10 s at first, about 1–2 minutes later on. Oil flasks in the rock give some back. Monsters, gas pockets and lava burn oil. When the oil is gone you go back up and sell what you carried.
- **Moving and digging.** On touch screens, touch and drag anywhere on the cave: a faint floating joystick appears where your finger went down, and you walk and dig in the drag direction for as long as you hold. A short tap on a block goes and digs it. On a keyboard, use the arrow keys or WASD (dragging with the mouse works too). There are no on-screen arrow buttons. Which way you dig matters: ore veins and treasure chests are worth a lot, hard boulders slow you down, green gas rocks explode, water slows you and lava burns.
- **Pip the buddy** doesn't follow you. He wanders the explored mine on his own, digs blocks around himself (smelled ore first once he has Ore Sniffing), fights creatures near him and chatters in speech bubbles. He stays roughly within your light or a few tiles of explored tunnels, and pops back through a tunnel if he ends up far behind. Tap 🐾 and then a spot to nudge him there. After that he goes back to exploring. Upgrades teach him Ore Sniffing (ore sparkles in the dark), Gem Hunter (he smells ore much further away), Brave Buddy (he fights) and Dynamite.
- **Cave creatures** (bats, slimes, beetles, spiders, imps, golems...) wake up when your light reaches them and bite away your oil. Your weapon hits them automatically when they get close, so swords and armor matter.
- **Upgrade Map** (52 nodes on mine-cart rails). It has six branches: Pickaxe tiers (Wooden → Heartforge), Weapon tiers (Stick → Star Saber), Lantern (oil, light, flare), Gear (boots, backpack, armor, gas mask, heat boots, helmet, gloves), Buddy, and Loot. You only ever buy upgrades. There are no helpers to buy over and over.
- **Cave-in (prestige).** Once you reach 100 m in a shaft, a cave-in resets coins, upgrades and shaft depth. In return you get Relics, roughly (depth)³. You spend them on the **Relic Map** (17 nodes), which shows a constellation over geological layers. It has permanent buffs, the Elevator, the Gear Locker, Auto-buy, and **four buddy evolutions**: Drill Pip (drills straight down), Crystal Pip (sees ore far away), Ember Pip (burns monsters, walks through lava) and Star Pip (glows in the dark).
- **Saves** go to localStorage on each device (autosave every 10 s, after runs and after purchases). You can move a save with export/import.

## Tech
Vanilla JS with no build step. Canvas renderer with procedural pixel art, darkness and a lantern light radius, particles and screen shake. Sound is made with WebAudio (no audio files) and can be muted. It is an installable PWA: `sw.js` caches the game cache-first, and its `CACHE` name must be bumped on every release.

- `js/data.js` holds the strata, ores, creatures, upgrade map and relic map. `js/core.js` holds the economy and the world simulation, with no DOM, so Node can use it too.
- `node sim/pacing.js [minutesPerDay] [maxDays]` runs a pacing simulation: a bot plays real runs through the same `World` class the game uses. Results are in `SIM_RESULTS.md`.
- `node test/e2e.js [url]` is a headless Chrome test. It loads the game, digs with the d-pad and the keyboard, plays a run, buys an upgrade, does a cave-in, buys a relic node and checks that the save survives a reload.
