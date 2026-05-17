import { isMobile } from '@dcl/sdk/platform'

/**
 * Shared card.png layout constants.
 * Imported by both `ui.tsx` (legacy) and `fortuneFsm/fsmUi.tsx` (FSM) so all
 * card panels share the same dimensions, offset, and content positioning.
 *
 * Desktop pixel values below match the former `vh` layout at **1920×1080** (1vh = 10.8px).
 * Mobile keeps the card texture responsive at 50vh × 50vh.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  To resize the card or adjust its vertical position, edit ONLY this file.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Vertical offset from the top of the viewport for all card.png panels (−5vh @ 1080p ≈ −54px). */
export const CARD_VERTICAL_OFFSET = -104

/**
 * Card frame size shared by card.png and welcome.png.
 * Desktop: fixed 540×540px (former 50vh @ 1080p).
 * Mobile: 50vh × 50vh. UI background textures do not provide intrinsic width for `auto`,
 * so using auto can collapse the frame and hide both card.png and welcome.png.
 */
export function getCardSize() {
  const mobile = isMobile()
  return mobile
    ? { width: 540 as const, height: 540 as const }
    : { width: 600 as const, height: 600 as const }
}

/** Background texture definition shared by every card panel. */
export const CARD_BG = {
  texture: { src: 'assets/images/card.png' },
  textureMode: 'stretch' as const
}

/** Usable content width inside the card (as a fraction of card width). */
export const CARD_CONTENT_WIDTH = '70%' as const

/**
 * Height of the inner content container so percentage-based children
 * (e.g. label `maxHeight`, button rows) don't collapse to 0 in Yoga.
 */
export const CARD_CONTENT_HEIGHT = '86%' as const

/**
 * Negative margin that pulls content up to the optical centre of card.png.
 * Applied to the inner content column.  Both legacy and FSM systems use the
 * same value so every card.png panel positions its text identically.
 */
export const CARD_CONTENT_VERTICAL_ADJUST = 0

/**
 * Área útil sobre la textura de carta (card.png / welcome.png): un solo hijo directo → {@link CARD_ROOT_COLUMN}.
 * margin.top alinea el contenido con el centro óptico (mismo criterio que FSM y legacy).
 */
export const CARD_CONTENT_LAYER = {
  positionType: 'absolute' as const,
  position: { top: 0, left: 0 } as const,
  width: '100%' as const,
  height: '100%' as const,
  flexDirection: 'column' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  margin: { top: CARD_CONTENT_VERTICAL_ADJUST } as const,
  overflow: 'visible' as const
}

/**
 * Hijo de CARD_CONTENT_LAYER: columna en Y; alignItems stretch + Labels width 100% → textAlign middle-center en X.
 * height 100%: evita que hijos con maxHeight en % colapsen a 0 en Yoga.
 */
export const CARD_ROOT_COLUMN = {
  width: '85%' as const,
  height: '100%' as const,
  flexDirection: 'column' as const,
  justifyContent: 'center' as const,
  alignItems: 'stretch' as const
}
