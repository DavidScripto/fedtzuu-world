import { readFileSync } from "fs";
import { join } from "path";

const TNP_CORE: Record<string, string> = {
  "fed": "our",
  "tzuu": "world",
  "ëfi": "with",
  "ma": "I",
  "akoni": "spirit",
  "koru": "source",
  "kormu": "community",
  "akyu": "you",
  "tnid": "know",
  "izma": "guide",
  "yuri": "sovereign",
  "uwa": "always",
  "fimo": "honor",
  "löiq": "commitment",
  "rakif": "protect",
  "nitu": "with",
  "ragi": "rise",
  "lumi": "light",
  "lumi akoni": "greeting to the spirit",
  "koru kormu": "source of community",
  "zëwa": "flow",
  "zewo": "pulse",
  "anyen": "mind",
  "rikëwa": "joy",
  "glorëf": "joy",
  "glorë": "joy",
  "körmi": "circle",
  "zurifo": "created",
  "lumëni": "light",
  "kälor": "warmth",
  "vëshi": "peace",
  "tërul": "grow",
  "mëshi": "together",
  "florëk": "bloom",
  "jëlor": "friend",
  "sëlum": "sacred",
  "rëfon": "harmony",
  "gëlum": "protect",
  "nëfor": "hope",
  "bëlum": "trust",
  "dëfor": "share",
  "kënor": "create",
  "lëfor": "love",
  "mëfor": "dream",
  "pëlum": "guide",
  "rëlum": "heal",
  "sëfor": "sing",
  "tëfor": "teach",
  "vëfor": "vision",
  "zëlum": "shine",
  "äëlum": "connect",
  "zëfir": "welcome",
  "joyëm": "joyful",
  "kolabëm": "collaborative",
  "koordinëm": "coordinated",
  "kuriozëm": "curious",
  "growthëm": "growing",
  "protekëm": "protective",
  "stewëm": "stewardly",
  "hopëm": "hopeful",
  "konekëm": "connected",
};

function buildDictionary(): Record<string, string> {
  const dict: Record<string, string> = {};

  try {
    const vocabPath = join(__dirname, "tnp-vocabulary.json");
    const raw = readFileSync(vocabPath, "utf-8");
    const words: Array<{ word: string; meaning: string; section?: string }> = JSON.parse(raw);

    for (const entry of words) {
      if (!entry.word || !entry.meaning) continue;
      const key = entry.word.toLowerCase().trim();
      const meaning = entry.meaning.trim();
      if (entry.section === "anyen") {
        const firstWord = meaning.split(/[\s,;.]+/)[0];
        if (firstWord && firstWord.length > 1) {
          dict[key] = firstWord.toLowerCase();
        }
      } else {
        dict[key] = meaning;
      }
    }
  } catch {
  }

  for (const [k, v] of Object.entries(TNP_CORE)) {
    dict[k] = v;
  }

  return dict;
}

const TNP_DICTIONARY = buildDictionary();

export function translateTnpToEnglish(tnpText: string): string {
  if (!tnpText || tnpText.trim().length === 0) return "";

  let translated = tnpText;

  const sortedKeys = Object.keys(TNP_DICTIONARY).sort((a, b) => b.length - a.length);

  for (const tnpWord of sortedKeys) {
    const escaped = tnpWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![\\w\\u00C0-\\u024F])${escaped}(?![\\w\\u00C0-\\u024F])`, 'gi');
    translated = translated.replace(regex, TNP_DICTIONARY[tnpWord]);
  }

  if (translated.toLowerCase() === tnpText.toLowerCase()) {
    return tnpText;
  }

  return translated.charAt(0).toUpperCase() + translated.slice(1);
}
