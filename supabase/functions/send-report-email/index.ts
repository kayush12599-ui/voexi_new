import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const ADMIN_EMAIL = 'teamvoexi@gmail.com'
    const FROM_EMAIL = 'VOEXI Reports <alerts@voexi.online>'

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const {
      reportId,
      reporterName,
      reporterEmail,
      targetName,
      reason,
      description,
      contentTitle,
      contentUrl
    } = await req.json()

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #d32f2f;">[VOEXI Report] New Report Logged</h2>
            <p>A new content report has been submitted. Details below:</p>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-weight: bold; width: 150px;">Report ID:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${reportId}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-weight: bold;">Reason:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; color: #d32f2f;">${reason}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-weight: bold;">Reporter:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${reporterName} (${reporterEmail})</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-weight: bold;">Target:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${targetName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-weight: bold;">Content:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${contentTitle}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-weight: bold;">URL:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><a href="${contentUrl}">${contentUrl}</a></td>
              </tr>
            </table>

            <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #d32f2f;">
              <h4 style="margin: 0 0 10px 0;">Description:</h4>
              <p style="margin: 0;">${description || 'No description provided.'}</p>
            </div>

            <p style="font-size: 12px; color: #777; margin-top: 30px;">
              This is an automated security alert from the VOEXI Neural Core.
            </p>
          </div>
        </body>
      </html>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'VOEXI <onboarding@resend.dev>', // USE THIS FOR TESTING
        to: [ADMIN_EMAIL],
        subject: `[VOEXI Report] New Report - ${reason}`,
        html: htmlContent,
      }),
    })

    const data = await res.json()

    if (res.ok) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      console.error('[RESEND ERROR]', data)
      return new Response(JSON.stringify({ success: false, error: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
