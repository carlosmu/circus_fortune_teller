import { engine, type Entity } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { discoverEntitiesByNamePrefix } from './entityDiscovery'
import {
  fireSmokeWithConfig,
  initSmokeParticles,
  type SmokeSpawnConfig
} from './smokeParticles'
import { getEntityWorldPosition } from './worldTransform'

/** Prefijo de empties en Creator Hub (p. ej. particles_carpet_01). */
export const CARPET_PARTICLE_NAME_PREFIX = 'particles_carpet_'

/** Segundos entre spawns en cada anchor (bucle continuo). */
export const CARPET_SMOKE_SPAWN_INTERVAL_SEC = 0.4

// ─── Partículas del carpet (distinto a CARD_SMOKE en smokeParticles.ts) ─────────
export const CARPET_SMOKE: SmokeSpawnConfig = {
  opacity: 0.1,
  tint: { r: 0.48, g: 0.14, b: 0.68 },
  emissiveIntensity: 1,
  burstCount: 1,
  spawnOffsetY: 0.01,
  positionRandomX: 0.5,
  positionRandomY: 0.02,
  positionRandomZ: 0.5,
  rotationEulerX: -90,
  rotationEulerY: 0,
  rotationEulerZ: 0,
  rotationJitterDeg: 50,
  size: 1,
  lifeSec: 3,
  speedMin: 0.00,
  speedMax: 0.06,
  showDelaySec: 0.08
}

const REDISCOVER_INTERVAL_SEC = 2

type CarpetAnchor = {
  entity: Entity
  name: string
  cooldown: number
}

let anchors: CarpetAnchor[] = []
let rediscoverCooldown = 0
let loopStarted = false

function refreshCarpetAnchors(): void {
  const entities = discoverEntitiesByNamePrefix(CARPET_PARTICLE_NAME_PREFIX)
  anchors = entities.map((entity, i) => {
    const stagger = (CARPET_SMOKE_SPAWN_INTERVAL_SEC / Math.max(1, entities.length)) * i
    return {
      entity,
      name: `anchor_${i}`,
      cooldown: stagger
    }
  })
  if (anchors.length > 0) {
    console.log(`[carpetSmokeLoop] ${anchors.length} anchor(s) con prefijo "${CARPET_PARTICLE_NAME_PREFIX}"`)
  }
}

function spawnAtAnchor(anchor: CarpetAnchor): void {
  const pos = getEntityWorldPosition(anchor.entity)
  if (!pos) return
  fireSmokeWithConfig(Vector3.create(pos.x, pos.y, pos.z), CARPET_SMOKE)
}

export function initCarpetSmokeLoop(): void {
  if (loopStarted) return
  loopStarted = true

  initSmokeParticles()
  refreshCarpetAnchors()
  rediscoverCooldown = REDISCOVER_INTERVAL_SEC

  engine.addSystem((dt) => {
    if (anchors.length === 0) {
      rediscoverCooldown -= dt
      if (rediscoverCooldown <= 0) {
        refreshCarpetAnchors()
        rediscoverCooldown = REDISCOVER_INTERVAL_SEC
      }
      return
    }

    for (const anchor of anchors) {
      anchor.cooldown -= dt
      if (anchor.cooldown > 0) continue
      spawnAtAnchor(anchor)
      anchor.cooldown =
        CARPET_SMOKE_SPAWN_INTERVAL_SEC + Math.random() * CARPET_SMOKE_SPAWN_INTERVAL_SEC * 0.25
    }
  })
}
