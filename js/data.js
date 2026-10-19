/** Item, skill, quest, and recipe definitions for The Pilgrim's Way */

export const RARITY = { common:1, uncommon:2, rare:3, epic:4, legendary:5, blessed:6 };

export const ITEMS = {
  // Materials
  wood:{id:'wood',name:'Wood',cat:'mat',ico:'🪵',r:'common',desc:'Rough branch from the forest.'},
  oak_wood:{id:'oak_wood',name:'Oak Wood',cat:'mat',ico:'🪵',r:'uncommon',desc:'Sturdy oak timber.'},
  stone:{id:'stone',name:'Stone',cat:'mat',ico:'🪨',r:'common',desc:'Loose stone for tools.'},
  iron_ore:{id:'iron_ore',name:'Iron Ore',cat:'mat',ico:'⚙️',r:'uncommon',desc:'Raw iron from hills.'},
  iron_ingot:{id:'iron_ingot',name:'Iron Ingot',cat:'mat',ico:'🔩',r:'rare',desc:'Smelted at a forge.'},
  cloth:{id:'cloth',name:'Cloth',cat:'mat',ico:'🧵',r:'common',desc:'Woven fabric scrap.'},
  fine_cloth:{id:'fine_cloth',name:'Fine Cloth',cat:'mat',ico:'🧵',r:'uncommon',desc:'Better weave for cloaks.'},
  wax:{id:'wax',name:'Wax',cat:'mat',ico:'🕯️',r:'common',desc:'Beeswax for candles.'},
  herb:{id:'herb',name:'Herb',cat:'mat',ico:'🌿',r:'common',desc:'Healing roadside plant.'},
  berry:{id:'berry',name:'Berries',cat:'mat',ico:'🫐',r:'common',desc:'Wild berries. Restores a little hunger.'},
  fish:{id:'fish',name:'Fish',cat:'mat',ico:'🐟',r:'common',desc:'Fresh river fish.'},
  meat:{id:'meat',name:'Raw Meat',cat:'mat',ico:'🥩',r:'common',desc:'Needs cooking.'},
  leather:{id:'leather',name:'Leather',cat:'mat',ico:'🟤',r:'uncommon',desc:'Tanned hide.'},
  silver_coin:{id:'silver_coin',name:'Silver Coin',cat:'mat',ico:'🪙',r:'rare',desc:'Church offering metal.'},
  holy_water:{id:'holy_water',name:'Holy Water',cat:'consumable',ico:'💧',r:'uncommon',desc:'Blessed water. Casts out shadows.',use:'holy'},
  salt:{id:'salt',name:'Blessed Salt',cat:'mat',ico:'🧂',r:'uncommon',desc:'For rites and cooking.'},

  // Consumables
  bread:{id:'bread',name:'Bread',cat:'consumable',ico:'🍞',r:'common',desc:'Simple loaf. +25 hunger.',use:'food',hunger:25},
  cooked_meat:{id:'cooked_meat',name:'Cooked Meat',cat:'consumable',ico:'🍖',r:'common',desc:'+40 hunger, +10 HP.',use:'food',hunger:40,hp:10},
  cooked_fish:{id:'cooked_fish',name:'Cooked Fish',cat:'consumable',ico:'🍣',r:'common',desc:'+35 hunger.',use:'food',hunger:35},
  berry_pie:{id:'berry_pie',name:'Berry Pie',cat:'consumable',ico:'🥧',r:'uncommon',desc:'+50 hunger, +5 faith.',use:'food',hunger:50,faith:5},
  bandage:{id:'bandage',name:'Bandage',cat:'consumable',ico:'🩹',r:'common',desc:'+30 HP.',use:'heal',hp:30},
  herb_poultice:{id:'herb_poultice',name:'Herb Poultice',cat:'consumable',ico:'🪴',r:'uncommon',desc:'+55 HP.',use:'heal',hp:55},
  candle:{id:'candle',name:'Candle',cat:'consumable',ico:'🕯️',r:'common',desc:'Light a shrine candle.',use:'candle'},
  wine:{id:'wine',name:'Pilgrim Wine',cat:'consumable',ico:'🍷',r:'uncommon',desc:'+20 hunger, +15 faith.',use:'food',hunger:20,faith:15},
  stew:{id:'stew',name:'Hearty Stew',cat:'consumable',ico:'🍲',r:'uncommon',desc:'+60 hunger, +15 HP.',use:'food',hunger:60,hp:15},
  dried_rations:{id:'dried_rations',name:'Dried Rations',cat:'consumable',ico:'📦',r:'common',desc:'+20 hunger. Travels well.',use:'food',hunger:20},
  blessing_scroll:{id:'blessing_scroll',name:'Blessing Scroll',cat:'consumable',ico:'📜',r:'rare',desc:'+25 faith instantly.',use:'faith',faith:25},
  angelus_bell:{id:'angelus_bell',name:'Angelus Bell',cat:'consumable',ico:'🔔',r:'epic',desc:'Briefly repels demons nearby.',use:'bell'},

  // Staffs / weapons
  stick:{id:'stick',name:'Walking Stick',cat:'weapon',slot:'weapon',ico:'🪵',r:'common',atk:4,desc:'A humble staff.'},
  wood_staff:{id:'wood_staff',name:'Wood Staff',cat:'weapon',slot:'weapon',ico:'🏒',r:'common',atk:8,desc:'Carved pilgrim staff.'},
  oak_staff:{id:'oak_staff',name:'Oak Staff',cat:'weapon',slot:'weapon',ico:'🏒',r:'uncommon',atk:14,desc:'Solid oak.'},
  iron_staff:{id:'iron_staff',name:'Iron-shod Staff',cat:'weapon',slot:'weapon',ico:'🏒',r:'rare',atk:22,desc:'Iron tip and ferrule.'},
  blessed_staff:{id:'blessed_staff',name:'Blessed Staff',cat:'weapon',slot:'weapon',ico:'✝️',r:'blessed',atk:30,faithBonus:5,desc:'Blessed for the road.'},
  pilgrim_crook:{id:'pilgrim_crook',name:'Pilgrim Crook',cat:'weapon',slot:'weapon',ico:'🪄',r:'epic',atk:36,faithBonus:8,desc:'Shepherd crook of the Way.'},
  st_james_staff:{id:'st_james_staff',name:"St James' Staff",cat:'weapon',slot:'weapon',ico:'✨',r:'legendary',atk:45,faithBonus:12,desc:'Said to walk with Santiago.'},
  wood_knife:{id:'wood_knife',name:'Wood Knife',cat:'weapon',slot:'weapon',ico:'🔪',r:'common',atk:6,desc:'Simple carving knife.'},
  iron_sword:{id:'iron_sword',name:'Iron Shortsword',cat:'weapon',slot:'weapon',ico:'⚔️',r:'rare',atk:26,desc:'Blacksmith work.'},
  silver_blade:{id:'silver_blade',name:'Silver Blade',cat:'weapon',slot:'weapon',ico:'🗡️',r:'epic',atk:34,demonBonus:15,desc:'Effective against shadows.'},

  // Hats
  cloth_hat:{id:'cloth_hat',name:'Cloth Cap',cat:'armour',slot:'hat',ico:'🧢',r:'common',def:2,desc:'Keeps sun off.'},
  pilgrim_hat:{id:'pilgrim_hat',name:'Pilgrim Hat',cat:'armour',slot:'hat',ico:'🎩',r:'uncommon',def:5,desc:'Wide brim with scallop.'},
  leather_hat:{id:'leather_hat',name:'Leather Hat',cat:'armour',slot:'hat',ico:'👒',r:'rare',def:9,desc:'Tough travel hat.'},
  blessed_hat:{id:'blessed_hat',name:'Blessed Hat',cat:'armour',slot:'hat',ico:'👒',r:'blessed',def:14,faithBonus:3,desc:'Shell and blessing.'},

  // Cloaks
  rag_cloak:{id:'rag_cloak',name:'Rag Cloak',cat:'armour',slot:'cloak',ico:'🧥',r:'common',def:3,desc:'Worn travelling cloak.'},
  wool_cloak:{id:'wool_cloak',name:'Wool Cloak',cat:'armour',slot:'cloak',ico:'🧥',r:'uncommon',def:7,desc:'Warm wool.'},
  pilgrim_cloak:{id:'pilgrim_cloak',name:'Pilgrim Cloak',cat:'armour',slot:'cloak',ico:'🧥',r:'rare',def:12,desc:'Marked with the Way.'},
  blessed_cloak:{id:'blessed_cloak',name:'Blessed Cloak',cat:'armour',slot:'cloak',ico:'🧥',r:'blessed',def:18,faithBonus:5,desc:'Cloak of protection.'},
  st_michael_cloak:{id:'st_michael_cloak',name:"St Michael's Cloak",cat:'armour',slot:'cloak',ico:'🛡️',r:'legendary',def:25,faithBonus:10,desc:'Guard against evil.'},

  // Tunics / body
  tunic:{id:'tunic',name:'Simple Tunic',cat:'armour',slot:'body',ico:'👕',r:'common',def:4,desc:'Plain pilgrim tunic.'},
  padded_tunic:{id:'padded_tunic',name:'Padded Tunic',cat:'armour',slot:'body',ico:'👕',r:'uncommon',def:8,desc:'Quilted for travel.'},
  leather_jerkin:{id:'leather_jerkin',name:'Leather Jerkin',cat:'armour',slot:'body',ico:'🥋',r:'rare',def:14,desc:'Hard leather.'},
  chain_shirt:{id:'chain_shirt',name:'Chain Shirt',cat:'armour',slot:'body',ico:'🦺',r:'epic',def:20,desc:'Light mail.'},
  blessed_habit:{id:'blessed_habit',name:'Blessed Habit',cat:'armour',slot:'body',ico:'👔',r:'blessed',def:24,faithBonus:6,desc:'Monastic cut, blessed.'},

  // Boots
  sandals:{id:'sandals',name:'Sandals',cat:'armour',slot:'boots',ico:'🩴',r:'common',def:1,speed:0,desc:'Simple straps.'},
  leather_boots:{id:'leather_boots',name:'Leather Boots',cat:'armour',slot:'boots',ico:'👢',r:'uncommon',def:4,speed:0.05,desc:'Sturdy soles.'},
  hiking_boots:{id:'hiking_boots',name:'Hiking Boots',cat:'armour',slot:'boots',ico:'🥾',r:'rare',def:7,speed:0.1,desc:'For long roads.'},
  blessed_boots:{id:'blessed_boots',name:'Blessed Boots',cat:'armour',slot:'boots',ico:'🥾',r:'blessed',def:11,speed:0.15,desc:'Miles feel lighter.'},

  // Trinkets
  wooden_rosary:{id:'wooden_rosary',name:'Wooden Rosary',cat:'trinket',slot:'trinket',ico:'📿',r:'common',faithBonus:3,desc:'Simple beads.'},
  olive_rosary:{id:'olive_rosary',name:'Olive Rosary',cat:'trinket',slot:'trinket',ico:'📿',r:'uncommon',faithBonus:6,desc:'From olive wood.'},
  silver_rosary:{id:'silver_rosary',name:'Silver Rosary',cat:'trinket',slot:'trinket',ico:'📿',r:'rare',faithBonus:10,def:2,desc:'Fine silver beads.'},
  st_benedict_medal:{id:'st_benedict_medal',name:'St Benedict Medal',cat:'trinket',slot:'trinket',ico:'🏅',r:'rare',faithBonus:8,demonBonus:10,desc:'Against evil.'},
  miraculous_medal:{id:'miraculous_medal',name:'Miraculous Medal',cat:'trinket',slot:'trinket',ico:'🏅',r:'epic',faithBonus:12,hpBonus:15,desc:'Mary, conceived without sin.'},
  brown_scapular:{id:'brown_scapular',name:'Brown Scapular',cat:'trinket',slot:'trinket',ico:'🎗️',r:'uncommon',faithBonus:5,def:3,desc:'Our Lady of Mount Carmel.'},
  scallop_shell:{id:'scallop_shell',name:'Scallop Shell',cat:'trinket',slot:'trinket',ico:'🐚',r:'common',faithBonus:2,desc:'Sign of the Camino.'},
  pilgrim_passport:{id:'pilgrim_passport',name:'Pilgrim Passport',cat:'trinket',slot:'trinket',ico:'📘',r:'uncommon',xpBonus:0.05,desc:'Credencial del peregrino.'},
  st_christopher:{id:'st_christopher',name:'St Christopher Medal',cat:'trinket',slot:'trinket',ico:'🏅',r:'rare',speed:0.08,def:2,desc:'Patron of travellers.'},
  crucifix:{id:'crucifix',name:'Wooden Crucifix',cat:'trinket',slot:'trinket',ico:'✝️',r:'uncommon',faithBonus:7,desc:'Worn close to heart.'},
  relic_fragment:{id:'relic_fragment',name:'Relic Fragment',cat:'trinket',slot:'trinket',ico:'💎',r:'legendary',faithBonus:15,hpBonus:20,desc:'Treasured fragment.'},

  // Tools
  hatchet:{id:'hatchet',name:'Hatchet',cat:'tool',ico:'🪓',r:'uncommon',desc:'Chop wood faster.',gather:'wood',bonus:1},
  pickaxe:{id:'pickaxe',name:'Pickaxe',cat:'tool',ico:'⛏️',r:'uncommon',desc:'Mine stone and ore.',gather:'stone',bonus:1},
  fishing_rod:{id:'fishing_rod',name:'Fishing Rod',cat:'tool',ico:'🎣',r:'uncommon',desc:'Fish at the river.',gather:'fish',bonus:1},
  sickle:{id:'sickle',name:'Sickle',cat:'tool',ico:'🔪',r:'uncommon',desc:'Gather herbs better.',gather:'herb',bonus:1},
  lantern:{id:'lantern',name:'Lantern',cat:'tool',ico:'🏮',r:'rare',desc:'See better at night.'},

  // Bag upgrades
  small_sack:{id:'small_sack',name:'Small Sack',cat:'bag',ico:'👜',r:'common',slots:5,desc:'+5 inventory slots.'},
  travel_pack:{id:'travel_pack',name:'Travel Pack',cat:'bag',ico:'🎒',r:'uncommon',slots:10,desc:'+10 inventory slots.'},
  large_pack:{id:'large_pack',name:'Large Pack',cat:'bag',ico:'🧳',r:'rare',slots:18,desc:'+18 inventory slots.'},
  mule_saddlebag:{id:'mule_saddlebag',name:'Mule Saddlebag',cat:'bag',ico:'🧳',r:'epic',slots:28,desc:'+28 inventory slots.'},

  // Misc / quest
  lost_letter:{id:'lost_letter',name:'Lost Letter',cat:'quest',ico:'✉️',r:'common',desc:'A letter for delivery.'},
  chapel_key:{id:'chapel_key',name:'Chapel Key',cat:'quest',ico:'🔑',r:'uncommon',desc:'Opens the ruined chapel chest.'},
  bandit_token:{id:'bandit_token',name:'Bandit Token',cat:'quest',ico:'☠️',r:'uncommon',desc:'Proof of cleared camp.'},
  shrine_oil:{id:'shrine_oil',name:'Shrine Oil',cat:'consumable',ico:'🫙',r:'uncommon',desc:'For lighting shrines.',use:'oil'},
};

