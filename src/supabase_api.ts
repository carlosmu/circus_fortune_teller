const SUPABASE_BASE = 'https://vbkodaxfnigccjzypfsd.supabase.co/functions/v1'
const SUPABASE_FUNCTION_URL = `${SUPABASE_BASE}/swift-responder`
const GET_STATS_URL = `${SUPABASE_BASE}/get-stats`

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZia29kYXhmbmlnY2NqenlwZnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODU0NDEsImV4cCI6MjA4OTA2MTQ0MX0.YVKVurMGx-FzVhclpKd24Qzl3oRDVXfXkZoqKWPNeDM'

export type GetStatsResponse = {
  status: 'ok' | 'error'
  message?: string
  stats?: {
    mostVisited: Array<{ wallet: string; days_connected: number; name?: string | null }>
    bestStreak: Array<{ wallet: string; max_streak: number; name?: string | null }>
    crowdedDays: Array<{ visit_date: string; visits: number }>
  }
  player?: {
    wallet: string
    days_connected: number
    login_streak: number
    max_streak: number
    total_logins: number
    rank: number | null
    name?: string | null
  } | null
}

export async function getStats(wallet: string | null): Promise<GetStatsResponse | null> {
  try {
    const response = await fetch(GET_STATS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ wallet: wallet ?? '' })
    })
    const data = (await response.json().catch(() => null)) as GetStatsResponse | null
    return data
  } catch (error) {
    console.log('Supabase getStats error:', error)
    return null
  }
}

export async function registerVisit(wallet: string, name?: string | null): Promise<void> {
  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ wallet, ...(name != null && name !== '' && { name }) })
    })
    const data = await response.json().catch(() => ({ _parseError: true }))
    console.log('Supabase response status:', response.status, 'data:', data)
    if (!response.ok) {
      console.log('Supabase error: request failed', response.status, data)
    }
  } catch (error) {
    console.log('Supabase error:', error)
  }
}
