export const SUPABASE_FUNCTION_URL =
  "https://vbkodaxfnigccjzypfsd.supabase.co/functions/v1/swift-responder"

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZia29kYXhmbmlnY2NqenlwZnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODU0NDEsImV4cCI6MjA4OTA2MTQ0MX0.YVKVurMGx-FzVhclpKd24Qzl3oRDVXfXkZoqKWPNeDM"

// Funcion que registra la visita de un jugador a la escena
export async function registerVisit(wallet: string) {
try {
    await fetch(SUPABASE_FUNCTION_URL, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ wallet })
    })
} catch (error) {
    console.log("registerVisit error", error)
}
}