export const SKILLS = [
  {id:'endurance',name:'Endurance',max:5,desc:'+8 max stamina per rank.',cost:1},
  {id:'walker',name:'Walker',max:5,desc:'+4% move speed per rank.',cost:1},
  {id:'forager',name:'Forager',max:5,desc:'+10% gather yield per rank.',cost:1},
  {id:'haggler',name:'Haggler',max:5,desc:'-5% shop prices per rank.',cost:1},
  {id:'swordless',name:'Swordless Defence',max:5,desc:'+6% block reduction per rank.',cost:1},
  {id:'st_michael',name:"St Michael's Guard",max:5,desc:'+8% damage vs demons per rank.',cost:2},
  {id:'healing_prayer',name:'Healing Prayer',max:5,desc:'Pray restores +8 HP per rank.',cost:2},
  {id:'iron_will',name:'Iron Will',max:5,desc:'+10 max HP per rank.',cost:1},
  {id:'deep_faith',name:'Deep Faith',max:5,desc:'+8 max Faith per rank.',cost:1},
  {id:'quiet_step',name:'Quiet Step',max:3,desc:'Enemies notice you later.',cost:2},
  {id:'cook',name:'Camp Cook',max:3,desc:'Cooked food restores +10% more.',cost:1},
  {id:'herbalist',name:'Herbalist',max:3,desc:'Bandages and poultices +15% heal.',cost:1},
  {id:'night_watch',name:'Night Watch',max:3,desc:'Less hunger drain at night.',cost:1},
  {id:'pilgrim_song',name:'Pilgrim Song',max:3,desc:'Faith regen while walking.',cost:2},
  {id:'steady_hand',name:'Steady Hand',max:5,desc:'+5% melee damage per rank.',cost:1},
  {id:'scallop_luck',name:'Scallop Luck',max:3,desc:'+8% coin finds per rank.',cost:2},
  {id:'shrine_keeper',name:'Shrine Keeper',max:3,desc:'Shrines restore more HP/Faith.',cost:1},
  {id:'pack_mule',name:'Pack Mule',max:3,desc:'+4 inventory slots per rank.',cost:1},
  {id:'exorcist',name:'Exorcist',max:5,desc:'Holy water and prayers stronger.',cost:2},
  {id:'martyr',name:'Martyr\'s Resolve',max:3,desc:'Survive fatal blow once per shrine rest (rank scales cooldown).',cost:3},
  {id:'almsgiver',name:'Almsgiver',max:3,desc:'Deliveries and poor quests give +15% XP.',cost:1},
  {id:'cartographer',name:'Cartographer',max:3,desc:'Minimap reveals more.',cost:1},
];

