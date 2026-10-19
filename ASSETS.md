# Third-party assets

Every file is stored in this repo under `assets/` or `vendor/`. Nothing is loaded from another site. The models were repacked with gltf-transform: skeletons merged, meshes simplified, textures converted to WebP, and geometry meshopt-compressed.

| File | Contents | Author / source | Licence |
|---|---|---|---|
| assets/human_m.glb, assets/human_f.glb | Universal Base Characters + Modular Character Outfits – Fantasy (peasant and ranger outfits, hair) | Quaternius, https://quaternius.itch.io/universal-base-characters, https://quaternius.itch.io/modular-character-outfits-fantasy | CC0 1.0 |
| assets/anims.glb | Universal Animation Library 1 & 2 (idle, walk, jog, sprint, sword combo, block, roll, hit, death, pray, gather…) | Quaternius, https://quaternius.itch.io/universal-animation-library, https://quaternius.itch.io/universal-animation-library-2 | CC0 1.0 |
| assets/village.glb | Medieval Village MegaKit (walls, roofs, props) | Quaternius, https://quaternius.itch.io/medieval-village-megakit | CC0 1.0 |
| assets/nature.glb | Stylized Nature MegaKit (trees, rocks, grass, flowers) | Quaternius, https://quaternius.itch.io/stylized-nature-megakit | CC0 1.0 |
| assets/wolf.glb | Wolf (animated) | Quaternius, https://poly.pizza/m/P1gU3Qkr9r | CC0 1.0 |
| assets/cow.glb | Cow | Quaternius, https://poly.pizza/m/26zM1outCr | CC0 1.0 |
| assets/boar.glb | Animated Pig (Idle, Walk, Run, Headbutt, Eat, Death), recoloured dark brown and given tusks and a mane in code to play the wild boar | Quaternius, https://poly.pizza/m/u35l6uP5vj | CC0 1.0 |
| assets/props.glb (lazy-loaded with interiors) | Fantasy Props MegaKit furniture (beds, benches, tables, chairs, shelves, candlesticks, barrels, crates…) plus a few Medieval Village MegaKit interior pieces | Quaternius, https://quaternius.itch.io/fantasy-props-megakit, https://quaternius.itch.io/medieval-village-megakit | CC0 1.0 |
| assets/tex/foliage.webp | Foliage card atlas (grass, wildflowers, ferns, nettles, hedgerow shrubs) baked offline with tools/bake_foliage.* from plant scans grass_medium_01/02, dandelion_01, celandine_01, periwinkle_plant, fern_02, nettle_plant, weed_plant_02, shrub_01/02/03/04, shrub_sorrel_01 | Poly Haven, https://polyhaven.com/models | CC0 |
| assets/tex/drystone_* | stacked_stone_wall (field walls) | Poly Haven, https://polyhaven.com/a/stacked_stone_wall | CC0 |
| assets/tex/sandstone_* (lazy) | large_sandstone_blocks (church and cathedral walls and vaults) | Poly Haven, https://polyhaven.com/a/large_sandstone_blocks | CC0 |
| assets/tex/monfloor_* (lazy) | monastery_stone_floor | Poly Haven, https://polyhaven.com/a/monastery_stone_floor | CC0 |
| assets/tex/woodfloor_* (lazy) | old_wood_floor (floors, pews, furniture timber) | Poly Haven, https://polyhaven.com/a/old_wood_floor | CC0 |
| assets/tex/grass_* | sparse_grass | Poly Haven, https://polyhaven.com/a/sparse_grass | CC0 |
| assets/tex/path_* | rocky_trail | Poly Haven, https://polyhaven.com/a/rocky_trail | CC0 |
| assets/tex/rock_* | rocky_terrain_02 | Poly Haven, https://polyhaven.com/a/rocky_terrain_02 | CC0 |
| assets/tex/cobble_* | cobblestone_floor_04 | Poly Haven, https://polyhaven.com/a/cobblestone_floor_04 | CC0 |
| assets/tex/forest_* | forrest_ground_01 | Poly Haven, https://polyhaven.com/a/forrest_ground_01 | CC0 |
| assets/env/sky_1k.hdr | kloofendal_48d_partly_cloudy_puresky (environment lighting) | Poly Haven, https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | CC0 |
| vendor/three.module.min.js, vendor/addons/* | three.js r170 | https://threejs.org | MIT |

Procedural content written for v4 (no third-party files): stained-glass windows, the crucifix corpus pose, the Marian and St James statues, candles and flames, light shafts, chimney smoke, birds, tree impostors and wind sway.

All audio is generated in the browser with WebAudio. There are no audio files.
