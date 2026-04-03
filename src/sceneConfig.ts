/**
 * Central scene configuration.
 * Ajusta aquí tiempos, visibilidad de fortunas, etc.
 */

/** How long (seconds) the fortune is shown (3D text and UI panel). */
export const FORTUNE_DISPLAY_DURATION = 5

/** Tras la 3ª lectura: cuánto se muestra el mensaje de despedida antes de expulsar. */
export const FORTUNE_FAREWELL_MAX_READINGS_DURATION = 5

/** Mostrar la fortuna como texto 3D sobre el mago. */
export const SHOW_3D_FORTUNE = false

/** Mostrar la fortuna en el panel de UI. */
export const SHOW_UI_FORTUNE = true

/** Flujo Host/Guest como FSM (INIT → … → RESET); si es true, el panel legacy de revelación queda desactivado. */
export const USE_FORTUNE_FSM_FLOW = true