export const RECIPES = [
  {id:'r_wood_staff',out:'wood_staff',n:1,at:['bench'],need:{wood:5,stick:1}},
  {id:'r_oak_staff',out:'oak_staff',n:1,at:['bench'],need:{oak_wood:6,wood_staff:1}},
  {id:'r_iron_staff',out:'iron_staff',n:1,at:['bench','forge'],need:{iron_ingot:3,oak_staff:1}},
  {id:'r_stick',out:'stick',n:1,at:['bench','hand'],need:{wood:2}},
  {id:'r_wood_knife',out:'wood_knife',n:1,at:['bench'],need:{wood:3,stone:1}},
  {id:'r_bandage',out:'bandage',n:2,at:['hand','bench'],need:{cloth:2,herb:1}},
  {id:'r_poultice',out:'herb_poultice',n:1,at:['bench'],need:{herb:3,cloth:1,wax:1}},
  {id:'r_candle',out:'candle',n:3,at:['hand','bench'],need:{wax:2,cloth:1}},
  {id:'r_cooked_meat',out:'cooked_meat',n:1,at:['campfire'],need:{meat:1}},
  {id:'r_cooked_fish',out:'cooked_fish',n:1,at:['campfire'],need:{fish:1}},
  {id:'r_stew',out:'stew',n:1,at:['campfire'],need:{meat:1,herb:2,berry:2}},
  {id:'r_berry_pie',out:'berry_pie',n:1,at:['campfire'],need:{berry:5,wax:1}},
  {id:'r_cloth_hat',out:'cloth_hat',n:1,at:['bench'],need:{cloth:3}},
  {id:'r_rag_cloak',out:'rag_cloak',n:1,at:['bench'],need:{cloth:4}},
  {id:'r_tunic',out:'tunic',n:1,at:['bench'],need:{cloth:5}},
  {id:'r_sandals',out:'sandals',n:1,at:['bench'],need:{leather:1,cloth:1}},
  {id:'r_leather_boots',out:'leather_boots',n:1,at:['bench'],need:{leather:3,cloth:1}},
  {id:'r_wool_cloak',out:'wool_cloak',n:1,at:['bench'],need:{fine_cloth:3,cloth:2}},
  {id:'r_padded',out:'padded_tunic',n:1,at:['bench'],need:{cloth:6,leather:2}},
  {id:'r_hatchet',out:'hatchet',n:1,at:['bench'],need:{wood:3,stone:2}},
  {id:'r_pickaxe',out:'pickaxe',n:1,at:['bench'],need:{wood:3,stone:3,iron_ore:1}},
  {id:'r_rod',out:'fishing_rod',n:1,at:['bench'],need:{wood:4,cloth:2}},
  {id:'r_sickle',out:'sickle',n:1,at:['bench'],need:{wood:2,iron_ore:1}},
  {id:'r_ingot',out:'iron_ingot',n:1,at:['forge'],need:{iron_ore:3,wood:2}},
  {id:'r_holy',out:'holy_water',n:2,at:['church'],need:{wax:1,salt:1}},
  {id:'r_rosary',out:'wooden_rosary',n:1,at:['bench','church'],need:{wood:4,wax:1}},
  {id:'r_shell',out:'scallop_shell',n:1,at:['hand'],need:{stone:1}}, // placeholder gather mostly
  {id:'r_small_sack',out:'small_sack',n:1,at:['bench'],need:{cloth:6}},
  {id:'r_travel_pack',out:'travel_pack',n:1,at:['bench'],need:{cloth:8,leather:3}},
  {id:'r_bread',out:'bread',n:2,at:['campfire'],need:{berry:2,herb:1}},
  {id:'r_leather_hat',out:'leather_hat',n:1,at:['bench'],need:{leather:3,cloth:1}},
  {id:'r_jerkin',out:'leather_jerkin',n:1,at:['bench'],need:{leather:5,cloth:2}},
  {id:'r_pilgrim_hat',out:'pilgrim_hat',n:1,at:['bench'],need:{cloth:4,leather:1,scallop_shell:1}},
];

