// AlQuran.cloud API client — https://alquran.cloud/api
// Free, no key, CORS-enabled. Provides Arabic text, translations, and per-ayah audio (with timing per surah via reciter).

const BASE = "https://api.alquran.cloud/v1";

export interface Reciter {
  identifier: string; // e.g. "ar.alafasy"
  name: string;
  englishName: string;
  language: string;
  format: string; // "audio"
  type: string;
}

export interface SurahMeta {
  number: number;
  name: string; // Arabic
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan";
}

export interface Ayah {
  number: number; // global
  audio: string;
  audioSecondary?: string[];
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | object;
}

export interface AyahWithTranslation extends Ayah {
  translation?: string;
}

// Curated, popular reciters available on alquran.cloud
export const POPULAR_RECITERS: Reciter[] = [
  { identifier: "ar.alafasy", name: "مشاري العفاسي", englishName: "Mishary Rashid Alafasy", language: "ar", format: "audio", type: "versebyverse" },
  { identifier: "ar.abdulbasitmurattal", name: "عبد الباسط عبد الصمد", englishName: "AbdulBaset AbdulSamad (Murattal)", language: "ar", format: "audio", type: "versebyverse" },
  { identifier: "ar.abdurrahmaansudais", name: "عبد الرحمن السديس", englishName: "Abdurrahmaan As-Sudais", language: "ar", format: "audio", type: "versebyverse" },
  { identifier: "ar.husary", name: "محمود خليل الحصري", englishName: "Mahmoud Khalil Al-Husary", language: "ar", format: "audio", type: "versebyverse" },
  { identifier: "ar.minshawi", name: "محمد صديق المنشاوي", englishName: "Mohamed Siddiq El-Minshawi", language: "ar", format: "audio", type: "versebyverse" },
  { identifier: "ar.hudhaify", name: "علي الحذيفي", englishName: "Ali Al-Hudhaify", language: "ar", format: "audio", type: "versebyverse" },
  { identifier: "ar.muhammadayyoub", name: "محمد أيوب", englishName: "Muhammad Ayyoub", language: "ar", format: "audio", type: "versebyverse" },
  { identifier: "ar.shaatree", name: "أبو بكر الشاطري", englishName: "Abu Bakr Ash-Shaatree", language: "ar", format: "audio", type: "versebyverse" },
];

let surahsCache: SurahMeta[] | null = null;

export async function fetchSurahs(): Promise<SurahMeta[]> {
  if (surahsCache) return surahsCache;
  const res = await fetch(`${BASE}/surah`);
  if (!res.ok) throw new Error("Failed to fetch surahs");
  const json = await res.json();
  surahsCache = json.data as SurahMeta[];
  return surahsCache;
}

// Fetch a range of ayat with audio (from reciter) and optional translation edition.
export async function fetchAyatRange(
  surah: number,
  fromAyah: number,
  toAyah: number,
  reciter: string,
  translationEdition?: string,
): Promise<AyahWithTranslation[]> {
  const editions = translationEdition ? `${reciter},${translationEdition}` : reciter;
  // Use surah endpoint then slice — single request, faster than per-ayah.
  const res = await fetch(`${BASE}/surah/${surah}/editions/${editions}`);
  if (!res.ok) throw new Error("Failed to fetch ayat");
  const json = await res.json();
  const editionsData = json.data as Array<{ ayahs: Ayah[]; edition: { identifier: string } }>;

  const audioEdition = editionsData.find((e) => e.edition.identifier === reciter);
  const transEdition = translationEdition
    ? editionsData.find((e) => e.edition.identifier === translationEdition)
    : null;

  if (!audioEdition) throw new Error("Reciter edition not found");

  const sliced = audioEdition.ayahs.filter(
    (a) => a.numberInSurah >= fromAyah && a.numberInSurah <= toAyah,
  );

  return sliced.map((a) => ({
    ...a,
    audio: corsAudioUrl(reciter, surah, a.numberInSurah) ?? a.audio,
    translation: transEdition?.ayahs.find((t) => t.numberInSurah === a.numberInSurah)?.text,
  }));
}

// Map alquran.cloud reciter identifiers -> everyayah.com folder names.
// everyayah.com serves with `Access-Control-Allow-Origin: *`, so audio works
// in canvas/AudioContext flows. cdn.islamic.network does NOT send CORS headers.
const EVERYAYAH_RECITER: Record<string, string> = {
  "ar.alafasy": "Alafasy_128kbps",
  "ar.abdulbasitmurattal": "Abdul_Basit_Murattal_192kbps",
  "ar.abdurrahmaansudais": "Abdurrahmaan_As-Sudais_192kbps",
  "ar.husary": "Husary_128kbps",
  "ar.minshawi": "Minshawy_Murattal_128kbps",
  "ar.hudhaify": "Hudhaify_128kbps",
  "ar.muhammadayyoub": "Muhammad_Ayyoub_128kbps",
  "ar.shaatree": "Abu_Bakr_Ash-Shaatree_128kbps",
};

function pad(n: number, width: number) {
  return n.toString().padStart(width, "0");
}

export function corsAudioUrl(reciter: string, surah: number, ayah: number): string | null {
  const folder = EVERYAYAH_RECITER[reciter];
  if (!folder) return null;
  // everyayah filenames: SSSAAA.mp3 (3-digit surah + 3-digit ayah)
  return `https://everyayah.com/data/${folder}/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;
}

// Common translation editions
export const TRANSLATIONS = [
  { id: "en.sahih", label: "English — Sahih International" },
  { id: "en.pickthall", label: "English — Pickthall" },
  { id: "en.yusufali", label: "English — Yusuf Ali" },
  { id: "ur.jalandhry", label: "Urdu — Jalandhry" },
  { id: "fr.hamidullah", label: "French — Hamidullah" },
  { id: "id.indonesian", label: "Indonesian" },
  { id: "tr.diyanet", label: "Turkish — Diyanet" },
  { id: "es.cortes", label: "Spanish — Cortes" },
];
