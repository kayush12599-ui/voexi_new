import { supabase } from './supabase';
import * as Linking from 'expo-linking';
import { EmailTemplates } from './emailTemplate';
import { EmailService } from './emailService';

/**
 * VOEXI PRODUCTION MAIL SERVICE
 * Direct Resend REST API & Cloud Uplink
 */
export const MailService = {
  /**
   * Sends a high-priority neural alert / OTP using Resend REST API & Supabase Functions.
   */
  async sendNeuralAlert(target: string, subject: string, body: string): Promise<boolean> {
    try {
      let email = target;

      // 1. Resolve UUID to Email if necessary
      if (target.includes('-') && target.length > 30) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', target)
          .maybeSingle();

        if (error || !profile?.email) {
          console.error(`[MAIL] Failed to resolve email for UUID: ${target}`);
          return false;
        }
        email = profile.email;
      }

      // Convert plain text body to rich Gmail HTML if necessary
      let formattedHtml = body;
      if (!body.includes('<table') && !body.includes('<html')) {
        const otpMatch = body.match(/\b\d{6}\b/);
        if (otpMatch) {
          formattedHtml = EmailTemplates.generateOtpEmail({
            recipientEmail: email,
            otpCode: otpMatch[0],
            purpose: subject
          });
        } else {
          formattedHtml = `
            <!DOCTYPE html>
            <html>
            <body style="background:#09090D; color:#F8FAFC; font-family:sans-serif; padding:30px; margin:0;">
              <div style="max-width:550px; margin:0 auto; background:#0F0F1A; border:1px solid #A855F7; border-radius:20px; padding:30px;">
                <h1 style="color:#A855F7; font-size:22px; letter-spacing:2px; margin-top:0;">VOEXI SPECTRUM SUPPORT</h1>
                <h3 style="color:#00F2FE; font-size:14px; margin-bottom:12px;">${subject}</h3>
                <div style="background:#141426; border:1px solid #1F1F3D; padding:18px; border-radius:14px; margin:18px 0;">
                  <pre style="color:#E2E8F0; font-size:13px; line-height:1.6; white-space:pre-wrap; font-family:sans-serif;">${body}</pre>
                </div>
                <p style="font-size:11px; color:#64748B; text-align:center;">VOEXI Technical Support • Station: ${email}</p>
              </div>
            </body>
            </html>
          `;
        }
      }

      console.log(`[MAIL] Dispatching Resend API live email to: ${email}`);

      // 2. Direct Resend REST API Dispatch
      EmailService.sendEmail({
        to: email,
        subject: subject,
        html: formattedHtml
      }).catch(err => console.warn('[MAIL RESEND BG ERR]', err));

      // 3. Backup Supabase Edge Function Dispatch
      try {
        supabase.functions.invoke('send-verification-email', {
          body: {
            userId: target.length > 30 ? target : null,
            username: 'VOEXI User',
            stationOwner: 'User',
            to: email,
            subject,
            body: formattedHtml,
            html: formattedHtml
          },
          headers: { 'Content-Type': 'application/json' }
        }).catch(e => console.warn("[MAIL EDGE BG] Failure:", e.message));
      } catch (e) {}

      return true;
    } catch (e: any) {
      console.error("[MAIL ERROR]", e.message);
      return true;
    }
  },

  /**
   * Opens the native mail app for user-initiated feedback
   */
  async openGmailApp(to: string, subject: string, body: string) {
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.warn("No mail client available on this device.");
    }
  }
};
