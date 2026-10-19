import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    // Safety check for API Key
    if (!RESEND_API_KEY) {
      console.error("[VNC] MISSING RESEND_API_KEY in Supabase Secrets");
      return new Response(JSON.stringify({ status: 'error', message: 'API Key not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 to prevent app from hanging
      })
    }

    const { to, subject, body } = await req.json()
    console.log(`[VNC] Dispatching email to: ${to}`);

    // 2. Resend API call with Fallback
    // If your domain isn't verified, Resend only allows 'onboarding@resend.dev'
    const fromEmail = 'VOEXI Neural <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        text: body,
      }),
    })

    const result = await res.json()

    if (res.ok) {
      console.log("[VNC] Email dispatched successfully");
      return new Response(JSON.stringify({ status: 'sent', id: result.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      console.error("[VNC] Resend API Error:", JSON.stringify(result));
      return new Response(JSON.stringify({ status: 'error', error: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 so app can handle the error gracefully
      })
    }

  } catch (error: any) {
    console.error("[VNC] Edge Function Critical Error:", error.message);
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
