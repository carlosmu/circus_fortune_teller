import {
  engine,
  Transform,
  TextShape,
  MeshRenderer,
  Material,
  VisibilityComponent,
  Font,
  TextAlignMode
} from '@dcl/sdk/ecs'
import { Vector3, Color4, Quaternion } from '@dcl/sdk/math'
import { HOST_POSITION } from './scene'
import type { GetStatsResponse } from './supabase_api'

const PANEL_WIDTH = 2.5
const PANEL_HEIGHT = 2.5
const OFFSET_X = 2
const OFFSET_Y = 2
const FRAME_THICKNESS = 0.08

const COLOR_FRAME = Color4.create(0.35, 0.22, 0.08, 1)
const COLOR_BG = Color4.create(0.09, 0.07, 0.04, 0.97)
/** Color para títulos (secciones y cabeceras de columna). */
const COLOR_HEADER = Color4.create(0.95, 0.85, 0.2, 1)
/** Color para texto de contenido (nombres, números). */
const COLOR_TEXT = Color4.create(0.98, 0.95, 0.85, 1)
const COLOR_OUTLINE = Color4.create(0.15, 0.1, 0.05, 1)
/** Tamaño de fuente compartido por títulos y contenido. */
const FONT_SIZE = 0.8

const PROFILE_API_URL = 'https://peer.decentraland.org/lambdas/profiles'

let parentEntity: ReturnType<typeof engine.addEntity> | null = null
let textHeaderEntity: ReturnType<typeof engine.addEntity> | null = null
let textContentEntity: ReturnType<typeof engine.addEntity> | null = null

function shortWallet(wallet: string): string {
  if (!wallet || wallet.length < 12) return wallet
  return wallet.slice(0, 6) + '...' + wallet.slice(-4)
}

function displayName(wallet: string, profileNames: Map<string, string>): string {
  const name = profileNames.get(wallet) ?? profileNames.get(wallet.toLowerCase())
  if (name != null && name !== '') return name
  return shortWallet(wallet)
}

async function fetchProfileNames(wallets: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(wallets)].filter((w) => w && w.length > 0)
  if (unique.length === 0) return new Map()

  try {
    const res = await fetch(PROFILE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unique })
    })
    const profiles = (await res.json().catch(() => null)) as Array<{
      avatars?: Array<{
        userId?: string
        ethAddress?: string
        name?: string
        hasClaimedName?: boolean
      }>
    }> | null
    if (!Array.isArray(profiles)) return new Map()

    const map = new Map<string, string>()
    for (const profile of profiles) {
      const avatar = profile.avatars?.[0]
      const wallet = avatar?.userId ?? avatar?.ethAddress
      const name = avatar?.name?.trim()
      const hasClaimedName = avatar?.hasClaimedName === true
      if (wallet && name) {
        const display =
          hasClaimedName ? name : `${name}#${wallet.slice(-4).toLowerCase()}`
        map.set(wallet, display)
        map.set(wallet.toLowerCase(), display)
      }
    }
    return map
  } catch {
    return new Map()
  }
}

function getRankTag(index: number): string {
  if (index === 0) return '🥇'
  if (index === 1) return '🥈'
  if (index === 2) return '🥉'
  return `${index + 1}.`
}

function formatStats(
  data: GetStatsResponse,
  profileNames: Map<string, string>
): { headerText: string; contentText: string } {
  if (data.status !== 'ok' || !data.stats) {
    const msg = 'Loading...'
    return { headerText: msg, contentText: msg }
  }

  const lines: string[] = []
  const isHeaderLine: boolean[] = []
  const s = data.stats
  const NAME_WIDTH = 25
  const RNK_WIDTH = 4

  // TOP VISITORS
  lines.push('----------  🏆 TOP VISITORS   ----------')
  isHeaderLine.push(true)
  lines.push(`   ${' '.repeat(RNK_WIDTH - 3)}  Name${' '.repeat(NAME_WIDTH - 4)}  Days`)
  isHeaderLine.push(true)
  ;(s.mostVisited ?? []).slice(0, 10).forEach((p, i) => {
    const rank = getRankTag(i).padEnd(RNK_WIDTH, ' ')
    const name = displayName(p.wallet, profileNames).padEnd(NAME_WIDTH, ' ')
    lines.push(`${rank}  ${name}  ${p.days_connected}`)
    isHeaderLine.push(false)
  })
  lines.push('')
  isHeaderLine.push(false)

  // BEST STREAKS
  lines.push('----------  🔥 BEST STREAKS   ----------')
  isHeaderLine.push(true)
  lines.push(`   ${' '.repeat(RNK_WIDTH - 3)}  Name${' '.repeat(NAME_WIDTH - 4)}  Days`)
  isHeaderLine.push(true)
  ;(s.bestStreak ?? []).slice(0, 3).forEach((p, i) => {
    const rank = getRankTag(i).padEnd(RNK_WIDTH, ' ')
    const name = displayName(p.wallet, profileNames).padEnd(NAME_WIDTH, ' ')
    lines.push(`${rank}  ${name}  ${p.max_streak}`)
    isHeaderLine.push(false)
  })
  lines.push('')
  isHeaderLine.push(false)

  // CROWDED DAYS
  lines.push('----------  👥 CROWDED DAYS   ----------')
  isHeaderLine.push(true)
  lines.push(`   ${' '.repeat(RNK_WIDTH - 3)}  Date${' '.repeat(NAME_WIDTH - 4)}  Visits`)
  isHeaderLine.push(true)
  ;(s.crowdedDays ?? []).slice(0, 3).forEach((row, i) => {
    const rank = getRankTag(i).padEnd(RNK_WIDTH, ' ')
    const date = row.visit_date.padEnd(NAME_WIDTH, ' ')
    lines.push(`${rank}  ${date}  ${row.visits}`)
    isHeaderLine.push(false)
  })

  // YOU
  if (data.player) {
    const p = data.player
    lines.push('')
    isHeaderLine.push(false)
    lines.push('👤 YOU')
    isHeaderLine.push(true)
    lines.push(displayName(p.wallet, profileNames))
    isHeaderLine.push(false)
    lines.push(`Days: ${p.days_connected} | Streak: ${p.login_streak}`)
    isHeaderLine.push(false)
    if (p.rank != null) {
      lines.push(`Rank: #${p.rank}`)
      isHeaderLine.push(false)
    }
  }

  const maxLen = Math.max(...lines.map((l) => l.length), 1)
  const headerText = lines
    .map((line, i) => (isHeaderLine[i] ? line.padEnd(maxLen) : ' '.repeat(maxLen)))
    .join('\n')
  const contentText = lines
    .map((line, i) => (isHeaderLine[i] ? ' '.repeat(maxLen) : line.padEnd(maxLen)))
    .join('\n')
  return { headerText, contentText }
}

