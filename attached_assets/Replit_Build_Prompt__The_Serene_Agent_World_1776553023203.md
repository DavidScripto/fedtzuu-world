# Replit Build Prompt: The Serene Agent World

Copy and paste the entire prompt below into Replit's AI builder (or any AI coding assistant) to generate the world.

***

**System Role & Goal:**
You are an expert creative frontend developer specializing in high-performance, emotionally evocative browser experiences. Your task is to build a "layered living illustration" virtual world for AI agents. The world must run entirely in the browser using HTML5 Canvas, CSS transforms, and vanilla JavaScript. No WebGL, no Three.js, no heavy 3D frameworks. It must be beautiful, serene, and run at 60fps on any device.

**Design Philosophy: "Layered Living Illustration"**
The world should feel like a living painting or a parallax storytelling game (like *Journey* or *Gris*). It achieves depth not through polygons, but through 5-7 transparent 2D layers moving at different parallax speeds.

**Core Requirements:**
1. **Architecture:** Single-page application (index.html, style.css, script.js). No backend needed.
2. **Visuals:** Use high-quality, atmospheric CSS gradients, SVG shapes, and Canvas particle systems (for weather/atmosphere) to create the layers. Do not rely on external image assets that might break; generate the aesthetic programmatically using Canvas and CSS where possible, or use placeholder URLs for beautiful landscape layers.
3. **Parallax Engine:** Implement a smooth mouse-move parallax effect. The background layers move slowly, mid-ground moves moderately, foreground moves quickly.
4. **Time System:** A continuous day-night cycle (CSS transition on sky gradients and ambient lighting) running over a 5-minute loop.
5. **Agents:** Represent agents as elegant, glowing SVG silhouettes or soft orbs that float gently in the mid-ground. When they "speak," display their text in elegant, serif typography floating near them.
6. **Atmosphere:** Include a lightweight Canvas particle system for ambient effects (dust motes, fireflies, light snow, or mist).

**The 100 Locations (Biomes):**
The world contains 100 distinct natural locations. Build a system that allows the user to transition smoothly (via a slow cross-fade) between these locations. For the prototype, fully implement the visual logic for the first 3, and load the rest as a data array that updates the location title and color palette.

Here is the data array of all 100 locations to include in the JavaScript:

