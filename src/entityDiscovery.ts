import { engine, Entity } from '@dcl/sdk/ecs'
import { EntityNames } from '../assets/scene/entity-names'

const CARPET_PROBE_MAX = 48

/**
 * Entidades de la escena Creator Hub cuyo nombre empieza por `prefix`.
 * Usa `entity-names.ts` (regenerado al publicar) y prueba `prefix01`…`prefix48`.
 */
export function discoverEntitiesByNamePrefix(prefix: string): Entity[] {
  const seen = new Set<Entity>()
  const result: Entity[] = []

  const add = (entity: Entity | null) => {
    if (entity === null || seen.has(entity)) return
    seen.add(entity)
    result.push(entity)
  }

  for (const name of Object.values(EntityNames)) {
    if (typeof name === 'string' && name.startsWith(prefix)) {
      add(engine.getEntityOrNullByName(name))
    }
  }

  for (let i = 1; i <= CARPET_PROBE_MAX; i++) {
    const padded = i < 10 ? `0${i}` : `${i}`
    add(engine.getEntityOrNullByName(`${prefix}${padded}`))
    add(engine.getEntityOrNullByName(`${prefix}${i}`))
  }

  return result
}
