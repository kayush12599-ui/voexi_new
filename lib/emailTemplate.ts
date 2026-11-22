/**
 * VOEXI PRODUCTION GMAIL-COMPATIBLE HTML EMAIL TEMPLATES
 * Ultra-Modern Neon Cyberpunk Styling Engineered Specifically for Gmail (Android/iOS/Web), Apple Mail, and Outlook.
 * 100% Inline CSS for Flawless Native Email Rendering.
 */

export const EmailTemplates = {
  /**
   * Generates a High-End VOEXI Neon Security OTP Email HTML Template
   */
  generateOtpEmail(params: {
    recipientEmail: string;
    otpCode: string;
    purpose: string;
    stationName?: string;
    certificateId?: string;
    currentOwner?: string;
    newOwner?: string;
  }): string {
    const { recipientEmail, otpCode, purpose, stationName, certificateId, currentOwner, newOwner } = params;

    const certRow = certificateId
      ? `<tr>
           <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Certificate ID:</td>
           <td style="padding: 8px 0; color: #A855F7; font-size: 13px; font-weight: bold; text-align: right;">${certificateId}</td>
         </tr>`
      : '';

    const stationRow = stationName
      ? `<tr>
           <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Station Title:</td>
           <td style="padding: 8px 0; color: #ffffff; font-size: 13px; font-weight: bold; text-align: right;">${stationName}</td>
         </tr>`
      : '';

    const ownerRow = currentOwner
      ? `<tr>
           <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Current Owner:</td>
           <td style="padding: 8px 0; color: #ffffff; font-size: 13px; font-weight: bold; text-align: right;">${currentOwner}</td>
         </tr>`
      : '';

    const newOwnerRow = newOwner
      ? `<tr>
           <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">New Assignee:</td>
           <td style="padding: 8px 0; color: #10B981; font-size: 13px; font-weight: bold; text-align: right;">${newOwner}</td>
         </tr>`
      : '';

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VOEXI Security Verification Code</title>
</head>
<body bgcolor="#05050A" style="margin:0; padding:0; background-color:#05050A; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" bgcolor="#05050A" border="0" cellspacing="0" cellpadding="0" style="background-color:#05050A; width:100%; table-layout:fixed;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px; width:100%; background-color:#0d0d16; border-radius:24px; border:1px solid #1e1e32; overflow:hidden;">

          <!-- TOP NEON GRADIENT BRANDING HEADER -->
          <tr>
            <td bgcolor="#00F2FE" align="center" style="background-color:#00F2FE; background: linear-gradient(135deg, #00F2FE 0%, #A855F7 50%, #FF0080 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 30px; font-weight: 900; letter-spacing: 6px; text-transform: uppercase; text-shadow: 0 2px 10px rgba(0,0,0,0.4);">VOEXI</h1>
              <p style="margin: 6px 0 0 0; color: #ffffff; font-size: 10px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; opacity: 0.95;">NEURAL SECURITY OPERATIONS CENTER</p>
            </td>
          </tr>

          <!-- CARD BODY -->
          <tr>
            <td style="padding: 32px 28px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                <tr>
                  <td bgcolor="#18182a" style="background-color: #18182a; border: 1px solid #00F2FE; border-radius: 8px; padding: 6px 14px;">
                    <span style="color: #00F2FE; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">VERIFICATION CODE</span>
                  </td>
                </tr>
              </table>

              <h2 style="margin: 0 0 14px 0; color: #ffffff; font-size: 20px; font-weight: 800; line-height: 1.3;">
                ${purpose}
              </h2>

              <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Security authentication request for <strong style="color: #ffffff;">${recipientEmail}</strong>. Please use the confidential 6-digit OTP code below:
              </p>

              <!-- ULTRA-HIGH-CONTRAST NEON OTP VAULT BOX -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td bgcolor="#00F2FE" align="center" style="background-color: #00F2FE; border: 3px solid #A855F7; border-radius: 20px; padding: 24px 12px; text-align: center;">
                    <p style="margin: 0 0 6px 0; color: #000000; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">YOUR CONFIDENTIAL OTP CODE</p>
                    <h1 style="margin: 8px 0; color: #000000; font-size: 46px; font-weight: 900; letter-spacing: 14px; font-family: 'Courier New', Courier, monospace; line-height: 1;">
                      ${otpCode}
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #000000; font-size: 11px; font-weight: 800; letter-spacing: 1px;">
                      ✓ VALID FOR 10 MINUTES &bull; DO NOT SHARE WITH ANYONE
                    </p>
                  </td>
                </tr>
              </table>

              <!-- TRANSACTION METADATA TABLE -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #12121e; border-radius: 14px; border: 1px solid #22223a; padding: 16px 18px; margin-top: 18px;">
                ${stationRow}
                ${ownerRow}
                ${newOwnerRow}
                ${certRow}
                <tr>
                  <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Security Status:</td>
                  <td style="padding: 8px 0; color: #10B981; font-size: 13px; font-weight: bold; text-align: right;">Encrypted 256-Bit Link Active</td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td bgcolor="#080810" align="center" style="background-color: #080810; padding: 24px 20px; text-align: center; border-top: 1px solid #1a1a2e;">
              <p style="margin: 0; color: #64748b; font-size: 12px; font-weight: 600;">
                VOEXI Inc. &bull; 24/7 Neural Security Operations
              </p>
              <p style="margin: 6px 0 0 0; color: #475569; font-size: 11px; line-height: 1.4;">
                <a href="https://voexi.com/terms" style="color: #A855F7; text-decoration: none;">Terms of Service</a> &bull;
                <a href="https://voexi.com/privacy" style="color: #A855F7; text-decoration: none;">Station Policies</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  },

  generateTransferSubmittedEmail(params: {
    ownerName: string;
    ownerEmail: string;
    channelName: string;
    newOwnerName: string;
    newOwnerEmail: string;
    certId: string;
    submittedAt: string;
  }): string {
    const { ownerName, ownerEmail, channelName, newOwnerName, newOwnerEmail, certId, submittedAt } = params;

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Station Ownership Transfer Submitted</title>
</head>
<body bgcolor="#05050A" style="margin:0; padding:0; background-color:#05050A; font-family:sans-serif;">
  <div style="padding:30px; color:#fff; max-width:560px; margin:0 auto; background-color:#0d0d16; border-radius:20px; border:1px solid #1e1e32;">
    <h2 style="color:#00F2FE;">Station Ownership Transfer Submitted</h2>
    <p style="color:#cbd5e1; font-size:14px;">Transfer request for <strong>${channelName}</strong> (Cert ID: ${certId}) has been logged and is pending review.</p>
  </div>
</body>
</html>`;
  }
};
