import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const userId = url.searchParams.get('userId')

  if (!action || !userId) {
    return new Response('Invalid Request Protocol', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const isApprove = action === 'approve'
    const verificationStatus = isApprove ? 'verified' : 'rejected'

    // 1. UPDATE DATABASE
    await supabase.from('profiles').update({ verification_status: verificationStatus }).eq('id', userId)
    await supabase.from('station_applications').update({ status: isApprove ? 'approved' : 'rejected' }).eq('user_id', userId)

    // 2. GENERATE CLEAN HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>VOEXI Verification</title>
        <style>
          body { background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #080808; padding: 50px; border-radius: 30px; text-align: center; border: 1px solid #111; max-width: 350px; }
          .icon { font-size: 50px; margin-bottom: 20px; color: ${isApprove ? '#00ff00' : '#ff4444'}; }
          h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
          p { color: #555; font-size: 12px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">${isApprove ? '&#10003;' : '&#10005;'}</div>
          <h1>Agent ${isApprove ? 'Verified' : 'Rejected'}</h1>
          <p>The neural spectrum has been updated. You can now close this window.</p>
        </div>
      </body>
      </html>
    `

    // 3. RETURN WITH FORCED HTML HEADER (CRITICAL)
    return new Response(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Access-Control-Allow-Origin": "*"
      },
      status: 200,
    })

  } catch (error: any) {
    return new Response(`System Error: ${error.message}`, { status: 500 })
  }
})
