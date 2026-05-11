import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'

const BANNER_BG = Color4.create(0.35, 0.08, 0.55, 0.92)
const BANNER_TEXT = Color4.create(1, 1, 1, 1)
const FADE_DURATION_MS = 500

/**
 * Reusable info banner: centrado en X e Y sobre el viewport, fondo violeta y bordes redondeados.
 * Desvanece antes de desaparecer. Anuncios de escena (guest, FT, sesión terminada, etc.).
 */
export function InfoBanner({ text, expiresAtMs }: { text: string | null; expiresAtMs?: number }) {
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

  const bg = Color4.create(BANNER_BG.r, BANNER_BG.g, BANNER_BG.b, BANNER_BG.a * alpha)
  const textColor = Color4.create(BANNER_TEXT.r, BANNER_TEXT.g, BANNER_TEXT.b, BANNER_TEXT.a * alpha)

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
      >
        <Label
          uiTransform={{ width: '100%', height: 'auto' }}
          value={text}
          textAlign="middle-center"
          textWrap="wrap"
          fontSize={20}
          font="serif"
          color={textColor}
        />
      </UiEntity>
    </UiEntity>
  )
}
