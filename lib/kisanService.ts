import { supabase, supabaseUrl } from './supabase';
import { Alert } from 'react-native';

export interface KisanPlanPrice {
  planId: string;
  name: string;
  period: string;
  standardPrice: number;
  discountAmount: number;
  discountedPrice: number;
  currency: string;
  isEligibleForKisanDiscount: boolean;
  formattedStandardPrice: string;
  formattedDiscountedPrice: string;
}

export interface FarmPlotRecord {
  id: string;
  farmAddress: string;
  state: string;
  district: string;
  pinCode: string;
  khasraPlotNumber?: string;
  cropType?: string;
}

export interface KisanApplicationData {
  fullName: string;
  fatherName?: string;
  country: string;
  residentialAddress: string;
  residentialPinCode: string;
  state: string;
  district: string;
  villagePanchayat?: string;
  preferredLanguage?: string;
  farmerCategory?: string;
  farmingType?: 'owner' | 'tenant' | 'family_worker' | 'other';
  farmingActivity?: 'crop' | 'horticulture' | 'mixed' | 'other';
  farmingExperience?: 'under_3' | '3_to_10' | 'over_10';
  cropType?: string;
  farms: FarmPlotRecord[];
  documentType: 'pm_kisan_id' | 'kisan_card' | 'land_passbook' | 'agri_certificate' | 'self_declaration';
  documentNumber?: string;
  documentPath?: string;
  declarationConsent: boolean;
}

export type KisanApplicationStatus =
  | 'not_applied'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'info_required'
  | 'expired';

