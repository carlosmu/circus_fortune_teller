import { executeTask } from '@dcl/sdk/ecs'
import { movePlayerTo } from '~system/RestrictedActions'
import { FORTUNE_TELLER_CAMERA_TARGET } from './scene'

/**
 * Rectángulo XZ al salir de la silla de invitado (idle, tope de lecturas, o “No” a más fortuna).
 * Alineado con `moveFortuneTellerToRandomArea` / `FORTUNE_TELLER_RANDOM_*` en setupWizard.ts.
 */
const GUEST_SEAT_DISPLACE_RANDOM_MIN_X = 3
const GUEST_SEAT_DISPLACE_RANDOM_MAX_X = 13
const GUEST_SEAT_DISPLACE_RANDOM_MIN_Z = 7
const GUEST_SEAT_DISPLACE_RANDOM_MAX_Z = 12

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function displaceGuestSeatOccupantToRandomArea(): void {
  executeTask(async () => {
    try {
      await movePlayerTo({
        newRelativePosition: {
          x: randomInRange(GUEST_SEAT_DISPLACE_RANDOM_MIN_X, GUEST_SEAT_DISPLACE_RANDOM_MAX_X),
          y: 1,
          z: randomInRange(GUEST_SEAT_DISPLACE_RANDOM_MIN_Z, GUEST_SEAT_DISPLACE_RANDOM_MAX_Z)
        },
        cameraTarget: {
          x: FORTUNE_TELLER_CAMERA_TARGET.x,
          y: FORTUNE_TELLER_CAMERA_TARGET.y,
          z: FORTUNE_TELLER_CAMERA_TARGET.z
        }
      })
    } catch (_e) {}
  })
}
