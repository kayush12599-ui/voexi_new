import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const ADMIN_EMAIL = 'teamvoexi@gmail.com'

    const payload = await req.json()
    const {
      userId, username, channelName, vxId, regNum,
      ownerName, editorName, mobile, gender,
      country, state, district, licenseType,
      coverage, foundingDate, selfieUrl
    } = payload

    const htmlContent = `
      <html>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #111; line-height: 1.5; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">

            <div style="background: #7C5CFF; padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; letter-spacing: 2px; font-size: 24px;">🛡️ NEURAL IDENTITY LOG</h1>
              <p style="opacity: 0.9; margin-top: 5px;">STATION VERIFICATION PROTOCOL ACTIVE</p>
            </div>

            <div style="padding: 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="${selfieUrl}" style="width: 180px; height: 180px; border-radius: 90px; border: 5px solid #7C5CFF; object-fit: cover; box-shadow: 0 5px 15px rgba(124, 92, 255, 0.3);" />
                <h2 style="margin: 15px 0 5px 0;">${channelName}</h2>
                <p style="color: #7C5CFF; font-weight: bold; margin: 0;">@${username}</p>
              </div>

              <h3 style="border-left: 4px solid #7C5CFF; padding-left: 10px; color: #333; margin-bottom: 20px;">COMMANDER INTEL</h3>

              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f9f9f9;">
                  <td style="padding: 12px; font-weight: bold; width: 40%;">VX-ID NUMBER</td>
                  <td style="padding: 12px; font-family: monospace; letter-spacing: 1px;">${vxId}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold;">REGISTRATION NO.</td>
                  <td style="padding: 12px; color: #d946ef;">${regNum}</td>
                </tr>
                <tr style="background: #f9f9f9;">
                  <td style="padding: 12px; font-weight: bold;">IDENTITY NUMBER (MOBILE)</td>
                  <td style="padding: 12px; color: #00C851; font-weight: bold;">${mobile}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold;">STATION OWNER</td>
                  <td style="padding: 12px;">${ownerName}</td>
                </tr>
                <tr style="background: #f9f9f9;">
                  <td style="padding: 12px; font-weight: bold;">CHIEF EDITOR</td>
                  <td style="padding: 12px;">${editorName || 'NOT ASSIGNED'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold;">GENDER</td>
                  <td style="padding: 12px;">${gender}</td>
                </tr>
                <tr style="background: #f9f9f9;">
                  <td style="padding: 12px; font-weight: bold;">LOCATION</td>
                  <td style="padding: 12px;">${district}, ${state}, ${country}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold;">LICENSE TYPE</td>
                  <td style="padding: 12px; background: #e0e7ff; border-radius: 4px; display: inline-block; margin: 8px;">${licenseType}</td>
                </tr>
                <tr style="background: #f9f9f9;">
                  <td style="padding: 12px; font-weight: bold;">BROADCAST RANGE</td>
                  <td style="padding: 12px;">${coverage}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold;">STATION FOUNDED</td>
                  <td style="padding: 12px;">${foundingDate}</td>
                </tr>
              </table>

              <div style="margin-top: 40px; display: flex; gap: 20px; justify-content: center;">
                <a href="https://iafmgtldihnhcvrfveev.supabase.co/functions/v1/handle-verification?action=approve&userId=${userId}"
                   style="background-color: #00C851; color: white; padding: 20px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; text-align: center; flex: 1;">
                   ✅ APPROVE STATION
                </a>
                <a href="https://iafmgtldihnhcvrfveev.supabase.co/functions/v1/handle-verification?action=reject&userId=${userId}"
                   style="background-color: #ff4444; color: white; padding: 20px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; text-align: center; flex: 1; margin-left: 20px;">
                   ❌ REJECT SIGNAL
                </a>
              </div>
            </div>

            <div style="background: #111; color: #666; padding: 20px; text-align: center; font-size: 11px;">
              TRACE ID: ${userId}<br/>
              VOEXI NEURAL CORE | SPECTRUM COMMAND CENTER
            </div>
          </div>
        </body>
      </html>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'VOEXI Verify <alerts@voexi.online>',
        to: [ADMIN_EMAIL],
        subject: `🚨 [VOEXI] Verification Request: ${channelName} (@${username})`,
        html: htmlContent,
      }),
    })

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  }
})
