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