export const MAIN_QUEST = [
  {id:'mq1',name:'First Steps',desc:'Visit the village shrine and rest.',obj:'visit_shrine',target:'shrine_start',xp:40,coin:10},
  {id:'mq2',name:'Staff of the Way',desc:'Craft or obtain a Wood Staff.',obj:'have_item',item:'wood_staff',xp:50,coin:15},
  {id:'mq3',name:'Roadside Charity',desc:'Deliver bread to the poor near the village.',obj:'deliver',npc:'poor_1',item:'bread',xp:60,coin:20},
  {id:'mq4',name:'Through the Woods',desc:'Reach the forest shrine (north-east).',obj:'visit_shrine',target:'shrine_forest',xp:80,coin:25},
  {id:'mq5',name:'Bandit Trouble',desc:'Clear the bandit camp and take a token.',obj:'have_item',item:'bandit_token',xp:120,coin:50},
  {id:'mq6',name:'Ruined Chapel',desc:'Find the chapel key and open the chest.',obj:'visit',target:'chapel_chest',xp:100,coin:40},
  {id:'mq7',name:'Town of Faith',desc:'Enter Santiago town and speak to the priest.',obj:'talk',npc:'priest',xp:90,coin:30},
  {id:'mq8',name:'Light the Shrines',desc:'Light candles at 3 shrines.',obj:'light_shrines',count:3,xp:110,coin:45},
  {id:'mq9',name:'Night Vigil',desc:'Survive until dawn after accepting (cast out 3 demons).',obj:'kill',enemy:'demon',count:3,xp:150,coin:60},
  {id:'mq10',name:'The Cathedral',desc:'Reach Santiago Cathedral and pray.',obj:'visit',target:'cathedral',xp:200,coin:100},
  {id:'mq11',name:'Compostela',desc:'Offer a prayer at the high altar (pray at cathedral).',obj:'pray_cathedral',xp:250,coin:150},
];

