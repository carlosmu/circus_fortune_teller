import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { GUEST_READING_COOLDOWN_MESSAGE } from './guestReadingCooldown'

/** Fondo violeta compartido con otros paneles (p. ej. bienvenida). */
export const INFO_BANNER_BG = Color4.create(0.35, 0.08, 0.55, 1)
/** Fondo dorado para avisos especiales (p. ej. cooldown de lecturas guest). */
export const INFO_BANNER_GOLD_BG = Color4.create(212 / 255, 175 / 255, 55 / 255, 0.92)
/** Texto sobre fondo gold: marrón oscuro (no negro puro). */
const BANNER_GOLD_TEXT = Color4.create(52 / 255, 36 / 255, 18 / 255, 1)
const BANNER_BG = INFO_BANNER_BG
const BANNER_TEXT = Color4.create(1, 1, 1, 1)
const FADE_DURATION_MS = 500

/**
 * Reusable info banner: centrado en X e Y sobre el viewport, fondo violeta y bordes redondeados.
 * Desvanece antes de desaparecer. Anuncios de escena (guest, FT, sesión terminada, etc.).
 */
export function InfoBanner({
  text,
  expiresAtMs,
  variant = 'default'
}: {
  text: string | null
  expiresAtMs?: number
  variant?: 'default' | 'golden'
}) {
  if (!text) return null

  const now = Date.now()
  let alpha = 1

  if (expiresAtMs !== undefined) {
    const remaining = expiresAtMs - now
    if (remaining <= 0) return null
    if (remaining < FADE_DURATION_MS) {
      alpha = remaining / FADE_DURATION_MS
    }
  }

  const isGolden = variant === 'golden' || text === GUEST_READING_COOLDOWN_MESSAGE
  const baseBg = isGolden ? INFO_BANNER_GOLD_BG : BANNER_BG
  const baseText = isGolden ? BANNER_GOLD_TEXT : BANNER_TEXT
  const bg = Color4.create(baseBg.r, baseBg.g, baseBg.b, baseBg.a * alpha)
  const textColor = Color4.create(baseText.r, baseText.g, baseText.b, baseText.a * alpha)

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20
      }}
    >
      <UiEntity
        uiTransform={{
          width: 'auto',
          maxWidth: '90%',
          height: 'auto',
          padding: { top: 14, bottom: 14, left: 20, right: 20 },
          borderRadius: 12
        }}
        uiBackground={{ color: bg }}
        uiText={{
          value: text,
          textAlign: 'middle-center',
          textWrap: 'wrap',
          fontSize: 20,
          font: 'serif',
          color: textColor
        }}
      />
    </UiEntity>
  )
}