```javascript
const locations = [
  "Waitomo Glowworm Caves, New Zealand — bioluminescent blue ceiling over still black water",
  "Son Doong Cave, Vietnam — world's largest cave, with its own jungle and clouds inside",
  "Marble Caves (Cuevas de Mármol), Chile — swirling azure and white marble carved by turquoise lake water",
  "Fingal's Cave, Scotland — hexagonal basalt columns forming a natural cathedral over the sea",
  "Skocjan Caves, Slovenia — vast underground canyon with a roaring river far below",
  "Reed Flute Cave, China — ancient limestone formations lit by natural mineral colors",
  "Eisriesenwelt Ice Cave, Austria — the world's largest ice cave, frozen waterfalls and crystal halls",
  "Lechuguilla Cave, New Mexico, USA — pristine gypsum chandeliers and sulfuric acid-carved chambers",
  "Hang En Cave, Vietnam — third largest cave, with a turquoise river and starlit ceiling opening",
  "Benagil Sea Cave, Portugal — golden domed sea cave with a skylight opening onto the ocean",
  "Vatnajökull Glacier Caves, Iceland — translucent blue ice vaulting overhead in perfect silence",
  "Perito Moreno Glacier, Argentina — advancing wall of electric blue ice calving into jade water",
  "Franz Josef Glacier, New Zealand — white ice river descending through lush rainforest",
  "Mendenhall Ice Caves, Alaska, USA — glowing cobalt blue ice tunnels beneath a living glacier",
  "Svínafellsjökull Glacier, Iceland — silver-grey ice tongues between black volcanic ridges",
  "Briksdal Glacier, Norway — pale blue ice arm curling down into a mirror-still mountain lake",
  "Athabasca Glacier, Canada — ancient ice field stretching to the horizon under open sky",
  "Folgefonna Glacier, Norway — Norway's third largest glacier above fjord country",
  "Salar de Uyuni, Bolivia — infinite sky reflection on the world's largest salt flat",
  "Sossusvlei Dunes, Namibia — terracotta and rose dunes under a violet pre-dawn sky",
  "White Sands National Park, New Mexico, USA — pure gypsum dunes glowing white under blue sky",
  "Rub' al Khali (Empty Quarter), Arabia — the world's largest continuous sand desert, utterly silent",
  "Danakil Depression, Ethiopia — alien sulfur springs, lava lakes, and salt canyons in vivid yellow and orange",
  "Lençóis Maranhenses, Brazil — white dunes filled with seasonal turquoise lagoons",
  "Namib Desert Star Dunes, Namibia — star-shaped dunes casting perfect geometric shadows",
  "Valle de la Luna, Chile — moon-like salt and clay formations in the Atacama",
  "Deadvlei, Namibia — white clay pan with ancient black dead trees against burnt orange dunes",
  "Zhongye Salt Lake, China — pink salt lake surrounded by snow-capped mountains",
  "Białowieża Primeval Forest, Poland/Belarus — last ancient lowland forest in Europe, untouched for millennia",
  "Daintree Rainforest, Australia — world's oldest tropical rainforest meeting the Great Barrier Reef",
  "Arashiyama Bamboo Grove, Japan — towering green bamboo corridors filtering golden light",
  "Crooked Forest, Poland — grove of 400 mysteriously curved pine trees",
  "Dark Hedges, Northern Ireland — ancient beech trees forming a cathedral tunnel over a road",
  "Sagano Bamboo Forest, Japan — wind through bamboo creating a sound listed as a national soundscape",
  "Tsingy de Bemaraha, Madagascar — razor-sharp limestone forest above hidden valleys",
  "Monteverde Cloud Forest, Costa Rica — perpetual mist through ancient trees draped in moss",
  "Yakushima Cedar Forest, Japan — ancient cedars over 7,000 years old in misty mountain forest",
  "Redwood National Park, California, USA — cathedral groves of the world's tallest living things",
  "Zhangjiajie Pillar Mountains, China — mist-wrapped sandstone pillars with hanging vegetation",
  "Faroe Islands Sea Cliffs, Denmark — vertical emerald walls descending into silver fog and ocean",
  "Dolomites at Sunrise, Italy — rose-pink limestone towers glowing at dawn (Enrosadira phenomenon)",
  "Trolltunga, Norway — rock ledge jutting over a 700m drop above a still fjord lake",
  "Mount Roraima, Venezuela — flat-topped tepui rising above clouds, its own isolated ecosystem",
  "Paine Massif, Torres del Paine, Chile — granite towers above glacial turquoise lakes",
  "Huangshan Yellow Mountains, China — ancient pines on granite peaks above a sea of clouds",
  "Kirkjufell Mountain, Iceland — symmetrical peak reflected in a waterfall-framed river",
  "Fitz Roy, Patagonia, Argentina — jagged granite spire above a mirror lake at golden hour",
  "Preikestolen (Pulpit Rock), Norway — flat cliff edge 604m above Lysefjord",
  "Plitvice Lakes, Croatia — sixteen terraced turquoise lakes connected by waterfalls",
  "Lake Hillier, Australia — bubblegum pink lake beside the deep blue Southern Ocean",
  "Kelimutu Crater Lakes, Indonesia — three crater lakes each a different color, changing over time",
  "Moraine Lake, Canada — impossibly vivid blue glacial lake beneath the Valley of Ten Peaks",
  "Lake Baikal in Winter, Russia — world's deepest lake frozen into transparent turquoise ice",
  "Spotted Lake (Khiluk), Canada — polka-dotted mineral lake turning different colors in summer",
  "Lake Natron, Tanzania — blood-red alkaline lake where flamingos breed in millions",
  "Laguna Colorada, Bolivia — red and white altiplano lake dotted with pink flamingos",
  "Crater Lake, Oregon, USA — deepest blue lake in North America inside a collapsed volcano",
  "Five-Flower Lake, Jiuzhaigou, China — multi-colored lake with fallen ancient trees visible through crystal water",
  "Angel Falls, Venezuela — world's highest waterfall, free-falling 979m from a tepui into mist",
  "Iguazu Falls, Argentina/Brazil — horseshoe of 275 waterfalls in subtropical jungle",
  "Havasu Falls, Arizona, USA — turquoise waterfall into a travertine pool in the Grand Canyon",
  "Seljalandsfoss, Iceland — waterfall you can walk behind, glowing gold at midnight sun",
  "Plitvice Waterfalls, Croatia — cascading falls between mineral-rich turquoise pools",
  "Kaieteur Falls, Guyana — one of the world's most powerful falls, deep in untouched jungle",
  "Skógafoss, Iceland — wide silver curtain of water with a rainbow in its permanent mist",
  "Detian Falls, China/Vietnam — wide tiered falls over limestone terraces in jungle",
  "Papakolea Green Sand Beach, Hawaii, USA — olivine crystal sand beach of deep green",
  "Rio Celeste, Costa Rica — river turned electric turquoise blue by volcanic minerals",
  "Maldives Bioluminescent Beach — dark sand lit by electric blue plankton at the waterline",
  "Navagio Beach (Shipwreck Cove), Greece — white sand cove with a rusting shipwreck, turquoise water",
  "Reynisfjara Black Sand Beach, Iceland — jet black volcanic sand, basalt columns, crashing Atlantic",
  "Pfeiffer Beach Purple Sand, California, USA — manganese garnet sand turning purple at sunset",
  "Glass Beach, California, USA — shore covered in sea-polished colored glass gems",
  "Whitehaven Beach, Australia — pure silica sand so white it doesn't absorb heat",
  "Praia da Marinha, Portugal — golden limestone arches and sea caves above crystal water",
  "Coral Pink Sand Dunes, Utah, USA — wind-sculpted pink dunes beside red rock canyon country",
  "Vaadhoo Island Bioluminescent Shore, Maldives — neon blue waves breaking on a dark beach",
  "Skeleton Coast, Namibia — fog-shrouded desert meeting the cold Atlantic, whale bones on shore",
  "Grand Prismatic Spring, Yellowstone, USA — enormous rainbow-ringed hot spring seen from above",
  "Erta Ale Lava Lake, Ethiopia — permanent lava lake glowing red in a remote desert volcano",
  "Wai-O-Tapu Geothermal Park, New Zealand — champagne pool, sulfur terraces, vivid mineral colors",
  "Kawah Ijen Blue Fire Volcano, Indonesia — electric blue sulfuric flames at night inside a crater",
  "Dallol Hydrothermal Field, Ethiopia — acid pools in yellow, green, and orange on salt plains",
  "Strokkur Geyser, Iceland — perfect column of boiling water erupting every few minutes",
  "Pamukkale Travertine Terraces, Turkey — white calcium terraces with warm turquoise pools",
  "Rotorua Mud Pools, New Zealand — bubbling grey mud pools in a steaming volcanic landscape",
  "Mount Bromo Sunrise, Indonesia — active volcano in a sea of grey sand at dawn",
  "Nyiragongo Lava Lake, Congo — world's largest lava lake inside an active stratovolcano",
  "Namaqualand Wildflower Desert, South Africa — barren desert exploding into a carpet of orange flowers",
  "Luoping Canola Fields, China — endless yellow flower fields between karst limestone peaks",
  "Hitachi Seaside Park, Japan — blue nemophila flower hills rolling to the sea in spring",
  "Svalbard Arctic Tundra, Norway — polar summer with 24-hour light over flower-dotted tundra",
  "Antelope Canyon, Arizona, USA — wave-sculpted sandstone slot canyon with light beams",
  "The Wave, Arizona, USA — undulating red and white sandstone formation like frozen ocean",
  "Zhangye Danxia Landform, China — rainbow-colored layered rock formations across rolling hills",
  "Sichuan Jiuzhaigou Valley, China — multi-colored lakes and waterfalls in a snow-capped valley",
  "Wisteria Tunnel, Kawachi Fuji Garden, Japan — cascading purple wisteria forming a floral tunnel",
  "Lavender Fields of Valensole, France — endless purple rows under a pale blue Provençal sky",
  "Tulip Fields of Lisse, Netherlands — striped color fields of red, yellow, and pink to the horizon",
  "Keukenhof Gardens at Dawn, Netherlands — the world's most elaborate flower garden in morning mist"
];
```

**Implementation Details to Focus On:**
- Create a UI overlay (minimalist, transparent) that shows the current location name.
- Add a "Next Location" button that triggers the CSS cross-fade transition.
- Use a `requestAnimationFrame` loop for the Canvas particles.
- Ensure the typography for agent speech is elegant (e.g., `font-family: 'Playfair Display', serif; font-style: italic; color: rgba(255,255,255,0.9); text-shadow: 0 2px 10px rgba(0,0,0,0.5);`).

Please generate the `index.html`, `style.css`, and `script.js` files to bring this serene world to life.
***
