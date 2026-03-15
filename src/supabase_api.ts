const SUPABASE_FUNCTION_URL =
  'https://vbkodaxfnigccjzypfsd.supabase.co/functions/v1/swift-responder'

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZia29kYXhmbmlnY2NqenlwZnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODU0NDEsImV4cCI6MjA4OTA2MTQ0MX0.YVKVurMGx-FzVhclpKd24Qzl3oRDVXfXkZoqKWPNeDM'

export async function registerVisit(wallet: string): Promise<void> {
  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ wallet })
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