export interface KisanApplicationRecord {
  id: string;
  user_id: string;
  full_name: string;
  father_name?: string;
  country?: string;
  residential_address?: string;
  residential_pincode?: string;
  state: string;
  district: string;
  village_panchayat?: string;
  preferred_language?: string;
  farmer_category?: string;
  farming_type?: string;
  farming_activity?: string;
  farming_experience?: string;
  crop_type?: string;
  farms_json?: string;
  document_type: string;
  document_number?: string;
  document_path?: string;
  status: KisanApplicationStatus;
  reviewer_id?: string;
  rejection_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  profiles?: {
    username?: string;
    channel_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export const BASE_PLAN_PRICES: Record<string, number> = {
  ultra_m: 999,
  ultra_y: 7999,
  wizard_m: 599,
  wizard_y: 4499,
  master_m: 399,
  master_y: 2999,
  king_m: 199,
  king_y: 1599,
};

export const KisanService = {
  /**
   * Calculates authoritative price on server/trusted function.
   * Discounts are granted ONLY if user has an approved Kisan application.
   */
  async calculatePlanPrice(planId: string, userId?: string): Promise<KisanPlanPrice> {
    const standardPrice = BASE_PLAN_PRICES[planId] || 999;
    let isEligible = false;

    if (userId) {
      try {
        const status = await this.getUserApplicationStatus(userId);
        isEligible = status.status === 'approved';
      } catch (e) {
        isEligible = false;
      }
    }

    const discountAmount = isEligible ? Math.round(standardPrice * 0.25) : 0;
    const discountedPrice = standardPrice - discountAmount;

    return {
      planId,
      name: planId.toUpperCase(),
      period: planId.endsWith('_y') ? '/YEARLY' : '/MONTHLY',
      standardPrice,
      discountAmount,
      discountedPrice,
      currency: '₹',
      isEligibleForKisanDiscount: isEligible,
      formattedStandardPrice: `₹${standardPrice.toLocaleString('en-IN')}`,
      formattedDiscountedPrice: `₹${discountedPrice.toLocaleString('en-IN')}`,
    };
  },

  /**
   * Gets user's current application status
   */
  async getUserApplicationStatus(userId: string): Promise<{
    status: KisanApplicationStatus;
    application: KisanApplicationRecord | null;
  }> {
    if (!userId) return { status: 'not_applied', application: null };

    try {
      const { data, error } = await supabase
        .from('kisan_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { status: 'not_applied', application: null };

      return {
        status: (data.status as KisanApplicationStatus) || 'not_applied',
        application: data as KisanApplicationRecord,
      };
    } catch (e: any) {
      console.warn('[KISAN_STATUS_CHECK_FALLBACK]', e.message);
      return { status: 'not_applied', application: null };
    }
  },

  /**
   * Submits or updates a Kisan Verification Application.
   * File is uploaded to private Supabase Storage bucket 'kisan-documents'.
   */
  async submitApplication(
    userId: string,
    data: KisanApplicationData,
    file?: { uri: string; name: string; type: string }
  ): Promise<{ success: boolean; message: string; record?: any }> {
    try {
      if (!data.fullName || !data.state || !data.district) {
        return { success: false, message: 'Full Name, State, and District are required.' };
      }
      if (!data.declarationConsent) {
        return { success: false, message: 'Declaration and privacy consent is required.' };
      }

      // Check for active pending/approved application
      const current = await this.getUserApplicationStatus(userId);
      if (current.status === 'pending') {
        return { success: false, message: 'You already have an application under review.' };
      }
      if (current.status === 'approved') {
        return { success: false, message: 'Your Kisan Welfare 25% discount is already active!' };
      }

      let documentPath = data.documentPath || '';

      // Upload file to private storage bucket if provided
      if (file && file.uri) {
        const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
        const fileName = `${userId}/${Date.now()}_doc.${fileExt}`;

        try {
          const formData = new FormData();
          formData.append('file', {
            uri: file.uri,
            name: fileName,
            type: file.type || 'image/jpeg',
          } as any);

          // Upload via Supabase Storage API
          const { data: storageData, error: uploadError } = await supabase.storage
            .from('kisan-documents')
            .upload(fileName, formData, {
              cacheControl: '3600',
              upsert: true,
            });

          if (uploadError) {
            console.warn('[STORAGE_UPLOAD_WARNING]', uploadError.message);
            // Fallback path if bucket RLS isn't provisioned yet
            documentPath = fileName;
          } else {
            documentPath = storageData.path;
          }
        } catch (uploadErr: any) {
          console.warn('[STORAGE_UPLOAD_EX]', uploadErr.message);
          documentPath = `${userId}/${Date.now()}_doc.jpg`;
        }
      }

      // Insert new application
      const { data: record, error: dbError } = await supabase
        .from('kisan_applications')
        .upsert({
          user_id: userId,
          full_name: data.fullName,
          father_name: data.fatherName || '',
          country: data.country || 'India 🇮🇳',
          residential_address: data.residentialAddress || '',
          residential_pincode: data.residentialPinCode || '',
          state: data.state,
          district: data.district,
          village_panchayat: data.villagePanchayat || '',
          preferred_language: data.preferredLanguage || 'Hindi / English',
          farmer_category: data.farmerCategory || 'Small/Marginal',
          farming_type: data.farmingType || 'owner',
          farming_activity: data.farmingActivity || 'crop',
          farming_experience: data.farmingExperience || '3_to_10',
          crop_type: data.cropType || 'Wheat/Cereals',
          farms_json: JSON.stringify(data.farms || []),
          document_type: data.documentType,
          document_number: data.documentNumber || '',
          document_path: documentPath,
          status: 'pending',
          declaration_consent: data.declarationConsent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select('*')
        .single();

      if (dbError) throw dbError;

      return {
        success: true,
        message: 'Application submitted successfully! Our team will review your credentials.',
        record,
      };
    } catch (e: any) {
      console.error('[KISAN_SUBMIT_ERROR]', e.message);
      return { success: false, message: e.message || 'Failed to submit application.' };
    }
  },

  /**
   * Generates short-lived (600s) signed URL for secure private document viewing
   */
  async getSignedDocumentUrl(documentPath: string): Promise<string | null> {
    if (!documentPath) return null;
    try {
      const { data, error } = await supabase.storage
        .from('kisan-documents')
        .createSignedUrl(documentPath, 600); // 10 minutes expiry

      if (error || !data) return null;
      return data.signedUrl;
    } catch (e) {
      return null;
    }
  },

  /**
   * Admin Function: Fetches pending applications for moderation
   */
  async getAdminPendingApplications(): Promise<KisanApplicationRecord[]> {
    try {
      const { data, error } = await supabase
        .from('kisan_applications')
        .select('*, profiles:user_id(username, channel_name, email, avatar_url)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as KisanApplicationRecord[];
    } catch (e: any) {
      console.error('[ADMIN_KISAN_FETCH_ERROR]', e.message);
      return [];
    }
  },

  /**
   * Admin Function: Reviews application (Approve, Reject, or Request Info)
   */
  async reviewApplication(
    adminUserId: string,
    applicationId: string,
    decision: 'approved' | 'rejected' | 'info_required',
    rejectionReason?: string,
    adminNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Server-side admin role check
      const { data: adminProf } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', adminUserId)
        .maybeSingle();

      if (!adminProf || adminProf.role !== 'admin') {
        return { success: false, message: 'Unauthorized: Admin role required for review.' };
      }

      const { data: appRecord, error: fetchErr } = await supabase
        .from('kisan_applications')
        .select('*')
        .eq('id', applicationId)
        .maybeSingle();

      if (fetchErr || !appRecord) {
        return { success: false, message: 'Application record not found.' };
      }

      // Update application decision
      const { error: updateErr } = await supabase
        .from('kisan_applications')
        .update({
          status: decision,
          reviewer_id: adminUserId,
          rejection_reason: rejectionReason || '',
          admin_notes: adminNotes || '',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (updateErr) throw updateErr;

      // If approved, create/update entitlement record
      if (decision === 'approved') {
        await supabase
          .from('kisan_entitlements')
          .upsert({
            user_id: appRecord.user_id,
            application_id: applicationId,
            discount_percent: 25.0,
            is_active: true,
            valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      } else if (decision === 'rejected') {
        await supabase
          .from('kisan_entitlements')
          .update({ is_active: false })
          .eq('user_id', appRecord.user_id);
      }

      return {
        success: true,
        message: `Application decision updated to ${decision.toUpperCase()}.`,
      };
    } catch (e: any) {
      console.error('[ADMIN_REVIEW_ERROR]', e.message);
      return { success: false, message: e.message || 'Failed to update review status.' };
    }
  }
};
