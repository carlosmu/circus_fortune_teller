import { engine } from '@dcl/sdk/ecs'
import { TriggerType, type Triggers } from '@dcl/asset-packs'
import { defineAllComponents } from '@dcl/asset-packs/dist/versioning'

const TRIGGERS_COMPONENT = 'asset-packs::Triggers'

type TriggersComponentDef = ReturnType<typeof defineAllComponents>[typeof TRIGGERS_COMPONENT]

let triggersComponent: TriggersComponentDef | null = null

function getTriggersComponent(): TriggersComponentDef | null {
  if (triggersComponent) return triggersComponent
  try {
    triggersComponent = engine.getComponent(TRIGGERS_COMPONENT) as TriggersComponentDef
    return triggersComponent
  } catch {
    const all = defineAllComponents(engine)
    triggersComponent = all[TRIGGERS_COMPONENT] as TriggersComponentDef
    return triggersComponent
  }
}

/**
 * Quita triggers `on_input_action` del Sit Spot (tecla E → “Sit Here” del smart item).
 * El asiento solo debe activarse con clic vía `registerPointerClickOnly`.
 */
export function disableBuiltInSitOnKeyPress(entity: ReturnType<typeof engine.addEntity>): void {
  const Triggers = getTriggersComponent()
  if (!Triggers?.has(entity)) return
  const m = Triggers.getMutable(entity)
  const next = m.value.filter((t: Triggers['value'][number]) => t.type !== TriggerType.ON_INPUT_ACTION)
  if (next.length === m.value.length) return
  m.value = next
}
