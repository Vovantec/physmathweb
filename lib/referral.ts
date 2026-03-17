// lib/referral.ts

export const REFERRAL_REWARDS = {
  // Points awarded to referrer when friend registers
  ON_REGISTER: 50,
  // Points awarded to referrer when friend completes first homework
  ON_FIRST_HW: 100,
  // Points awarded to referrer for each friend's subsequent homework (percent bonus)
  PER_HW_BONUS: 10,
} as const

/**
 * Generate a short unique referral code from user data.
 * Format: first name (transliterated) + user id
 * e.g. "ivan_123"
 */
export function generateReferralCode(firstName: string | null, userId: number): string {
  const base = firstName
    ? transliterate(firstName).toLowerCase().replace(/[^a-z]/g, '').slice(0, 8)
    : 'user'
  return `${base}_${userId}`
}

/**
 * Basic Russian → Latin transliteration for readable codes.
 */
function transliterate(str: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
    ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  }
  return str
    .toLowerCase()
    .split('')
    .map(c => map[c] ?? c)
    .join('')
}

/**
 * Build referral link from code.
 */
export function buildReferralUrl(code: string, baseUrl: string): string {
  return `${baseUrl}?ref=${code}`
}