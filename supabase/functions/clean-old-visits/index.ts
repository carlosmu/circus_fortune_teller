/**
 * Archiva las visitas por fecha en crowded_days_archive y luego borra registros antiguos
 * de daily_visits. Así no se pierde la información de "qué días fueron los más concurridos".
 * Ejecutar manualmente o con un cron (p. ej. 1 vez al mes).
 *
 * Requiere la tabla crowded_days_archive (visit_date, visits). Ver migrations.
 *
 * Uso: POST .../clean-old-visits  Body: { "retention_days": 90 }  // opcional
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

function getDateDaysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Use POST' }),
      { headers: corsHeaders, status: 405 }
    )
  }

  try {
    let retention_days = 90
    try {
      const body = (await req.json().catch(() => ({}))) as { retention_days?: number }
      if (typeof body?.retention_days === 'number' && body.retention_days >= 1 && body.retention_days <= 3650) {
        retention_days = body.retention_days
      }
    } catch {
      // use default
    }

    const cutoff = getDateDaysAgo(retention_days)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1) Obtener todas las filas antiguas (solo visit_date) y agregar por fecha
    const { data: oldRows, error: selectError } = await supabase
      .from('daily_visits')
      .select('visit_date')
      .lt('visit_date', cutoff)

    if (selectError) {
      console.error('clean-old-visits: select failed', selectError)
      return new Response(
        JSON.stringify({ status: 'error', message: selectError.message }),
        { headers: corsHeaders, status: 500 }
      )
    }

    const countByDate = (oldRows ?? []).reduce<Record<string, number>>((acc, row) => {
      const d = String(row.visit_date ?? '')
      acc[d] = (acc[d] ?? 0) + 1
      return acc
    }, {})

    // 2) Guardar resumen en crowded_days_archive (no se pierde la info de crowded days)
    const archiveRows = Object.entries(countByDate).map(([visit_date, visits]) => ({ visit_date, visits }))
    if (archiveRows.length > 0) {
      const { error: upsertError } = await supabase
        .from('crowded_days_archive')
        .upsert(archiveRows, { onConflict: 'visit_date' })

      if (upsertError) {
        console.error('clean-old-visits: archive upsert failed', upsertError)
        return new Response(
          JSON.stringify({
            status: 'error',
            message: 'No se pudo archivar. ¿Existe la tabla crowded_days_archive? ' + upsertError.message
          }),
          { headers: corsHeaders, status: 500 }
        )
      }
      console.log('clean-old-visits: archived', archiveRows.length, 'dates')
    }

    // 3) Borrar filas antiguas de daily_visits
    const { error: deleteError } = await supabase
      .from('daily_visits')
      .delete()
      .lt('visit_date', cutoff)

    if (deleteError) {
      console.error('clean-old-visits: delete failed', deleteError)
      return new Response(
        JSON.stringify({ status: 'error', message: deleteError.message }),
        { headers: corsHeaders, status: 500 }
      )
    }

    console.log('clean-old-visits: deleted daily_visits with visit_date <', cutoff)

    return new Response(
      JSON.stringify({
        status: 'ok',
        cutoff,
        retention_days,
        archived_dates: archiveRows.length,
        message: `Archivados ${archiveRows.length} fechas en crowded_days_archive y eliminadas visitas anteriores a ${cutoff}`
      }),
      { headers: corsHeaders, status: 200 }
    )
  } catch (err) {
    console.error('clean-old-visits:', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ status: 'error', message }),
      { headers: corsHeaders, status: 500 }
    )
  }
})