export const SIDE_TEMPLATES = [
  {id:'hunt_wolf',name:'Wolf Bounty',desc:'Hunt {n} wolves.',obj:'kill',enemy:'wolf',n:[3,8],xp:40,coin:20,minLvl:1},
  {id:'hunt_boar',name:'Boar Hunt',desc:'Hunt {n} boars.',obj:'kill',enemy:'boar',n:[2,6],xp:45,coin:25,minLvl:2},
  {id:'hunt_bandit',name:'Bandit Bounty',desc:'Defeat {n} bandits.',obj:'kill',enemy:'bandit',n:[2,6],xp:60,coin:40,minLvl:4},
  {id:'gather_herb',name:'Herbal Request',desc:'Gather {n} herbs.',obj:'gather',item:'herb',n:[5,15],xp:30,coin:15,minLvl:1},
  {id:'gather_wood',name:'Timber Needed',desc:'Bring {n} wood to the notice board.',obj:'gather',item:'wood',n:[8,20],xp:35,coin:18,minLvl:1},
  {id:'gather_berry',name:'Berry Picking',desc:'Collect {n} berries.',obj:'gather',item:'berry',n:[6,16],xp:28,coin:12,minLvl:1},
  {id:'fish_request',name:'River Fish',desc:'Catch {n} fish.',obj:'gather',item:'fish',n:[3,8],xp:40,coin:22,minLvl:2},
  {id:'deliver_bread',name:'Bread for the Poor',desc:'Deliver bread to a beggar.',obj:'deliver',item:'bread',xp:35,coin:10,minLvl:1},
  {id:'light_shrine',name:'Light a Shrine',desc:'Light a candle at any shrine.',obj:'light_one',xp:40,coin:15,minLvl:1},
  {id:'clear_camp',name:'Clear Bandit Camp',desc:'Defeat the camp leader.',obj:'kill',enemy:'bandit_chief',n:[1,1],xp:100,coin:70,minLvl:5},
  {id:'find_pilgrim',name:'Lost Pilgrim',desc:'Find the lost pilgrim in the hills.',obj:'rescue',xp:80,coin:40,minLvl:3},
  {id:'demon_ruin',name:'Cast Out Shadows',desc:'Cast out {n} demons at the ruin.',obj:'kill',enemy:'demon',n:[2,5],xp:90,coin:50,minLvl:6},
  {id:'escort',name:'Escort to Town',desc:'Walk with a pilgrim to town gates.',obj:'escort',xp:70,coin:35,minLvl:3},
  {id:'ore_run',name:'Iron for the Smith',desc:'Deliver {n} iron ore.',obj:'gather',item:'iron_ore',n:[3,8],xp:55,coin:30,minLvl:4},
  {id:'wax_candles',name:'Candles for Church',desc:'Craft and deliver {n} candles.',obj:'gather',item:'candle',n:[4,10],xp:45,coin:25,minLvl:2},
];

