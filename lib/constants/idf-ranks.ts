/** Closed list of common IDF ranks for consistent filtering and display */
export const IDF_RANKS = [
  "טוראי",
  "רב טוראי",
  "סמל",
  "רב סמל",
  "סמל ראשון",
  "רב סמל ראשון",
  "רב סמל מתקדם",
  "רב סמל בכיר",
  "רס״ל",
  "רס״ר",
  "רב״ט",
  "סגן",
  "סרן",
  "רב סרן",
  "סא״ל",
  "אל״ם",
  "תא״ל",
  "אלוף",
] as const;

export type IdfRank = (typeof IDF_RANKS)[number];

/** Suggestions for military_role autocomplete (formal MOS examples) */
export const MILITARY_ROLE_SUGGESTIONS: string[] = [
  "לוחם",
  "מפק״צ",
  "מודיעין",
  "הנדסה",
  "קשר",
  "לא״י",
  "לוגיסטיקה",
  "טכנאי רפואה",
  "נהג רכב קרבי",
  "מגן",
  "חובש",
];
