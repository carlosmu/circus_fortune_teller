import { engine, GltfContainer, Transform, VisibilityComponent, AudioSource, Animator } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

export const TABLE = engine.addEntity()
export const FLOOR = engine.addEntity()
export const TENT = engine.addEntity()
export const LIGHTS_TENT = engine.addEntity()
export const WIZARD = engine.addEntity()
/** Entity with fortune_teller_collider.glb: click area for "Become Fortune Teller". */
export const FORTUNE_TELLER_COLLIDER = engine.addEntity()
/** Animated GLB shown when player enters the Fortune Teller trigger area. */
export const BECOME_FORTUNE_TELLER_PROMPT = engine.addEntity()

const BACKGROUND_MUSIC = engine.addEntity()

/** Wizard position in scene (GLB origin 0,0,0, placed by code). */
const WIZARD_POSITION = Vector3.create(8, 0, 5)

/** Fixed position of the fortune teller spot (never mutated, unlike WIZARD's Transform). */
export const FORTUNE_TELLER_POSITION = Vector3.create(8, 0, 5)
/** Point the fortune teller camera looks at (table/guest). */
export const FORTUNE_TELLER_CAMERA_TARGET = Vector3.create(8, 1, 8)
/** Position of Chair_Fortune_Teller (composite entity 518). */
export const CHAIR_FORTUNE_TELLER_POSITION = Vector3.create(8, 0, 4.75)

export function setupScene() {
  // TABLE ENTITY
  Transform.create(TABLE, {
    position: Vector3.create(8, 0, 8)
  })

  GltfContainer.create(TABLE, {
    src: 'assets/models/table.glb'
  })

  // WIZARD (hidden when local player is fortune teller)
  Transform.create(WIZARD, {
    position: WIZARD_POSITION,
    scale: Vector3.create(1.2, 1.2, 1.2)
  })

  GltfContainer.create(WIZARD, {
    src: 'assets/models/fortune_teller.glb'
  })
  VisibilityComponent.create(WIZARD, { visible: true })

  // FORTUNE TELLER COLLIDER: same position as wizard, for "Become Fortune Teller" click
  Transform.create(FORTUNE_TELLER_COLLIDER, {
    position: WIZARD_POSITION
  })

  
  GltfContainer.create(FORTUNE_TELLER_COLLIDER, {
    src: 'assets/models/host_collider.glb'
  })
  Transform.create(FLOOR, {
    position: Vector3.create(8, 0, 8)
  })
  GltfContainer.create(FLOOR, {
    src: 'assets/models/floor.glb'
  })
  Transform.create(TENT, {
    position: Vector3.create(8, 0, 8)
  })
  GltfContainer.create(TENT, {
    src: 'assets/models/tent.glb'
  })
  Transform.create(LIGHTS_TENT, {
    position: Vector3.create(8, 0, 8)
  })
  GltfContainer.create(LIGHTS_TENT, {
    src: 'assets/models/lights_tent.glb'
  })

  // "Become Fortune Teller" animated prompt — hidden until player enters trigger
  Transform.create(BECOME_FORTUNE_TELLER_PROMPT, {
    position: Vector3.create(CHAIR_FORTUNE_TELLER_POSITION.x, CHAIR_FORTUNE_TELLER_POSITION.y, CHAIR_FORTUNE_TELLER_POSITION.z)
  })
  GltfContainer.create(BECOME_FORTUNE_TELLER_PROMPT, {
    src: 'assets/models/become_fortune_teller.glb'
  })
  VisibilityComponent.create(BECOME_FORTUNE_TELLER_PROMPT, { visible: false })
  Animator.create(BECOME_FORTUNE_TELLER_PROMPT, {
    states: [{ clip: 'become_fortune_teller', playing: true, loop: true, speed: 1 }]
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
