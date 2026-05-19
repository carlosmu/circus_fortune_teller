import { executeTask } from '@dcl/sdk/ecs'
import { movePlayerTo } from '~system/RestrictedActions'
import { FORTUNE_TELLER_CAMERA_TARGET } from './scene'

/**
 * Rectángulo XZ al abandonar silla de invitado o rol de Fortune Teller (leave dialog, tope de lecturas, etc.).
 */
const ROLE_LEAVE_DISPLACE_RANDOM_MIN_X = 5
const ROLE_LEAVE_DISPLACE_RANDOM_MAX_X = 11
const ROLE_LEAVE_DISPLACE_RANDOM_MIN_Z = 9
const ROLE_LEAVE_DISPLACE_RANDOM_MAX_Z = 11

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Teletransporte aleatorio compartido (guest y fortune teller al soltar su rol). */
export function displacePlayerToRandomLeaveArea(): void {
  executeTask(async () => {
    try {
      await movePlayerTo({
        newRelativePosition: {
          x: randomInRange(ROLE_LEAVE_DISPLACE_RANDOM_MIN_X, ROLE_LEAVE_DISPLACE_RANDOM_MAX_X),
          y: 1,
          z: randomInRange(ROLE_LEAVE_DISPLACE_RANDOM_MIN_Z, ROLE_LEAVE_DISPLACE_RANDOM_MAX_Z)
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

/** @deprecated Usar `displacePlayerToRandomLeaveArea`; alias para call sites del guest. */
export function displaceGuestSeatOccupantToRandomArea(): void {
  displacePlayerToRandomLeaveArea()
}
