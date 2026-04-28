import { engine, Transform, Entity } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'

type Vec3 = { x: number; y: number; z: number }
type Quat = { x: number; y: number; z: number; w: number }

/**
 * Computes world position of an entity by walking up the parent chain.
 * Necessary because Transform.get(e).position is LOCAL to the parent.
 */
export function getEntityWorldPosition(entity: Entity): Vec3 | null {
  if (!Transform.has(entity)) return null
  const t = Transform.get(entity)
  const localPos = t.position

  const parent = t.parent
  if (!parent || parent === engine.RootEntity) {
    return { x: localPos.x, y: localPos.y, z: localPos.z }
  }
  if (!Transform.has(parent)) {
    return { x: localPos.x, y: localPos.y, z: localPos.z }
  }

  const parentWorldPos = getEntityWorldPosition(parent)
  const parentWorldRot = getEntityWorldRotation(parent)
  if (!parentWorldPos || !parentWorldRot) {
    return { x: localPos.x, y: localPos.y, z: localPos.z }
  }

  const rotated = Vector3.rotate(localPos, parentWorldRot)
  return {
    x: parentWorldPos.x + rotated.x,
    y: parentWorldPos.y + rotated.y,
    z: parentWorldPos.z + rotated.z
  }
}

/**
 * Computes world rotation of an entity by multiplying rotations up the parent chain.
 */
export function getEntityWorldRotation(entity: Entity): Quat | null {
  if (!Transform.has(entity)) return null
  const t = Transform.get(entity)
  const localRot = t.rotation

  const parent = t.parent
  if (!parent || parent === engine.RootEntity) {
    return { x: localRot.x, y: localRot.y, z: localRot.z, w: localRot.w }
  }
  if (!Transform.has(parent)) {
    return { x: localRot.x, y: localRot.y, z: localRot.z, w: localRot.w }
  }

  const parentWorldRot = getEntityWorldRotation(parent)
  if (!parentWorldRot) {
    return { x: localRot.x, y: localRot.y, z: localRot.z, w: localRot.w }
  }

  return Quaternion.multiply(parentWorldRot, localRot)
}
