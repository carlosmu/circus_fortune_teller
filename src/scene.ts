import { engine, GltfContainer, Transform, VisibilityComponent, AudioSource, Animator } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

export const WIZARD = engine.addEntity()

/**
 * Pivote world-space para la cinemática: `cinematicCamera` copia aquí posición/rotación world de
 * `table.glb` (Creator Hub) cada frame. Los arcos **no** se cuelgan del GLB para no romper el render.
 */
export const CINEMATIC_TABLE_FALLBACK = engine.addEntity()

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
const WIZARD_POSITION = Vector3.create(8, 0.5, 6.6)

/** Fixed position of the fortune teller spot (never mutated, unlike WIZARD's Transform). */
export const FORTUNE_TELLER_POSITION = Vector3.create(8, 0, 5)
/** Point the fortune teller camera looks at (table/guest). */
export const FORTUNE_TELLER_CAMERA_TARGET = Vector3.create(8, 1, 8)
/** Position of Chair_Fortune_Teller (composite entity 518). */
export const CHAIR_FORTUNE_TELLER_POSITION = Vector3.create(8, 0, 4.75)

export function setupScene() {

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

  Transform.create(CINEMATIC_TABLE_FALLBACK, {
    position: Vector3.create(8, 0, 8)
  })

  // Background music: global loop
  Transform.create(BACKGROUND_MUSIC, { position: Vector3.create(8, 0, 8) })
  AudioSource.create(BACKGROUND_MUSIC, {
    audioClipUrl: 'assets/audio/building_music.mp3',
    playing: true,
    loop: true,
    volume: 1
  })

}
