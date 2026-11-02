export const ESSAY_MAX_WORDS = 200;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Cuts text right after its `max`-th word, keeping everything before it untouched. */
export function limitWords(text: string, max: number): string {
  const words = [...text.matchAll(/\S+/g)];
  if (words.length <= max) return text;
  const last = words[max - 1];
  return text.slice(0, last.index + last[0].length);
}
