import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { gameData } from './gameState'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiComponent)
}

function uiComponent() {
  const fortune = gameData.currentFortune
  const isVisible = gameData.gameState === 'MOSTRANDO_FORTUNA' && !!fortune

  const text = fortune?.text ?? ''
  const category = fortune?.category ?? ''

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch'
      }}
    >
      {/* Pequeño debug de estado en la esquina superior izquierda */}
      <UiEntity
        uiTransform={{
          width: '40%',
          height: '10%',
          margin: { top: '2%', left: '2%' }
        }}
      >
        <Label
          uiTransform={{ width: '100%', height: '100%' }}
          value={`Estado: ${gameData.gameState}`}
          textAlign="top-left"
          fontSize={14}
        />
      </UiEntity>

      {/* Panel de fortuna centrado, solo cuando corresponde */}
      {isVisible && (
        <UiEntity
          uiTransform={{
            width: '100%',
            height: '100%',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <UiEntity
            uiTransform={{
              width: '60%',
              height: '35%',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
            uiBackground={{
              color: Color4.create(0, 0, 0, 0.7)
            }}
          >
            <Label
              uiTransform={{
                width: '90%',
                height: '70%'
              }}
              value={text}
              textAlign="middle-center"
              fontSize={24}
            />

            <Label
              uiTransform={{
                width: '90%',
                height: '20%'
              }}
              value={`Categoría: ${category}`}
              textAlign="middle-center"
              fontSize={18}
            />
          </UiEntity>
        </UiEntity>
      )}
    </UiEntity>
  )
}