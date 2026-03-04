import {
    engine,
    Transform,
    pointerEventsSystem,
    InputAction
  } from '@dcl/sdk/ecs'
  import { Vector3 } from '@dcl/sdk/math'
  import { gameData } from './gameState'
  import { TABLE } from './scene'
  
  export const GUEST_SPOT = engine.addEntity()
  
  export function setupGuestSpot() {
    // Posición donde se sentará/parará el guest, frente a la mesa
    Transform.create(GUEST_SPOT, {
      position: Vector3.create(8, 1, 8.6)
    })
  
    pointerEventsSystem.onPointerDown(
      {
        entity: TABLE,
        opts: {
          button: InputAction.IA_POINTER,
          hoverText: 'Consultar tu fortuna'
        }
      },
      () => {
        // Si ya hay sesión, ignorar
        if (gameData.gameState !== 'LIBRE') return
  
        // En SDK7 puedes identificar al player actual según cómo estés manejando multi‑player;
        // como primera aproximación, usamos un id genérico o un TODO:
        gameData.currentGuestId = 'TODO-player-id'
        gameData.gameState = 'OCUPADO'
  
        // TODO: mover al player al GUEST_SPOT y bloquear su movimiento
      }
    )
  }