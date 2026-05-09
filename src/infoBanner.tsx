import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'

const BANNER_BG = Color4.create(0.35, 0.08, 0.55, 0.92)
const BANNER_TEXT = Color4.create(1, 1, 1, 1)

/**
 * Reusable info banner: centered in X, positioned at the bottom of the screen,
 * with a purple background and rounded corners.
 * Used for scene-level announcements (guest joining, FT leaving, session finished, etc.).
 */
export function InfoBanner({ text }: { text: string | null }) {
  if (!text) return null

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        zIndex: 20
      }}
    >
      <UiEntity
        uiTransform={{
          width: 'auto',
          height: 'auto',
          margin: { bottom: '12vh' },
          padding: { top: 14, bottom: 14, left: 20, right: 20 },
          borderRadius: 12
        }}
        uiBackground={{ color: BANNER_BG }}
      >
        <Label
          uiTransform={{ width: '100%', height: 'auto' }}
          value={text}
          textAlign="middle-center"
          textWrap="wrap"
          fontSize={20}
          font="serif"
          color={BANNER_TEXT}
        />
      </UiEntity>
    </UiEntity>
  )
}