export const SHOPS = {
  merchant:{name:'Merchant',stock:[
    {id:'bread',price:8},{id:'dried_rations',price:12},{id:'cloth',price:6},{id:'wax',price:5},
    {id:'berry',price:3},{id:'small_sack',price:40},{id:'travel_pack',price:120},{id:'lantern',price:80},
    {id:'wine',price:25},{id:'salt',price:10},
  ]},
  blacksmith:{name:'Blacksmith',stock:[
    {id:'hatchet',price:35},{id:'pickaxe',price:40},{id:'iron_ore',price:15},{id:'iron_ingot',price:45},
    {id:'iron_sword',price:180},{id:'iron_staff',price:220},{id:'chain_shirt',price:300},
    {id:'wood_knife',price:20},{id:'silver_blade',price:450},
  ]},
  tailor:{name:'Tailor',stock:[
    {id:'cloth',price:5},{id:'fine_cloth',price:18},{id:'cloth_hat',price:25},{id:'pilgrim_hat',price:70},
    {id:'rag_cloak',price:30},{id:'wool_cloak',price:90},{id:'pilgrim_cloak',price:160},
    {id:'tunic',price:40},{id:'padded_tunic',price:100},{id:'leather_boots',price:60},
    {id:'hiking_boots',price:140},
  ]},
  apothecary:{name:'Apothecary',stock:[
    {id:'herb',price:4},{id:'bandage',price:15},{id:'herb_poultice',price:35},{id:'berry',price:3},
    {id:'wine',price:22},{id:'blessing_scroll',price:60},{id:'shrine_oil',price:20},
  ]},
  church:{name:'Church Shop',stock:[
    {id:'holy_water',price:30},{id:'candle',price:8},{id:'wooden_rosary',price:40},
    {id:'olive_rosary',price:90},{id:'brown_scapular',price:70},{id:'st_benedict_medal',price:150},
    {id:'miraculous_medal',price:280},{id:'crucifix',price:55},{id:'scallop_shell',price:15},
    {id:'blessed_staff',price:400},{id:'angelus_bell',price:200},
  ]},
};

