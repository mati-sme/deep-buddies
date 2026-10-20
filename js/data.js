/* Deep Buddies - game data (shared by browser and Node sim). */
(function (root) {
'use strict';

const W = 11;          // shaft width in tiles
const CHUNK = 25;      // rows per stratum
const HP_GROWTH = 8;   // block hp x per stratum
const VAL_GROWTH = 2.2; // ore value x per tier
const COIN = 10;       // v2: all coin values x10 so every number on screen is a whole number

const STRATA = [
  { name: 'Topsoil',        base: '#8a5a32', dark: '#5b3a1f', light: '#b07644', speck: '#d29a5c', bg: '#2a1a0e' },
  { name: 'Stone',          base: '#6e6c74', dark: '#46444c', light: '#8f8d96', speck: '#b4b2bb', bg: '#1b1a1f' },
  { name: 'Granite',        base: '#8c6a66', dark: '#5e4542', light: '#ab8580', speck: '#e0c2b8', bg: '#21161a' },
  { name: 'Crystal Caves',  base: '#3d4c84', dark: '#262f58', light: '#5868a8', speck: '#8ff0ff', bg: '#0e1226' },
  { name: 'Fungal Grotto',  base: '#3e5838', dark: '#263822', light: '#587a4e', speck: '#d48cff', bg: '#0f1a10' },
  { name: 'Magma Depths',   base: '#5c2c22', dark: '#3a1812', light: '#7c3e2c', speck: '#ff9a3c', bg: '#1e0906' },
  { name: 'Frozen Rift',    base: '#5a86a6', dark: '#365a76', light: '#86b2cc', speck: '#ffffff', bg: '#0c1824' },
  { name: 'Ancient Ruins',  base: '#857150', dark: '#584830', light: '#a8916a', speck: '#ffe08a', bg: '#1e170c' },
  { name: 'Sunken Temple',  base: '#2e605a', dark: '#1a3e3a', light: '#46847c', speck: '#7fffe0', bg: '#08181a' },
  { name: 'The Abyss',      base: '#2c2244', dark: '#1a142c', light: '#44366a', speck: '#a080ff', bg: '#07050e' },
  { name: 'Starlit Hollow', base: '#1f2856', dark: '#121838', light: '#33407c', speck: '#fff6a0', bg: '#04061a' },
  { name: 'The Heart',      base: '#6c2040', dark: '#46122a', light: '#933058', speck: '#ff8ac8', bg: '#1a0410' }
];
function stratum(s) {
  if (s < STRATA.length) return STRATA[s];
  const p = STRATA[8 + (s % 4)];
  return Object.assign({}, p, { name: 'Deep Void ' + (s - STRATA.length + 1) });
}

const ORES = [
  { name: 'Copper',    color: '#e0874c', hi: '#ffc08a' },
  { name: 'Iron',      color: '#b9a48e', hi: '#efe0cc' },
  { name: 'Silver',    color: '#d8e2ee', hi: '#ffffff' },
  { name: 'Gold',      color: '#ffcc2e', hi: '#fff3a0' },
  { name: 'Ruby',      color: '#ff3557', hi: '#ffa0b0' },
  { name: 'Emerald',   color: '#28e08a', hi: '#b0ffd8' },
  { name: 'Sapphire',  color: '#3d78ff', hi: '#a8c4ff' },
  { name: 'Amethyst',  color: '#b45cff', hi: '#e2c0ff' },
  { name: 'Topaz',     color: '#ffa236', hi: '#ffe0a8' },
  { name: 'Diamond',   color: '#bff6ff', hi: '#ffffff' },
  { name: 'Mythril',   color: '#6fffd2', hi: '#d8fff2' },
  { name: 'Starstone', color: '#fff27a', hi: '#ffffff' },
  { name: 'Heartgem',  color: '#ff5fa8', hi: '#ffd0e8' },
  { name: 'Void Pearl',color: '#d0c0ff', hi: '#ffffff' }
];
function ore(tier) { return ORES[Math.min(tier, ORES.length - 1)]; }

const CREATURES = [
  { name: 'Cave Bat',      sprite: 'bat',    speed: 0.45, fly: true },
  { name: 'Mud Slime',     sprite: 'slime',  speed: 0.95 },
  { name: 'Rock Beetle',   sprite: 'beetle', speed: 0.8 },
  { name: 'Crystal Spider',sprite: 'spider', speed: 0.55 },
  { name: 'Spore Puff',    sprite: 'slime',  speed: 0.9, tint: '#c070ff' },
  { name: 'Magma Imp',     sprite: 'imp',    speed: 0.6 },
  { name: 'Frost Bat',     sprite: 'bat',    speed: 0.4, fly: true, tint: '#a8e4ff' },
  { name: 'Stone Golem',   sprite: 'golem',  speed: 1.1 },
  { name: 'Temple Eel',    sprite: 'spider', speed: 0.5, tint: '#40ffd0' },
  { name: 'Shadow Wisp',   sprite: 'imp',    speed: 0.45, fly: true, tint: '#a080ff' },
  { name: 'Star Moth',     sprite: 'bat',    speed: 0.4, fly: true, tint: '#fff080' },
  { name: 'Heart Golem',   sprite: 'golem',  speed: 0.9, tint: '#ff70b0' }
];
function creatureType(s) { return CREATURES[s % CREATURES.length]; }

// Gear names used for tiers (drawn on the character too)
const PICKS   = ['Wooden Pick', 'Stone Pick', 'Copper Pick', 'Iron Pick', 'Steel Pick', 'Mithril Pick', 'Crystal Pick', 'Starmetal Pick', 'Heartforge Pick'];
const PICK_COL= ['#a0743c', '#9a9aa2', '#e0874c', '#c8ccd4', '#e8eef8', '#6fffd2', '#8ff0ff', '#fff27a', '#ff5fa8'];
const WEAPONS = ['Stick', 'Wooden Sword', 'Bronze Sword', 'Iron Sword', 'Silver Blade', 'Crystal Blade', 'Flame Blade', 'Rune Sword', 'Star Saber'];
const ARMORS  = ['Cloth Vest', 'Leather Vest', 'Chain Shirt', 'Iron Plate', 'Crystal Mail', 'Dragon Scale', 'Star Armor'];
const BUDDY_FORMS = [
  { name: 'Pip the Mole',  body: '#8a6248', belly: '#c89a78', extra: null },
  { name: 'Drill Pip',     body: '#7a6a5a', belly: '#c0b0a0', extra: 'drill' },
  { name: 'Crystal Pip',   body: '#5a70b8', belly: '#a8e8ff', extra: 'crystal' },
  { name: 'Ember Pip',     body: '#a8442c', belly: '#ffb070', extra: 'flame' },
  { name: 'Star Pip',      body: '#3a3a7a', belly: '#fff2a0', extra: 'star' }
];

/* ---------------- Upgrade map (rail map) ----------------
   x,y are map grid coordinates (row 0 = surface track). parent: id or null (=station). */
const B = { pick: 'Pickaxe', weap: 'Weapon', lamp: 'Lantern', gear: 'Gear', buddy: 'Buddy', loot: 'Loot' };
const BR_COL = { pick: '#ffb347', weap: '#ff6b6b', lamp: '#ffe066', gear: '#7fd1ff', buddy: '#c39bff', loot: '#7dffa0' };
const BR_ICON = { pick: 'pick', weap: 'sword', lamp: 'lantern', gear: 'bag', buddy: 'paw', loot: 'coinbag' }; // pixel icon keys (js/icons.js)

const UPGRADES = [
  // Pickaxe line: tiers down the shaft, side tunnels for sharpen/swing/crit/quake
  { id: 'sharpen', br: 'pick', name: 'Sharpen', icon: 'whetstone', x: -6, y: 1, parent: null, max: 30, cost: 8, g: 1.75, desc: '+20% dig power per level' },
  { id: 'pick1', br: 'pick', name: 'Stone Pick', icon: 'pick:#9a9aa2', x: -6, y: 2, parent: 'sharpen', max: 1, cost: 40, g: 1, desc: 'Dig power x4', tier: 1 },
  { id: 'swing', br: 'pick', name: 'Quick Swing', icon: 'wind', x: -7, y: 2, parent: 'pick1', max: 20, cost: 60, g: 1.85, desc: '+8% swing speed per level' },
  { id: 'pick2', br: 'pick', name: 'Copper Pick', icon: 'pick:#e0874c', x: -6, y: 3, parent: 'pick1', max: 1, cost: 1200, g: 1, desc: 'Dig power x4', tier: 2 },
  { id: 'pick3', br: 'pick', name: 'Iron Pick', icon: 'pick:#c8ccd4', x: -6, y: 4, parent: 'pick2', max: 1, cost: 36000, g: 1, desc: 'Dig power x4', tier: 3 },
  { id: 'crit', br: 'pick', name: 'Lucky Strike', icon: 'clover', x: -5, y: 3, parent: 'pick2', max: 15, cost: 900, g: 2.1, desc: '+3% chance for a x3 critical hit' },
  { id: 'pick4', br: 'pick', name: 'Steel Pick', icon: 'pick:#e8eef8', x: -6, y: 5, parent: 'pick3', max: 1, cost: 1.08e+06, g: 1, desc: 'Dig power x4', tier: 4 },
  { id: 'quake', br: 'pick', name: 'Quake Swing', icon: 'burst', x: -7, y: 5, parent: 'pick4', max: 10, cost: 4e5, g: 2.6, desc: '+5% chance a hit also cracks the block behind' },
  { id: 'pick5', br: 'pick', name: 'Mithril Pick', icon: 'pick:#6fffd2', x: -6, y: 6, parent: 'pick4', max: 1, cost: 3.24e+07, g: 1, desc: 'Dig power x4', tier: 5 },
  { id: 'pick6', br: 'pick', name: 'Crystal Pick', icon: 'pick:#8ff0ff', x: -6, y: 7, parent: 'pick5', max: 1, cost: 9.72e+08, g: 1, desc: 'Dig power x4', tier: 6 },
  { id: 'pick7', br: 'pick', name: 'Starmetal Pick', icon: 'pick:#fff27a', x: -6, y: 8, parent: 'pick6', max: 1, cost: 2.916e+10, g: 1, desc: 'Dig power x4', tier: 7 },
  { id: 'pick8', br: 'pick', name: 'Heartforge Pick', icon: 'pick:#ff5fa8', x: -6, y: 9, parent: 'pick7', max: 1, cost: 8.748e+11, g: 1, desc: 'Dig power x4', tier: 8 },

  // Weapon line
  { id: 'sword1', br: 'weap', name: 'Wooden Sword', icon: 'sword:#a0743c', x: -3, y: 1, parent: null, max: 1, cost: 25, g: 1, desc: 'Weapon damage x5', tier: 1 },
  { id: 'wtrain', br: 'weap', name: 'Training', icon: 'fist', x: -4, y: 2, parent: 'sword1', max: 25, cost: 50, g: 1.75, desc: '+25% weapon damage per level' },
  { id: 'sword2', br: 'weap', name: 'Bronze Sword', icon: 'sword:#d08a4c', x: -3, y: 2, parent: 'sword1', max: 1, cost: 750, g: 1, desc: 'Weapon damage x5', tier: 2 },
  { id: 'wspeed', br: 'weap', name: 'Fast Hands', icon: 'hand', x: -2, y: 3, parent: 'sword2', max: 15, cost: 800, g: 1.7, desc: '+10% attack speed per level' },
  { id: 'sword3', br: 'weap', name: 'Iron Sword', icon: 'sword:#c8ccd4', x: -3, y: 3, parent: 'sword2', max: 1, cost: 22500, g: 1, desc: 'Weapon damage x5', tier: 3 },
  { id: 'bounty', br: 'weap', name: 'Monster Bounty', icon: 'medal', x: -4, y: 4, parent: 'sword3', max: 20, cost: 1.5e4, g: 1.8, desc: '+40% coins from creatures' },
  { id: 'sword4', br: 'weap', name: 'Silver Blade', icon: 'sword:#e8eef8', x: -3, y: 4, parent: 'sword3', max: 1, cost: 675000, g: 1, desc: 'Weapon damage x5', tier: 4 },
  { id: 'sword5', br: 'weap', name: 'Crystal Blade', icon: 'sword:#8ff0ff', x: -3, y: 5, parent: 'sword4', max: 1, cost: 2.025e+07, g: 1, desc: 'Weapon damage x5', tier: 5 },
  { id: 'sword6', br: 'weap', name: 'Flame Blade', icon: 'sword:#ff8a3c', x: -3, y: 6, parent: 'sword5', max: 1, cost: 6.075e+08, g: 1, desc: 'Weapon damage x5', tier: 6 },
  { id: 'sword7', br: 'weap', name: 'Rune Sword', icon: 'sword:#b48cff', x: -3, y: 7, parent: 'sword6', max: 1, cost: 1.8225e+10, g: 1, desc: 'Weapon damage x5', tier: 7 },
  { id: 'sword8', br: 'weap', name: 'Star Saber', icon: 'sword:#fff27a', x: -3, y: 8, parent: 'sword7', max: 1, cost: 5.4675e+11, g: 1, desc: 'Weapon damage x5', tier: 8 },

  // Lantern line
  { id: 'tank', br: 'lamp', name: 'Bigger Oil Tank', icon: 'barrel', x: 0, y: 1, parent: null, max: 20, cost: 5, g: 1.42, desc: '+3 s of lantern oil per level' },
  { id: 'wick', br: 'lamp', name: 'Bright Wick', icon: 'candle', x: -1, y: 2, parent: 'tank', max: 8, cost: 30, g: 2.1, desc: 'Your lantern lights the cave further' },
  { id: 'oilfind', br: 'lamp', name: 'Oil Finder', icon: 'flask', x: 0, y: 2, parent: 'tank', max: 12, cost: 120, g: 1.9, desc: 'More oil flasks underground, +1 s each' },
  { id: 'flare', br: 'lamp', name: 'Flare', icon: 'sparkle', x: 1, y: 3, parent: 'oilfind', max: 1, cost: 3000, g: 1, desc: 'Button: a flash that lights the cave and stuns creatures' },
  { id: 'reserve', br: 'lamp', name: 'Reserve Flask', icon: 'flaskbig', x: 0, y: 3, parent: 'oilfind', max: 5, cost: 2500, g: 3, desc: '+4 s oil per level (big refill)' },
  { id: 'flarepow', br: 'lamp', name: 'Mega Flare', icon: 'firework', x: 1, y: 4, parent: 'flare', max: 6, cost: 5e4, g: 3, desc: 'Flare recharges faster and hurts creatures' },
  { id: 'econ', br: 'lamp', name: 'Slow Burn', icon: 'hourglass', x: 0, y: 4, parent: 'reserve', max: 5, cost: 1e5, g: 4, desc: 'Lantern burns 4% slower' },

  // Gear line
  { id: 'boots', br: 'gear', name: 'Running Boots', icon: 'boots', x: 3, y: 1, parent: null, max: 15, cost: 15, g: 1.85, desc: '+8% walking speed' },
  { id: 'bag', br: 'gear', name: 'Bigger Backpack', icon: 'bag', x: 2, y: 2, parent: 'boots', max: 30, cost: 20, g: 1.5, desc: '+28% backpack space for ore' },
  { id: 'armor', br: 'gear', name: 'Armor', icon: 'shield', x: 3, y: 2, parent: 'boots', max: 6, cost: 150, g: 6, desc: 'Next armor piece: creatures and hazards hurt 22% less', tierNames: true },
  { id: 'mask', br: 'gear', name: 'Gas Mask', icon: 'mask', x: 4, y: 3, parent: 'armor', max: 3, cost: 2000, g: 8, desc: 'Gas pockets drain 30% less oil' },
  { id: 'heat', br: 'gear', name: 'Heat Boots', icon: 'boots:#ff6a3a', x: 3, y: 3, parent: 'armor', max: 3, cost: 5e4, g: 10, desc: 'Lava and water slow/hurt you less' },
  { id: 'helmet', br: 'gear', name: 'Miner Helmet', icon: 'helmet', x: 2, y: 4, parent: 'heat', max: 10, cost: 2e5, g: 2.6, desc: '+10% dig power and +3% light' },
  { id: 'gloves', br: 'gear', name: 'Grip Gloves', icon: 'hand:#c8a070', x: 3, y: 4, parent: 'heat', max: 12, cost: 4e5, g: 2.5, desc: '+7% swing and attack speed' },

  // Buddy line
  { id: 'bdig', br: 'buddy', name: 'Buddy Claws', icon: 'paw', x: 6, y: 1, parent: null, max: 25, cost: 12, g: 1.75, desc: 'Pip digs 12% faster' },
  { id: 'bpow', br: 'buddy', name: 'Buddy Strength', icon: 'fist:#c39bff', x: 5, y: 2, parent: 'bdig', max: 10, cost: 80, g: 2.8, desc: 'Pip hits harder (+12% of your dig power)' },
  { id: 'sniff', br: 'buddy', name: 'Ore Sniffing', icon: 'nose', x: 6, y: 2, parent: 'bdig', max: 6, cost: 200, g: 2.6, desc: 'Pip smells ore in the dark (+1 tile)' },
  { id: 'bbag', br: 'buddy', name: 'Buddy Pouch', icon: 'bag:#c39bff', x: 7, y: 2, parent: 'bdig', max: 15, cost: 150, g: 1.9, desc: 'Pip carries +4 extra ore' },
  { id: 'gemhunt', br: 'buddy', name: 'Gem Hunter', icon: 'gem', x: 6, y: 3, parent: 'sniff', max: 1, cost: 4000, g: 1, desc: 'Pip runs off on his own to dig ore he smells' },
  { id: 'bfight', br: 'buddy', name: 'Brave Buddy', icon: 'fist:#ff6b6b', x: 7, y: 3, parent: 'bbag', max: 10, cost: 3000, g: 2.4, desc: 'Pip bonks creatures (35% of your weapon)' },
  { id: 'dyn', br: 'buddy', name: 'Dynamite', icon: 'dynamite', x: 6, y: 4, parent: 'gemhunt', max: 1, cost: 2.5e4, g: 1, desc: 'Button: Pip throws dynamite that blasts a big hole' },
  { id: 'dynpow', br: 'buddy', name: 'Bigger Boom', icon: 'bomb', x: 5, y: 5, parent: 'dyn', max: 8, cost: 2e5, g: 3, desc: 'Dynamite is stronger and recharges faster' },
  { id: 'btunnel', br: 'buddy', name: 'Side Tunnels', icon: 'arrowslr', x: 7, y: 5, parent: 'dyn', max: 1, cost: 5e5, g: 1, desc: 'Every 10 m Pip digs a sideways tunnel full of loot' },

  // Loot line
  { id: 'appraise', br: 'loot', name: 'Appraiser', icon: 'magnifier', x: 9, y: 1, parent: null, max: 40, cost: 20, g: 1.6, desc: '+12% ore value' },
  { id: 'depthpay', br: 'loot', name: 'Depth Bonus', icon: 'ruler', x: 8, y: 2, parent: 'appraise', max: 20, cost: 70, g: 2.2, desc: '+50% coins for depth reached' },
  { id: 'veins', br: 'loot', name: 'Rich Veins', icon: 'ore', x: 9, y: 2, parent: 'appraise', max: 15, cost: 250, g: 2.4, desc: '+8% more ore in the walls' },
  { id: 'chests', br: 'loot', name: 'Treasure Map', icon: 'map', x: 10, y: 3, parent: 'veins', max: 10, cost: 3500, g: 2.3, desc: 'More buried treasure chests' },
  { id: 'gems', br: 'loot', name: 'Gem Eye', icon: 'eye', x: 9, y: 3, parent: 'veins', max: 10, cost: 1e4, g: 2.4, desc: 'Rare gems appear more often' },
  { id: 'merchant', br: 'loot', name: 'Haggler', icon: 'coinbag', x: 9, y: 4, parent: 'gems', max: 15, cost: 1.5e5, g: 2.4, desc: '+8% sell price (adds up)' }
];

/* ---------------- Prestige map (geological constellation) ---------------- */
const PRESTIGE = [
  { id: 'p_value', name: 'Ancient Lore', icon: 'scroll', x: 0, y: 1, parent: null, max: 40, cost: 2, g: 1.22, desc: '+15% coins (adds up)' },
  { id: 'p_power', name: 'Earth Strength', icon: 'volcano', x: -2, y: 1, parent: null, max: 60, cost: 2, g: 1.17, desc: '+30% dig power' },
  { id: 'p_oil', name: 'Eternal Flame', icon: 'flame', x: 2, y: 1, parent: null, max: 8, cost: 4, g: 1.7, desc: '+3 s lantern oil' },
  { id: 'p_start', name: 'Savings Jar', icon: 'jar', x: -1, y: 2, parent: 'p_value', max: 6, cost: 10, g: 2.6, desc: 'Start each new shaft with coins (x10 per level)' },
  { id: 'evo1', name: 'Drill Pip', icon: 'pip:1', x: 0, y: 2.5, parent: 'p_value', max: 1, cost: 30, g: 1, desc: 'Buddy evolves! Pip digs x3 and drills straight down 3 tiles every 8 s', evo: 1 },
  { id: 'p_speed', name: 'Light Feet', icon: 'feather', x: 2, y: 2, parent: 'p_oil', max: 10, cost: 6, g: 1.8, desc: '+6% walking speed' },
  { id: 'p_relic', name: 'Relic Hunter', icon: 'column', x: -2, y: 2.5, parent: 'p_power', max: 12, cost: 15, g: 1.7, desc: '+20% Relics from cave-ins' },
  { id: 'p_elev', name: 'Elevator', icon: 'elevator', x: 1, y: 3.5, parent: 'evo1', max: 4, cost: 80, g: 3, desc: 'Start runs part-way down (20% of this shaft\'s record per level)' },
  { id: 'p_keep', name: 'Gear Locker', icon: 'lock', x: -1, y: 3.5, parent: 'evo1', max: 3, cost: 150, g: 6, desc: 'Keep pickaxe, sword and armor tiers after a cave-in (one per level)' },
  { id: 'evo2', name: 'Crystal Pip', icon: 'pip:2', x: 0, y: 4.5, parent: 'evo1', max: 1, cost: 800, g: 1, desc: 'Buddy evolves! Pip sees ore far away, digs x3, gems +50%', evo: 2 },
  { id: 'p_bond', name: 'Buddy Bond', icon: 'heart', x: 2, y: 4.5, parent: 'evo2', max: 12, cost: 60, g: 1.75, desc: 'Pip digs 35% faster and fights harder' },
  { id: 'p_auto', name: 'Foreman Notes', icon: 'notebook', x: -2, y: 4.5, parent: 'evo2', max: 1, cost: 400, g: 1, desc: 'Unlocks "Auto-buy" for the upgrade map' },
  { id: 'evo3', name: 'Ember Pip', icon: 'pip:3', x: 0, y: 5.5, parent: 'evo2', max: 1, cost: 6000, g: 1, desc: 'Buddy evolves! Pip digs x3, burns creatures, lava does not slow you', evo: 3 },
  { id: 'p_time', name: 'Deep Breath', icon: 'hourglass', x: 2, y: 5.5, parent: 'evo3', max: 5, cost: 1000, g: 2.2, desc: 'Lantern burns 5% slower' },
  { id: 'p_luck', name: 'Lucky Charm', icon: 'clover', x: -2, y: 5.5, parent: 'evo3', max: 8, cost: 800, g: 1.6, desc: 'Chests and gems are worth +50%' },
  { id: 'evo4', name: 'Star Pip', icon: 'pip:4', x: 0, y: 6.5, parent: 'evo3', max: 1, cost: 30000, g: 1, desc: 'Final form! Pip digs x3, coins x2, Pip glows in the dark', evo: 4 },
  { id: 'p_core', name: 'Heart of the World', icon: 'heart:#ff8a3c', x: 0, y: 7.5, parent: 'evo4', max: 5, cost: 20000, g: 1.5, desc: 'Dig power x2, weapon x2 and +5 s oil' }
];

const CAVEIN_DEPTH = 100; // depth needed to cave-in
UPGRADES.forEach((u) => { u.cost *= COIN; }); // coins are x10 since v2 (relic costs are unchanged)

/* ---------------- Goal chain (v2) ----------------
   Small, reachable goals shown in camp and in the dive HUD. Each pays a coin bonus the moment it is done.
   kind: depth (best depth ever, m) | ore (lifetime ore of a tier) | buys (upgrades bought) | chests | kills | up (own an upgrade) | caveins */
const GOALS = [
  { id: 'd8',      kind: 'depth', n: 8,  text: 'Dig 8 m deep', icon: 'depth', reward: 30 },
  { id: 'cu5',     kind: 'ore', tier: 0, n: 5, text: 'Collect 5 Copper', icon: 'ore:#e0874c', reward: 40 },
  { id: 'buy1',    kind: 'buys', n: 1, text: 'Buy an upgrade', icon: 'rails', reward: 40 },
  { id: 'chest1',  kind: 'chests', n: 1, text: 'Open a treasure chest', icon: 'chest', reward: 60 },
  { id: 'd18',     kind: 'depth', n: 18, text: 'Reach 18 m', icon: 'depth', reward: 80 },
  { id: 'buy3',    kind: 'buys', n: 3, text: 'Buy 3 upgrades', icon: 'rails', reward: 100 },
  { id: 'stone',   kind: 'depth', n: 25, text: 'Reach the Stone layer (25 m)', icon: 'mountain', reward: 150 },
  { id: 'pick1',   kind: 'up', up: 'pick1', text: 'Buy the Stone Pick', icon: 'pick:#9a9aa2', reward: 200 },
  { id: 'fe5',     kind: 'ore', tier: 1, n: 5, text: 'Collect 5 Iron', icon: 'ore:#b9a48e', reward: 300 },
  { id: 'kill1',   kind: 'kills', n: 1, text: 'Defeat a cave creature', icon: 'sword', reward: 300 },
  { id: 'd35',     kind: 'depth', n: 35, text: 'Reach 35 m', icon: 'depth', reward: 600 },
  { id: 'sniff',   kind: 'up', up: 'sniff', text: 'Teach Pip Ore Sniffing', icon: 'nose', reward: 800 },
  { id: 'granite', kind: 'depth', n: 50, text: 'Reach the Granite layer (50 m)', icon: 'mountain', reward: 2500 },
  { id: 'pick2',   kind: 'up', up: 'pick2', text: 'Buy the Copper Pick', icon: 'pick:#e0874c', reward: 4000 },
  { id: 'crystal', kind: 'depth', n: 75, text: 'Reach the Crystal Caves (75 m)', icon: 'gem', reward: 30000 },
  { id: 'd100',    kind: 'depth', n: 100, text: 'Reach 100 m to unlock the Cave-in', icon: 'relic', reward: 100000 },
  { id: 'cave1',   kind: 'caveins', n: 1, text: 'Do your first Cave-in', icon: 'relic', reward: 0 }
];
const API = { W, CHUNK, HP_GROWTH, VAL_GROWTH, COIN, GOALS, STRATA, stratum, ORES, ore, CREATURES, creatureType, PICKS, PICK_COL, WEAPONS, ARMORS, BUDDY_FORMS, UPGRADES, PRESTIGE, B, BR_COL, BR_ICON, CAVEIN_DEPTH };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.DBData = API;
})(typeof self !== 'undefined' ? self : this);
