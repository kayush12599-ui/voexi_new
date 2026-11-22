import { EmailTemplates } from './emailTemplate';

/**
 * VOEXI REAL PRODUCTION MULTI-PROVIDER EMAIL SERVICE
 * Powered by Resend REST API (Verified voexi.com Domain) + FormSubmit Relay + Web3Forms
 */
const RESEND_API_KEY = 're_e7ENhE1j_JRAzLaLCqRGzG6a2rs1pUNGe';
const RESEND_API_URL = 'https://api.resend.com/emails';

// Official Verified Domain Sender Configuration
const OFFICIAL_NOREPLY_SENDER = 'VOEXI Security <noreply@voexi.com>';
const SANDBOX_SENDER = 'VOEXI Security <onboarding@resend.dev>';
const VERIFIED_OWNER_EMAIL = 'teterser369m0v';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  message?: string;
  from?: string;
}

interface EmailResponse {
  success: boolean;
  error?: string;
  id?: string;
}

export const EmailService = {
  /**
   * Sends a real production email directly to ANY recipient Gmail address using verified domain noreply@voexi.com.
   */
  async sendEmail(payload: EmailPayload): Promise<EmailResponse> {
    const targetEmail = payload.to.trim().toLowerCase();
    const plainTextMsg = payload.message || payload.subject;
    const senderEmail = payload.from || OFFICIAL_NOREPLY_SENDER;

    console.log(`[EmailService] Dispatching live email from [${senderEmail}] to: ${targetEmail}`);

    // 1. Primary: Resend API with Verified Domain (noreply@voexi.com)
    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [targetEmail],
          subject: payload.subject,
          html: payload.html,
          text: plainTextMsg,
        }),
      });

      const result = await response.json();

      if (response.ok && result.id) {
        console.log(`[EmailService] Live Resend verified domain email delivered! ID: ${result.id}`);
        return { success: true, id: result.id };
      }

      console.warn(`[EmailService] Resend Notice:`, result);

      // Retry with sandbox sender if custom domain fails temporarily
      if (result?.name === 'validation_error' && targetEmail === VERIFIED_OWNER_EMAIL) {
        const sandboxRes = await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: SANDBOX_SENDER,
            to: [VERIFIED_OWNER_EMAIL],
            subject: payload.subject,
            html: payload.html,
            text: plainTextMsg,
          }),
        });
        const sandboxResult = await sandboxRes.json();
        if (sandboxRes.ok && sandboxResult.id) {
          return { success: true, id: sandboxResult.id };
        }
      }
    } catch (e: any) {
      console.warn(`[EmailService] Resend Direct Error:`, e.message);
    }

    // 2. Fallback: FormSubmit Live Cloud Relay
    try {
      console.log(`[EmailService] Trying FormSubmit live cloud relay for ${targetEmail}...`);
      const fsRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: payload.subject,
          message: plainTextMsg,
          _captcha: 'false',
          _template: 'basic',
          _replyto: 'noreply@voexi.com',
          from_name: 'VOEXI Security <noreply@voexi.com>'
        })
      });

      const fsResult = await fsRes.json();
      if (fsRes.ok && (fsResult.success === 'true' || fsResult.message)) {
        console.log(`[EmailService] Delivered via FormSubmit to ${targetEmail}!`);
        return { success: true, id: 'fs_' + Date.now() };
      }
    } catch (e: any) {
      console.warn(`[EmailService] FormSubmit Relay Error:`, e.message);
    }

    // 3. Fallback: Web3Forms Cloud Dispatcher
    try {
      console.log(`[EmailService] Trying Web3Forms live cloud dispatcher for ${targetEmail}...`);
      const web3Res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: 'b9432f83-e18e-4a87-b9e0-081832049e49',
          to_email: targetEmail,
          email: targetEmail,
          from_name: 'VOEXI Security <noreply@voexi.com>',
          subject: payload.subject,
          message: plainTextMsg,
          html: payload.html
        })
      });

      const web3Result = await web3Res.json();
      if (web3Res.ok && web3Result.success) {
        console.log(`[EmailService] Delivered via Web3Forms to ${targetEmail}!`);
        return { success: true, id: 'web3_' + Date.now() };
      }
    } catch (e: any) {
      console.warn(`[EmailService] Web3Forms Error:`, e.message);
    }

    return { success: false, error: 'All email providers failed' };
  },

  /**
   * Specifically sends a verification email with OTP code directly in Subject Line & Plain Text.
   */
  async sendVerificationEmail(to: string, code: string, purpose = 'VOEXI Account Verification OTP'): Promise<EmailResponse> {
    const plainTextMsg = `🔐 YOUR VOEXI VERIFICATION CODE IS: ${code}\n\nPlease enter this 6-digit OTP in the VOEXI app to verify your account (${to}).\n\nThis code is valid for 10 minutes.\n\nNote: This is an automated no-reply email from noreply@voexi.com. Please do not reply to this email.`;

    const html = EmailTemplates.generateOtpEmail({
      recipientEmail: to,
      otpCode: code,
      purpose: purpose
    });

    return this.sendEmail({
      to,
      subject: `🔐 YOUR VOEXI OTP CODE IS: ${code} (${purpose})`,
      message: plainTextMsg,
      html,
      from: OFFICIAL_NOREPLY_SENDER
    });
  }
};
