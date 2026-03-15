import { engine } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { setupInteractionSystem } from './interactionSystem'
import { setupHostSystem } from './hostSystem'
import { setupFortuneUiSystem } from './fortuneUiSystem'
import { setupFortuneSync } from './fortuneSync'
import { setupGuestSpot } from './setupGuestSpot'
import { setupWizard } from './setupWizard'
import { setupUi } from './ui'
import { setupScene } from './scene'
import { registerVisit, getStats } from './supabase_api'
import { setupLeaderboard3D, setLeaderboardData } from './leaderboard3D'

let visitRegistered = false
let statsFetched = false

export function main() {
  // Register visit when player is available (may not be on first frame)
  engine.addSystem(() => {
    if (visitRegistered) return
    const player = getPlayer()
    const wallet = player?.userId
    if (wallet) {
      visitRegistered = true
      console.log('Player wallet:', wallet)
      registerVisit(wallet, player.name)
    }
  })

  // Fortune sync across players (MessageBus)
  setupFortuneSync()

  // Inicializar la UI base
  setupUi()

  // Inicializar escena (mesa, wizard, etc.)
  setupScene()

  // Panel 3D del leaderboard (monospace, +2m en X respecto al host)
  setupLeaderboard3D()

  // Load stats and update leaderboard panel
  engine.addSystem(() => {
    if (statsFetched) return
    const player = getPlayer()
    const wallet = player?.userId ?? null
    if (wallet === null) return
    statsFetched = true
    getStats(wallet).then((data) => {
      if (data) setLeaderboardData(data)
    })
  })

  setupGuestSpot()
  setupWizard()
  setupInteractionSystem()
  setupHostSystem()
  setupFortuneUiSystem()
}