export const ENEMY_TYPES = {
  wolf:{name:'Wolf',hp:40,atk:8,speed:3.2,xp:18,coin:3,color:0x555555,scale:0.9,drop:{meat:0.7,leather:0.3}},
  boar:{name:'Boar',hp:55,atk:10,speed:2.6,xp:22,coin:4,color:0x6b4423,scale:1.0,drop:{meat:0.8,leather:0.4}},
  bandit:{name:'Bandit',hp:70,atk:12,speed:2.8,xp:30,coin:12,color:0x4a3020,scale:1.0,drop:{cloth:0.4,iron_ore:0.15}},
  bandit_chief:{name:'Bandit Chief',hp:140,atk:18,speed:2.5,xp:80,coin:40,color:0x3a2010,scale:1.15,drop:{bandit_token:1,iron_ingot:0.5}},
  demon:{name:'Shadow',hp:60,atk:14,speed:3.0,xp:40,coin:8,color:0x1a0a2a,scale:1.05,holyOnly:true,drop:{wax:0.3,salt:0.2}},
};

/** World landmarks (x,z) on 600x600 centered at 0 */
export const LANDMARKS = {
  start:{x:0,z:40,label:'Start Village'},
  shrine_start:{x:8,z:28,label:'Village Shrine'},
  shrine_forest:{x:140,z:-120,label:'Forest Shrine'},
  shrine_river:{x:-100,z:80,label:'River Shrine'},
  shrine_hill:{x:-160,z:-160,label:'Hill Shrine'},
  shrine_town:{x:200,z:180,label:'Town Shrine'},
  forest:{x:120,z:-100,label:'Wolf Woods'},
  river:{x:-80,z:60,label:'River'},
  hills:{x:-150,z:-140,label:'Hills'},
  bandit_camp:{x:-180,z:40,label:'Bandit Camp'},
  chapel:{x:60,z:-200,label:'Ruined Chapel'},
  chapel_chest:{x:62,z:-198,label:'Chapel Chest'},
  town:{x:200,z:200,label:'Santiago Town'},
  cathedral:{x:210,z:210,label:'Cathedral'},
  market:{x:190,z:195,label:'Market'},
  notice:{x:5,z:35,label:'Notice Board'},
  region2:{x:0,z:-290,label:'Region 2'},
  lost_pilgrim:{x:-120,z:-220,label:'Lost Pilgrim'},
};

export function itemCount(){return Object.keys(ITEMS).length}
export function skillCount(){return SKILLS.length}
