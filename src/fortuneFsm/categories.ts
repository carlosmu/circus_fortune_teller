import { CATEGORIES_WITH_FORTUNES, hashString } from '../revelationRng'
import type { FortuneCategory } from '../types'

/** Etiquetas UI para categorías (alineado con `ui.tsx` / legacy). */
export const FSM_CATEGORY_LABELS: Record<FortuneCategory, string> = {
  love: 'Love',
  money: 'Money',
  health: 'Health',
  work: 'Work',
  luck: 'Luck',
  travel: 'Travel',
  pets: 'Pets',
  family: 'Family',
  mystery: 'Mystery'
}

/**
 * Elige hasta 3 categorías distintas del pool disponible (las 6 con fortunas, menos `excluded`).
 * Si ya se usaron las 6, el pool se reinicia para poder ofrecer de nuevo 3.
 * Si quedan 1 o 2 sin usar, se muestran solo esas (menos de 3 botones).
 */
export function pickFsmCategoryOffer(excluded: FortuneCategory[], seedKey: string): FortuneCategory[] {
  const excludedUnique = [...new Set(excluded)]
  let pool = CATEGORIES_WITH_FORTUNES.filter((c) => !excludedUnique.includes(c))
  if (pool.length === 0) {
    pool = [...CATEGORIES_WITH_FORTUNES]
  }
  const count = Math.min(3, pool.length)
  const out: FortuneCategory[] = []
  const remaining = [...pool]
  for (let step = 0; step < count && remaining.length > 0; step++) {
    const idx = hashString(`${seedKey}:${step}`) % remaining.length
    out.push(remaining[idx]!)
    remaining.splice(idx, 1)
  }
  return out
}

/** Misma oferta en todos los clientes: semilla estable a partir de guestId + categorías ya elegidas. */
export function getFsmCategoryOffer(guestId: string | null, usedCategories: FortuneCategory[]): FortuneCategory[] {
  const seedKey = `${guestId ?? ''}:fsmCat:${[...usedCategories].sort().join('|')}`
  return pickFsmCategoryOffer(usedCategories, seedKey)
}
