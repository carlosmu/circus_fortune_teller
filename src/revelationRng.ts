import type { FortuneCategory, FortuneKind } from './types'

/** Categories that have at least one fortune in FORTUNES. */
export const CATEGORIES_WITH_FORTUNES: FortuneCategory[] = [
  'love',
  'money',
  'health',
  'work',
  'mystery',
  'luck'
]

export const FORTUNE_KINDS: FortuneKind[] = ['advertencia', 'consejo', 'prediccion']

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Picks `count` distinct categories from `pool` using a stable seed. */
export function pickDistinctCategoriesSeeded(
  seedPrefix: string,
  pool: FortuneCategory[],
  count: number
): FortuneCategory[] {
  const remaining = [...pool]
  const out: FortuneCategory[] = []
  for (let step = 0; step < count && remaining.length > 0; step++) {
    const idx = hashString(`${seedPrefix}:${step}`) % remaining.length
    out.push(remaining[idx])
    remaining.splice(idx, 1)
  }
  return out
}

export function pickThreeGuestCategoriesSeeded(guestId: string, roundSalt: number): [FortuneCategory, FortuneCategory, FortuneCategory] {
  const base = `${guestId}:${roundSalt}:guest3`
  const picked = pickDistinctCategoriesSeeded(base, CATEGORIES_WITH_FORTUNES, 3)
  while (picked.length < 3) {
    picked.push(CATEGORIES_WITH_FORTUNES[picked.length % CATEGORIES_WITH_FORTUNES.length])
  }
  return [picked[0], picked[1], picked[2]]
}

export function pickGuestCategoryFromOptionsSeeded(
  guestId: string,
  roundSalt: number,
  options: readonly [FortuneCategory, FortuneCategory, FortuneCategory]
): FortuneCategory {
  const idx = hashString(`${guestId}:${roundSalt}:guestPick`) % 3
  return options[idx]
}

export function pickKindSeeded(guestId: string, roundSalt: number): FortuneKind {
  const idx = hashString(`${guestId}:${roundSalt}:kindPick`) % 3
  return FORTUNE_KINDS[idx]
}
