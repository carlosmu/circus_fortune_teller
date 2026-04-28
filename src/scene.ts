import { engine, GltfContainer, Transform, VisibilityComponent, AudioSource, Animator } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

export const TABLE = engine.addEntity()
export const WIZARD = engine.addEntity()
/**
 * Collider legacy (host_collider.glb). Oculto: el rol se toma por Sit Spot + trigger GLB.
 *
 * TODOs (limpieza):
 * - [ ] eliminar host_collider.glb (asset en assets/models/)
 * - [ ] quitar entidad FORTUNE_TELLER_COLLIDER y GltfContainer asociado si ya no hace falta
 */
export const FORTUNE_TELLER_COLLIDER = engine.addEntity()

const BACKGROUND_MUSIC = engine.addEntity()

/** Wizard position in scene (GLB origin 0,0,0, placed by code). */
const WIZARD_POSITION = Vector3.create(8, 0.5, 6.75)

/** Fixed position of the fortune teller spot (never mutated, unlike WIZARD's Transform). */
export const FORTUNE_TELLER_POSITION = Vector3.create(8, 0, 5)
/** Point the fortune teller camera looks at (table/guest). */
export const FORTUNE_TELLER_CAMERA_TARGET = Vector3.create(8, 1, 8)
/** Position of Chair_Fortune_Teller (composite entity 518). */
export const CHAIR_FORTUNE_TELLER_POSITION = Vector3.create(8, 0, 4.75)

export function setupScene() {
  // TABLE ENTITY (referenciado por cámara/interacción)
  Transform.create(TABLE, {
    position: Vector3.create(8, 0, 8)
  })
  GltfContainer.create(TABLE, {
    src: 'assets/models/Ftable.glb'
  })

  // WIZARD (hidden when local player is fortune teller)
  Transform.create(WIZARD, {
    position: WIZARD_POSITION,
    scale: Vector3.create(1.2, 1.2, 1.2)
  })

  GltfContainer.create(WIZARD, {
    src: 'assets/models/fortune_teller.glb'
  })
  /** Debe declararse explícitamente: sin esto `Animator.has(WIZARD)` suele ser false y el código no puede cambiar de clip. */
  Animator.create(WIZARD, {
    states: [
      { clip: 'sit_idle', playing: true, loop: true, speed: 1 },
      { clip: 'stand_idle', playing: false, loop: true, speed: 1 }
    ]
  })
  VisibilityComponent.create(WIZARD, { visible: true })

  // FORTUNE TELLER COLLIDER (host_collider.glb): desactivado temporalmente — ver TODO arriba
  Transform.create(FORTUNE_TELLER_COLLIDER, {
    position: WIZARD_POSITION
  })
  GltfContainer.create(FORTUNE_TELLER_COLLIDER, {
    src: 'assets/models/host_collider.glb'
  })
  VisibilityComponent.create(FORTUNE_TELLER_COLLIDER, { visible: false })
  // Background music: global loop
  Transform.create(BACKGROUND_MUSIC, { position: Vector3.create(8, 0, 8) })
  AudioSource.create(BACKGROUND_MUSIC, {
    audioClipUrl: 'assets/audio/building_music.mp3',
    playing: true,
    loop: true,
    volume: 1
  })

}
