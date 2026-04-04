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

/** Evita filtrar FORTUNES en cada frame del UI durante REVEAL. */
let revealTextMemoKey = ''
let revealTextMemo = ''

/** Texto de fortuna en todos los clientes (misma semilla). */
export function getFsmRevealFortuneText(session: Pick<FsmSession, 'guestId' | 'selectedCategoryKey' | 'selectedDeck' | 'selectedFortune'>): string {
  const key = session.selectedCategoryKey
  const deck = session.selectedDeck
  const choice = session.selectedFortune
  if (!key || !deck || !choice) {
    revealTextMemoKey = ''
    revealTextMemo = ''
    return 'The cards remain silent.'
  }
  const memoKey = `${session.guestId ?? ''}|${key}|${deck}|${choice}`
  if (memoKey === revealTextMemoKey && revealTextMemo.length > 0) {
    return revealTextMemo
  }
  const kind = FSM_CHOICE_TO_KIND[choice]
  const d = deckToDataDeck(deck)
  const pool = FORTUNES.filter((f) => f.category === key && f.deck === d && f.type === kind)
  if (pool.length === 0) {
    revealTextMemoKey = memoKey
    revealTextMemo = 'The cards are unclear.'
    return revealTextMemo
  }
  const seed = `${session.guestId ?? ''}:reveal:${key}:${d}:${kind}:${choice}`
  const idx = hashString(seed) % pool.length
  const text = pool[idx]!.text
  revealTextMemoKey = memoKey
  revealTextMemo = text
  return text
}

export function getFsmRevealKindTitle(choice: FsmCardChoice | null): string {
  if (!choice) return ''
  return KIND_TITLE[FSM_CHOICE_TO_KIND[choice]]
}
