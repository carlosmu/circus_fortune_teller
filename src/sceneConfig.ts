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

/**
 * FSM: tras el host elige significado (A/B/C), ms hasta el mensaje “se aclara” para el invitado.
 * Mantener al menos 2s para que la pantalla “Reading the cards…” pueda leerse.
 */
export const FSM_REVEAL_READING_PHASE_MS = 2000

/**
 * FSM: ms desde la elección del host hasta entrar en REVEAL (texto en carta).
 * Debe ser mayor que {@link FSM_REVEAL_READING_PHASE_MS}; deja otros 2s para “It is becoming clear…”.
 */
export const FSM_REVEAL_SHOW_AT_MS = 4000
