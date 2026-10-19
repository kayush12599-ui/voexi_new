import { supabase } from './supabase';

export interface StudentApplicationData {
  fullName: string;
  dob?: string;
  country: string;
  state: string;
  district: string;
  institutionName: string;
  rollNumber: string;
  courseName: string;
  currentYear: string;
  graduationYear?: string;
  documentType: 'student_id_card' | 'fee_receipt' | 'edu_email' | 'self_declaration';
  documentNumber?: string;
  documentPath?: string;
  declarationConsent: boolean;
}

export type StudentApplicationStatus =
  | 'not_applied'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'info_required'
  | 'expired';

export interface StudentApplicationRecord {
  id: string;
  user_id: string;
  full_name: string;
  dob?: string;
  country?: string;
  state: string;
  district: string;
  institution_name: string;
  roll_number: string;
  course_name: string;
  current_year: string;
  graduation_year?: string;
  document_type: string;
  document_number?: string;
  document_path?: string;
  status: StudentApplicationStatus;
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

export const StudentService = {
  /**
   * Calculates authoritative plan price with Student 25% discount
   */
  async calculateStudentPrice(planId: string, userId?: string) {
    const standardPrice = BASE_PLAN_PRICES[planId] || 999;
    let isEligible = false;

    if (userId) {
      try {
        const { status } = await this.getUserApplicationStatus(userId);
        isEligible = status === 'approved';
      } catch (e) {
        isEligible = false;
      }
    }

    const discountAmount = isEligible ? Math.round(standardPrice * 0.25) : 0;
    const discountedPrice = standardPrice - discountAmount;

    return {
      planId,
      standardPrice,
      discountAmount,
      discountedPrice,
      isEligibleForStudentDiscount: isEligible,
      formattedStandardPrice: `₹${standardPrice.toLocaleString('en-IN')}`,
      formattedDiscountedPrice: `₹${discountedPrice.toLocaleString('en-IN')}`,
    };
  },

  /**
   * Fetches user's current student application status
   */
  async getUserApplicationStatus(userId: string): Promise<{
    status: StudentApplicationStatus;
    application: StudentApplicationRecord | null;
  }> {
    if (!userId) return { status: 'not_applied', application: null };

    try {
      const { data, error } = await supabase
        .from('student_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { status: 'not_applied', application: null };

      return {
        status: (data.status as StudentApplicationStatus) || 'not_applied',
        application: data as StudentApplicationRecord,
      };
    } catch (e: any) {
      console.warn('[STUDENT_STATUS_CHECK_FALLBACK]', e.message);
      return { status: 'not_applied', application: null };
    }
  },

  /**
   * Submits a Student Verification Application with document photo upload
   */
  async submitApplication(
    userId: string,
    data: StudentApplicationData,
    file?: { uri: string; name: string; type: string }
  ): Promise<{ success: boolean; message: string; record?: any }> {
    try {
      if (!data.fullName || !data.institutionName || !data.rollNumber) {
        return { success: false, message: 'Full Name, Institution Name, and Roll/ID Number are required.' };
      }
      if (!data.declarationConsent) {
        return { success: false, message: 'Declaration and privacy consent is required.' };
      }

      const current = await this.getUserApplicationStatus(userId);
      if (current.status === 'pending') {
        return { success: false, message: 'You already have a student application under review.' };
      }
      if (current.status === 'approved') {
        return { success: false, message: 'Your Student Welfare 25% discount is already active!' };
      }

      let documentPath = data.documentPath || '';

      if (file && file.uri) {
        const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
        const fileName = `${userId}/${Date.now()}_student_id.${fileExt}`;

        try {
          const formData = new FormData();
          formData.append('file', {
            uri: file.uri,
            name: fileName,
            type: file.type || 'image/jpeg',
          } as any);

          const { data: storageData, error: uploadError } = await supabase.storage
            .from('student-documents')
            .upload(fileName, formData, { cacheControl: '3600', upsert: true });

          if (!uploadError && storageData) {
            documentPath = storageData.path;
          } else {
            documentPath = fileName;
          }
        } catch (uploadErr: any) {
          documentPath = `${userId}/${Date.now()}_student_id.jpg`;
        }
      }

      const { data: record, error: dbError } = await supabase
        .from('student_applications')
        .upsert({
          user_id: userId,
          full_name: data.fullName,
          dob: data.dob || '',
          country: data.country || 'India 🇮🇳',
          state: data.state || '',
          district: data.district || '',
          institution_name: data.institutionName,
          roll_number: data.rollNumber,
          course_name: data.courseName || 'B.Tech / B.Sc / Higher Sec',
          current_year: data.currentYear || '1st Year',
          graduation_year: data.graduationYear || '2027',
          document_type: data.documentType,
          document_number: data.documentNumber || data.rollNumber,
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
        message: 'Student application submitted successfully! Our team will review your ID.',
        record,
      };
    } catch (e: any) {
      console.error('[STUDENT_SUBMIT_ERROR]', e.message);
      return { success: false, message: e.message || 'Failed to submit student application.' };
    }
  },

  /**
   * Generates short-lived signed URL for private student document inspection
   */
  async getSignedDocumentUrl(documentPath: string): Promise<string | null> {
    if (!documentPath) return null;
    try {
      const { data, error } = await supabase.storage
        .from('student-documents')
        .createSignedUrl(documentPath, 600);

      if (error || !data) return null;
      return data.signedUrl;
    } catch (e) {
      return null;
    }
  },

  /**
   * Admin Function: Review student application
   */
  async reviewApplication(
    adminUserId: string,
    applicationId: string,
    decision: 'approved' | 'rejected' | 'info_required',
    rejectionReason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data: adminProf } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', adminUserId)
        .maybeSingle();

      if (!adminProf || adminProf.role !== 'admin') {
        return { success: false, message: 'Unauthorized: Admin role required.' };
      }

      const { data: appRecord, error: fetchErr } = await supabase
        .from('student_applications')
        .select('*')
        .eq('id', applicationId)
        .maybeSingle();

      if (fetchErr || !appRecord) {
        return { success: false, message: 'Application record not found.' };
      }

      const { error: updateErr } = await supabase
        .from('student_applications')
        .update({
          status: decision,
          reviewer_id: adminUserId,
          rejection_reason: rejectionReason || '',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (updateErr) throw updateErr;

      if (decision === 'approved') {
        await supabase
          .from('student_entitlements')
          .upsert({
            user_id: appRecord.user_id,
            application_id: applicationId,
            discount_percent: 25.0,
            is_active: true,
            valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      } else if (decision === 'rejected') {
        await supabase
          .from('student_entitlements')
          .update({ is_active: false })
          .eq('user_id', appRecord.user_id);
      }

      return {
        success: true,
        message: `Student application decision updated to ${decision.toUpperCase()}.`,
      };
    } catch (e: any) {
      console.error('[ADMIN_STUDENT_REVIEW_ERROR]', e.message);
      return { success: false, message: e.message || 'Failed to update student review status.' };
    }
  }
};
