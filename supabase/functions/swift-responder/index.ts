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
    const body = await req.json() as { wallet?: string; name?: string }
    const wallet = body?.wallet?.trim()
    const name = typeof body?.name === 'string' ? body.name.trim() || null : null

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
    const yesterday = getYesterdayUTC()
    const nowIso = new Date().toISOString()

    // STEP 1 — Check if today's visit already exists
    const { data: existingVisit, error: checkError } = await supabase
      .from('daily_visits')
      .select('wallet')
      .eq('wallet', wallet)
      .eq('visit_date', today)
      .maybeSingle()

    if (checkError) throw checkError

    const isNewVisit = !existingVisit

    // STEP 2 — Record visit
    const { error: visitError } = await supabase
      .from('daily_visits')
      .upsert({
        wallet,
        visit_date: today,
        visit_time: nowIso
      })

    if (visitError) throw visitError

    if (isNewVisit) {
      console.log('Daily visit recorded')
    }

    // STEP 3 — Load player
    const { data: player, error: selectError } = await supabase
      .from('players')
      .select('wallet, first_login, last_login, days_connected, total_logins, login_streak, max_streak, name')
      .eq('wallet', wallet)
      .maybeSingle()

    if (selectError) throw selectError

    let updatedPlayer: any

    // STEP 4 — New player
    if (!player) {

      updatedPlayer = {
        wallet,
        first_login: today,
        last_login: today,
        days_connected: 1,
        total_logins: 1,
        login_streak: 1,
        max_streak: 1,
        ...(name != null && { name })
      }

      const { error: insertError } = await supabase
        .from('players')
        .insert(updatedPlayer)

      if (insertError) throw insertError

      console.log('New player created:', updatedPlayer)

    } else {

      // STEP 5 — Update existing player stats

      let days_connected = player.days_connected ?? 0
      let total_logins = (player.total_logins ?? 0) + 1
      let login_streak = player.login_streak ?? 0
      let max_streak = player.max_streak ?? 0

      const lastLogin = player.last_login

      if (isNewVisit) {
        days_connected += 1
      }

      if (lastLogin === today) {
        // already visited today
      }
      else if (lastLogin === yesterday) {
        login_streak += 1
      }
      else {
        login_streak = 1
      }

      max_streak = Math.max(max_streak, login_streak)

      updatedPlayer = {
        wallet,
        first_login: player.first_login ?? today,
        last_login: today,
        days_connected,
        total_logins,
        login_streak,
        max_streak,
        name: name ?? (player as { name?: string | null }).name ?? null
      }

      const updatePayload: Record<string, unknown> = {
        last_login: today,
        days_connected,
        total_logins,
        login_streak,
        max_streak
      }
      if (name != null) updatePayload.name = name

      const { error: updateError } = await supabase
        .from('players')
        .update(updatePayload)
        .eq('wallet', wallet)

      if (updateError) throw updateError

      console.log('Updated player stats:', {
        days_connected,
        login_streak,
        max_streak,
        total_logins
      })
    }

    // STEP 6 — Response
    return new Response(
      JSON.stringify({
        status: 'ok',
        wallet,
        updated_player: updatedPlayer
      }),
      { headers: corsHeaders, status: 200 }
    )

  } catch (err) {

    console.error('swift-responder error:', err)

    return new Response(
      JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : String(err)
      }),
      { headers: corsHeaders, status: 500 }
    )
  }
})