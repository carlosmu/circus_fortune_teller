import { FORTUNES } from '../fortunes'
import { hashString } from '../revelationRng'
import type { FortuneCategory, FortuneKind } from '../types'
import type { FsmCardChoice, FsmDeck, FsmSession } from './types'

/** Carta A = prediction, B = advice, C = warning (meaning 1, 2, 3). */
export const FSM_CHOICE_TO_KIND: Record<FsmCardChoice, FortuneKind> = {
  A: 'prediction',
  B: 'advice',
  C: 'warning'
}

const KIND_TITLE: Record<FortuneKind, string> = {
  prediction: 'Prediction',
  advice: 'Advice',
  warning: 'Warning'
}

function deckToDataDeck(d: FsmDeck): 'funny' | 'serious' | 'strange' {
  return d.toLowerCase() as 'funny' | 'serious' | 'strange'
}

const LOG_REVEAL_TEXT = '[FortuneFSM/revealText]'
/** Evita inundar consola: un log por combinación de sesión + índice elegido. */
let lastRevealTextLogKey = ''

/** Texto de fortuna en todos los clientes (misma semilla). */
export function getFsmRevealFortuneText(session: Pick<FsmSession, 'guestId' | 'selectedCategoryKey' | 'selectedDeck' | 'selectedFortune'>): string {
  const key = session.selectedCategoryKey
  const deck = session.selectedDeck
  const choice = session.selectedFortune
  if (!key || !deck || !choice) {
    const k = `silent|${session.guestId}|${String(key)}|${String(deck)}|${String(choice)}`
    if (k !== lastRevealTextLogKey) {
      lastRevealTextLogKey = k
      console.log(LOG_REVEAL_TEXT, 'missing category/deck/choice → fallback', {
        guestId: session.guestId,
        selectedCategoryKey: key,
        selectedDeck: deck,
        selectedFortune: choice
      })
    }
    return 'The cards remain silent.'
  }
  const kind = FSM_CHOICE_TO_KIND[choice]
  const d = deckToDataDeck(deck)
  const pool = FORTUNES.filter((f) => f.category === key && f.deck === d && f.type === kind)
  if (pool.length === 0) {
    const k = `unclear|${key}|${d}|${kind}`
    if (k !== lastRevealTextLogKey) {
      lastRevealTextLogKey = k
      console.log(LOG_REVEAL_TEXT, 'no fortunes in pool → fallback', { category: key, deck: d, kind, poolLen: 0 })
    }
    return 'The cards are unclear.'
  }
  const seed = `${session.guestId ?? ''}:reveal:${key}:${d}:${kind}:${choice}`
  const idx = hashString(seed) % pool.length
  const text = pool[idx]!.text
  const logKey = `ok|${seed}|${idx}`
  if (logKey !== lastRevealTextLogKey) {
    lastRevealTextLogKey = logKey
    console.log(LOG_REVEAL_TEXT, 'resolved', {
      category: key,
      deck: d,
      kind,
      poolLen: pool.length,
      idx,
      textLength: text.length,
      textPreview: text.length > 120 ? `${text.slice(0, 120)}…` : text
    })
  }
  return text
}

export function getFsmRevealKindTitle(choice: FsmCardChoice | null): string {
  if (!choice) return ''
  return KIND_TITLE[FSM_CHOICE_TO_KIND[choice]]
}
