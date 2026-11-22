// Helpers for comparing names the way people type them.

/** "잠실(송파구청)" and "잠실" are the same station; the part in brackets is a second name. */
export const baseName = (name: string) => name.replace(/\s*\(.*?\)\s*/g, '').trim()

/**
 * A name reduced to what matters for matching: lower case, no spaces or
 * punctuation, and the common long and short spellings made the same.
 * "Myeong-dong", "myeongdong" and "Myeong Dong" all fold to "myeongdong".
 */
export function fold(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/university/g, 'univ')
    .replace(/national|nat[`'’]l/g, 'natl')
    .replace(/\bstation\b|\bstn\b/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/역$/, '')
}

const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'

/** The first consonant of each Korean syllable: 홍대입구 gives ㅎㄷㅇㄱ. Koreans search this way. */
export function initials(text: string): string {
  let out = ''
  for (const char of text) {
    const code = char.charCodeAt(0) - 0xac00
    if (code >= 0 && code <= 11171) out += INITIALS[Math.floor(code / 588)]
  }
  return out
}

/** True when the text is only Korean first consonants, such as "ㅎㄷ". */
export const isInitials = (text: string) => text.length > 0 && [...text].every((char) => INITIALS.includes(char))
