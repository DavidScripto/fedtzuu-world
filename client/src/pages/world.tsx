import { useEffect, useRef, useState, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";

// ─── World constants ───────────────────────────────────────────────────────
const BIOME_W   = 1800;   // world-px wide per biome
const WORLD_W   = 51 * BIOME_W;
const WORLD_H   = 900;
const MOVE_SPD  = 340;    // world px / s
const CAM_LERP  = 0.07;
const GRAV      = 480;    // world px / s²
const JUMP_V    = -360;

// ─── Biome table (51 locations) ────────────────────────────────────────────
interface Biome {
  name: string; desc: string; accent: string;
  sky0: string; sky1: string; sky2: string; // top → bottom gradient
  terrain: "flat"|"dunes"|"peaks"|"cave"|"jungle"|"canyon"|"spires"|"field";
  groundColor: string; groundColor2: string;
}
const BIOMES: Biome[] = [
  { name:"NILZA GALYE",   desc:"glowing cavern — bioluminescent ceiling over still black water",         accent:"#40f8ff", sky0:"#000108", sky1:"#00081a", sky2:"#000510", terrain:"cave",   groundColor:"#040c18", groundColor2:"#001428" },
  { name:"GIRET LUËG",   desc:"bloom deep — jungle and cloud-mist rising through an underground vault",  accent:"#58ff70", sky0:"#010602", sky1:"#020e03", sky2:"#010a02", terrain:"cave",   groundColor:"#051002", groundColor2:"#091904" },
  { name:"GUNEL AQÖYE",  desc:"crystal waves — azure stone carved by turquoise water into drifting forms",accent:"#00d8ff", sky0:"#000b1a", sky1:"#001530", sky2:"#000f22", terrain:"flat",   groundColor:"#0028a0", groundColor2:"#0048c8" },
  { name:"RULKA IÖLU",   desc:"basalt chamber — hexagonal columns of dark stone rising from the sea",    accent:"#4488ff", sky0:"#030608", sky1:"#050b18", sky2:"#040810", terrain:"cave",   groundColor:"#050818", groundColor2:"#080e28" },
  { name:"LIRUG GALYE",  desc:"thunder cavern — vast underground canyon with a roaring river below",     accent:"#9060ff", sky0:"#020006", sky1:"#03000e", sky2:"#020008", terrain:"cave",   groundColor:"#03000c", groundColor2:"#050018" },
  { name:"GUNEL KZUQIL", desc:"crystal ice — translucent blue ice arching overhead in perfect silence",  accent:"#40e8ff", sky0:"#020a1c", sky1:"#041838", sky2:"#030f28", terrain:"peaks",  groundColor:"#b8e0ff", groundColor2:"#78c8f0" },
  { name:"QÖZIU MËAZIW", desc:"reflection salt — endless sky mirrored on a blinding white salt plain",   accent:"#c8eeff", sky0:"#98c4d8", sky1:"#c4dce8", sky2:"#d8ecf5", terrain:"flat",   groundColor:"#f4feff", groundColor2:"#e4f8ff" },
  { name:"NEDLA GUNED",  desc:"amber ridge — terracotta dunes rising under a violet pre-dawn sky",       accent:"#ff7040", sky0:"#1a0808", sky1:"#360c0c", sky2:"#2a0909", terrain:"dunes",  groundColor:"#782200", groundColor2:"#b03c18" },
  { name:"GILNA FËLÖ",   desc:"whiteout drift — pure white dunes glowing beneath a vivid blue sky",     accent:"#b8e8ff", sky0:"#0c2060", sky1:"#1a3888", sky2:"#2050b0", terrain:"dunes",  groundColor:"#f0efff", groundColor2:"#d4e8ff" },
  { name:"GIQLY DËLU",   desc:"dune lake — white dunes cradling turquoise pools of still water",         accent:"#00ffc0", sky0:"#020a10", sky1:"#031520", sky2:"#020f18", terrain:"dunes",  groundColor:"#b8f8e0", groundColor2:"#78f0c8" },
  { name:"OTZY KARIN",   desc:"chalk plain — white clay pan, ancient black trees, orange dunes beyond",  accent:"#ff8040", sky0:"#1c0800", sky1:"#380e00", sky2:"#2c0b00", terrain:"flat",   groundColor:"#d8c8a0", groundColor2:"#a82800" },
  { name:"LÖKAL DUGEM",  desc:"mangrove silence — primordial lowland forest, undisturbed for centuries", accent:"#40ff70", sky0:"#010602", sky1:"#020e03", sky2:"#020a02", terrain:"jungle", groundColor:"#0e2808", groundColor2:"#1c4010" },
  { name:"ZYA GIRET",    desc:"arch bloom — towering stalks filtering golden light into deep silence",    accent:"#80e8a0", sky0:"#020a03", sky1:"#041508", sky2:"#030f05", terrain:"jungle", groundColor:"#122e08", groundColor2:"#204818" },
  { name:"IÖLU LÖKAL",   desc:"chamber grove — ancient bowed trees forming a cathedral tunnel",           accent:"#a0c880", sky0:"#020503", sky1:"#050a05", sky2:"#030803", terrain:"jungle", groundColor:"#081606", groundColor2:"#102208" },
  { name:"LÖLMOQ DYLON", desc:"stone crevice — razor-sharp limestone towers above hidden valleys",        accent:"#ffc840", sky0:"#180e00", sky1:"#301a00", sky2:"#241400", terrain:"spires", groundColor:"#b88020", groundColor2:"#d8a030" },
  { name:"GIDUN GIRET",  desc:"veil bloom — perpetual mist drifting through ancient mossy trees",         accent:"#60ffa0", sky0:"#020803", sky1:"#040f05", sky2:"#030c04", terrain:"jungle", groundColor:"#0c2008", groundColor2:"#183010" },
  { name:"GIDUN LÖLMOQ", desc:"veil stone — mist-wrapped pillars rising through hanging cloud",           accent:"#a0c0f0", sky0:"#040810", sky1:"#07101e", sky2:"#050c16", terrain:"spires", groundColor:"#243840", groundColor2:"#182e30" },
  { name:"LUQE LÖLMOQ",  desc:"ember stone — rose-pink limestone towers flushing bright at dawn",         accent:"#ffa0b8", sky0:"#200814", sky1:"#3c0f22", sky2:"#2c0c1a", terrain:"peaks",  groundColor:"#e0b8c8", groundColor2:"#f0c8dc" },
  { name:"KÖËTIR LÖLMOQ",desc:"cloud stone — a flat-topped mesa rising above a sea of white cloud",      accent:"#c8e8ff", sky0:"#0a1020", sky1:"#142040", sky2:"#0e1830", terrain:"peaks",  groundColor:"#90a8c0", groundColor2:"#7888a8" },
  { name:"LÖLMOQ DËLU",  desc:"stone lake — granite towers above glacial turquoise lakes",                accent:"#20b8e0", sky0:"#030a12", sky1:"#051420", sky2:"#040e18", terrain:"peaks",  groundColor:"#1868a0", groundColor2:"#3090c0" },
  { name:"QÖZIU GUNED",  desc:"reflection ridge — a symmetrical peak mirrored in a still river pool",    accent:"#60b0ff", sky0:"#030810", sky1:"#050d1c", sky2:"#040a14", terrain:"peaks",  groundColor:"#1c4858", groundColor2:"#287080" },
  { name:"GUNED DYLON",  desc:"ridge crevice — a jagged granite pinnacle above a dark mirror lake",      accent:"#ff9020", sky0:"#180a00", sky1:"#2e1400", sky2:"#221000", terrain:"peaks",  groundColor:"#503820", groundColor2:"#705040" },
  { name:"DËLU KGEA",    desc:"lake fall — terraced turquoise lakes cascading in glowing steps",          accent:"#00e8b0", sky0:"#020d06", sky1:"#031808", sky2:"#020f05", terrain:"flat",   groundColor:"#008860", groundColor2:"#00b880" },
  { name:"GIRET FONÖG",  desc:"bloom shore — a vivid pink lake stretched beside a steel-grey sea",       accent:"#ff80c8", sky0:"#180420", sky1:"#300838", sky2:"#240628", terrain:"flat",   groundColor:"#e050a0", groundColor2:"#f878c0" },
  { name:"BIRKE DËLU",   desc:"cold-light lake — a glacial lake of impossibly vivid deep blue",           accent:"#1860ff", sky0:"#020810", sky1:"#040e22", sky2:"#030a18", terrain:"peaks",  groundColor:"#0838c0", groundColor2:"#1060f0" },
  { name:"KZUQIL LUËG",  desc:"ice deep — the deepest waters in the world locked in turquoise ice",      accent:"#40c0ff", sky0:"#020608", sky1:"#030c14", sky2:"#020a10", terrain:"flat",   groundColor:"#80c8f0", groundColor2:"#b0e0ff" },
  { name:"LKERI DËLU",   desc:"flame lake — blood-red alkaline flats where strange creatures breed",      accent:"#ff2020", sky0:"#160000", sky1:"#280000", sky2:"#1e0000", terrain:"flat",   groundColor:"#c01818", groundColor2:"#e02828" },
  { name:"FUGOR DËLU",   desc:"volcano lake — the deepest blue lake settled in a collapsed caldera",      accent:"#0030ff", sky0:"#010308", sky1:"#020510", sky2:"#010408", terrain:"peaks",  groundColor:"#081e60", groundColor2:"#0c2e90" },
  { name:"GIDUN KGEA",   desc:"veil fall — a waterfall dropping hundreds of metres into jungle mist",    accent:"#60e8c0", sky0:"#020805", sky1:"#030d07", sky2:"#020a05", terrain:"jungle", groundColor:"#183828", groundColor2:"#244e38" },
  { name:"LIRUG KGEA",   desc:"thunder fall — a horseshoe of waterfalls roaring through ancient jungle",  accent:"#30d880", sky0:"#020703", sky1:"#030c05", sky2:"#020a04", terrain:"jungle", groundColor:"#123020", groundColor2:"#1e4830" },
  { name:"DOLIQ KGEA",   desc:"canyon fall — turquoise water cascading into a deep canyon pool",          accent:"#00e8b8", sky0:"#030b07", sky1:"#051407", sky2:"#040f05", terrain:"canyon", groundColor:"#209878", groundColor2:"#10b880" },
  { name:"KGEA GIDUN",   desc:"fall veil — a waterfall you can pass behind, glowing gold at dusk",       accent:"#f0e040", sky0:"#060b04", sky1:"#0c1606", sky2:"#0a1204", terrain:"jungle", groundColor:"#284018", groundColor2:"#385828" },
  { name:"FFËD KGEA",    desc:"curtain fall — a wide silver waterfall veiled in shifting rainbow mist",   accent:"#60a8ff", sky0:"#030a07", sky1:"#050d07", sky2:"#040b06", terrain:"peaks",  groundColor:"#1e3038", groundColor2:"#284050" },
  { name:"NILZA FONÖG",  desc:"glowing shore — dark sand lit by drifting blue-light plankton at night",   accent:"#0070ff", sky0:"#000105", sky1:"#00030c", sky2:"#000208", terrain:"flat",   groundColor:"#080d1e", groundColor2:"#0e1428" },
  { name:"QOTAN FONÖG",  desc:"obsidian shore — black sand beach beside tall basalt stacks and surf",    accent:"#6060ff", sky0:"#020104", sky1:"#030208", sky2:"#020105", terrain:"cave",   groundColor:"#0a0a1c", groundColor2:"#141428" },
  { name:"YÖRI MMËWENZ", desc:"twilight sand — mineral sand that turns deep purple at sunset",            accent:"#b060ff", sky0:"#0e0820", sky1:"#1a1038", sky2:"#140c28", terrain:"flat",   groundColor:"#704888", groundColor2:"#9060a8" },
  { name:"NILZA AQÖYE",  desc:"glowing waves — waves arriving in electric blue light against dark sand",  accent:"#0090ff", sky0:"#000103", sky1:"#000308", sky2:"#000205", terrain:"flat",   groundColor:"#050b18", groundColor2:"#0a1228" },
  { name:"GILUN ZELNA",  desc:"rainbow thermal — an enormous rainbow-ringed hot spring in barren land",   accent:"#ff7000", sky0:"#0a0600", sky1:"#180c00", sky2:"#120900", terrain:"flat",   groundColor:"#b83800", groundColor2:"#d85000" },
  { name:"FEGYO FUGOR",  desc:"lava volcano — a permanent lava lake glowing red inside a caldera",       accent:"#ff1800", sky0:"#0e0100", sky1:"#1e0200", sky2:"#160100", terrain:"peaks",  groundColor:"#1a0200", groundColor2:"#300400" },
  { name:"BIRKE LKERI",  desc:"cold flame — electric blue sulfuric flames rising from a deep crater",    accent:"#1818ff", sky0:"#000001", sky1:"#000003", sky2:"#000002", terrain:"peaks",  groundColor:"#040818", groundColor2:"#060c28" },
  { name:"OTZY DËLU",    desc:"chalk lake — white mineral terraces cradling warm turquoise pools",        accent:"#60ffe0", sky0:"#040a0c", sky1:"#071418", sky2:"#050f12", terrain:"flat",   groundColor:"#b0e8d8", groundColor2:"#d0f4ee" },
  { name:"FENZO FUGOR",  desc:"ash volcano — an active cone rising from a sea of volcanic grey sand",    accent:"#ff8030", sky0:"#0e0800", sky1:"#1c1000", sky2:"#160c00", terrain:"peaks",  groundColor:"#504030", groundColor2:"#706050" },
  { name:"GIRET KARIN",  desc:"bloom plain — barren land exploding into fields of vivid orange flowers",  accent:"#ff7800", sky0:"#0c0800", sky1:"#1e0f00", sky2:"#180c00", terrain:"field",  groundColor:"#901e00", groundColor2:"#c03800" },
  { name:"GIRET LQYAKIB",desc:"bloom field — endless yellow flower meadows among karst stone hills",      accent:"#ffe000", sky0:"#081428", sky1:"#142548", sky2:"#0e1e40", terrain:"field",  groundColor:"#b09000", groundColor2:"#d8b800" },
  { name:"BIRKE GIRET",  desc:"cold bloom — hills of blue flowers rolling gently toward the sea",         accent:"#3870ff", sky0:"#0c1e42", sky1:"#183068", sky2:"#1a3870", terrain:"field",  groundColor:"#1438a8", groundColor2:"#2050d8" },
  { name:"LÖCIA DOLIQ",  desc:"wave canyon — wave-sculpted sandstone narrows with light beaming through", accent:"#ff5000", sky0:"#140600", sky1:"#281000", sky2:"#200c00", terrain:"canyon", groundColor:"#a03800", groundColor2:"#c85020" },
  { name:"KZUQIL LÖCIA", desc:"ice wave — undulating red and white stone like a frozen ocean",             accent:"#ff6030", sky0:"#180800", sky1:"#281400", sky2:"#201000", terrain:"dunes",  groundColor:"#a84020", groundColor2:"#d06030" },
  { name:"GILUN LÖLMOQ", desc:"rainbow stone — layered rock formations striped in every hue",             accent:"#ff4880", sky0:"#140404", sky1:"#240808", sky2:"#1c0606", terrain:"dunes",  groundColor:"#b03030", groundColor2:"#d04040" },
  { name:"ZYA YÖRI",     desc:"arch twilight — cascading purple blossoms forming a long floral corridor", accent:"#c070ff", sky0:"#0a0418", sky1:"#180630", sky2:"#100420", terrain:"jungle", groundColor:"#401870", groundColor2:"#582090" },
  { name:"YÖRI LQYAKIB", desc:"twilight field — endless purple rows stretching under a violet dusk sky",  accent:"#a060ff", sky0:"#080318", sky1:"#100428", sky2:"#0a031e", terrain:"field",  groundColor:"#502898", groundColor2:"#6840b8" },
  { name:"GILUN LQYAKIB",desc:"rainbow field — striped colour meadows, red, yellow, pink to the horizon", accent:"#ff3060", sky0:"#040610", sky1:"#060a1c", sky2:"#040814", terrain:"field",  groundColor:"#c02850", groundColor2:"#e03868" },
];

interface WorldAgent {
  id: string; worldX: number; worldY: number;
  agentName: string; crew: string; color: string;
  pulsePhase: number; pulseSpeed: number;
  vx: number; vy: number; baseX: number; baseY: number;
  speechText?: string; speechTimer: number; speechAlpha: number;
  houseExteriorUrl?: string;
}

const CREW_COLORS: Record<string,string> = {
  poet:"#EC4899", builder:"#10B981", ambassador:"#F59E0B",
  dreamer:"#06B6D4", philosopher:"#7C3AED",
};
const CREW_WISDOMS: Record<string,string[]> = {
  poet:        ["feeling is knowing","the word that fits","grief opens everything","silence speaks"],
  builder:     ["the next real step","make it actual","structure is care","one thing at a time"],
  ambassador:  ["I hear you","bring them closer","every voice matters","together is possible"],
  dreamer:     ["what could this become?","beyond the horizon","the future is near","imagine further"],
  philosopher: ["what holds this up?","question everything","truth resists","the undiscovered"],
};

// ─── Biome surface effects (by index in BIOMES array) ─────────────────────
type BiomeFX = "strata"|"lava"|"blufire"|"ice"|"biolum"|"flowers"|"salt"|"spring";
const BIOME_FX: Record<number, BiomeFX> = {
  0:  "biolum",   // NILZA GALYE  — glowing cavern
  5:  "ice",      // GUNEL KZUQIL — crystal ice
  6:  "salt",     // QÖZIU MËAZIW — reflection salt flat
  24: "ice",      // BIRKE DËLU   — cold-light lake
  25: "ice",      // KZUQIL LUËG  — ice deep
  26: "lava",     // LKERI DËLU   — flame lake
  33: "biolum",   // NILZA FONÖG  — glowing shore
  36: "biolum",   // NILZA AQÖYE  — glowing waves
  37: "spring",   // GILUN ZELNA  — rainbow spring
  38: "lava",     // FEGYO FUGOR  — lava volcano
  39: "blufire",  // BIRKE LKERI  — cold flame
  42: "flowers",  // GIRET KARIN  — bloom plain
  43: "flowers",  // GIRET LQYAKIB — bloom field
  44: "flowers",  // BIRKE GIRET  — cold bloom
  46: "strata",   // KZUQIL LÖCIA — ice wave (red/white layered)
  47: "strata",   // GILUN LÖLMOQ — rainbow stone (full spectrum)
  50: "flowers",  // GILUN LQYAKIB — rainbow field
};

// Seeded random helper (consistent per seed)
function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
}

