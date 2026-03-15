import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function getYesterdayUTC(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json() as { wallet?: string }
    const wallet = body?.wallet?.trim()

    if (!wallet) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Missing wallet' }),
        { headers: corsHeaders, status: 400 }
      )
    }

    console.log('Wallet received:', wallet)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = getTodayUTC()
    const nowIso = new Date().toISOString()

    // Step 1 & 2 — Insert daily visit (no duplicate for same wallet + date)
    const { error: visitError } = await supabase
      .from('daily_visits')
      .insert({
        wallet,
        visit_date: today,
        visit_time: nowIso
      })

    const isNewVisit = !visitError
    if (visitError) {
      if (visitError.code === '23505') {
        // Unique violation: already visited today
        // isNewVisit stays false
      } else {
        console.error('Daily visit insert error:', visitError)
        throw visitError
      }
    } else {
      console.log('Daily visit recorded')
    }

    // Step 3 — Load player
    const { data: player, error: selectError } = await supabase
      .from('players')
      .select('wallet, first_login, last_login, days_connected, total_logins, login_streak, max_streak')
      .eq('wallet', wallet)
      .maybeSingle()

    if (selectError) throw selectError

    let updatedPlayer: {
      wallet: string
      first_login: string
      last_login: string
      days_connected: number
      total_logins: number
      login_streak: number
      max_streak: number
    }

    if (!player) {
      // New player
      updatedPlayer = {
        wallet,
        first_login: today,
        last_login: today,
        days_connected: 1,
        total_logins: 1,
        login_streak: 1,
        max_streak: 1
      }
      const { error: insertError } = await supabase
        .from('players')
        .insert(updatedPlayer)
      if (insertError) throw insertError
      console.log('Updated player stats:', updatedPlayer)
    } else {
      // Step 4 — Existing player: update stats
      let days_connected = player.days_connected ?? 0
      let total_logins = (player.total_logins ?? 0) + 1
      let login_streak = player.login_streak ?? 0
      let max_streak = player.max_streak ?? 0
      const lastLogin = (player.last_login as string) ?? ''

      if (isNewVisit) {
        days_connected += 1
      }

      const yesterday = getYesterdayUTC()

      if (lastLogin === today) {
        // Already visited today — streak unchanged
      } else if (lastLogin === yesterday) {
        login_streak += 1
      } else {
        login_streak = 1
      }

      max_streak = Math.max(max_streak, login_streak)

      updatedPlayer = {
        wallet,
        first_login: (player.first_login as string) ?? today,
        last_login: today,
        days_connected,
        total_logins,
        login_streak,
        max_streak
      }

      const { error: updateError } = await supabase
        .from('players')
        .update({
          last_login: today,
          days_connected,
          total_logins,
          login_streak,
          max_streak
        })
        .eq('wallet', wallet)

      if (updateError) throw updateError
      console.log('Updated player stats:', { days_connected, login_streak, max_streak, total_logins })
    }

    // Step 7 — Response
    return new Response(
      JSON.stringify({
        status: 'ok',
        wallet,
        updated_player: updatedPlayer
      }),
      { headers: corsHeaders, status: 200 }
    )
  } catch (err) {
    console.error('Swift-responder error:', err)
    return new Response(
      JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : String(err)
      }),
      { headers: corsHeaders, status: 500 }
    )
  }
})
