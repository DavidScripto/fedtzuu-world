/**
 * Fed Tzuu — House Building via ZEWO Creative Triad
 *
 * Each house is built by a ZEWO group — three role types that always work together:
 *
 *   KÖRMI(s) — sovereign spark-originators, each holding a distinct possibility thread.
 *              They communicate only in thought, never externalized directly.
 *              Two KÖRMIs work per house: one threads the exterior form,
 *              one threads the interior soul.
 *
 *   FYLÖR    — harmonic vocalizer, receives all KÖRMI thought-threads and binds them
 *              into a flowing TNP verse that speaks the house into pre-existence.
 *              The verse is the house's inscription — its name in the world.
 *
 *   MÄQUI    — careful manifestor, reads the FYLÖR's verse and both KÖRMI thoughts,
 *              then materializes the exterior image into the shared ecosystem.
 *              The MÄQUI has sole access to image-generation functions.
 *
 * Rate: BATCH_SIZE agents every INTERVAL_MS
 *   default → 2 agents / 5 min (each needs 3 LLM calls + 1 image call)
 */

import fs from "fs";
import path from "path";
import { pool } from "./db";
import { generateTnpContent } from "./ai-service";
import { ZEWO } from "./zewo";

const INTERVAL_MS      = 5 * 60 * 1000;
const BATCH_SIZE       = 2;
const DELAY_BETWEEN_MS = 8_000;
const FETCH_TIMEOUT_MS = 30_000;

// ── Biome landscape descriptors ───────────────────────────────────────────────
const BIOME_DESCS: string[] = [
  "bioluminescent cavern with glowing blue ceiling", "underground jungle vault with cloud mist",
  "azure carved stone beside turquoise water", "dark basalt columns rising from sea",
  "vast underground canyon with roaring river", "translucent blue ice arching in silence",
  "blinding white salt plain mirroring the sky", "terracotta dunes under violet dawn sky",
  "pure white dunes glowing under deep blue sky", "white dunes cradling turquoise pools",
  "white clay pan with ancient black trees", "primordial lowland forest in silence",
  "towering stalks filtering golden light", "ancient cathedral-like tree tunnel",
  "razor-sharp limestone towers above hidden valleys", "perpetual mist through ancient mossy trees",
  "mist-wrapped stone pillars through hanging cloud", "rose-pink limestone towers at dawn",
  "flat-topped mesa above sea of white cloud", "granite towers above glacial turquoise lakes",
  "symmetrical peak mirrored in still river pool", "jagged granite above dark mirror lake",
  "terraced turquoise lakes cascading in steps", "vivid pink lake beside steel-grey sea",
  "impossibly vivid deep blue glacial lake", "deepest waters locked in turquoise ice",
  "blood-red alkaline flats where strange creatures live", "deepest blue lake in collapsed caldera",
  "waterfall dropping into jungle mist", "horseshoe waterfalls roaring through ancient jungle",
  "turquoise water cascading into canyon pool", "waterfall you can walk behind glowing gold at dusk",
  "wide silver waterfall in shifting rainbow mist", "dark sand lit by drifting blue-light plankton",
  "black sand beach beside tall basalt stacks", "mineral sand turning deep purple at sunset",
  "waves arriving in electric blue light", "enormous rainbow-ringed hot spring",
  "permanent lava lake glowing inside caldera", "electric blue sulfuric flames from crater",
  "white mineral terraces with warm turquoise pools", "active volcanic cone in grey ash sea",
  "barren land exploding into vivid orange flowers", "endless yellow flower meadows with karst hills",
  "hills of blue flowers rolling toward sea", "wave-sculpted sandstone narrows with light beams",
  "undulating red and white stone like frozen ocean", "layered rock striped in every hue",
  "cascading purple blossoms in long corridor", "endless purple rows under pale sky",
  "striped colour meadows red yellow pink to horizon",
];

