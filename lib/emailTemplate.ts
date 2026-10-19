/**
 * VOEXI PRODUCTION GMAIL-COMPATIBLE HTML EMAIL TEMPLATES
 * Engineered specifically for Gmail (Android/iOS/Web), Apple Mail, and Outlook.
 * All CSS is fully inlined for 100% rendering accuracy in Gmail.
 */

export const EmailTemplates = {
  /**
   * Generates a VOEXI Security OTP Email HTML Template
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
           <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Certificate ID:</td>
           <td style="padding: 6px 0; color: #a855f7; font-size: 12px; font-weight: bold; text-align: right;">${certificateId}</td>
         </tr>`
      : '';

    const stationRow = stationName
      ? `<tr>
           <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Station Title:</td>
           <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: bold; text-align: right;">${stationName}</td>
         </tr>`
      : '';

    const ownerRow = currentOwner
      ? `<tr>
           <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Current Owner:</td>
           <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: bold; text-align: right;">${currentOwner}</td>
         </tr>`
      : '';

    const newOwnerRow = newOwner
      ? `<tr>
           <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">New Assignee:</td>
           <td style="padding: 6px 0; color: #22c55e; font-size: 12px; font-weight: bold; text-align: right;">${newOwner}</td>
         </tr>`
      : '';

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VOEXI Security Verification OTP</title>
</head>
<body bgcolor="#09090e" style="margin:0; padding:0; background-color:#09090e; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" bgcolor="#09090e" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090e; width:100%; table-layout:fixed;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px; width:100%; background-color:#12121c; border-radius:20px; border:1px solid #2a2a3e; overflow:hidden;">

          <!-- TOP BRANDING HEADER -->
          <tr>
            <td bgcolor="#7c3aed" align="center" style="background-color:#7c3aed; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); padding: 28px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">VOEXI</h1>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">NEURAL SECURITY OPERATIONS CENTER</p>
            </td>
          </tr>

          <!-- CARD BODY -->
          <tr>
            <td style="padding: 30px 24px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td bgcolor="#181828" style="background-color: #181828; border: 1px solid #a855f7; border-radius: 6px; padding: 4px 10px;">
                    <span style="color: #a855f7; font-size: 10px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">SECURITY VERIFICATION</span>
                  </td>
                </tr>
              </table>

              <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 19px; font-weight: 800; line-height: 1.3;">
                ${purpose}
              </h2>

              <p style="margin: 0 0 20px 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                A security authentication request was generated for <strong>${recipientEmail}</strong>. Please enter the 6-digit OTP code below to confirm identity and complete the transaction:
              </p>

              <!-- OTP HIGHLIGHT VAULT BOX -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                <tr>
                  <td bgcolor="#181828" align="center" style="background-color: #181828; border: 2px dashed #a855f7; border-radius: 16px; padding: 22px 15px; text-align: center;">
                    <p style="margin: 0 0 6px 0; color: #94a3b8; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">YOUR CONFIDENTIAL OTP CODE</p>
                    <div style="color: #00f2fe; font-size: 38px; font-weight: 900; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace; text-shadow: 0 0 10px rgba(0,242,254,0.3); margin: 6px 0 8px 12px;">
                      ${otpCode}
                    </div>
                    <p style="margin: 0; color: #22c55e; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">
                      ✓ VALID FOR 10 MINUTES • DO NOT SHARE WITH ANYONE
                    </p>
                  </td>
                </tr>
              </table>

              <!-- TRANSACTION METADATA TABLE -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #181824; border-radius: 12px; border: 1px solid #2a2a3e; padding: 14px 16px; margin-top: 15px;">
                ${stationRow}
                ${ownerRow}
                ${newOwnerRow}
                ${certRow}
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Encryption Status:</td>
                  <td style="padding: 6px 0; color: #22c55e; font-size: 12px; font-weight: bold; text-align: right;">Aadhaar & Neural Lock Active</td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td bgcolor="#0c0c14" align="center" style="background-color: #0c0c14; padding: 22px 20px; text-align: center; border-top: 1px solid #1e1e2e;">
              <p style="margin: 0; color: #64748b; font-size: 11px; font-weight: 600;">
                VOEXI Inc. • 24/7 Neural Security Operations
              </p>
              <p style="margin: 5px 0 0 0; color: #475569; font-size: 10px; line-height: 1.4;">
                <a href="https://voexi.com/terms" style="color: #a855f7; text-decoration: none;">Terms of Service</a> &bull;
                <a href="https://voexi.com/privacy" style="color: #a855f7; text-decoration: none;">Station Policies</a>
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

  /**
   * Notification Email to Current Owner when Transfer Request is Submitted (Pending Admin 72 Hours Review)
   */
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
<body bgcolor="#09090e" style="margin:0; padding:0; background-color:#09090e; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" bgcolor="#09090e" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090e; width:100%; table-layout:fixed;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px; width:100%; background-color:#12121c; border-radius:20px; border:1px solid #2a2a3e; overflow:hidden;">

          <!-- TOP BRANDING HEADER -->
          <tr>
            <td bgcolor="#7c3aed" align="center" style="background-color:#7c3aed; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); padding: 28px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 2px;">VOEXI</h1>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 10px; font-weight: 800; letter-spacing: 2px;">NEURAL SECURITY AUDIT</p>
            </td>
          </tr>

          <!-- CARD BODY -->
          <tr>
            <td style="padding: 30px 24px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td bgcolor="#181828" style="background-color: #181828; border: 1px solid #f59e0b; border-radius: 6px; padding: 4px 10px;">
                    <span style="color: #f59e0b; font-size: 10px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">⏳ PENDING ADMIN APPROVAL (72 HOURS REVIEW)</span>
                  </td>
                </tr>
              </table>

              <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 19px; font-weight: 800; line-height: 1.3;">
                Station Ownership Transfer Request Submitted
              </h2>

              <p style="margin: 0 0 20px 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                Hello <strong>${ownerName}</strong>,<br /><br />
                A request to transfer full station ownership of <strong>"${channelName}"</strong> to <strong>${newOwnerName} (${newOwnerEmail})</strong> has been logged and submitted.
              </p>

              <!-- STATUS REVIEW VAULT BOX -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                <tr>
                  <td bgcolor="#181828" style="background-color: #181828; border: 1px solid #f59e0b; border-radius: 16px; padding: 20px; text-align: left;">
                    <p style="margin: 0 0 8px 0; color: #f59e0b; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">🛡️ 72-HOUR SECURITY REVIEW WINDOW ACTIVE</p>
                    <p style="margin: 0; color: #cbd5e1; font-size: 12px; line-height: 1.5;">
                      The VOEXI Admin Security Operations Team is verifying the submitted identity documents, selfie photos, and dual OTP records. Ownership will be reassigned upon final approval within <strong>72 Hours</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- DETAILS TABLE -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #181824; border-radius: 12px; border: 1px solid #2a2a3e; padding: 14px 16px; margin-top: 15px;">
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Request ID:</td>
                  <td style="padding: 6px 0; color: #a855f7; font-size: 12px; font-weight: bold; text-align: right;">${certId}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Station Name:</td>
                  <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: bold; text-align: right;">${channelName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">New Assignee:</td>
                  <td style="padding: 6px 0; color: #22c55e; font-size: 12px; font-weight: bold; text-align: right;">${newOwnerName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Assignee Email:</td>
                  <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: bold; text-align: right;">${newOwnerEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Submitted Date:</td>
                  <td style="padding: 6px 0; color: #ffffff; font-size: 12px; text-align: right;">${submittedAt}</td>
                </tr>
              </table>

              <!-- CANCEL / REPORT WARNING -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #1e1e2e;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #ef4444; font-size: 12px; font-weight: bold;">
                      ⚠️ Did NOT authorize this transfer?
                    </p>
                    <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
                      If you did not initiate this transaction, please open the VOEXI app immediately or visit <a href="https://voexi.com/terms" style="color: #a855f7;">VOEXI Security Center</a> to freeze your station.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td bgcolor="#0c0c14" align="center" style="background-color: #0c0c14; padding: 22px 20px; text-align: center; border-top: 1px solid #1e1e2e;">
              <p style="margin: 0; color: #64748b; font-size: 11px; font-weight: 600;">
                VOEXI Inc. • <a href="https://voexi.com/terms" style="color: #a855f7;">Terms of Service</a> &bull; <a href="https://voexi.com/privacy" style="color: #a855f7;">Station Policies</a>
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

  /**
   * Notification Email to New Recipient when Transfer Request is Initiated
   */
  generateTransferReceivedEmail(params: {
    newOwnerName: string;
    newOwnerEmail: string;
    channelName: string;
    currentOwnerName: string;
    certId: string;
    submittedAt: string;
  }): string {
    const { newOwnerName, newOwnerEmail, channelName, currentOwnerName, certId, submittedAt } = params;

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Station Ownership Assigned to You</title>
</head>
<body bgcolor="#09090e" style="margin:0; padding:0; background-color:#09090e; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" bgcolor="#09090e" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090e; width:100%; table-layout:fixed;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px; width:100%; background-color:#12121c; border-radius:20px; border:1px solid #2a2a3e; overflow:hidden;">

          <!-- TOP BRANDING HEADER -->
          <tr>
            <td bgcolor="#16a34a" align="center" style="background-color:#16a34a; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 28px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 2px;">VOEXI</h1>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 10px; font-weight: 800; letter-spacing: 2px;">NEW STATION ASSIGNMENT</p>
            </td>
          </tr>

          <!-- CARD BODY -->
          <tr>
            <td style="padding: 30px 24px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td bgcolor="#181828" style="background-color: #181828; border: 1px solid #22c55e; border-radius: 6px; padding: 4px 10px;">
                    <span style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">🎉 OWNERSHIP INITIATED</span>
                  </td>
                </tr>
              </table>

              <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 19px; font-weight: 800; line-height: 1.3;">
                You Have Been Assigned Station Ownership
              </h2>

              <p style="margin: 0 0 20px 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                Congratulations <strong>${newOwnerName}</strong>!<br /><br />
                <strong>${currentOwnerName}</strong> has designated you as the new owner for station <strong>"${channelName}"</strong>. Both mobile and email OTP verifications were completed successfully.
              </p>

              <!-- STATUS REVIEW VAULT BOX -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                <tr>
                  <td bgcolor="#181828" style="background-color: #181828; border: 1px solid #22c55e; border-radius: 16px; padding: 20px; text-align: left;">
                    <p style="margin: 0 0 8px 0; color: #22c55e; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">⏳ ADMIN APPROVAL IN PROGRESS (WITHIN 72 HOURS)</p>
                    <p style="margin: 0; color: #cbd5e1; font-size: 12px; line-height: 1.5;">
                      The VOEXI Security Operations Team is performing standard identity checks. Full channel broadcast access, handle rights, and monetized balance will be transferred to your account within <strong>72 Hours</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- DETAILS TABLE -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #181824; border-radius: 12px; border: 1px solid #2a2a3e; padding: 14px 16px; margin-top: 15px;">
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Request ID:</td>
                  <td style="padding: 6px 0; color: #a855f7; font-size: 12px; font-weight: bold; text-align: right;">${certId}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Station Title:</td>
                  <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: bold; text-align: right;">${channelName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Former Owner:</td>
                  <td style="padding: 6px 0; color: #ffffff; font-size: 12px; font-weight: bold; text-align: right;">${currentOwnerName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Assigned To:</td>
                  <td style="padding: 6px 0; color: #22c55e; font-size: 12px; font-weight: bold; text-align: right;">${newOwnerEmail}</td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td bgcolor="#0c0c14" align="center" style="background-color: #0c0c14; padding: 22px 20px; text-align: center; border-top: 1px solid #1e1e2e;">
              <p style="margin: 0; color: #64748b; font-size: 11px; font-weight: 600;">
                VOEXI Inc. • <a href="https://voexi.com/terms" style="color: #22c55e;">Terms of Service</a> &bull; <a href="https://voexi.com/privacy" style="color: #22c55e;">Station Policies</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
};
