import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

const cacheHeaders = {
  ...corsHeaders,
  'Cache-Control': 'public, max-age=60'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('get-stats: function started')

  let wallet: string | null = null
  try {
    const body = await req.json().catch(() => ({})) as { wallet?: string }
    wallet = typeof body?.wallet === 'string' ? body.wallet.trim() || null : null
  } catch {
    // No body or invalid JSON — continue with wallet = null
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Most visited players (top 10 by days_connected)
    const { data: mostVisited, error: err1 } = await supabase
      .from('players')
      .select('wallet, days_connected')
      .order('days_connected', { ascending: false })
      .limit(10)

    if (err1) {
      console.error('get-stats: mostVisited query failed', err1)
      return new Response(
        JSON.stringify({ status: 'error', message: err1.message }),
        { headers: corsHeaders, status: 500 }
      )
    }
    console.log('get-stats: mostVisited result', mostVisited?.length ?? 0, 'rows')

    // 2. Best streak players (top 10 by max_streak)
    const { data: bestStreak, error: err2 } = await supabase
      .from('players')
      .select('wallet, max_streak')
      .order('max_streak', { ascending: false })
      .limit(10)

    if (err2) {
      console.error('get-stats: bestStreak query failed', err2)
      return new Response(
        JSON.stringify({ status: 'error', message: err2.message }),
        { headers: corsHeaders, status: 500 }
      )
    }
    console.log('get-stats: bestStreak result', bestStreak?.length ?? 0, 'rows')

    // 3. Most crowded days (top 5 by visit count) — aggregate in memory
    const { data: dailyRows, error: err3 } = await supabase
      .from('daily_visits')
      .select('visit_date')

    if (err3) {
      console.error('get-stats: crowdedDays query failed', err3)
      return new Response(
        JSON.stringify({ status: 'error', message: err3.message }),
        { headers: corsHeaders, status: 500 }
      )
    }

    const countByDate = (dailyRows ?? []).reduce<Record<string, number>>((acc, row) => {
      const d = row.visit_date as string
      acc[d] = (acc[d] ?? 0) + 1
      return acc
    }, {})

    const crowdedDays = Object.entries(countByDate)
      .map(([visit_date, visits]: [string, number]) => ({ visit_date, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5)

    console.log('get-stats: crowdedDays result', crowdedDays.length, 'rows')

    const stats = {
      mostVisited: mostVisited ?? [],
      bestStreak: bestStreak ?? [],
      crowdedDays
    }

    // 4. Current player stats and rank (when wallet provided)
    let player: {
      wallet: string
      days_connected: number
      login_streak: number
      max_streak: number
      total_logins: number
      rank: number | null
    } | null = null

    if (wallet) {
      const { data: playerRow, error: err4 } = await supabase
        .from('players')
        .select('wallet, days_connected, login_streak, max_streak, total_logins')
        .eq('wallet', wallet)
        .maybeSingle()

      if (err4) {
        console.error('get-stats: player query failed', err4)
        return new Response(
          JSON.stringify({ status: 'error', message: err4.message }),
          { headers: corsHeaders, status: 500 }
        )
      }

      if (playerRow) {
        const daysConnected = Number(playerRow.days_connected) ?? 0

        // Rank = 1 + number of players with strictly higher days_connected
        const { count, error: err5 } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .gt('days_connected', daysConnected)

        if (err5) {
          console.error('get-stats: rank query failed', err5)
          return new Response(
            JSON.stringify({ status: 'error', message: err5.message }),
            { headers: corsHeaders, status: 500 }
          )
        }

        const rank = (count ?? 0) + 1

        player = {
          wallet: String(playerRow.wallet),
          days_connected: daysConnected,
          login_streak: Number(playerRow.login_streak) ?? 0,
          max_streak: Number(playerRow.max_streak) ?? 0,
          total_logins: Number(playerRow.total_logins) ?? 0,
          rank
        }
        console.log('get-stats: player result', player)
      }
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        stats,
        player
      }),
      {
        headers: cacheHeaders,
        status: 200
      }
    )
  } catch (err) {
    console.error('get-stats: error', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ status: 'error', message }),
      { headers: corsHeaders, status: 500 }
    )
  }
})