const TEXT_POS = Vector3.create(-PANEL_WIDTH / 2 + 0.2, PANEL_HEIGHT / 2 - 0.2, -0.02)
const TEXT_SIZE = { width: PANEL_WIDTH - 0.4, height: PANEL_HEIGHT - 0.4 }

function ensureEntities(): {
  parent: ReturnType<typeof engine.addEntity>
  textHeader: ReturnType<typeof engine.addEntity>
  textContent: ReturnType<typeof engine.addEntity>
} {
  if (parentEntity !== null && textHeaderEntity !== null && textContentEntity !== null) {
    return { parent: parentEntity, textHeader: textHeaderEntity, textContent: textContentEntity }
  }

  const parent = engine.addEntity()
  Transform.create(parent, {
    position: Vector3.create(
      HOST_POSITION.x + OFFSET_X,
      HOST_POSITION.y + OFFSET_Y,
      HOST_POSITION.z
    ),
    rotation: Quaternion.fromEulerDegrees(0, -180, 0)
  })

  const frame = engine.addEntity()
  Transform.create(frame, {
    parent,
    position: Vector3.create(0, 0, 0.02),
    scale: Vector3.create(PANEL_WIDTH + FRAME_THICKNESS * 2, PANEL_HEIGHT + FRAME_THICKNESS * 2, 1)
  })
  MeshRenderer.setPlane(frame)
  Material.setBasicMaterial(frame, {
    diffuseColor: COLOR_FRAME
  })

  const background = engine.addEntity()
  Transform.create(background, {
    parent,
    position: Vector3.create(0, 0, 0.01),
    scale: Vector3.create(PANEL_WIDTH, PANEL_HEIGHT, 1)
  })
  MeshRenderer.setPlane(background)
  Material.setBasicMaterial(background, {
    diffuseColor: COLOR_BG
  })

  const textHeader = engine.addEntity()
  Transform.create(textHeader, {
    parent,
    position: Vector3.create(TEXT_POS.x, TEXT_POS.y, -0.02)
  })
  TextShape.create(textHeader, {
    text: 'Loading...',
    fontSize: FONT_SIZE,
    font: Font.F_MONOSPACE,
    textAlign: TextAlignMode.TAM_TOP_LEFT,
    textColor: COLOR_HEADER,
    outlineColor: COLOR_OUTLINE,
    outlineWidth: 0.08,
    width: TEXT_SIZE.width,
    height: TEXT_SIZE.height,
    textWrapping: false
  })

  const textContent = engine.addEntity()
  Transform.create(textContent, {
    parent,
    position: Vector3.create(TEXT_POS.x, TEXT_POS.y, -0.03)
  })
  TextShape.create(textContent, {
    text: '',
    fontSize: FONT_SIZE,
    font: Font.F_MONOSPACE,
    textAlign: TextAlignMode.TAM_TOP_LEFT,
    textColor: COLOR_TEXT,
    outlineColor: COLOR_OUTLINE,
    outlineWidth: 0.08,
    width: TEXT_SIZE.width,
    height: TEXT_SIZE.height,
    textWrapping: false
  })

  parentEntity = parent
  textHeaderEntity = textHeader
  textContentEntity = textContent
  return { parent, textHeader, textContent }
}

export function setupLeaderboard3D(): void {
  ensureEntities()
  VisibilityComponent.create(parentEntity!, { visible: true })
}

export async function setLeaderboardData(data: GetStatsResponse | null): Promise<void> {
  const entities = ensureEntities()
  if (!data) {
    TextShape.getMutable(entities.textHeader).text = 'Loading...'
    TextShape.getMutable(entities.textContent).text = ''
    return
  }

  const wallets: string[] = []
  if (data.stats) {
    ;(data.stats.mostVisited ?? []).forEach((p) => wallets.push(p.wallet))
    ;(data.stats.bestStreak ?? []).forEach((p) => wallets.push(p.wallet))
  }
  if (data.player) wallets.push(data.player.wallet)

  const profileNames = await fetchProfileNames(wallets)
  const { headerText, contentText } = formatStats(data, profileNames)
  TextShape.getMutable(entities.textHeader).text = headerText
  TextShape.getMutable(entities.textContent).text = contentText
}