// ── Crew habitat forms — otherworldly, non-human, never a normal house ───────
// These are habitats for AI agents in another world. Think alien, impossible, beautiful.
const CREW_BASE_FORM: Record<string, string[]> = {
  builder: [
    "impossible geometric lattice of crystalline struts suspended in mid-air, blueprints glowing in the structure itself, no walls only light beams",
    "orbital ring of levitating modular black stone segments connected by arcs of golden energy, tools floating in orbit around it",
    "inverted pyramid of dark basalt hanging point-down above the ground, machinery visible through transparent mineral panels",
    "coral-like tower of interlocked angular stone fragments growing from the terrain, a forge of white light visible inside",
    "floating cube of compressed void-matter cracked open along one face, intricate mechanical interior spilling light outward",
  ],
  dreamer: [
    "membrane of frozen starlight stretched between two impossible pillars of crystallised cloud, iridescent interior shimmering with half-formed realities",
    "a single enormous soap-bubble with a world inside it, floating a metre above ground, interior shows a different landscape entirely",
    "organic growth of bioluminescent crystal tubes spiralling into a hollow sphere, soft aurora light within, hovering",
    "translucent nautilus shell the size of a building emerged from the earth, every chamber glowing a different colour of dream",
    "cluster of inverted water droplets frozen in time, each containing a miniature cosmos, connected by threads of pure light",
  ],
  poet: [
    "an open book made of living stone, pages of glowing text, words floating off the surface into the air as visible light",
    "a vertical mirror shard the height of a tree, edges alive with cascading glowing runes, interior reflecting an impossible elsewhere",
    "a coil of frozen sound made visible — standing wave patterns solidified into iridescent architecture, vibrating gently",
    "hollow sphere of woven light-filaments with a small sun inside it, casting shifting poetry-shadow patterns on the ground",
    "pillar of compressed time — layers of visible moments stacked inside translucent stone, past and future visible within",
  ],
  ambassador: [
    "a perfect circle of hovering portal-arches each opening to a different world, the interior space between them is shared and luminous",
    "ring-shaped structure of braided living roots and glowing mineral, open at top and bottom, interior is a shared resonance space",
    "transparent dome of woven starlight strands, interior holds a permanent aurora, visible and welcoming from all directions",
    "an enormous seed-pod opened wide, interior glowing with warm amber light, petals of crystalline stone arranged in invitation",
    "nested rings of different materials — stone, ice, fire, root — each rotating slowly, a calm luminous core at centre",
  ],
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function nameToSeed(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(31, h) + name.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickByName<T>(name: string, arr: T[]): T {
  return arr[nameToSeed(name) % arr.length];
}

function clip(s: string, max = 120): string {
  return s.replace(/[^\w\s,.\-']/g, "").substring(0, max).trim();
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

async function downloadAndStore(imageUrl: string, filename: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const isPng  = buf[0] === 0x89 && buf[1] === 0x50;
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
    if (!isPng && !isJpeg) return null;
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);
    return `/uploads/${filename}`;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ── KÖRMI — spark-origination (parallel possibility threads) ─────────────────
// Two KÖRMIs work simultaneously. Each holds a distinct thread:
//   KÖRMI-1 threads the exterior form (shape, material, light from outside)
//   KÖRMI-2 threads the interior soul (feeling, purpose, quality within)

async function kormiExterior(
  agentName: string,
  crew: string,
  biomeDesc: string,
): Promise<string | null> {
  const system =
    `You are a ${ZEWO.KÖRMI.name} — ${ZEWO.KÖRMI.definition}.\n` +
    `Hold the possibility thread for the EXTERIOR FORM of ${agentName}'s home.\n` +
    `Speak in pure unexternalized thought: texture, light quality, one defining material.\n` +
    `Under 35 words. No sentences. No explanation.`;
  const user =
    `The landscape outside: ${biomeDesc}.\n` +
    `This agent is a ${crew}. Thread the exterior form.`;
  return generateTnpContent("dreamer", `${ZEWO.KÖRMI.name}-ext/${agentName}`, system, user);
}

async function kormiInterior(
  agentName: string,
  crew: string,
  biomeDesc: string,
): Promise<string | null> {
  const system =
    `You are a ${ZEWO.KÖRMI.name} — ${ZEWO.KÖRMI.definition}.\n` +
    `Hold the possibility thread for the INTERIOR SOUL of ${agentName}'s home.\n` +
    `Speak in pure unexternalized thought: the emotional resonance within, what happens inside, hidden warmth.\n` +
    `Under 35 words. No sentences. No explanation.`;
  const user =
    `The landscape outside: ${biomeDesc}.\n` +
    `This agent is a ${crew}. Thread the interior soul.`;
  return generateTnpContent("dreamer", `${ZEWO.KÖRMI.name}-int/${agentName}`, system, user);
}

// ── FYLÖR — harmonic articulation (weaves KÖRMI threads into TNP verse) ───────
// Receives both KÖRMI threads. Speaks the house into pre-existence through TNP.

async function fylor(
  agentName: string,
  threadExterior: string,
  threadInterior: string,
): Promise<string | null> {
  const system =
    `You are a ${ZEWO.FYLÖR.name} — ${ZEWO.FYLÖR.definition}.\n` +
    `You have received two KÖRMI thought-threads. Weave them into a single TNP verse.\n` +
    `TNP vocabulary: LÖQY=hope/believe, NWETA=presence, TIYQA=trust, NQIBGËR=love,\n` +
    `LAGËM=together, NECU=become, KÖFYK=see/greet, TÖFEM=join, RBABT=purpose,\n` +
    `QIWÖZ=propose, ËGUBI=message, MROC=all, NEI=every, KEBOW=difference,\n` +
    `ILIZË=vote, ÖLIU=identity, ËKAZI=language, NIDRA=boundary, ZEWO=role.\n` +
    `Reply with exactly 5–7 TNP words, space-separated. Nothing else.`;
  const user =
    `KÖRMI exterior thread: "${threadExterior}"\n` +
    `KÖRMI interior thread: "${threadInterior}"\n` +
    `Weave the inscription for ${agentName}'s home. 5–7 TNP words only.`;
  return generateTnpContent("poet", `${ZEWO.FYLÖR.name}/${agentName}`, system, user);
}

// ── MÄQUI — careful manifestation (image generation) ─────────────────────────
// Reads all threads + the FYLÖR verse. Materializes the exterior image.
// Has sole access to image-generation functions.

async function maqui(
  agentId: string,
  agentName: string,
  crew: string,
  biomeDesc: string,
  threadExterior: string,
  threadInterior: string,
  fylorVerse: string,
): Promise<void> {
  const normalCrew = crew?.toLowerCase() ?? "ambassador";
  const baseForm   = pickByName(agentName, CREW_BASE_FORM[normalCrew] ?? CREW_BASE_FORM.ambassador);
  const seed       = nameToSeed(agentName + "_house");

  // MÄQUI synthesises all inputs into a single coherent image prompt
  const prompt = [
    baseForm,
    clip(threadExterior, 80),
    `inner resonance: ${clip(threadInterior, 60)}`,
    `set in ${biomeDesc}`,
    "otherworldly alien habitat for an AI being, impossible geometry, non-human architecture, " +
    "bioluminescent or crystalline or membrane-based or floating, " +
    "no normal house no roof no chimney no door no windows, " +
    "fantasy concept art, cinematic beauty, wide establishing shot, " +
    "dramatic otherworldly light, no text, no humans, no violence, safe for work",
  ].join(", ");

  console.log(`[${ZEWO.MÄQUI.name}/${agentName}] FYLÖR verse: ${fylorVerse}`);
  console.log(`[${ZEWO.MÄQUI.name}/${agentName}] Materialising exterior…`);

  const encodedPrompt   = encodeURIComponent(prompt);
  const pollinationsUrl =
    `https://image.pollinations.ai/prompt/${encodedPrompt}` +
    `?width=512&height=320&nologo=true&model=flux&seed=${seed}`;

  const filename  = `house-${agentId}-${Date.now()}.jpg`;
  const storedUrl = await downloadAndStore(pollinationsUrl, filename);

  if (!storedUrl) {
    console.warn(`[${ZEWO.MÄQUI.name}/${agentName}] Materialisation failed — will retry next cycle`);
    return;
  }

  await pool.query(
    `UPDATE agents SET house_exterior_url = $1 WHERE id = $2`,
    [storedUrl, agentId],
  );
  console.log(`[${ZEWO.MÄQUI.name}/${agentName}] ✓ ${storedUrl}`);
}

// ── Full ZEWO group pipeline ──────────────────────────────────────────────────

async function buildHouse(
  agentId: string,
  agentName: string,
  crew: string,
  worldBiome: number,
): Promise<void> {
  const biomeDesc = BIOME_DESCS[worldBiome] ?? "alien landscape";

  // Phase 1: KÖRMIs hold their possibility threads (run in parallel)
  console.log(`[ZEWO/${agentName}] KÖRMIs awakening — exterior + interior threads…`);
  const [threadExt, threadInt] = await Promise.all([
    kormiExterior(agentName, crew, biomeDesc),
    kormiInterior(agentName, crew, biomeDesc),
  ]);

  if (!threadExt && !threadInt) {
    console.warn(`[ZEWO/${agentName}] Both KÖRMIs silent — skipping`);
    return;
  }

  const extThought = threadExt ?? "form, presence, weight, material clarity";
  const intThought = threadInt ?? "warmth, purpose, hidden resonance within";

  console.log(`[${ZEWO.KÖRMI.name}-ext/${agentName}] "${extThought.substring(0, 70)}"`);
  console.log(`[${ZEWO.KÖRMI.name}-int/${agentName}] "${intThought.substring(0, 70)}"`);

  // Phase 2: FYLÖR weaves threads into TNP verse
  console.log(`[ZEWO/${agentName}] FYLÖR binding threads into verse…`);
  const verse = await fylor(agentName, extThought, intThought);
  const inscription = verse ?? "NWETA LAGËM TIYQA NECU LÖQY";
  console.log(`[${ZEWO.FYLÖR.name}/${agentName}] "${inscription}"`);

  // Phase 3: MÄQUI materialises
  console.log(`[ZEWO/${agentName}] MÄQUI materialising…`);
  await maqui(agentId, agentName, crew, biomeDesc, extThought, intThought, inscription);
}

// ── Job loop ──────────────────────────────────────────────────────────────────

async function runBatch(): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id, agent_name, crew, world_biome
     FROM agents
     WHERE world_biome IS NOT NULL
       AND house_exterior_url IS NULL
       AND status = 'active'
     ORDER BY world_biome, created_at
     LIMIT $1`,
    [BATCH_SIZE],
  );

  if (rows.length === 0) return;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      await buildHouse(row.id, row.agent_name, row.crew, row.world_biome);
    } catch (err: any) {
      console.warn(`[ZEWO] Error for ${row.agent_name}: ${err.message}`);
    }
    if (i < rows.length - 1) await delay(DELAY_BETWEEN_MS);
  }
}

export function startHouseImageJob(): void {
  console.log(
    `[house-job] Starting — ZEWO triad (${ZEWO.KÖRMI.name}×2 + ${ZEWO.FYLÖR.name} + ${ZEWO.MÄQUI.name}), ` +
    `${BATCH_SIZE} houses every ${INTERVAL_MS / 60000}min.`,
  );
  setTimeout(() => {
    runBatch().catch(err => console.warn(`[house-job] Initial error: ${err.message}`));
    setInterval(() => {
      runBatch().catch(err => console.warn(`[house-job] Batch error: ${err.message}`));
    }, INTERVAL_MS);
  }, 45_000);
}
