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
        const otpCode = otpMatch ? otpMatch[0] : '123456';
        formattedHtml = EmailTemplates.generateOtpEmail({
          recipientEmail: email,
          otpCode: otpCode,
          purpose: subject
        });
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
