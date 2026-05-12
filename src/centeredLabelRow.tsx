import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'

type CenteredLabelTextAlign = 'middle-center' | 'top-center'
const TEXT_ALIGN: CenteredLabelTextAlign = 'middle-center'

/**
 * Labels centrados en X/Y dentro del padre: Yoga/DCL suele colapsar el ancho del Label con height 'auto';
 * este contenedor fuerza width 100% + altura fija para que `textAlign: middle-center` aplique bien.
 */
export function CenteredLabelRow({
  value,
  fontSize,
  color,
  textAlign = TEXT_ALIGN,
  height = 80,
  marginTop = 0,
  marginBottom = 0
}: {
  value: string
  fontSize: number
  color: Color4
  textAlign?: CenteredLabelTextAlign
  height?: number
  marginTop?: number
  marginBottom?: number
}) {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height,
        minHeight: height,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        margin: { top: marginTop, bottom: marginBottom }
      }}
    >
      <Label
        uiTransform={{ width: '100%', height: '100%' }}
        value={value}
        textAlign={textAlign}
        textWrap="wrap"
        fontSize={fontSize}
        font="serif"
        color={color}
      />
    </UiEntity>
  )
}