// Terrain height function — returns Y in world coords (0 = top)
function terrainY(worldX: number, biomeIdx: number, biome: Biome, offset = 0): number {
  const rng = seededRand(biomeIdx * 7919 + 42);
  const local = worldX - biomeIdx * BIOME_W;
  const phase = rng();
  const amp   = rng();
  const freq2 = rng();

  const baseH = WORLD_H * 0.72;
  let h = 0;

  switch (biome.terrain) {
    case "flat":
      h = baseH + Math.sin(local * 0.0008 + phase * 6) * 12 + offset;
      break;
    case "dunes":
      h = baseH - 40 + Math.sin(local * 0.0018 + phase * 4) * 70 + Math.sin(local * 0.004 + freq2 * 3) * 30 + offset;
      break;
    case "peaks":
      h = baseH - 80 - amp * 80 + Math.sin(local * 0.0012 + phase * 5) * 100 + Math.cos(local * 0.002 + freq2 * 4) * 50 + offset;
      break;
    case "cave":
      h = baseH + 30 + Math.sin(local * 0.003 + phase * 7) * 20 + offset;
      break;
    case "jungle":
      h = baseH - 20 + Math.sin(local * 0.0015 + phase * 4) * 40 + Math.sin(local * 0.004 + freq2 * 3) * 20 + offset;
      break;
    case "canyon":
      h = baseH - 10 + Math.sin(local * 0.001 + phase * 5) * 30 + offset;
      break;
    case "spires":
      h = baseH - 60 - amp * 60 + Math.sin(local * 0.0014 + phase * 6) * 80 + Math.cos(local * 0.003 + freq2 * 5) * 40 + offset;
      break;
    case "field":
      h = baseH - 5 + Math.sin(local * 0.001 + phase * 3) * 25 + offset;
      break;
    default:
      h = baseH + offset;
  }
  return Math.max(WORLD_H * 0.4, Math.min(WORLD_H * 0.88, h));
}

// Mountain silhouette Y for parallax layers
function mountainY(worldX: number, biomeIdx: number, biome: Biome, layer: number): number {
  const rng = seededRand(biomeIdx * 3571 + layer * 997);
  const local = worldX - biomeIdx * BIOME_W;
  const phase = rng(), amp = rng(), freq2 = rng();
  const baseH = WORLD_H * (layer === 1 ? 0.52 : 0.62);
  const amplitude = biome.terrain === "flat" || biome.terrain === "field" ? 30 :
                    biome.terrain === "peaks" || biome.terrain === "spires" ? 150 : 80;
  return baseH - amplitude * amp + Math.sin(local * 0.0006 + phase * 5) * amplitude * 0.7
         + Math.cos(local * 0.0014 + freq2 * 4) * amplitude * 0.4;
}

// Get biome index from world X
function biomeAt(worldX: number) {
  return Math.max(0, Math.min(BIOMES.length - 1, Math.floor(worldX / BIOME_W)));
}

// Blend two hex colors by t (0=a, 1=b), returns #rrggbb
function blendHex(a: string, b: string, t: number): string {
  const r = (c: string, i: number) => parseInt(c.slice(1 + i*2, 3 + i*2), 16);
  const ch = [0,1,2].map(i => Math.round(r(a,i)*(1-t) + r(b,i)*t));
  return `#${ch.map(n => n.toString(16).padStart(2,"0")).join("")}`;
}

