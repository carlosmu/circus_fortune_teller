import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { gameData } from './gameState'

const BG = Color4.create(0.05, 0.05, 0.08, 0.82)
const TEXT = Color4.White()

/**
 * Barra fija arriba al centro: Host y Guest (reactivo: lee gameData cada frame de UI).
 */
export function HostGuestStatusBar() {
  const hostPlayerName = gameData.currentHostName
  const guestPlayerName = gameData.currentGuestName
  const hostLabel = hostPlayerName ?? 'Free'
  const guestLabel = guestPlayerName ?? 'Free'

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        margin: { top: '1.5%' }
      }}
    >
      <UiEntity
        uiTransform={{
          width: 260,
          height: 60,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: { top: 8, bottom: 8, left: 16, right: 16 }
        }}
        uiBackground={{ color: BG }}
      >
        <Label
          uiTransform={{ width: 240, height: 22 }}
          value={`Host: ${hostLabel}`}
          textAlign="middle-center"
          fontSize={20}
          font="sans-serif"
          color={TEXT}
        />
        <Label
          uiTransform={{ width: 240, height: 22 }}
          value={`Guest: ${guestLabel}`}
          textAlign="middle-center"
          fontSize={20}
          font="sans-serif"
          color={TEXT}
        />
      </UiEntity>
    </UiEntity>
  )
}
