/**
 * Shared card.png layout constants.
 * Imported by both `ui.tsx` (legacy) and `fortuneFsm/fsmUi.tsx` (FSM) so all
 * card panels share the same dimensions, offset, and content positioning.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  To resize the card or adjust its vertical position, edit ONLY this file.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Vertical offset from the top of the viewport for all card.png panels. */
export const CARD_VERTICAL_OFFSET = '-5vh'

/**
 * Fixed dimensions for the card.png frame.
 * The source texture is 1024×1024; we display it at 512×512 (stretch in a
 * square matching the aspect ratio causes no distortion).
 */
export const CARD_SIZE = { width: '50vh' as const, height: '50vh' as const }

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
export const CARD_CONTENT_VERTICAL_ADJUST = '0'

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
  width: '75%' as const,
  height: '100%' as const,
  flexDirection: 'column' as const,
  justifyContent: 'center' as const,
  alignItems: 'stretch' as const
}