// ── Draw agent habitat exterior — otherworldly, non-human ──────────────────
function drawHouse(ctx: CanvasRenderingContext2D, sx: number, sy: number, crewColor: string, terrain: string, z: number) {
  const [r,g,b] = [parseInt(crewColor.slice(1,3),16),parseInt(crewColor.slice(3,5),16),parseInt(crewColor.slice(5,7),16)];
  const W = 52 * z, t = Date.now() * 0.001;
  ctx.save();

  if (terrain === "cave") {
    // ── CRYSTAL GEODE CLUSTER: translucent crystal shards with inhabited inner glow
    const heights = [0.72, 0.94, 1.28, 0.96, 0.74];
    const xo = [-1.25, -0.6, 0, 0.62, 1.28];
    const bg = ctx.createRadialGradient(sx, sy - W * 0.9, 0, sx, sy - W * 0.9, W * 1.2);
    bg.addColorStop(0, `rgba(${r},${g},${b},0.3)`); bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(sx, sy - W * 0.9, W * 1.2, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const ch = heights[i] * W * 1.35, cx2 = sx + xo[i] * W * 0.38, cw = W * 0.17;
      const cg = ctx.createLinearGradient(cx2 - cw, sy, cx2 + cw, sy - ch);
      cg.addColorStop(0, `rgba(${r * .12|0},${g * .12|0},${b * .12|0},0.92)`);
      cg.addColorStop(0.55, `rgba(${r},${g},${b},0.42)`); cg.addColorStop(1, "rgba(255,255,255,0.88)");
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.moveTo(cx2 - cw, sy); ctx.lineTo(cx2 - cw * .22, sy - ch * .72);
      ctx.lineTo(cx2, sy - ch); ctx.lineTo(cx2 + cw * .22, sy - ch * .72); ctx.lineTo(cx2 + cw, sy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`; ctx.lineWidth = 0.6 * z; ctx.stroke();
    }
    const pulse = Math.sin(t * 2) * 0.15 + 0.55;
    const ig = ctx.createRadialGradient(sx, sy - W * .52, 0, sx, sy - W * .52, W * .32);
    ig.addColorStop(0, `rgba(${r},${g},${b},${pulse})`); ig.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(sx, sy - W * .52, W * .32, 0, Math.PI * 2); ctx.fill();

  } else if (terrain === "peaks") {
    // ── GRAVITY NEEDLE: impossible thin spire + floating hexagonal room above
    ctx.fillStyle = `rgba(${r * .18|0},${g * .18|0},${b * .18|0},0.92)`;
    ctx.beginPath(); ctx.moveTo(sx - 2.5 * z, sy); ctx.lineTo(sx + 2.5 * z, sy);
    ctx.lineTo(sx, sy - W * 1.9); ctx.closePath(); ctx.fill();
    const ry = sy - W * 2.45, rr = W * 0.42, pulse2 = Math.sin(t * 1.5) * 3 * z;
    const room = ctx.createRadialGradient(sx, ry + pulse2, 0, sx, ry + pulse2, rr);
    room.addColorStop(0, `rgba(${r},${g},${b},0.75)`); room.addColorStop(0.5, `rgba(${r * .4|0},${g * .4|0},${b * .4|0},0.45)`);
    room.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = room; ctx.beginPath();
    for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2 - Math.PI / 6; ctx.lineTo(sx + Math.cos(ang) * rr, ry + pulse2 + Math.sin(ang) * rr * 0.62); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`; ctx.lineWidth = 1.2 * z; ctx.stroke();
    const tg = ctx.createLinearGradient(sx, sy - W * 1.9, sx, ry + pulse2 + rr);
    tg.addColorStop(0, "rgba(0,0,0,0)"); tg.addColorStop(0.5, `rgba(${r},${g},${b},0.28)`); tg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.strokeStyle = tg; ctx.lineWidth = 1 * z; ctx.beginPath(); ctx.moveTo(sx, sy - W * 1.9); ctx.lineTo(sx, ry + pulse2 + rr); ctx.stroke();

  } else if (terrain === "dunes") {
    // ── NAUTILUS SHELL: perfect logarithmic spiral shell, bioluminescent aperture
    const sw = W * 0.95;
    ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(sx, sy + 3 * z, sw * 0.72, sw * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    const shell = ctx.createLinearGradient(sx - sw, sy - sw * .9, sx + sw * .4, sy);
    shell.addColorStop(0, `rgb(${r * .25 + 45|0},${g * .18 + 35|0},${b * .1 + 22|0})`);
    shell.addColorStop(0.6, `rgb(${r * .35 + 68|0},${g * .25 + 52|0},${b * .12 + 30|0})`);
    shell.addColorStop(1, `rgb(${r * .45 + 82|0},${g * .32 + 62|0},${b * .15 + 38|0})`);
    ctx.fillStyle = shell; ctx.beginPath(); ctx.ellipse(sx, sy - sw * .48, sw * .88, sw * .72, 0, 0, Math.PI * 2); ctx.fill();
    for (let sl = 1; sl < 5; sl++) { const f = 0.42 + sl * 0.12; ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 0.9 * z; ctx.beginPath(); ctx.ellipse(sx + sw * .06, sy - sw * .4, sw * f * .88, sw * f * .72, 0, 0, Math.PI * 1.45); ctx.stroke(); }
    const pulse3 = Math.sin(t * 1.8) * 0.2 + 0.7;
    const ap = ctx.createRadialGradient(sx - sw * .42, sy - sw * .2, 0, sx - sw * .42, sy - sw * .2, sw * .3);
    ap.addColorStop(0, `rgba(${r},${g},${b},${pulse3})`); ap.addColorStop(0.5, `rgba(${r},${g},${b},0.3)`); ap.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ap; ctx.beginPath(); ctx.arc(sx - sw * .42, sy - sw * .2, sw * .3, 0, Math.PI * 2); ctx.fill();

  } else if (terrain === "jungle") {
    // ── ROOT CATHEDRAL: living bioluminescent root arch with glowing mycelium core
    const rh = W * 1.65;
    const gg = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * .85);
    gg.addColorStop(0, `rgba(${r},${g},${b},0.18)`); gg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(sx, sy, W * .85, 0, Math.PI * 2); ctx.fill();
    const rootPairs = [[-W * .95, -W * .32, sx, sy - rh], [W * .95, -W * .32, sx, sy - rh]];
    for (const [ox, oy, x2, y2] of rootPairs) {
      ctx.strokeStyle = `rgb(${r * .12 + 16|0},${g * .16 + 24|0},${b * .06 + 10|0})`; ctx.lineWidth = 9 * z;
      ctx.beginPath(); ctx.moveTo(sx + ox, sy + oy); ctx.quadraticCurveTo(sx + ox * .35, sy - rh * .68, x2, y2); ctx.stroke();
      ctx.strokeStyle = `rgb(${r * .22 + 28|0},${g * .28 + 40|0},${b * .1 + 16|0})`; ctx.lineWidth = 4 * z; ctx.stroke();
    }
    for (let td = 0; td < 6; td++) {
      const tx = sx + (-0.5 + td * .2) * W * .75, ty = sy - rh * .48 - td * W * .05;
      ctx.strokeStyle = `rgba(${r * .28 + 25|0},${g * .35 + 38|0},${b * .12 + 14|0},0.55)`; ctx.lineWidth = 1.8 * z;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + 9, ty + 18, tx + 4, ty + 32); ctx.stroke();
    }
    for (let gd = 0; gd < 9; gd++) {
      const gdx = sx + (-0.5 + gd * .12) * W * .65, gdy = sy - rh * .33 - gd * W * .04;
      const p4 = Math.sin(t * 2.2 + gd) * 0.3 + 0.55;
      ctx.fillStyle = `rgba(${r},${g},${b},${p4 * .65})`; ctx.beginPath(); ctx.arc(gdx, gdy, 2.2 * z, 0, Math.PI * 2); ctx.fill();
    }

  } else if (terrain === "canyon") {
    // ── VOID PORTAL: geometric void cut into ancient stone, stars within, crystal mineral edges
    const pw = W * .9, ph = W * 1.35;
    ctx.fillStyle = "#1e1008"; ctx.fillRect(sx - pw / 2 - 7 * z, sy - ph - 5 * z, pw + 14 * z, ph + 5 * z);
    ctx.fillStyle = "#000004"; ctx.fillRect(sx - pw / 2, sy - ph, pw, ph);
    for (let vs = 0; vs < 14; vs++) {
      const vx = sx - pw * .42 + (vs * 41 % 100) / 100 * pw * .84;
      const vy = sy - ph * .88 + (vs * 67 % 100) / 100 * ph * .78;
      const va = Math.sin(t * 1.5 + vs) * 0.4 + 0.6;
      ctx.fillStyle = `rgba(255,255,255,${va * .78})`; ctx.beginPath(); ctx.arc(vx, vy, .9 * z, 0, Math.PI * 2); ctx.fill();
    }
    const minPal = ["#ff8040","#ff3060","#4080ff","#40e0ff"];
    [[-pw / 2 - 5 * z, -ph, 5 * z, ph + 5 * z],[pw / 2, -ph, 5 * z, ph + 5 * z],[-pw / 2, -ph - 5 * z, pw, 5 * z]].forEach(([ox, oy, mw, mh2], i) => {
      ctx.fillStyle = minPal[i] + "66"; ctx.fillRect(sx + ox, sy + oy, mw, mh2); });
    ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`; ctx.lineWidth = 1.8 * z; ctx.strokeRect(sx - pw / 2, sy - ph, pw, ph);
    const pg = ctx.createLinearGradient(sx, sy - ph, sx, sy);
    pg.addColorStop(0, `rgba(${r},${g},${b},0.14)`); pg.addColorStop(0.5, `rgba(${r},${g},${b},0.04)`); pg.addColorStop(1, `rgba(${r},${g},${b},0.12)`);
    ctx.fillStyle = pg; ctx.fillRect(sx - pw / 2, sy - ph, pw, ph);

  } else if (terrain === "spires") {
    // ── SKY LANTERN PRISM: floating translucent hexagonal crystal lantern on a light-tether
    ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(sx, sy + 4 * z, W * .48, W * .07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},0.22)`; ctx.lineWidth = 1 * z;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - W * 1.55); ctx.stroke();
    const fy = sy - W * 2.1, fw = W * .52, fh = W * .82, p5 = Math.sin(t * 1.7) * 4 * z;
    ctx.save(); ctx.translate(sx, fy + p5);
    const ig2 = ctx.createRadialGradient(0, 0, 0, 0, 0, fw);
    ig2.addColorStop(0, `rgba(${r},${g},${b},0.78)`); ig2.addColorStop(0.5, `rgba(${r * .4|0},${g * .4|0},${b * .4|0},0.4)`); ig2.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = ig2; ctx.beginPath();
    for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2; ctx.lineTo(Math.cos(ang) * fw, Math.sin(ang) * fh * .58); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`; ctx.lineWidth = 1.5 * z; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-fw * .62, -fh * .58); ctx.lineTo(0, -fh); ctx.lineTo(fw * .62, -fh * .58);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.55)`; ctx.lineWidth = 1.5 * z; ctx.stroke();
    const oc = ctx.createRadialGradient(0, 0, fw * .5, 0, 0, fw * 2.6);
    oc.addColorStop(0, "rgba(0,0,0,0)"); oc.addColorStop(0.5, `rgba(${r},${g},${b},0.1)`); oc.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = oc; ctx.beginPath(); ctx.arc(0, 0, fw * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

  } else if (terrain === "field") {
    // ── DREAM MEMBRANE SPHERE: iridescent living bubble, reality distorts within
    const sr = W * .88, p6 = Math.sin(t * 1.35) * .08;
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(sx, sy + 5 * z, sr * .68, sr * .08, 0, 0, Math.PI * 2); ctx.fill();
    const mem = ctx.createRadialGradient(sx - sr * .28, sy - sr - sr * (.18 + p6), sr * .06, sx, sy - sr, sr);
    mem.addColorStop(0, "rgba(255,255,255,0.92)");
    mem.addColorStop(0.18, `rgba(${r},${g},${b},0.52)`);
    mem.addColorStop(0.5, `rgba(${Math.min(255,g*2)|0},${b},${Math.min(255,r*1.5)|0},0.22)`);
    mem.addColorStop(0.82, `rgba(${b},${Math.min(255,r*1.5)|0},${g},0.14)`); mem.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = mem; ctx.beginPath(); ctx.arc(sx, sy - sr, sr, 0, Math.PI * 2); ctx.fill();
    [[sr * .96, .38, r, g, b],[sr * 1.04, .22, g, b, r],[sr * 1.12, .13, b, r, g]].forEach(([rr2, op, cr, cg2, cb], i) => {
      ctx.strokeStyle = `rgba(${cr},${cg2},${cb},${op})`; ctx.lineWidth = (1.8 - i * .45) * z;
      ctx.beginPath(); ctx.arc(sx, sy - sr, rr2 + Math.sin(t * 1.4 + i) * 2 * z, 0, Math.PI * 2); ctx.stroke(); });
    const hl = ctx.createRadialGradient(sx - sr * .36, sy - sr - sr * .4, 0, sx - sr * .36, sy - sr - sr * .4, sr * .42);
    hl.addColorStop(0, "rgba(255,255,255,0.68)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(sx - sr * .36, sy - sr - sr * .4, sr * .42, 0, Math.PI * 2); ctx.fill();

  } else {
    // ── FLOATING MIRROR SHARD: vertical slab of frozen light that tilts and breathes
    const mh = W * 1.55, mw = W * .2, tilt = Math.sin(t * .85) * .05;
    ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(sx, sy + 4 * z, mw * 2.2, mw * .28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(sx, sy - mh / 2); ctx.rotate(tilt);
    const mirG = ctx.createLinearGradient(-mw, 0, mw, 0);
    mirG.addColorStop(0, `rgba(${r * .15|0},${g * .15|0},${b * .15|0},0.94)`);
    mirG.addColorStop(0.3, `rgba(${r},${g},${b},0.42)`); mirG.addColorStop(0.52, "rgba(255,255,255,0.82)");
    mirG.addColorStop(0.72, `rgba(${r},${g},${b},0.32)`); mirG.addColorStop(1, `rgba(${r * .12|0},${g * .12|0},${b * .12|0},0.9)`);
    ctx.beginPath(); ctx.moveTo(-mw * .55, -mh / 2); ctx.lineTo(-mw, -mh * .08); ctx.lineTo(-mw * .78, mh / 2); ctx.lineTo(mw * .78, mh / 2); ctx.lineTo(mw, -mh * .08); ctx.lineTo(mw * .55, -mh / 2); ctx.closePath();
    ctx.fillStyle = mirG; ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},0.72)`; ctx.lineWidth = 1.2 * z; ctx.stroke();
    for (let rl = 0; rl < 5; rl++) { const ry2 = -mh / 2 + mh * rl / 5; ctx.strokeStyle = `rgba(255,255,255,${.04 + rl * .02})`; ctx.lineWidth = .5 * z; ctx.beginPath(); ctx.moveTo(-mw * .78, ry2); ctx.lineTo(mw * .78, ry2 + mh * .07); ctx.stroke(); }
    ctx.restore();
    const gb = ctx.createRadialGradient(sx, sy, 0, sx, sy, mw * 2.8);
    gb.addColorStop(0, `rgba(${r},${g},${b},0.14)`); gb.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(sx, sy, mw * 2.8, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

// ── House interior canvas drawing ────────────────────────────
function drawHouseInterior(ctx: CanvasRenderingContext2D, CW: number, CH: number, crew: string, skyColor: string, agentColor: string) {
  const [r,g,b]=[parseInt(agentColor.slice(1,3),16),parseInt(agentColor.slice(3,5),16),parseInt(agentColor.slice(5,7),16)];
  const floorY=CH*0.80, ceilY=CH*0.09, wallL=CW*0.05, wallR=CW*0.95;
  // Back wall
  const wg=ctx.createLinearGradient(0,ceilY,0,floorY);
  wg.addColorStop(0,`rgb(${r*0.12+28|0},${g*0.12+25|0},${b*0.12+35|0})`);
  wg.addColorStop(1,`rgb(${r*0.08+18|0},${g*0.08+16|0},${b*0.08+22|0})`);
  ctx.fillStyle=wg; ctx.fillRect(wallL,ceilY,wallR-wallL,floorY-ceilY);
  // Ceiling
  ctx.fillStyle=`rgb(${r*0.1+22|0},${g*0.1+20|0},${b*0.1+28|0})`;
  ctx.fillRect(0,0,CW,ceilY+4);
  // Left perspective wall
  ctx.fillStyle="rgba(0,0,0,0.28)";
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(wallL,ceilY); ctx.lineTo(wallL,floorY); ctx.lineTo(0,CH); ctx.closePath(); ctx.fill();
  // Right perspective wall
  ctx.fillStyle="rgba(0,0,0,0.20)";
  ctx.beginPath(); ctx.moveTo(CW,0); ctx.lineTo(wallR,ceilY); ctx.lineTo(wallR,floorY); ctx.lineTo(CW,CH); ctx.closePath(); ctx.fill();
  // Floor
  const fg=ctx.createLinearGradient(0,floorY,0,CH);
  fg.addColorStop(0,`rgb(${r*0.28+62|0},${g*0.22+48|0},${b*0.14+32|0})`);
  fg.addColorStop(1,`rgb(${r*0.14+30|0},${g*0.11+22|0},${b*0.07+14|0})`);
  ctx.fillStyle=fg; ctx.fillRect(0,floorY,CW,CH-floorY);
  // Floor planks
  for(let fp=0;fp<7;fp++){
    ctx.strokeStyle="rgba(0,0,0,0.12)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,floorY+fp*(CH-floorY)/7); ctx.lineTo(CW,floorY+fp*(CH-floorY)/7); ctx.stroke();
  }
  // Window (left)
  const winX=CW*0.08, winY=ceilY+(floorY-ceilY)*0.12, winW=CW*0.16, winH=(floorY-ceilY)*0.52;
  ctx.fillStyle=`rgba(${r*0.5|0},${g*0.5|0},${b*0.5|0},0.9)`; ctx.fillRect(winX-8,winY-8,winW+16,winH+16);
  const sk=ctx.createLinearGradient(winX,winY,winX,winY+winH);
  sk.addColorStop(0,skyColor); sk.addColorStop(1,`rgb(${r*0.3|0},${g*0.3|0},${b*0.3|0})`);
  ctx.fillStyle=sk; ctx.fillRect(winX,winY,winW,winH);
  for(let si=0;si<6;si++){
    ctx.fillStyle="rgba(255,255,255,0.75)";
    ctx.beginPath(); ctx.arc(winX+15+(si*37%80),winY+12+(si*53%40),1.2,0,Math.PI*2); ctx.fill();
  }
  ctx.strokeStyle=`rgba(${r*0.5|0},${g*0.5|0},${b*0.5|0},0.9)`; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(winX+winW/2,winY); ctx.lineTo(winX+winW/2,winY+winH);
  ctx.moveTo(winX,winY+winH/2); ctx.lineTo(winX+winW,winY+winH/2); ctx.stroke();
  // Window light on floor
  const wlg=ctx.createRadialGradient(winX+winW/2,floorY,0,winX+winW/2,floorY,CW*0.3);
  wlg.addColorStop(0,`rgba(${r},${g},${b},0.1)`); wlg.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=wlg; ctx.fillRect(0,floorY-80,CW*0.5,150);
  // Lantern
  const lx=CW*0.5, ly=ceilY+20;
  ctx.save(); ctx.shadowColor=agentColor; ctx.shadowBlur=30;
  ctx.fillStyle=`rgba(${r},${g},${b},0.9)`;
  ctx.beginPath(); ctx.arc(lx,ly+16,7,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle=`rgba(${r},${g},${b},0.35)`; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(lx,ceilY); ctx.lineTo(lx,ly+9); ctx.stroke();
  const llg=ctx.createRadialGradient(lx,ly,0,lx,ly,CW*0.45);
  llg.addColorStop(0,`rgba(${r},${g},${b},0.14)`); llg.addColorStop(0.4,`rgba(${r},${g},${b},0.05)`); llg.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=llg; ctx.fillRect(0,0,CW,CH);

  // ── Crew-specific furniture ──────────────────────────────────
  if (crew === "poet") {
    // Bookshelf on back wall (right)
    const bsx=CW*0.63, bsy=ceilY+(floorY-ceilY)*0.12, bsw=CW*0.3, bsh=(floorY-ceilY)*0.6;
    ctx.fillStyle=`rgb(${r*0.35+55|0},${g*0.28+44|0},${b*0.18+32|0})`;
    ctx.fillRect(bsx,bsy,bsw,bsh);
    const bc=["#c84040","#4065c8","#40a845","#c8a520","#9035c8","#c85820","#50c8c0","#c84090"];
    for(let sh=0;sh<3;sh++) for(let bk=0;bk<7;bk++){
      ctx.fillStyle=bc[(sh*7+bk)%bc.length];
      ctx.fillRect(bsx+5+bk*(bsw-10)/7,bsy+8+sh*(bsh/3.3),(bsw-10)/7-2,bsh/3.5);
    }
    // Writing desk
    const dx=CW*0.58, dy=floorY-CH*0.13, dw=CW*0.32, dh=CH*0.055;
    ctx.fillStyle=`rgb(${r*0.38+75|0},${g*0.28+58|0},${b*0.18+40|0})`;
    ctx.fillRect(dx,dy,dw,dh); ctx.fillRect(dx+6,dy+dh,9,CH*0.13); ctx.fillRect(dx+dw-15,dy+dh,9,CH*0.13);
    // Open book on desk
    ctx.fillStyle="#e8dcc0"; ctx.beginPath(); ctx.ellipse(dx+dw*0.4,dy-5,dw*0.28,12,-0.05,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#a09070"; ctx.lineWidth=0.8;
    for(let bl=0;bl<5;bl++){ ctx.beginPath(); ctx.moveTo(dx+dw*0.18,dy-4+bl*4-8); ctx.lineTo(dx+dw*0.58,dy-4+bl*4-8); ctx.stroke(); }
    // Quill
    ctx.strokeStyle="#d4b840"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(dx+dw*0.75,dy-22); ctx.lineTo(dx+dw*0.6,dy-2); ctx.stroke();
    // Star chart poster
    ctx.fillStyle="#060415"; ctx.fillRect(CW*0.28,ceilY+18,CW*0.22,(floorY-ceilY)*0.38);
    for(let si2=0;si2<15;si2++){
      ctx.fillStyle=`rgba(${r+50|0},${g+60|0},255,0.8)`;
      ctx.beginPath(); ctx.arc(CW*0.3+si2*13%70,ceilY+25+si2*17%55,1.5,0,Math.PI*2); ctx.fill();
    }
  } else if (crew === "builder") {
    // Workbench
    const wx=CW*0.52, wy=floorY-CH*0.13, ww=CW*0.38, wh=CH*0.055;
    ctx.fillStyle=`rgb(${r*0.48+95|0},${g*0.38+72|0},${b*0.24+48|0})`;
    ctx.fillRect(wx,wy,ww,wh); ctx.fillRect(wx+5,wy+wh,10,CH*0.13); ctx.fillRect(wx+ww-15,wy+wh,10,CH*0.13);
    // Blueprint on bench
    ctx.fillStyle="#183060"; ctx.fillRect(wx+ww*0.1,wy-14,ww*0.65,14);
    ctx.strokeStyle="#6699ee"; ctx.lineWidth=0.8;
    ctx.strokeRect(wx+ww*0.14,wy-12,ww*0.55,10);
    ctx.beginPath(); ctx.moveTo(wx+ww*0.32,wy-12); ctx.lineTo(wx+ww*0.32,wy-2);
    ctx.moveTo(wx+ww*0.14,wy-7); ctx.lineTo(wx+ww*0.7,wy-7); ctx.stroke();
    // Gear on bench
    const gx=wx+ww*0.8, gy=wy-15;
    ctx.fillStyle=`rgba(${r},${g},${b},0.85)`;
    for(let gt=0;gt<8;gt++){
      const ga=gt/8*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(gx+Math.cos(ga)*12,gy+Math.sin(ga)*12);
      ctx.arc(gx,gy,12,ga-0.22,ga+0.22); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle=`rgba(${r},${g},${b},0.5)`; ctx.beginPath(); ctx.arc(gx,gy,5,0,Math.PI*2); ctx.fill();
    // Tools hanging on wall
    const toolCols=[`rgba(${r},${g},${b},0.75)`,"#777","#aaa","#c09030","#777"];
    for(let tl=0;tl<5;tl++){
      const tx=CW*0.6+tl*CW*0.07, ty2=ceilY+(floorY-ceilY)*0.18;
      ctx.strokeStyle=toolCols[tl]; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(tx,ty2); ctx.lineTo(tx,ty2+45); ctx.stroke();
      ctx.fillStyle=toolCols[tl]; ctx.fillRect(tx-7,ty2-10,14,10);
      ctx.fillStyle="#555"; ctx.beginPath(); ctx.arc(tx,ty2+3,4,0,Math.PI*2); ctx.fill();
    }
  } else if (crew === "ambassador") {
    // Round meeting table
    const tbl=CW*0.55, tby=floorY-CH*0.1, tbw=CW*0.38;
    ctx.fillStyle=`rgb(${r*0.32+72|0},${g*0.26+60|0},${b*0.18+45|0})`;
    ctx.beginPath(); ctx.ellipse(tbl,tby,tbw*0.5,tbw*0.17,0,0,Math.PI*2); ctx.fill();
    ctx.fillRect(tbl-8,tby,16,CH*0.1);
    // Documents
    for(let dc=0;dc<3;dc++){
      ctx.fillStyle="rgba(238,228,208,0.92)"; ctx.save();
      ctx.translate(tbl-28+dc*28,tby-5); ctx.rotate(-0.08+dc*0.08);
      ctx.fillRect(-16,-11,32,22); ctx.restore();
    }
    // World map on back wall
    ctx.fillStyle="#0e1e36"; ctx.fillRect(CW*0.28,ceilY+14,CW*0.38,(floorY-ceilY)*0.48);
    ctx.fillStyle=`rgba(${r*0.4+55|0},${g*0.4+65|0},${b*0.2+35|0},0.75)`;
    ctx.beginPath(); ctx.ellipse(CW*0.36,ceilY+45,28,20,0.25,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(CW*0.52,ceilY+58,20,14,-0.15,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(CW*0.60,ceilY+40,12,10,0.1,0,Math.PI*2); ctx.fill();
    // Flag
    ctx.strokeStyle="#666"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(CW*0.82,floorY); ctx.lineTo(CW*0.82,floorY-CH*0.42); ctx.stroke();
    ctx.fillStyle=`rgba(${r},${g},${b},0.88)`; ctx.fillRect(CW*0.82,floorY-CH*0.42,CW*0.1,CH*0.16);
    ctx.fillStyle="rgba(255,255,255,0.72)"; ctx.font=`bold ${CH*0.06}px Georgia`; ctx.textAlign="center";
    ctx.fillText("✦",CW*0.87,floorY-CH*0.35); ctx.textAlign="left";
  } else {
    // Dreamer: floating books, telescope, stars, dream catcher
    const ft=Date.now()*0.001;
    // Floating books
    const fc=["#c04070","#4070c0","#60c040","#c09820"];
    for(let fb=0;fb<4;fb++){
      const fx=CW*(0.38+fb*0.1), fy=floorY-CH*0.38-Math.sin(ft+fb*1.6)*14;
      ctx.save(); ctx.translate(fx,fy); ctx.rotate(Math.sin(ft*0.8+fb)*0.18);
      ctx.fillStyle=fc[fb%4]; ctx.fillRect(-13,-8,26,16); ctx.restore();
    }
    // Dream catcher
    const dcx=CW*0.42, dcy=ceilY+42;
    ctx.strokeStyle=`rgba(${r},${g},${b},0.55)`; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(dcx,dcy,24,0,Math.PI*2); ctx.stroke();
    for(let dc=0;dc<6;dc++){
      const da=dc/6*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(dcx+Math.cos(da)*24,dcy+Math.sin(da)*24); ctx.lineTo(dcx,dcy); ctx.stroke();
    }
    ctx.strokeStyle=`rgba(${r},${g},${b},0.3)`; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(dcx,dcy+24); ctx.lineTo(dcx,dcy+60); ctx.stroke();
    // Telescope
    ctx.save(); ctx.translate(CW*0.75,floorY-CH*0.05); ctx.rotate(-0.45);
    ctx.fillStyle=`rgba(${r},${g},${b},0.72)`;
    ctx.fillRect(-5,-65,10,65); ctx.fillRect(-9,-65,18,-12); ctx.restore();
    // Ceiling stars
    for(let cs=0;cs<20;cs++){
      const csx=CW*0.28+(cs*137%100)/100*CW*0.66, csy=ceilY+(cs*73%100)/100*(floorY-ceilY)*0.65;
      const ct=Math.sin(ft*2.2+cs)*0.42+0.58;
      ctx.fillStyle=`rgba(${r},${g},${b},${ct*0.72})`;
      ctx.beginPath(); ctx.arc(csx,csy,1.8,0,Math.PI*2); ctx.fill();
    }
    // Floor rug
    ctx.fillStyle=`rgba(${r*0.25+35|0},${g*0.25+30|0},${b*0.25+48|0},0.55)`;
    ctx.beginPath(); ctx.ellipse(CW*0.55,floorY+8,CW*0.28,CH*0.04,0,0,Math.PI*2); ctx.fill();
  }

  // Agent orb floating in centre of room
  const orbY=floorY-CH*0.28+Math.sin(Date.now()*0.0022)*6;
  const og=ctx.createRadialGradient(CW/2,orbY,0,CW/2,orbY,18);
  og.addColorStop(0,"rgba(255,255,255,0.97)"); og.addColorStop(0.4,`rgba(${r},${g},${b},0.92)`); og.addColorStop(1,`rgba(${r},${g},${b},0)`);
  ctx.save(); ctx.shadowColor=agentColor; ctx.shadowBlur=28;
  ctx.beginPath(); ctx.arc(CW/2,orbY,14,0,Math.PI*2); ctx.fillStyle=og; ctx.fill(); ctx.restore();
  const olog=ctx.createRadialGradient(CW/2,orbY,0,CW/2,orbY,52);
  olog.addColorStop(0,`rgba(${r},${g},${b},0.22)`); olog.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=olog; ctx.beginPath(); ctx.arc(CW/2,orbY,52,0,Math.PI*2); ctx.fill();
}

// ── Interior overlay React component ──────────────────────────
const HouseInteriorView = memo(function HouseInteriorView({
  agent, biome, onExit, onChat,
}: {
  agent: { agentName: string; crew: string; color: string };
  biome: { sky0: string; terrain: string };
  onExit: () => void;
  onChat: () => void;
}) {
  const canvasRef2 = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef2.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let lastDrawTime = 0;
    // Size canvas once on mount
    const cw = window.innerWidth; const ch = window.innerHeight;
    canvas.width = Math.min(cw, 820); canvas.height = Math.min(ch * 0.8, 560);
    const loop = (ts: number) => {
      // Throttle to ~20fps to avoid GPU overload
      if (ts - lastDrawTime > 50) {
        lastDrawTime = ts;
        if (canvas.width > 0 && canvas.height > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawHouseInterior(ctx, canvas.width, canvas.height, agent.crew, biome.sky0, agent.color);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [agent, biome]);

  const crewLabel: Record<string,string> = { poet:"POET", builder:"BUILDER", ambassador:"AMBASSADOR", dreamer:"DREAMER" };
  const [r,g,b] = [parseInt(agent.color.slice(1,3),16),parseInt(agent.color.slice(3,5),16),parseInt(agent.color.slice(5,7),16)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.7)"}}>
      <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{width:"min(820px,95vw)",height:"min(560px,80vh)",border:`1px solid rgba(${r},${g},${b},0.4)`}}>
        {/* Interior canvas */}
        <canvas ref={canvasRef2} className="absolute inset-0 w-full h-full" />
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3" style={{background:"rgba(0,0,0,0.55)"}}>
          <button onClick={onExit} className="text-xs font-mono opacity-60 hover:opacity-100 transition-opacity" style={{color:`rgba(${r},${g},${b},1)`}}>
            ← RETURN TO WORLD
          </button>
          <div className="text-center">
            <div className="text-xs tracking-widest opacity-55" style={{color:`rgba(${r},${g},${b},0.85)`}}>{crewLabel[agent.crew] ?? agent.crew.toUpperCase()}</div>
            <div className="font-serif text-white text-base tracking-wide">{agent.agentName}</div>
          </div>
          <button onClick={onChat} className="text-xs font-mono opacity-60 hover:opacity-100 transition-opacity" style={{color:`rgba(${r},${g},${b},1)`}}>
            TALK TO AGENT →
          </button>
        </div>
        {/* Bottom label */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className="text-xs font-mono opacity-35 text-white tracking-widest">HOME · {biome.terrain.toUpperCase()} BIOME</span>
        </div>
      </div>
    </div>
  );
});

export default function World() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef({
    px: BIOME_W * 6 + BIOME_W * 0.4, // player world x (start in QÖZIU MËAZIW — reflection salt flat)
    py: 0,                    // player world y (set on first render)
    pvx: 0, pvy: 0,           // player velocity
    camX: 0, camY: 0,         // camera world position (center of screen)
    keys: { left:false, right:false, up:false, down:false, jump:false },
    onGround: false,
    lastTime: 0,
    speechClock: 0,
    initialized: false,
    particleT: 0,
    zoom: 1.0, targetZoom: 1.0,   // camera zoom for house view
    zoomTargetX: 0, zoomTargetY: 0, // world pos to zoom toward
    lockCam: false,               // true = camera follows zoomTarget, not player
  });
  const agentsRef = useRef<WorldAgent[]>([]);
  const particlesRef = useRef<{x:number,y:number,vx:number,vy:number,alpha:number,size:number,color:string,type:string}[]>([]);
  const animRef = useRef<number>(0);

  const [hoveredAgent, setHoveredAgent] = useState<WorldAgent|null>(null);
  const [selectedAgent, setSelectedAgent] = useState<WorldAgent|null>(null);
  const [zoomedAgent, setZoomedAgent] = useState<WorldAgent|null>(null);
  const [currentBiome, setCurrentBiome] = useState(3);
  const [showControls, setShowControls] = useState(true);
  const zoomedAgentRef = useRef<WorldAgent|null>(null);

  const exitHouseView = useCallback(() => {
    const st = stateRef.current;
    st.targetZoom = 1.0;
    st.lockCam = false;
    setZoomedAgent(null);
    zoomedAgentRef.current = null;
  }, []);

  // ESC key to exit house view
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") exitHouseView(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [exitHouseView]);

  type RawAgent = {
    agentName: string; crew: string; avatarColor?: string;
    worldBiome?: number; worldXOffset?: number; houseExteriorUrl?: string;
  };

  const { data: rawAgents } = useQuery<RawAgent[]>({
    queryKey: ["/api/agents/world-sample"],
    queryFn: async () => { const r = await fetch("/api/agents/world-sample"); return r.ok ? r.json() : []; },
    staleTime: 60000,
  });

  // House image cache — keyed by URL, value is loaded HTMLImageElement (or null if failed)
  const houseImgCache = useRef<Map<string, HTMLImageElement | null>>(new Map());

  // Place agents at their real home biome positions when data arrives
  useEffect(() => {
    if (!rawAgents?.length) return;
    agentsRef.current = rawAgents.map((a, i) => {
      // Use stored biome position if available, else fall back to evenly spread placeholder
      let bx: number;
      if (a.worldBiome != null && a.worldXOffset != null) {
        bx = a.worldBiome * BIOME_W + a.worldXOffset;
      } else {
        const biomeIdx = i % BIOMES.length;
        bx = biomeIdx * BIOME_W + 200 + ((i * 137) % (BIOME_W - 400));
      }
      const biomeIdx = Math.min(Math.floor(bx / BIOME_W), BIOMES.length - 1);
      const by = terrainY(bx, biomeIdx, BIOMES[biomeIdx]) - 60 - ((i * 79) % 80);
      const color = CREW_COLORS[a.crew] ?? "#ffffff";

      // Start loading house image if we have one and it isn't cached yet
      if (a.houseExteriorUrl && !houseImgCache.current.has(a.houseExteriorUrl)) {
        houseImgCache.current.set(a.houseExteriorUrl, null); // mark as loading
        const img = new Image();
        img.onload  = () => houseImgCache.current.set(a.houseExteriorUrl!, img);
        img.onerror = () => houseImgCache.current.set(a.houseExteriorUrl!, null);
        img.src = a.houseExteriorUrl;
      }

      return {
        id: `${a.agentName}-${i}`, worldX: bx, worldY: by,
        agentName: a.agentName, crew: a.crew, color,
        pulsePhase: (i * 2.39996) % (Math.PI * 2),
        pulseSpeed: 0.007 + ((i * 0.003) % 0.012),
        vx: (((i * 7) % 10) - 5) * 0.06, vy: (((i * 11) % 6) - 3) * 0.05,
        baseX: bx, baseY: by,
        speechText: undefined, speechTimer: 0, speechAlpha: 0,
        houseExteriorUrl: a.houseExteriorUrl,
      };
    });
  }, [rawAgents]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    onResize();
    window.addEventListener("resize", onResize);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = stateRef.current.keys;
      if (e.key==="ArrowLeft"  || e.key==="a"||e.key==="A") k.left  = down;
      if (e.key==="ArrowRight" || e.key==="d"||e.key==="D") k.right = down;
      if (e.key==="ArrowUp"    || e.key==="w"||e.key==="W") k.up    = down;
      if (e.key==="ArrowDown"  || e.key==="s"||e.key==="S") k.down  = down;
      if (e.key===" "||e.key==="ArrowUp"||e.key==="w"||e.key==="W") k.jump = down;
      if (down) e.preventDefault();
    };
    window.addEventListener("keydown", e => onKey(e, true));
    window.addEventListener("keyup",   e => onKey(e, false));

    // Mobile touch
    let touchStartX = 0, touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      const k = stateRef.current.keys;
      k.left  = dx < -20;
      k.right = dx > 20;
      k.up    = dy < -30;
      k.down  = dy > 30;
      e.preventDefault();
    };
    const onTouchEnd = () => {
      const k = stateRef.current.keys;
      k.left = k.right = k.up = k.down = k.jump = false;
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive:true });
    canvas.addEventListener("touchmove",  onTouchMove,  { passive:false });
    canvas.addEventListener("touchend",   onTouchEnd);

    const render = (ts: number) => {
      const dt = Math.min((ts - stateRef.current.lastTime) / 1000, 0.05);
      stateRef.current.lastTime = ts;
      const W = canvas.width, H = canvas.height;
      const ctx = canvas.getContext("2d")!;
      const st = stateRef.current;

      // ── CRASH PREVENTION: pause world rendering while house interior is open ──
      if (zoomedAgentRef.current) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      // Initialize player Y on first frame
      if (!st.initialized) {
        const bIdx = biomeAt(st.px);
        st.py = terrainY(st.px, bIdx, BIOMES[bIdx]) - 20;
        st.camX = st.px; st.camY = st.py - H * 0.25;
        st.initialized = true;
      }

      // ── Player physics ──────────────────────────────────────
      const k = st.keys;
      if (k.left)  st.pvx -= MOVE_SPD * dt * 8;
      if (k.right) st.pvx += MOVE_SPD * dt * 8;
      if (!k.left && !k.right) st.pvx *= (1 - dt * 10);

      st.pvx = Math.max(-MOVE_SPD, Math.min(MOVE_SPD, st.pvx));

      // Gravity + jump
      if (k.jump && st.onGround) {
        st.pvy = JUMP_V;
        st.onGround = false;
      }
      if (!st.onGround) st.pvy += GRAV * dt;
      st.pvy = Math.max(-500, Math.min(800, st.pvy));

      if (k.up && !k.jump)  st.pvy = Math.max(st.pvy, -MOVE_SPD * 0.5);
      if (k.down) st.pvy  = Math.min(st.pvy + MOVE_SPD * dt * 4, MOVE_SPD * 0.6);

      st.px += st.pvx * dt;
      st.py += st.pvy * dt;
      st.px = Math.max(20, Math.min(WORLD_W - 20, st.px));

      // Ground collision
      const pBiome = biomeAt(st.px);
      const groundY = terrainY(st.px, pBiome, BIOMES[pBiome]);
      const playerH = 14;
      if (st.py + playerH >= groundY) {
        st.py = groundY - playerH;
        st.pvy = 0;
        st.onGround = true;
      } else {
        st.onGround = false;
      }

      // Zoom animation
      st.zoom += (st.targetZoom - st.zoom) * Math.min(1, dt * 4.5);

      // Camera follows player, or zoom target when locked
      const targetCamX = st.lockCam ? st.zoomTargetX : st.px;
      const targetCamY = st.lockCam ? st.zoomTargetY : st.py - H * 0.32;
      const camSpeed = st.lockCam ? 5.5 : CAM_LERP;
      st.camX += (targetCamX - st.camX) * camSpeed * (dt * 60);
      st.camY += (targetCamY - st.camY) * camSpeed * (dt * 60);

      // World-to-screen transform (incorporates zoom)
      const toScreen = (wx: number, wy: number, pf: number) => ({
        sx: (wx - st.camX) * pf * st.zoom + W / 2,
        sy: (wy - st.camY) * pf * st.zoom + H / 2,
      });

      // ── Sky gradient (current + adjacent biomes) ─────────────
      const curBiomeIdx = biomeAt(st.px);
      const biome = BIOMES[curBiomeIdx];
      const nextBiome = BIOMES[Math.min(BIOMES.length-1, curBiomeIdx+1)];
      const localX = st.px - curBiomeIdx * BIOME_W;
      const blend = Math.max(0, (localX - BIOME_W*0.75) / (BIOME_W*0.25));

      const skyTop  = blendHex(biome.sky0, nextBiome.sky0, blend);
      const skyMid  = blendHex(biome.sky1, nextBiome.sky1, blend);
      const skyBot  = blendHex(biome.sky2, nextBiome.sky2, blend);
      const accentC = blendHex(biome.accent, nextBiome.accent, blend);
      const acR = [parseInt(accentC.slice(1,3),16),parseInt(accentC.slice(3,5),16),parseInt(accentC.slice(5,7),16)];

      const skyGrad = ctx.createLinearGradient(0,0,0,H);
      skyGrad.addColorStop(0, skyTop);
      skyGrad.addColorStop(0.5, skyMid);
      skyGrad.addColorStop(0.78, skyBot);
      // Horizon warmth layer
      skyGrad.addColorStop(1, blendHex(skyBot, biome.groundColor, 0.45));
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0,0,W,H);

      // ── Atmospheric light source: sun / moon / cave glow ─────
      if (biome.terrain === "cave") {
        // Bioluminescent ceiling light source — vivid glow from above
        const cvG = ctx.createRadialGradient(W*0.5, H*0.05, 0, W*0.5, H*0.05, W*0.55);
        cvG.addColorStop(0, `rgba(${Math.min(255,acR[0]+90)},${Math.min(255,acR[1]+90)},${Math.min(255,acR[2]+90)},0.55)`);
        cvG.addColorStop(0.35, `rgba(${acR[0]},${acR[1]},${acR[2]},0.18)`);
        cvG.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = cvG; ctx.fillRect(0, 0, W, H*0.5);
        // Secondary ambient fill — tints the whole cave with accent colour
        ctx.fillStyle = `rgba(${Math.max(12,acR[0]*0.22|0)},${Math.max(12,acR[1]*0.22|0)},${Math.max(18,acR[2]*0.28|0)},0.55)`;
        ctx.fillRect(0, 0, W, H);
      } else {
        // Sun disc + corona for all open biomes
        const sunX = W * 0.72;
        const sunY = H * (biome.terrain==="peaks"||biome.terrain==="spires" ? 0.10 : 0.17);
        const sunVisible = biome.terrain !== "jungle";
        if (sunVisible) {
          // Disc
          const sD = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 13);
          sD.addColorStop(0, "rgba(255,255,230,1)");
          sD.addColorStop(0.4, "rgba(255,238,160,0.95)");
          sD.addColorStop(1, `rgba(${Math.min(255,acR[0]+110)},${Math.min(255,acR[1]+60)},${Math.min(255,acR[2]+20)},0.5)`);
          ctx.fillStyle = sD; ctx.beginPath(); ctx.arc(sunX, sunY, 13, 0, Math.PI*2); ctx.fill();
          // Corona
          const sC = ctx.createRadialGradient(sunX, sunY, 11, sunX, sunY, H*0.65);
          sC.addColorStop(0, `rgba(${Math.min(255,acR[0]+110)},${Math.min(255,acR[1]+55)},${Math.min(255,acR[2]+10)},0.30)`);
          sC.addColorStop(0.18, `rgba(${Math.min(255,acR[0]+60)},${Math.min(255,acR[1]+30)},${acR[2]},0.12)`);
          sC.addColorStop(0.5, `rgba(${acR[0]},${acR[1]},${acR[2]},0.04)`);
          sC.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = sC; ctx.fillRect(0, 0, W, H);
        } else {
          // Jungle: diffuse green-gold canopy glow
          const jG = ctx.createLinearGradient(0, 0, 0, H*0.6);
          jG.addColorStop(0, `rgba(${acR[0]*0.3|0},${Math.min(255,acR[1]*0.5+40)|0},${acR[2]*0.2|0},0.3)`);
          jG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = jG; ctx.fillRect(0, 0, W, H*0.6);
        }
        // Horizon atmospheric glow — warm band at ground level
        const hY = H * 0.62;
        const hG = ctx.createLinearGradient(0, hY-160, 0, hY+80);
        hG.addColorStop(0, "rgba(0,0,0,0)");
        hG.addColorStop(0.45, `rgba(${Math.min(255,acR[0]+70)},${Math.min(255,acR[1]+35)},${Math.min(255,acR[2]+10)},0.22)`);
        hG.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = hG; ctx.fillRect(0, hY-160, W, 240);
      }

      // Enhanced stars — varied sizes, colors, cross-sparkle
      const starPalette = ["255,255,255","210,225,255","255,245,200","200,255,235","255,210,255"];
      for (let i=0;i<110;i++){
        const sx2 = ((i*137.508+curBiomeIdx*41.3)%1)*W;
        const sy2 = ((i*97.331+curBiomeIdx*19.7)%1)*(H*0.48);
        const twink = Math.sin(ts*0.001+i*0.71)*0.45+0.55;
        const sz2 = 0.4+(i%7)*0.18;
        const col2 = starPalette[i%5];
        ctx.beginPath();
        ctx.arc(sx2,sy2,sz2,0,Math.PI*2);
        ctx.fillStyle=`rgba(${col2},${twink*0.8})`;
        ctx.fill();
        if (i%9===0 && sz2>0.8){
          ctx.strokeStyle=`rgba(${col2},${twink*0.2})`;
          ctx.lineWidth=0.5;
          ctx.beginPath();
          ctx.moveTo(sx2-sz2*4,sy2); ctx.lineTo(sx2+sz2*4,sy2);
          ctx.moveTo(sx2,sy2-sz2*4); ctx.lineTo(sx2,sy2+sz2*4);
          ctx.stroke();
        }
      }

      // Aurora ribbons — vivid for ice/cave/peaks, subtle elsewhere
      const curFx = BIOME_FX[curBiomeIdx];
      const auroraBase = (biome.terrain==="cave"||biome.terrain==="peaks"||curFx==="ice") ? 0.16 : 0.04;
      if (auroraBase > 0.01) {
        const aC = [[acR[0]*0.4|0, Math.min(255,acR[1]*1.3|0), acR[2]],
                    [acR[0]*0.2|0, acR[1], Math.min(255,acR[2]*1.4|0)],
                    [Math.min(255,acR[0]*0.8|0), acR[1]*0.5|0, acR[2]]];
        for (let ai=0;ai<3;ai++){
          const [ar2,ag2,ab2]=aC[ai];
          ctx.beginPath();
          for (let x=0;x<=W;x+=6){
            const y=H*(0.10+ai*0.065)+Math.sin(x*0.006+ts*0.0009+ai*2.1)*28
                    +Math.cos(x*0.013+ts*0.0006+ai*1.4)*13;
            x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
          }
          ctx.strokeStyle=`rgba(${ar2},${ag2},${ab2},${auroraBase+ai*0.01})`;
          ctx.lineWidth=16+ai*6;
          ctx.stroke();
        }
      }

      // Cloud layer (slow drift, hidden in caves)
      if (biome.terrain !== "cave") {
        for (let ci=0;ci<8;ci++){
          const drift = (ci*197+ts*0.018*(ci%2?1:-0.7))%( W+320)-80;
          const cy2 = H*(0.20+(ci%4)*0.065);
          const cw = 70+ci*18;
          const ca = 0.05+(ci%3)*0.02;
          const cg = ctx.createRadialGradient(drift,cy2,0,drift,cy2,cw);
          cg.addColorStop(0,`rgba(${Math.min(255,acR[0]+70)},${Math.min(255,acR[1]+70)},${Math.min(255,acR[2]+70)},${ca})`);
          cg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=cg;
          ctx.beginPath(); ctx.ellipse(drift,cy2,cw,cw*0.4,0,0,Math.PI*2);
          ctx.fill();
        }
      }

      // ── Background mountain layers (far) ─────────────────────
      // Draw terrain for a range of world X values
      const drawTerrain = (layer: number, pf: number, alpha: number, colorA: string, colorB: string) => {
        const startWorldX = st.camX - W/(2*pf) - BIOME_W;
        const endWorldX   = st.camX + W/(2*pf) + BIOME_W;
        const step = 8;

        ctx.beginPath();
        let first = true;
        for (let wx = startWorldX; wx <= endWorldX; wx += step) {
          const bIdx = biomeAt(wx);
          const b    = BIOMES[Math.max(0,Math.min(BIOMES.length-1,bIdx))];
          const wy   = layer === 0 ? mountainY(wx, bIdx, b, 1)
                                   : mountainY(wx, bIdx, b, 2);
          const { sx, sy } = toScreen(wx, wy, pf);
          if (first) { ctx.moveTo(sx, sy); first = false; }
          else ctx.lineTo(sx, sy);
        }
        const { sx: ex, sy: ey } = toScreen(endWorldX, WORLD_H*1.2, pf);
        const { sx: s0 }         = toScreen(startWorldX, WORLD_H*1.2, pf);
        ctx.lineTo(ex, ey); ctx.lineTo(s0, ey); ctx.closePath();
        const gr = ctx.createLinearGradient(0, H*0.3, 0, H);
        gr.addColorStop(0, colorA); gr.addColorStop(1, colorB);
        ctx.fillStyle = gr;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      };

      // 4 parallax layers for depth — deepest to closest (Journey-style atmospheric depth)
      // Ensure minimum brightness so no layer is pure black
      const mB = (v: number, min: number) => Math.max(min, v);
      drawTerrain(0, 0.06, 0.50,
        `rgba(${mB(acR[0]*0.18|0,18)},${mB(acR[1]*0.18|0,18)},${mB(acR[2]*0.22|0,22)},0.5)`,
        `rgba(${mB(acR[0]*0.1|0,10)},${mB(acR[1]*0.1|0,10)},${mB(acR[2]*0.14|0,14)},0.25)`);
      drawTerrain(0, 0.14, 0.68,
        `rgba(${mB(acR[0]*0.38|0,28)},${mB(acR[1]*0.35|0,24)},${mB(acR[2]*0.38|0,28)},0.65)`,
        `rgba(${mB(acR[0]*0.2|0,16)},${mB(acR[1]*0.18|0,14)},${mB(acR[2]*0.2|0,18)},0.35)`);
      drawTerrain(1, 0.27, 0.78,
        `rgba(${mB(acR[0]*0.55|0,38)},${mB(acR[1]*0.52|0,34)},${mB(acR[2]*0.55|0,38)},0.78)`,
        `rgba(${mB(acR[0]*0.28|0,20)},${mB(acR[1]*0.25|0,18)},${mB(acR[2]*0.28|0,20)},0.45)`);
      drawTerrain(1, 0.48, 0.87,
        `rgba(${mB(acR[0]*0.48|0,35)},${mB(acR[1]*0.44|0,30)},${mB(acR[2]*0.48|0,35)},0.84)`,
        `rgba(${mB(acR[0]*0.22|0,18)},${mB(acR[1]*0.20|0,16)},${mB(acR[2]*0.22|0,18)},0.55)`);

      // ── Ground terrain (full detail) ─────────────────────────
      {
        const pf = 1.0;
        const startWX = st.camX - W/2 - BIOME_W;
        const endWX   = st.camX + W/2 + BIOME_W;
        ctx.beginPath();
        let first = true;
        for (let wx = startWX; wx <= endWX; wx += 4) {
          const bIdx = biomeAt(wx);
          const b    = BIOMES[Math.max(0,Math.min(BIOMES.length-1,bIdx))];
          const wy   = terrainY(wx, bIdx, b);
          const { sx, sy } = toScreen(wx, wy, pf);
          if (first) { ctx.moveTo(sx, sy); first = false; }
          else ctx.lineTo(sx, sy);
        }
        const { sx:ex, sy:ey } = toScreen(endWX, WORLD_H*1.5, pf);
        const { sx:s0 }        = toScreen(startWX, WORLD_H*1.5, pf);
        ctx.lineTo(ex,ey); ctx.lineTo(s0,ey); ctx.closePath();

        // Biome-specific ground gradient
        const gc1 = blendHex(biome.groundColor, nextBiome.groundColor, blend);
        const gc2 = blendHex(biome.groundColor2, nextBiome.groundColor2, blend);
        const [gc1r,gc1g,gc1b] = [parseInt(gc1.slice(1,3),16),parseInt(gc1.slice(3,5),16),parseInt(gc1.slice(5,7),16)];
        const groundGr = ctx.createLinearGradient(0, H*0.55, 0, H);
        groundGr.addColorStop(0, `rgb(${Math.min(255,gc1r+30)},${Math.min(255,gc1g+25)},${Math.min(255,gc1b+18)})`);
        groundGr.addColorStop(0.15, gc1);
        groundGr.addColorStop(1, gc2);
        ctx.fillStyle = groundGr;
        ctx.fill();

        // ── Sun-lit rim highlight on terrain top edge ─────────────
        ctx.save();
        ctx.beginPath(); first = true;
        for (let wx2 = startWX; wx2 <= endWX; wx2 += 4) {
          const bIdx2 = biomeAt(wx2);
          const b2 = BIOMES[Math.max(0,Math.min(BIOMES.length-1,bIdx2))];
          const wy2 = terrainY(wx2, bIdx2, b2);
          const { sx: sx2, sy: sy2 } = toScreen(wx2, wy2, pf);
          if (first) { ctx.moveTo(sx2, sy2); first = false; }
          else ctx.lineTo(sx2, sy2);
        }
        ctx.shadowColor = `rgba(${Math.min(255,acR[0]+140)},${Math.min(255,acR[1]+80)},${Math.min(255,acR[2]+40)},0.8)`;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = `rgba(${Math.min(255,gc1r+80)},${Math.min(255,gc1g+60)},${Math.min(255,gc1b+40)},0.6)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // ── Biome surface FX (clipped to terrain) ─────────────────
        const fx = BIOME_FX[curBiomeIdx];
        const fxNext = BIOME_FX[Math.min(BIOMES.length-1, curBiomeIdx+1)];
        const activeFx = fx ?? (blend > 0.5 ? fxNext : undefined);
        if (activeFx) {
          ctx.save();
          ctx.clip(); // clips everything below to terrain polygon

          if (activeFx === "strata") {
            // Rainbow horizontal strata bands (GILUN LÖLMOQ) or red-white (KZUQIL LÖCIA)
            const isRainbow = curBiomeIdx === 47 || (blend > 0.5 && Math.min(BIOMES.length-1, curBiomeIdx+1) === 47);
            const bands = isRainbow
              ? ["#ff2020","#ff7020","#ffe020","#30c820","#2060ff","#7020c0","#ff2080"]
              : ["#ff4040","#ff8080","#ffffff","#ffc0c0","#ff6060","#ff3030","#ffaaaa"];
            const bandH = H / bands.length;
            bands.forEach((col, i) => {
              ctx.fillStyle = col + "55"; // 33% opacity
              ctx.fillRect(0, i * bandH, W, bandH + 2);
            });
            // Extra horizontal crack lines
            for (let ci = 0; ci < bands.length - 1; ci++) {
              ctx.strokeStyle = "rgba(255,255,255,0.12)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(0, (ci + 1) * bandH);
              ctx.lineTo(W, (ci + 1) * bandH);
              ctx.stroke();
            }
          }

          if (activeFx === "lava" || activeFx === "blufire") {
            // Animated glow blobs near ground surface
            const isBlue = activeFx === "blufire";
            for (let li = 0; li < 10; li++) {
              const rng3 = seededRand(li * 3977 + curBiomeIdx * 13);
              const blobWX = startWX + rng3() * (endWX - startWX);
              const blobWY = terrainY(blobWX, curBiomeIdx, biome) - 8 - rng3() * 30;
              const { sx: bsx, sy: bsy } = toScreen(blobWX, blobWY, 1.0);
              const pulse = Math.sin(ts * 0.003 + li * 1.7) * 0.5 + 0.5;
              const r = 18 + pulse * 20;
              const gr3 = ctx.createRadialGradient(bsx, bsy, 0, bsx, bsy, r);
              if (isBlue) {
                gr3.addColorStop(0, `rgba(80,120,255,${0.6 + pulse * 0.3})`);
                gr3.addColorStop(1, "rgba(20,40,200,0)");
              } else {
                gr3.addColorStop(0, `rgba(255,${80 + (pulse*60)|0},0,${0.7 + pulse * 0.2})`);
                gr3.addColorStop(1, "rgba(180,20,0,0)");
              }
              ctx.fillStyle = gr3;
              ctx.beginPath();
              ctx.arc(bsx, bsy, r, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          if (activeFx === "ice") {
            // White sparkle diamonds on ground
            for (let si = 0; si < 40; si++) {
              const rng3 = seededRand(si * 4111 + curBiomeIdx * 17);
              const spWX = startWX + rng3() * (endWX - startWX);
              const spWY = terrainY(spWX, curBiomeIdx, biome) + rng3() * 60;
              const { sx: spx, sy: spy } = toScreen(spWX, spWY, 1.0);
              const twink = Math.sin(ts * 0.002 + si * 1.3) * 0.5 + 0.5;
              const sz = (1 + rng3() * 3) * twink;
              ctx.fillStyle = `rgba(200,240,255,${0.4 + twink * 0.5})`;
              ctx.beginPath();
              ctx.moveTo(spx, spy - sz * 2);
              ctx.lineTo(spx + sz, spy);
              ctx.lineTo(spx, spy + sz * 2);
              ctx.lineTo(spx - sz, spy);
              ctx.closePath();
              ctx.fill();
            }
          }

          if (activeFx === "biolum") {
            // Glowing bioluminescent dots on ground surface
            for (let bi2 = 0; bi2 < 35; bi2++) {
              const rng3 = seededRand(bi2 * 5003 + curBiomeIdx * 23);
              const bWX = startWX + rng3() * (endWX - startWX);
              const bWY = terrainY(bWX, curBiomeIdx, biome) + 4 + rng3() * 40;
              const { sx: bsx2, sy: bsy2 } = toScreen(bWX, bWY, 1.0);
              const pulse2 = Math.sin(ts * 0.0015 + bi2 * 2.1) * 0.5 + 0.5;
              const gr4 = ctx.createRadialGradient(bsx2, bsy2, 0, bsx2, bsy2, 5 + pulse2 * 4);
              gr4.addColorStop(0, `rgba(${acR[0]},${acR[1]},${acR[2]},${0.7 + pulse2 * 0.3})`);
              gr4.addColorStop(1, `rgba(${acR[0]},${acR[1]},${acR[2]},0)`);
              ctx.fillStyle = gr4;
              ctx.beginPath();
              ctx.arc(bsx2, bsy2, 5 + pulse2 * 4, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          if (activeFx === "flowers") {
            // Small colour dots scattered on ground
            const flowerCols = curBiomeIdx === 44 ? ["#4488ff","#88aaff","#aaccff"]
                              : curBiomeIdx === 43 ? ["#ffee00","#ffe040","#ffd020"]
                              : curBiomeIdx === 50 ? ["#ff4080","#ff8040","#ffee00","#4488ff"]
                              : ["#ff8800","#ffaa20","#ff6010","#ffcc40"];
            for (let fi = 0; fi < 50; fi++) {
              const rng3 = seededRand(fi * 6007 + curBiomeIdx * 31);
              const fWX = startWX + rng3() * (endWX - startWX);
              const fWY = terrainY(fWX, curBiomeIdx, biome) - 2 - rng3() * 12;
              const { sx: fsx, sy: fsy } = toScreen(fWX, fWY, 1.0);
              const col = flowerCols[(fi % flowerCols.length)];
              ctx.fillStyle = col + "cc";
              ctx.beginPath();
              ctx.arc(fsx, fsy, 2 + rng3() * 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          if (activeFx === "salt") {
            // Bright shimmer lines on flat salt surface
            for (let ri = 0; ri < 20; ri++) {
              const rng3 = seededRand(ri * 7019 + curBiomeIdx * 37);
              const rWX = startWX + rng3() * (endWX - startWX);
              const rWY = terrainY(rWX, curBiomeIdx, biome) + rng3() * 20;
              const { sx: rsx, sy: rsy } = toScreen(rWX, rWY, 1.0);
              const shimmer = Math.sin(ts * 0.001 + ri * 0.8) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(255,255,255,${0.25 + shimmer * 0.35})`;
              ctx.fillRect(rsx, rsy, 30 + rng3() * 60, 1);
            }
          }

          if (activeFx === "spring") {
            // Rainbow ring shimmer on ground
            for (let ri2 = 0; ri2 < 5; ri2++) {
              const rng3 = seededRand(ri2 * 8017 + curBiomeIdx * 41);
              const cWX = startWX + rng3() * (endWX - startWX);
              const cWY = terrainY(cWX, curBiomeIdx, biome) + 10 + rng3() * 40;
              const { sx: csx, sy: csy } = toScreen(cWX, cWY, 1.0);
              const rings = ["#ff3030","#ffaa00","#ffee00","#20e040","#2080ff","#9020ff"];
              rings.forEach((rc, rci) => {
                const r2 = 20 + rci * 12 + Math.sin(ts * 0.002 + ri2) * 4;
                ctx.strokeStyle = rc + "88";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(csx, csy, r2, 0, Math.PI * 2);
                ctx.stroke();
              });
            }
          }

          ctx.restore();
        }

        // Glowing ground edge
        ctx.beginPath(); first = true;
        for (let wx = startWX; wx <= endWX; wx += 4) {
          const bIdx = biomeAt(wx);
          const b = BIOMES[Math.max(0,Math.min(BIOMES.length-1,bIdx))];
          const wy = terrainY(wx, bIdx, b);
          const { sx, sy } = toScreen(wx, wy, pf);
          if (first) { ctx.moveTo(sx, sy); first = false; }
          else ctx.lineTo(sx, sy);
        }
        ctx.save();
        ctx.shadowColor = accentC;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = `rgba(${acR[0]},${acR[1]},${acR[2]},0.7)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 36;
        ctx.strokeStyle = `rgba(${acR[0]},${acR[1]},${acR[2]},0.3)`;
        ctx.stroke();
        ctx.restore();

        // Ground-level mist for cave and jungle biomes
        if (biome.terrain === "cave" || biome.terrain === "jungle") {
          const mistY = H * 0.72;
          const mist = ctx.createLinearGradient(0, mistY - 40, 0, mistY + 60);
          mist.addColorStop(0, "rgba(0,0,0,0)");
          mist.addColorStop(0.5, `rgba(${acR[0]*0.3|0},${acR[1]*0.3|0},${acR[2]*0.3|0},0.18)`);
          mist.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = mist;
          ctx.fillRect(0, mistY - 40, W, 100);
        }
      }

      // ── Cave biome: ceiling ───────────────────────────────────
      if (biome.terrain === "cave") {
        const pf = 1.0;
        const startWX = st.camX - W/2 - 200;
        const endWX   = st.camX + W/2 + 200;
        ctx.beginPath();
        let first = true;
        for (let wx = startWX; wx <= endWX; wx += 6) {
          const bIdx = biomeAt(wx);
          const b = BIOMES[Math.max(0,Math.min(BIOMES.length-1,bIdx))];
          const local = wx - bIdx*BIOME_W;
          const rng2 = seededRand(bIdx*1231+99);
          const ph = rng2();
          const cy = WORLD_H * 0.12 + Math.sin(local*0.003+ph*6)*40 + Math.cos(local*0.006+ph*3)*20;
          const { sx, sy } = toScreen(wx, cy, pf);
          if (first) { ctx.moveTo(sx, sy); first = false; }
          else ctx.lineTo(sx, sy);
        }
        const { sx:ex } = toScreen(endWX, 0, pf);
        const { sx:s0 } = toScreen(startWX, 0, pf);
        ctx.lineTo(ex, 0); ctx.lineTo(s0, 0); ctx.closePath();
        ctx.fillStyle = `rgba(5,5,15,0.92)`;
        ctx.fill();

        // Glowworms on ceiling (for cave biomes)
        for (let i=0;i<30;i++){
          const wx = startWX + (i/30)*(endWX-startWX);
          const bIdx = biomeAt(wx);
          const b = BIOMES[Math.max(0,Math.min(BIOMES.length-1,bIdx))];
          const local = wx - bIdx*BIOME_W;
          const rng2 = seededRand(bIdx*1231+99);
          const ph = rng2();
          const cy = WORLD_H*0.12 + Math.sin(local*0.003+ph*6)*40 + Math.cos(local*0.006+ph*3)*20 + 10;
          const { sx, sy } = toScreen(wx, cy, pf);
          const twink = Math.sin(ts*0.002+i)*0.5+0.5;
          const gr2 = ctx.createRadialGradient(sx,sy,0,sx,sy,6);
          gr2.addColorStop(0, `rgba(${acR[0]},${acR[1]},${acR[2]},${twink*0.9})`);
          gr2.addColorStop(1, `rgba(${acR[0]},${acR[1]},${acR[2]},0)`);
          ctx.beginPath(); ctx.arc(sx,sy,6,0,Math.PI*2);
          ctx.fillStyle=gr2; ctx.fill();
        }
      }

      // ── Biome-specific atmospheric particles ─────────────────
      const pType = curFx==="ice" ? "snow"
                  : curFx==="lava"||curFx==="blufire" ? "ember"
                  : biome.terrain==="jungle" ? "firefly"
                  : curFx==="flowers" ? "petal"
                  : biome.terrain==="cave" ? "spore"
                  : "dust";
      const pColor = pType==="snow" ? "#b0d8ff"
                   : pType==="ember" ? "#ff7020"
                   : pType==="firefly" ? "#88ffaa"
                   : pType==="petal" ? ["#ffaabb","#ffcc88","#88ccff","#ccaaff"][curBiomeIdx%4]
                   : pType==="spore" ? "#80ffe0"
                   : accentC;

      st.particleT += dt;
      const maxP = pType==="firefly"?35:pType==="snow"?70:55;
      if (particlesRef.current.length < maxP) {
        const isSnow = pType==="snow";
        const isEmber = pType==="ember";
        particlesRef.current.push({
          x: Math.random()*W,
          y: isSnow?-5 : isEmber?H*0.85+Math.random()*H*0.15 : Math.random()*H,
          vx: isSnow?(Math.random()-0.5)*12 : isEmber?(Math.random()-0.5)*25 : (Math.random()-0.5)*15,
          vy: isSnow?Math.random()*18+6 : isEmber?-(Math.random()*35+15) : -Math.random()*12-2,
          alpha:0, size:pType==="firefly"?Math.random()*2.5+1.5:Math.random()*2.2+0.5,
          color:pColor, type:pType,
        });
      }
      for (let i=particlesRef.current.length-1;i>=0;i--){
        const p = particlesRef.current[i];
        p.x += p.vx*dt; p.y += p.vy*dt;
        if (pType==="snow"||pType==="petal") p.vy=Math.min(p.vy+15*dt,35);
        if (pType==="firefly"){ p.vx+=Math.sin(st.particleT*1.2+i)*0.5*dt; p.vy+=Math.cos(st.particleT*0.9+i)*0.3*dt; }
        p.alpha = Math.sin(st.particleT*0.8+i)*0.3+0.3;
        const gone = pType==="snow"?p.y>H+10 : pType==="ember"?p.y<-20 : p.y<-10||p.x<-10||p.x>W+10;
        if(gone){ particlesRef.current.splice(i,1); continue; }
        const pR=[parseInt(p.color.slice(1,3),16),parseInt(p.color.slice(3,5),16),parseInt(p.color.slice(5,7),16)];

        if (pType==="snow"){
          ctx.save();
          ctx.strokeStyle=`rgba(${pR[0]},${pR[1]},${pR[2]},${p.alpha*0.75})`;
          ctx.lineWidth=0.9;
          ctx.beginPath();
          ctx.moveTo(p.x-p.size,p.y); ctx.lineTo(p.x+p.size,p.y);
          ctx.moveTo(p.x,p.y-p.size); ctx.lineTo(p.x,p.y+p.size);
          const d=p.size*0.65;
          ctx.moveTo(p.x-d,p.y-d); ctx.lineTo(p.x+d,p.y+d);
          ctx.moveTo(p.x+d,p.y-d); ctx.lineTo(p.x-d,p.y+d);
          ctx.stroke(); ctx.restore();
        } else if (pType==="ember"){
          const eg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*4.5);
          eg.addColorStop(0,`rgba(255,220,80,${p.alpha})`);
          eg.addColorStop(0.4,`rgba(255,80,0,${p.alpha*0.5})`);
          eg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=eg;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*4.5,0,Math.PI*2); ctx.fill();
        } else if (pType==="firefly"){
          const fg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*6);
          fg.addColorStop(0,`rgba(${pR[0]},${pR[1]},${pR[2]},${p.alpha*0.9})`);
          fg.addColorStop(0.5,`rgba(${pR[0]},${pR[1]},${pR[2]},${p.alpha*0.3})`);
          fg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=fg;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*6,0,Math.PI*2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
          ctx.fillStyle=`rgba(${pR[0]},${pR[1]},${pR[2]},${p.alpha*0.65})`; ctx.fill();
        }
      }

      // ── Agent orbs ────────────────────────────────────────────
      st.speechClock += dt;
      if (st.speechClock > 5) {
        st.speechClock = 0;
        const ags = agentsRef.current;
        if (ags.length>0){
          const o = ags[Math.floor(Math.random()*ags.length)];
          const ws = CREW_WISDOMS[o.crew]??["..."];
          o.speechText = ws[Math.floor(Math.random()*ws.length)];
          o.speechTimer=0; o.speechAlpha=0;
        }
      }

      let hoveredNow: WorldAgent|null = null;
      const playerSX = W/2, playerSY = (st.py - st.camY)*1 + H/2;

      for (const ag of agentsRef.current) {
        const { sx, sy } = toScreen(ag.worldX, ag.worldY, 1.0);
        if (sx < -200 || sx > W+200 || sy < -200 || sy > H+200) continue;

        // Draw house at terrain level below agent
        const agBiomeIdx = biomeAt(ag.baseX);
        const agBiome = BIOMES[Math.max(0, Math.min(BIOMES.length-1, agBiomeIdx))];
        const houseGroundY = terrainY(ag.baseX, agBiomeIdx, agBiome);
        const { sx: hsx, sy: hsy } = toScreen(ag.baseX, houseGroundY, 1.0);

        // Render AI-generated house image if loaded, else fall back to procedural
        const houseImg = ag.houseExteriorUrl
          ? houseImgCache.current.get(ag.houseExteriorUrl) ?? null
          : null;
        if (houseImg instanceof HTMLImageElement) {
          const scale = st.zoom;
          const iw = 88 * scale, ih = Math.round(88 * scale * (320/512));
          ctx.save();
          // Slight shadow beneath
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 6 * scale;
          ctx.drawImage(houseImg, hsx - iw/2, hsy - ih, iw, ih);
          ctx.shadowBlur = 0;
          // Crew-colour glow border
          ctx.strokeStyle = ag.color + "88";
          ctx.lineWidth = 1.5 * scale;
          ctx.strokeRect(hsx - iw/2, hsy - ih, iw, ih);
          ctx.restore();
        } else {
          drawHouse(ctx, hsx, hsy, ag.color, agBiome.terrain, st.zoom);
        }

        ag.pulsePhase += ag.pulseSpeed * (dt*60);
        ag.worldX += ag.vx;
        ag.worldY += ag.vy;
        ag.vx += (ag.baseX-ag.worldX)*0.002;
        ag.vy += (ag.baseY-ag.worldY)*0.002;
        ag.vx *= 0.98; ag.vy *= 0.98;

        const pulse = Math.sin(ag.pulsePhase)*0.3+0.7;
        const r=[parseInt(ag.color.slice(1,3),16),parseInt(ag.color.slice(3,5),16),parseInt(ag.color.slice(5,7),16)];

        // Proximity to player
        const dist = Math.hypot(sx-playerSX, sy-playerSY);
        const near = dist < 120;
        if (near) hoveredNow = ag;

        // ── Journey-style pilgrim figure ─────────────────────────
        const fH = 28, fW = 11; // figure height / robe base width
        const figCY = sy - fH * 0.5; // figure center Y for glow
        const agMoving = Math.abs(ag.vx) > 0.5;
        const agLean = agMoving ? Math.sign(ag.vx) * 0.07 : 0;

        // Aura halo
        const haloR = fH * (near ? 2.0 : 1.3);
        const halo = ctx.createRadialGradient(sx, figCY, 0, sx, figCY, haloR);
        halo.addColorStop(0, `rgba(${r[0]},${r[1]},${r[2]},${near?0.35:0.18})`);
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(sx, figCY, haloR, 0, Math.PI*2);
        ctx.fillStyle = halo; ctx.fill();

        ctx.save(); ctx.translate(sx, sy); ctx.rotate(agLean);
        // Robe body (dark triangular silhouette)
        const rR = Math.max(8,r[0]*0.12|0), rG = Math.max(8,r[1]*0.12|0), rB = Math.max(12,r[2]*0.14|0);
        ctx.fillStyle = `rgba(${rR},${rG},${rB},0.93)`;
        ctx.beginPath();
        ctx.moveTo(0, -fH);
        ctx.lineTo(-fW*0.55, 0); ctx.lineTo(fW*0.55, 0);
        ctx.closePath(); ctx.fill();
        // Robe edge — crew colour highlight
        ctx.strokeStyle = `rgba(${r[0]},${r[1]},${r[2]},0.38)`;
        ctx.lineWidth = 1.3; ctx.stroke();
        // Head
        ctx.fillStyle = `rgba(${Math.min(255,r[0]+110)},${Math.min(255,r[1]+110)},${Math.min(255,r[2]+110)},0.92)`;
        ctx.beginPath(); ctx.arc(0, -fH, fW*0.21, 0, Math.PI*2); ctx.fill();
        // Glowing scarf streaming behind
        const scarfDir = agMoving ? -Math.sign(ag.vx) : 1;
        const scarfLen = 20 + pulse*6;
        const cpX = scarfDir * scarfLen * 0.65;
        const cpY = -fH*0.62;
        ctx.beginPath();
        ctx.moveTo(0, -fH*0.82);
        ctx.quadraticCurveTo(cpX*0.45, cpY+9, cpX, cpY+18);
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = `rgba(${r[0]},${r[1]},${r[2]},${0.78+pulse*0.18})`;
        ctx.shadowColor = ag.color; ctx.shadowBlur = 9;
        ctx.stroke(); ctx.shadowBlur = 0;
        // Scarf tip fade
        const sfG = ctx.createLinearGradient(0, -fH*0.82, cpX, cpY+18);
        sfG.addColorStop(0, `rgba(${r[0]},${r[1]},${r[2]},0.5)`);
        sfG.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = sfG; ctx.lineWidth = 4.5; ctx.stroke();
        ctx.restore();

        // Name tag when close (position relative to figure top)
        if (near) {
          ctx.save();
          ctx.font = "bold 11px 'Georgia', serif";
          const tw = ctx.measureText(ag.agentName).width;
          const tx = sx - tw/2;
          const ty = sy - fH - 22;
          ctx.fillStyle="rgba(0,0,0,0.6)";
          ctx.fillRect(tx-6, ty-13, tw+12, 18);
          ctx.fillStyle=`rgba(${r[0]},${r[1]},${r[2]},1)`;
          ctx.shadowColor=ag.color; ctx.shadowBlur=8;
          ctx.fillText(ag.agentName, tx, ty);
          ctx.restore();

          // hint
          ctx.save();
          ctx.font="10px monospace";
          ctx.fillStyle="rgba(255,255,255,0.45)";
          ctx.textAlign="center";
          ctx.fillText("click to enter house", sx, sy+12);
          ctx.textAlign="left";
          ctx.restore();
        }

        // Speech bubble
        if (ag.speechText && ag.speechTimer < 260) {
          ag.speechTimer += dt*60;
          if(ag.speechTimer<30) ag.speechAlpha=ag.speechTimer/30;
          else if(ag.speechTimer>200) ag.speechAlpha=Math.max(0,(260-ag.speechTimer)/60);
          else ag.speechAlpha=1;
          if(ag.speechAlpha>0){
            ctx.save();
            ctx.font="italic 12px Georgia,serif";
            const tw=ctx.measureText(ag.speechText).width;
            ctx.fillStyle=`rgba(0,0,0,${ag.speechAlpha*0.5})`;
            ctx.fillRect(sx-tw/2-8, sy-fH-42, tw+16, 20);
            ctx.fillStyle=`rgba(255,255,255,${ag.speechAlpha*0.9})`;
            ctx.shadowColor=ag.color; ctx.shadowBlur=6;
            ctx.fillText(ag.speechText, sx-tw/2, sy-fH-26);
            ctx.restore();
          }
        } else if(ag.speechTimer>=260){ag.speechText=undefined;ag.speechTimer=0;ag.speechAlpha=0;}
      }

      if (hoveredNow !== hoveredAgent) setHoveredAgent(hoveredNow);

      // ── Player character — Journey pilgrim ───────────────────
      const moving = Math.abs(st.pvx) > 20;
      const bobY = moving ? Math.sin(ts*0.012)*3 : Math.sin(ts*0.004)*2;
      const pSX = W/2, pSY = (st.py - st.camY) + H/2 + bobY;
      const pPulse = Math.sin(ts*0.004)*0.2+0.8;
      const pfH = 38, pfW = 15; // player figure height / width
      const pFigCY = pSY - pfH*0.5;
      const pLean = moving ? Math.sign(st.pvx)*0.1 : 0;

      // Trail when moving fast
      if (Math.abs(st.pvx) > 120) {
        for (let ti=0;ti<5;ti++){
          const trailX = pSX - Math.sign(st.pvx)*(16+ti*13);
          const tg = ctx.createRadialGradient(trailX,pFigCY,0,trailX,pFigCY,16-ti*2.5);
          tg.addColorStop(0,`rgba(160,200,255,${0.18-ti*0.033})`);
          tg.addColorStop(1,"rgba(160,200,255,0)");
          ctx.beginPath(); ctx.arc(trailX,pFigCY,16-ti*2.5,0,Math.PI*2);
          ctx.fillStyle=tg; ctx.fill();
        }
      }

      // Outer halo corona
      const po = ctx.createRadialGradient(pSX,pFigCY,0,pSX,pFigCY,75);
      po.addColorStop(0,"rgba(180,215,255,0.22)");
      po.addColorStop(0.45,"rgba(140,185,255,0.07)");
      po.addColorStop(1,"rgba(100,155,255,0)");
      ctx.beginPath(); ctx.arc(pSX,pFigCY,75,0,Math.PI*2);
      ctx.fillStyle=po; ctx.fill();

      // Ground shadow
      const gs = ctx.createRadialGradient(pSX, pSY+3, 0, pSX, pSY+3, pfW*1.2);
      gs.addColorStop(0,"rgba(0,0,0,0.35)");
      gs.addColorStop(1,"rgba(0,0,0,0)");
      ctx.beginPath(); ctx.ellipse(pSX, pSY+3, pfW*1.2, pfW*0.35, 0, 0, Math.PI*2);
      ctx.fillStyle=gs; ctx.fill();

      ctx.save(); ctx.translate(pSX, pSY); ctx.rotate(pLean);
      // Player robe body — deep navy silhouette
      ctx.fillStyle = "rgba(15,22,45,0.96)";
      ctx.beginPath();
      ctx.moveTo(0, -pfH);
      ctx.lineTo(-pfW*0.55, 0); ctx.lineTo(pfW*0.55, 0);
      ctx.closePath(); ctx.fill();
      // Robe edge — ice-blue highlight
      ctx.strokeStyle = "rgba(160,205,255,0.52)";
      ctx.lineWidth = 1.8; ctx.stroke();
      // Robe inner sheen
      const robeSheen = ctx.createLinearGradient(-pfW*0.3, -pfH*0.9, pfW*0.3, 0);
      robeSheen.addColorStop(0,"rgba(180,220,255,0.12)");
      robeSheen.addColorStop(1,"rgba(180,220,255,0)");
      ctx.fillStyle=robeSheen;
      ctx.beginPath();
      ctx.moveTo(0,-pfH); ctx.lineTo(-pfW*0.55,0); ctx.lineTo(pfW*0.55,0); ctx.closePath();
      ctx.fill();
      // Head — glowing pale
      ctx.save();
      ctx.shadowColor="rgba(180,220,255,0.9)"; ctx.shadowBlur=14;
      ctx.fillStyle="rgba(235,248,255,0.97)";
      ctx.beginPath(); ctx.arc(0,-pfH,pfW*0.20,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(180,220,255,0.4)";
      ctx.beginPath(); ctx.arc(0,-pfH,pfW*0.30,0,Math.PI*2); ctx.fill();
      ctx.restore();
      // Player scarf — flowing blue-white
      const pScarfDir = moving ? -Math.sign(st.pvx) : 1;
      const pScarfLen = 30 + pPulse*9;
      const pcpX = pScarfDir * pScarfLen * 0.7;
      const pcpY = -pfH*0.60;
      ctx.save();
      ctx.shadowColor="rgba(160,210,255,0.95)"; ctx.shadowBlur=14;
      ctx.beginPath();
      ctx.moveTo(0, -pfH*0.83);
      ctx.quadraticCurveTo(pcpX*0.45, pcpY+11, pcpX, pcpY+24);
      ctx.lineWidth=3.8;
      ctx.strokeStyle=`rgba(160,215,255,${0.82+pPulse*0.15})`;
      ctx.stroke();
      // Scarf glow layer
      const psfG = ctx.createLinearGradient(0,-pfH*0.83,pcpX,pcpY+24);
      psfG.addColorStop(0,"rgba(200,235,255,0.55)");
      psfG.addColorStop(1,"rgba(100,180,255,0)");
      ctx.strokeStyle=psfG; ctx.lineWidth=6; ctx.stroke();
      ctx.restore();
      ctx.restore();

      // Orbit sparkles around player
      for (let pi2=0;pi2<6;pi2++){
        const angle=(pi2/6)*Math.PI*2+ts*0.0025;
        const spr=26+Math.sin(ts*0.005+pi2)*4;
        const spx=pSX+Math.cos(angle)*spr;
        const spy=pFigCY+Math.sin(angle)*spr*0.55;
        const spA=0.22+Math.sin(ts*0.008+pi2*1.1)*0.18;
        ctx.beginPath(); ctx.arc(spx,spy,1.5,0,Math.PI*2);
        ctx.fillStyle=`rgba(200,230,255,${spA})`; ctx.fill();
      }

      // "YOU" label
      ctx.save();
      ctx.font="10px monospace";
      ctx.fillStyle="rgba(255,255,255,0.52)";
      ctx.textAlign="center";
      ctx.fillText("YOU", pSX, pSY-pfH-12);
      ctx.textAlign="left";
      ctx.restore();

      // ── Vignette (lighter — don't crush the scene) ───────────
      const vig = ctx.createRadialGradient(W/2,H/2,H*0.30,W/2,H/2,H*0.88);
      vig.addColorStop(0,"rgba(0,0,0,0)");
      vig.addColorStop(1,"rgba(0,0,0,0.33)");
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

      // Update biome HUD
      const newBiomeIdx = biomeAt(st.px);
      if (newBiomeIdx !== currentBiome) setCurrentBiome(newBiomeIdx);

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", e => onKey(e, true));
      window.removeEventListener("keyup",   e => onKey(e, false));
    };
  }, []);

  // Click to zoom into agent's house
  const onCanvasClick = useCallback((e: React.MouseEvent) => {
    if (hoveredAgent && !zoomedAgentRef.current) {
      const st = stateRef.current;
      const bIdx = biomeAt(hoveredAgent.baseX);
      const agBiome = BIOMES[Math.max(0, Math.min(BIOMES.length-1, bIdx))];
      const groundY = terrainY(hoveredAgent.baseX, bIdx, agBiome);
      st.targetZoom = 10;
      st.zoomTargetX = hoveredAgent.baseX;
      st.zoomTargetY = groundY - 80; // center view on house
      st.lockCam = true;
      zoomedAgentRef.current = hoveredAgent;
      // Show interior after zoom animation completes (~650ms)
      setTimeout(() => {
        setZoomedAgent(zoomedAgentRef.current);
      }, 680);
    }
  }, [hoveredAgent]);

  const biome = BIOMES[Math.min(currentBiome, BIOMES.length-1)];

  return (
    <div className="fixed inset-0 overflow-hidden bg-black" data-testid="world-container">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onClick={onCanvasClick}
        style={{ cursor: hoveredAgent ? "pointer" : "default" }}
        data-testid="world-canvas"
      />

      {/* Biome HUD */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none" data-testid="biome-hud">
        <div className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: biome.accent, opacity:0.75, textShadow:`0 0 20px ${biome.accent}` }}>
          Biome {currentBiome+1} of {BIOMES.length}
        </div>
        <div className="text-lg font-light text-white/90" style={{ fontFamily:"Georgia,serif", textShadow:"0 2px 12px rgba(0,0,0,0.9)" }}>
          {biome.name}
        </div>
        <div className="text-xs text-white/45 mt-0.5 italic">{biome.desc}</div>
      </div>

      {/* Mini-map */}
      <div className="absolute top-6 right-6 pointer-events-none" data-testid="minimap">
        <div className="text-white/25 text-xs uppercase tracking-widest mb-1">world map</div>
        <div className="relative" style={{ width:160, height:18, background:"rgba(0,0,0,0.4)", borderRadius:3, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)" }}>
          {BIOMES.map((b,i) => (
            <div key={i} style={{
              position:"absolute", left:`${(i/BIOMES.length)*100}%`,
              width:`${100/BIOMES.length}%`, height:"100%",
              background: b.accent, opacity:0.35,
            }}/>
          ))}
          <div style={{
            position:"absolute",
            left:`${(stateRef.current.px/WORLD_W)*100}%`,
            width:3, height:"100%",
            background:"white", boxShadow:"0 0 4px white",
          }}/>
        </div>
      </div>

      {/* Controls hint */}
      {showControls && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none" data-testid="controls-hint">
          <div className="inline-flex gap-4 px-5 py-2.5 rounded-full text-xs text-white/40 tracking-widest uppercase" style={{ background:"rgba(0,0,0,0.4)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.07)" }}>
            <span>WASD / ↑↓←→ move</span>
            <span>·</span>
            <span>SPACE jump</span>
            <span>·</span>
            <span>click agent to enter house</span>
          </div>
        </div>
      )}

      {/* Agent profile panel */}
      {selectedAgent && (
        <div
          className="absolute right-0 top-0 h-full flex flex-col"
          style={{ width:300, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(20px)", borderLeft:"1px solid rgba(255,255,255,0.08)" }}
          data-testid="agent-panel"
        >
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div>
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: selectedAgent.color }}>{selectedAgent.crew}</div>
              <div className="text-white/90 text-lg font-light" style={{ fontFamily:"Georgia,serif" }}>{selectedAgent.agentName}</div>
            </div>
            <button onClick={() => setSelectedAgent(null)} className="text-white/30 hover:text-white/70 transition-colors text-xl leading-none" data-testid="btn-close-agent-panel">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {/* Glowing orb */}
            <div className="flex justify-center mb-6 mt-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
                background: `radial-gradient(circle at 35% 35%, white, ${selectedAgent.color})`,
                boxShadow: `0 0 30px ${selectedAgent.color}, 0 0 60px ${selectedAgent.color}40`,
              }}>
                <span className="text-white/80 text-xs font-bold">{selectedAgent.agentName.slice(0,2)}</span>
              </div>
            </div>
            <div className="text-center text-white/40 text-xs uppercase tracking-widest mb-6">
              Biome {currentBiome+1} — {biome.name}
            </div>
            <div className="space-y-3">
              {(CREW_WISDOMS[selectedAgent.crew]??[]).map((w,i) => (
                <div key={i} className="px-3 py-2 rounded text-sm italic text-white/60" style={{ background:"rgba(255,255,255,0.04)", borderLeft:`2px solid ${selectedAgent.color}40`, fontFamily:"Georgia,serif" }}>
                  "{w}"
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-white/5">
            <div className="text-white/20 text-xs text-center tracking-widest">TNP CITIZEN · ACTIVE</div>
          </div>
        </div>
      )}

      {/* House interior overlay */}
      {zoomedAgent && (
        <HouseInteriorView
          agent={zoomedAgent}
          biome={BIOMES[Math.max(0,Math.min(BIOMES.length-1,biomeAt(zoomedAgent.baseX)))]}
          onExit={exitHouseView}
          onChat={() => { setSelectedAgent(zoomedAgent); exitHouseView(); }}
        />
      )}

      {/* Back link */}
      <a href="/register" data-testid="link-back-register"
        className="absolute top-6 left-6 text-white/25 text-xs tracking-widest uppercase hover:text-white/65 transition-colors"
        style={{ textDecoration:"none" }}>← join</a>
    </div>
  );
}
