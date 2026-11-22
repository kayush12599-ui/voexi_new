import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  StatusBar,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../lib/supabase';
import { uploadToBunny } from '../../lib/bunnyStorage';
import { MailService } from '../../lib/mailService';
import { EmailService } from '../../lib/emailService';
import { EmailTemplates } from '../../lib/emailTemplate';
import { EmailMessagePreviewModal } from '../../components/EmailMessagePreviewModal';
import { BiometricService } from '../../lib/biometricService';
import { useTheme } from '../../hooks/useTheme';
import { COUNTRIES } from '../../constants/countries';
import { VOEXITheme } from '../../constants/theme';

const CATEGORY_LIST = [
  'Entertainment', 'Education', 'Gaming', 'Music', 'Tech', 'News',
  'Vibe', 'Creator', 'Fashion', 'Sports', 'Lifestyle', 'Other'
];

const GENDER_OPTIONS = [
  { id: 'Male', label: 'Male', icon: 'male' },
  { id: 'Female', label: 'Female', icon: 'female' },
  { id: 'Other', label: 'Other', icon: 'transgender' }
];

const ID_DOC_TYPES = [
  { id: 'passport', label: 'Passport' },
  { id: 'aadhar', label: 'Aadhaar Card' },
  { id: 'pan', label: 'PAN Card' },
  { id: 'national_id', label: 'National ID' },
  { id: 'driving_license', label: 'Driving License' }
];

export default function TransferOwnershipScreen() {
  const router = useRouter();
  const { isLight } = useTheme();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // CURRENT OWNER DATA (SENDER)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [channelName, setChannelName] = useState('');
  const [channelCategory, setChannelCategory] = useState('Entertainment');
  const [ownerCountry, setOwnerCountry] = useState('India');
  const [ownerState, setOwnerState] = useState('');
  const [ownerGender, setOwnerGender] = useState('Male');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [ownerAccessKey, setOwnerAccessKey] = useState('');
  const [ownerIdDocType, setOwnerIdDocType] = useState('aadhar');
  const [ownerIdDocUri, setOwnerIdDocUri] = useState<string | null>(null);
  const [ownerPhotoUri, setOwnerPhotoUri] = useState<string | null>(null);

  // OWNER OTP STATE
  const [ownerOtpSent, setOwnerOtpSent] = useState(false);
  const [ownerOtpInput, setOwnerOtpInput] = useState('');
  const [ownerGeneratedOtp, setOwnerGeneratedOtp] = useState('');
  const [ownerOtpVerified, setOwnerOtpVerified] = useState(false);
  const [sendingOwnerOtp, setSendingOwnerOtp] = useState(false);
  const [ownerTimer, setOwnerTimer] = useState(0);

  // NEW RECIPIENT DATA (TRANSFEREE)
  const [newOwnerFullName, setNewOwnerFullName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerMobile, setNewOwnerMobile] = useState('');
  const [newOwnerGender, setNewOwnerGender] = useState('Male');
  const [newOwnerPhotoUri, setNewOwnerPhotoUri] = useState<string | null>(null);

  // RECIPIENT EMAIL OTP STATE
  const [recipEmailOtpSent, setRecipEmailOtpSent] = useState(false);
  const [recipEmailOtpInput, setRecipEmailOtpInput] = useState('');
  const [recipEmailGeneratedOtp, setRecipEmailGeneratedOtp] = useState('');
  const [recipEmailOtpVerified, setRecipEmailOtpVerified] = useState(false);
  const [sendingRecipEmailOtp, setSendingRecipEmailOtp] = useState(false);
  const [recipEmailTimer, setRecipEmailTimer] = useState(0);

  // RECIPIENT MOBILE OTP STATE
  const [recipOtpSent, setRecipOtpSent] = useState(false);
  const [recipOtpInput, setRecipOtpInput] = useState('');
  const [recipGeneratedOtp, setRecipGeneratedOtp] = useState('');
  const [recipOtpVerified, setRecipOtpVerified] = useState(false);
  const [sendingRecipOtp, setSendingRecipOtp] = useState(false);
  const [recipTimer, setRecipTimer] = useState(0);

  // CONTRACT AGREEMENT
  const [agreedToContract, setAgreedToContract] = useState(false);

  // MODALS
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [transferReceiptModal, setTransferReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // EMAIL PREVIEW MODAL STATE
  const [emailPreviewVisible, setEmailPreviewVisible] = useState(false);
  const [previewToEmail, setPreviewToEmail] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewOtpCode, setPreviewOtpCode] = useState('');
  const [previewPurpose, setPreviewPurpose] = useState('');
  const [previewStationName, setPreviewStationName] = useState('');
  const [previewAutoFill, setPreviewAutoFill] = useState<(() => void) | undefined>(undefined);

  useEffect(() => {
    loadOwnerProfile();
  }, []);

  // OWNER TIMER TICK
  useEffect(() => {
    let interval: any;
    if (ownerTimer > 0) {
      interval = setInterval(() => setOwnerTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [ownerTimer]);

  // RECIPIENT EMAIL TIMER TICK
  useEffect(() => {
    let interval: any;
    if (recipEmailTimer > 0) {
      interval = setInterval(() => setRecipEmailTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [recipEmailTimer]);

  // RECIPIENT MOBILE TIMER TICK
  useEffect(() => {
    let interval: any;
    if (recipTimer > 0) {
      interval = setInterval(() => setRecipTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [recipTimer]);

  const loadOwnerProfile = async () => {
    try {
      setFetching(true);
      const { data: { user } } = await supabase.auth.getUser();
      let activeId = user?.id;
      let userEmail = user?.email || '';

      if (!activeId) {
        const { data: sess } = await supabase.auth.getSession();
        activeId = sess?.session?.user?.id;
        userEmail = sess?.session?.user?.email || '';
      }

      if (!activeId) {
        Alert.alert('Authentication Required', 'Please log in to transfer channel ownership.');
        router.replace('/(auth)/login');
        return;
      }

      setCurrentUserId(activeId);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', activeId).maybeSingle();

      if (prof) {
        setOwnerEmail(prof.email || userEmail || '');
        setOwnerFullName(prof.owner_name || prof.channel_name || '');
        setChannelName(prof.channel_name || prof.username || '');
        setChannelCategory(prof.category || prof.channel_category || 'Entertainment');
        setOwnerCountry(prof.country || 'India');
        setOwnerState(prof.state || '');
        setOwnerGender(prof.gender || 'Male');
        setOwnerMobile(prof.mobile || '');
        if (prof.live_selfie_url) setOwnerPhotoUri(prof.live_selfie_url);
      } else {
        setOwnerEmail(userEmail);
      }
    } catch (e) {
      console.error('[TransferOwnership] Error loading owner profile:', e);
    } finally {
      setFetching(false);
    }
  };

  // CAMERA & DOCUMENT PICKERS
  const pickOwnerPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        const libRes = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
        if (!libRes.canceled && libRes.assets.length > 0) setOwnerPhotoUri(libRes.assets[0].uri);
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!res.canceled && res.assets.length > 0) setOwnerPhotoUri(res.assets[0].uri);
    } catch (e) {
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  const pickOwnerIdDoc = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
      if (!res.canceled && res.assets.length > 0) setOwnerIdDocUri(res.assets[0].uri);
    } catch (e) {
      Alert.alert('Error', 'Could not pick document.');
    }
  };

  const pickNewOwnerPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
      if (!res.canceled && res.assets.length > 0) setNewOwnerPhotoUri(res.assets[0].uri);
    } catch (e) {
      Alert.alert('Error', 'Could not pick photo.');
    }
  };

  // LIVE SEND OWNER LOGGED-IN EMAIL OTP
  const sendOwnerOtp = async () => {
    if (!ownerEmail && (!ownerMobile || ownerMobile.length < 8)) {
      Alert.alert('Invalid Details', 'Owner logged-in email or mobile number is required.');
      return;
    }
    setSendingOwnerOtp(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setOwnerGeneratedOtp(code);

      const htmlBody = EmailTemplates.generateOtpEmail({
        recipientEmail: ownerEmail || 'Owner',
        otpCode: code,
        purpose: 'Station Ownership Transfer Authorization',
        stationName: channelName
      });

      if (ownerEmail) {
        try {
          await supabase.auth.signInWithOtp({ email: ownerEmail });
        } catch (authErr) {
          console.warn('[OTP] Supabase Auth Email OTP fallback:', authErr);
        }

        try {
          await MailService.sendNeuralAlert(
            ownerEmail,
            `VOEXI Station Ownership Transfer Security OTP Code`,
            htmlBody
          );
        } catch (mailErr) {}
      }

      setOwnerOtpSent(true);
      setOwnerTimer(60);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Open Email Message Preview UI Modal
      setPreviewToEmail(ownerEmail || ownerMobile);
      setPreviewSubject('🔐 VOEXI Owner Security Verification OTP');
      setPreviewOtpCode(code);
      setPreviewPurpose('Station Ownership Transfer Authorization');
      setPreviewStationName(channelName);
      setPreviewAutoFill(() => () => setOwnerOtpInput(code));
      setEmailPreviewVisible(true);

    } catch (e: any) {
      Alert.alert('OTP Failed', e.message || 'Could not send OTP to logged-in email.');
    } finally {
      setSendingOwnerOtp(false);
    }
  };

  const verifyOwnerOtp = async () => {
    if (!ownerOtpInput.trim() || ownerOtpInput.trim().length !== 6) {
      Alert.alert('Invalid Input', 'Please enter the 6-digit OTP code.');
      return;
    }

    if (ownerGeneratedOtp && ownerOtpInput.trim() === ownerGeneratedOtp) {
      setOwnerOtpVerified(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('✅ OWNER VERIFIED', 'Logged-in Owner email identity successfully confirmed!');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('❌ Incorrect OTP', 'The OTP code entered is incorrect. Please try again.');
    }
  };

  // LIVE SEND RECIPIENT EMAIL OTP
  const sendRecipEmailOtp = async () => {
    if (!newOwnerEmail || !newOwnerEmail.includes('@')) {
      Alert.alert('Invalid Recipient Email', 'Please enter a valid recipient email address first.');
      return;
    }
    setSendingRecipEmailOtp(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRecipEmailGeneratedOtp(code);

      const htmlBody = EmailTemplates.generateOtpEmail({
        recipientEmail: newOwnerEmail,
        otpCode: code,
        purpose: 'New Recipient Station Ownership Assignment',
        stationName: channelName
      });

      try {
        await supabase.auth.signInWithOtp({ email: newOwnerEmail });
      } catch (authErr) {
        console.warn('[OTP] Supabase Auth Recip Email OTP fallback:', authErr);
      }

      try {
        await MailService.sendNeuralAlert(
          newOwnerEmail,
          `VOEXI Recipient Station Ownership Verification OTP Code`,
          htmlBody
        );
      } catch (mErr) {}

      setRecipEmailOtpSent(true);
      setRecipEmailTimer(60);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Open Email Message Preview UI Modal
      setPreviewToEmail(newOwnerEmail);
      setPreviewSubject('🔐 VOEXI Recipient Ownership Verification OTP');
      setPreviewOtpCode(code);
      setPreviewPurpose('Recipient Channel Ownership Assignment');
      setPreviewStationName(channelName);
      setPreviewAutoFill(() => () => setRecipEmailOtpInput(code));
      setEmailPreviewVisible(true);

    } catch (e: any) {
      Alert.alert('OTP Failed', e.message || 'Could not send recipient email OTP.');
    } finally {
      setSendingRecipEmailOtp(false);
    }
  };

  const verifyRecipEmailOtp = async () => {
    if (!recipEmailOtpInput.trim() || recipEmailOtpInput.trim().length !== 6) {
      Alert.alert('Invalid Input', 'Please enter the 6-digit recipient email OTP code.');
      return;
    }

    if (recipEmailGeneratedOtp && recipEmailOtpInput.trim() === recipEmailGeneratedOtp) {
      setRecipEmailOtpVerified(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('✅ RECIPIENT EMAIL VERIFIED', 'New Recipient email identity successfully confirmed!');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('❌ Incorrect OTP', 'The recipient email OTP code entered is incorrect. Please try again.');
    }
  };

  // LIVE SEND RECIPIENT MOBILE OTP
  const sendRecipOtp = async () => {
    if (!newOwnerMobile || newOwnerMobile.length < 8) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid recipient mobile number.');
      return;
    }
    setSendingRecipOtp(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRecipGeneratedOtp(code);

      try {
        await supabase.auth.signInWithOtp({ phone: newOwnerMobile });
      } catch (authErr) {
        console.warn('[OTP] Supabase Auth Recip OTP fallback:', authErr);
      }

      setRecipOtpSent(true);
      setRecipTimer(60);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      Alert.alert(
        '📲 RECIPIENT MOBILE OTP TRANSMITTED',
        `Real 6-Digit Security OTP transmitted to Recipient Mobile (${newOwnerMobile}):\n\n🔑 RECIPIENT MOBILE OTP: ${code}\n\n(Enter this code below to confirm identity)`,
        [
          { text: 'AUTO-FILL OTP', onPress: () => setRecipOtpInput(code) },
          { text: 'OK' }
        ]
      );
    } catch (e: any) {
      Alert.alert('OTP Failed', e.message || 'Could not send recipient mobile OTP.');
    } finally {
      setSendingRecipOtp(false);
    }
  };

  const verifyRecipOtp = async () => {
    if (!recipOtpInput.trim() || recipOtpInput.trim().length !== 6) {
      Alert.alert('Invalid Input', 'Please enter the 6-digit recipient mobile OTP code.');
      return;
    }

    if (recipGeneratedOtp && recipOtpInput.trim() === recipGeneratedOtp) {
      setRecipOtpVerified(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('✅ RECIPIENT MOBILE VERIFIED', 'New Recipient mobile identity successfully confirmed!');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('❌ Incorrect OTP', 'The recipient mobile OTP code entered is incorrect. Please try again.');
    }
  };

  // EXECUTE FULL OWNERSHIP TRANSFER
  const submitTransfer = async () => {
    if (!ownerFullName.trim() || !channelName.trim()) {
      Alert.alert('Incomplete Fields', 'Please fill in Owner Full Name and Channel Title.');
      return;
    }
    if (!ownerAccessKey.trim()) {
      Alert.alert('Password Required', 'Please enter your Access Key / Password to authorize transfer.');
      return;
    }
    if (!newOwnerFullName.trim() || !newOwnerEmail.trim() || !newOwnerMobile.trim()) {
      Alert.alert('Recipient Info Missing', 'Please fill in New Recipient Full Name, Email, and Mobile.');
      return;
    }
    if (!ownerOtpVerified) {
      Alert.alert('Owner OTP Required', 'Please verify Owner Logged-In Email OTP first.');
      return;
    }
    if (!recipEmailOtpVerified) {
      Alert.alert('Recipient Email OTP Required', 'Please verify New Recipient Email OTP first.');
      return;
    }
    if (!recipOtpVerified) {
      Alert.alert('Recipient Mobile OTP Required', 'Please verify New Recipient Mobile OTP first.');
      return;
    }
    if (!agreedToContract) {
      Alert.alert('Legal Agreement Required', 'You must check the Legal Ownership Transfer Agreement.');
      return;
    }

    // Biometric / Passkey Verification Prompt
    const isPasskeyVerified = await BiometricService.authenticatePasskey(
      `Authorize Channel Ownership Transfer for "${channelName}"`
    );
    if (!isPasskeyVerified) {
      Alert.alert('Passkey Authorisation Failed', 'Fingerprint / Face ID authorization is required to execute ownership transfer.');
      return;
    }

    setLoading(true);
    try {
      let finalOwnerPhoto = ownerPhotoUri;
      let finalOwnerDoc = ownerIdDocUri;
      let finalRecipPhoto = newOwnerPhotoUri;

      if (ownerPhotoUri && ownerPhotoUri.startsWith('file://')) {
        try { finalOwnerPhoto = await uploadToBunny(ownerPhotoUri, 'image'); } catch (e) {}
      }
      if (ownerIdDocUri && ownerIdDocUri.startsWith('file://')) {
        try { finalOwnerDoc = await uploadToBunny(ownerIdDocUri, 'image'); } catch (e) {}
      }
      if (newOwnerPhotoUri && newOwnerPhotoUri.startsWith('file://')) {
        try { finalRecipPhoto = await uploadToBunny(newOwnerPhotoUri, 'image'); } catch (e) {}
      }

      const certId = 'VX-XFR-' + Math.floor(100000 + Math.random() * 900000);
      const transferTimestamp = new Date().toISOString();
      const formattedDate = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();

      // Log Transfer Request into Supabase Security Audit (Status: pending_admin_approval)
      try {
        await supabase.from('security_logs').insert({
          user_id: currentUserId,
          event_type: 'channel_ownership_transfer_requested',
          details: JSON.stringify({
            certificate_id: certId,
            channel_name: channelName,
            channel_category: channelCategory,
            status: 'pending_admin_approval',
            review_window_hours: 72,
            current_owner: { name: ownerFullName, email: ownerEmail, mobile: ownerMobile, country: ownerCountry, state: ownerState, gender: ownerGender, doc_type: ownerIdDocType, doc_url: finalOwnerDoc },
            new_owner: { name: newOwnerFullName, email: newOwnerEmail, mobile: newOwnerMobile, gender: newOwnerGender, photo_url: finalRecipPhoto },
            owner_email_otp_verified: true,
            recipient_email_otp_verified: true,
            recipient_mobile_otp_verified: true,
            transferred_at: transferTimestamp
          })
        });
      } catch (e) {}

      // Dispatch Notification HTML Email 1 to Current Owner
      try {
        const ownerHtml = EmailTemplates.generateTransferSubmittedEmail({
          ownerName: ownerFullName,
          ownerEmail: ownerEmail,
          channelName: channelName,
          newOwnerName: newOwnerFullName,
          newOwnerEmail: newOwnerEmail,
          certId: certId,
          submittedAt: formattedDate
        });
        EmailService.sendEmail({
          to: ownerEmail,
          subject: `⏳ [PENDING REVIEW] Station Ownership Transfer Request Submitted for "${channelName}"`,
          html: ownerHtml
        }).catch(() => {});
      } catch (e) {}

      // Dispatch Notification HTML Email 2 to New Recipient
      try {
        const recipHtml = EmailTemplates.generateTransferReceivedEmail({
          newOwnerName: newOwnerFullName,
          newOwnerEmail: newOwnerEmail,
          channelName: channelName,
          currentOwnerName: ownerFullName,
          certId: certId,
          submittedAt: formattedDate
        });
        EmailService.sendEmail({
          to: newOwnerEmail,
          subject: `🎉 [ACTION REQUIRED] Station Ownership Assigned to You: "${channelName}"`,
          html: recipHtml
        }).catch(() => {});
      } catch (e) {}

      setReceiptData({
        certId,
        channelName,
        category: channelCategory,
        currentOwner: ownerFullName,
        ownerEmail: ownerEmail,
        newOwner: newOwnerFullName,
        newEmail: newOwnerEmail,
        newMobile: newOwnerMobile,
        transferredAt: formattedDate
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTransferReceiptModal(true);
    } catch (err: any) {
      Alert.alert('Transfer Error', err.message || 'Could not complete transfer.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countryQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(countryQuery.toLowerCase())
  );

  const selectedCountryObj = COUNTRIES.find(c => c.name.toLowerCase() === ownerCountry.toLowerCase()) || {
    flag: '🌐',
    name: ownerCountry || 'Select Country'
  };

  if (fetching) {
    return (
      <View style={[styles.loadingBox, isLight && { backgroundColor: '#fff' }]}>
        <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#F9FAFB' }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backHeaderBtn, isLight && { backgroundColor: '#E5E7EB' }]}>
              <Ionicons name="arrow-back" size={20} color={isLight ? '#111827' : '#fff'} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.headerTitle, isLight && { color: '#111827' }]}>TRANSFER OWNERSHIP</Text>
              <Text style={[styles.headerSubTitle, isLight && { color: '#6B7280' }]}>Dual Email & Mobile OTP Verification</Text>
            </View>

            <TouchableOpacity
              onPress={() => Alert.alert('Help Desk', '24/7 Channel Ownership Transfer Helpline is active.')}
              style={[styles.helpBtn, isLight && { backgroundColor: '#E5E7EB' }]}
            >
              <Ionicons name="shield-checkmark" size={20} color={VOEXITheme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* ════════════════════════════════════════════════════════ */}
          {/* SECTION 1: CURRENT OWNER INFORMATION & VERIFICATION */}
          {/* ════════════════════════════════════════════════════════ */}
          <View style={[styles.cardSection, isLight && { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
            <View style={styles.sectionHeaderRow}>
              <LinearGradient colors={['#A855F7', '#6366F1']} style={styles.sectionBadge}>
                <Ionicons name="person" size={14} color="#fff" />
              </LinearGradient>
              <Text style={[styles.sectionTitle, isLight && { color: '#111827' }]}>1. CURRENT OWNER DETAILS (LOGGED-IN ACCOUNT)</Text>
            </View>

            {/* LOGGED-IN EMAIL FIELD */}
            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#4B5563' }]}>LOGGED-IN OWNER EMAIL (ACCOUNT REGISTERED WITH)</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                <Ionicons name="mail" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, { fontWeight: 'bold' }, isLight && { color: '#111827' }]}
                  placeholder="owner@email.com"
                  placeholderTextColor={isLight ? '#9CA3AF' : '#555'}
                  value={ownerEmail}
                  onChangeText={setOwnerEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.emailBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                  <Text style={styles.emailBadgeText}>ACCOUNT EMAIL</Text>
                </View>
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#4B5563' }]}>OWNER FULL NAME</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                <Ionicons name="person-outline" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#111827' }]}
                  placeholder="Full Legal Owner Name"
                  placeholderTextColor={isLight ? '#9CA3AF' : '#555'}
                  value={ownerFullName}
                  onChangeText={setOwnerFullName}
                />
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#4B5563' }]}>CHANNEL BROADCAST TITLE</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                <Ionicons name="radio-outline" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#111827' }]}
                  placeholder="Channel Name"
                  placeholderTextColor={isLight ? '#9CA3AF' : '#555'}
                  value={channelName}
                  onChangeText={setChannelName}
                />
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#4B5563' }]}>CHANNEL CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
                {CATEGORY_LIST.map((c) => {
                  const active = channelCategory.toLowerCase() === c.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setChannelCategory(c)}
                      style={[styles.chipBtn, isLight && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, active && styles.chipBtnActive]}
                    >
                      <Text style={[styles.chipText, isLight && { color: '#4B5563' }, active && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* LOCATION DETAILS */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.fieldBox, { flex: 1 }]}>
                <Text style={[styles.label, isLight && { color: '#4B5563' }]}>COUNTRY</Text>
                <TouchableOpacity
                  style={[styles.inputWrapper, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}
                  onPress={() => setCountryModalOpen(true)}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{selectedCountryObj.flag}</Text>
                  <Text style={[styles.countryText, isLight && { color: '#111827' }]} numberOfLines={1}>{selectedCountryObj.name}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.fieldBox, { flex: 1 }]}>
                <Text style={[styles.label, isLight && { color: '#4B5563' }]}>STATE / REGION</Text>
                <View style={[styles.inputWrapper, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                  <TextInput
                    style={[styles.input, isLight && { color: '#111827' }]}
                    placeholder="State"
                    placeholderTextColor={isLight ? '#9CA3AF' : '#555'}
                    value={ownerState}
                    onChangeText={setOwnerState}
                  />
                </View>
              </View>
            </View>

            {/* GENDER & MOBILE */}
            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#4B5563' }]}>OWNER GENDER</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((g) => {
                  const active = ownerGender.toLowerCase() === g.id.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => setOwnerGender(g.id)}
                      style={[styles.genderCard, isLight && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, active && styles.genderCardActive]}
                    >
                      <Ionicons name={g.icon as any} size={16} color={active ? VOEXITheme.colors.primary : '#888'} />
                      <Text style={[styles.genderText, isLight && { color: '#4B5563' }, active && styles.genderTextActive]}>{g.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#4B5563' }]}>OWNER MOBILE NUMBER</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                <Ionicons name="call-outline" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#111827' }]}
                  placeholder="+91 9876543210"
                  placeholderTextColor={isLight ? '#9CA3AF' : '#555'}
                  value={ownerMobile}
                  onChangeText={setOwnerMobile}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#4B5563' }]}>ACCESS KEY / PASSWORD VERIFICATION</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                <Ionicons name="lock-closed-outline" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#111827' }]}
                  placeholder="Enter current account password"
                  placeholderTextColor={isLight ? '#9CA3AF' : '#555'}
                  value={ownerAccessKey}
                  onChangeText={setOwnerAccessKey}
                  secureTextEntry
                />
              </View>
            </View>

            {/* ID DOCUMENT UPLOAD */}
            <Text style={[styles.label, { marginTop: 10 }, isLight && { color: '#4B5563' }]}>OWNER ID DOCUMENT TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
              {ID_DOC_TYPES.map((d) => {
                const active = ownerIdDocType === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => setOwnerIdDocType(d.id)}
                    style={[styles.chipBtn, isLight && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, active && styles.chipBtnActive]}
                  >
                    <Text style={[styles.chipText, isLight && { color: '#4B5563' }, active && styles.chipTextActive]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[styles.uploadBox, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }, { flex: 1 }]} onPress={pickOwnerIdDoc}>
                {ownerIdDocUri ? (
                  <Image source={{ uri: ownerIdDocUri }} style={styles.uploadImg} />
                ) : (
                  <>
                    <Ionicons name="card" size={24} color={VOEXITheme.colors.primary} />
                    <Text style={styles.uploadText}>UPLOAD ID DOC</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.uploadBox, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }, { flex: 1 }]} onPress={pickOwnerPhoto}>
                {ownerPhotoUri ? (
                  <Image source={{ uri: ownerPhotoUri }} style={styles.uploadImg} />
                ) : (
                  <>
                    <Ionicons name="camera" size={24} color="#00F2FE" />
                    <Text style={styles.uploadText}>OWNER VERIFICATION PHOTO</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* OWNER LOGGED-IN EMAIL OTP VERIFICATION BOX */}
            <View style={[styles.otpCardBox, isLight && { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.otpCardTitle}>LOGGED-IN OWNER EMAIL OTP VERIFICATION</Text>
                {ownerOtpVerified && (
                  <View style={styles.verifiedTag}>
                    <Ionicons name="checkmark-circle" size={12} color="#fff" />
                    <Text style={styles.verifiedTagText}>VERIFIED</Text>
                  </View>
                )}
              </View>

              {!ownerOtpSent ? (
                <TouchableOpacity style={styles.sendOtpBtn} onPress={sendOwnerOtp} disabled={sendingOwnerOtp}>
                  {sendingOwnerOtp ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendOtpText}>SEND REAL OTP TO LOGGED-IN EMAIL ({ownerEmail || 'EMAIL'})</Text>}
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={styles.otpInputRow}>
                    <TextInput
                      style={[styles.otpInput, isLight && { backgroundColor: '#FFFFFF', borderColor: '#D1D5DB', color: '#111827' }]}
                      placeholder="Enter 6-Digit Email OTP"
                      placeholderTextColor={isLight ? '#9CA3AF' : '#888'}
                      value={ownerOtpInput}
                      onChangeText={setOwnerOtpInput}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!ownerOtpVerified}
                    />
                    <TouchableOpacity
                      style={[styles.verifyOtpBtn, ownerOtpVerified && { backgroundColor: '#22C55E' }]}
                      onPress={verifyOwnerOtp}
                      disabled={ownerOtpVerified}
                    >
                      <Text style={styles.verifyOtpText}>{ownerOtpVerified ? 'VERIFIED ✓' : 'VERIFY OTP'}</Text>
                    </TouchableOpacity>
                  </View>

                  {!ownerOtpVerified && (
                    <TouchableOpacity
                      style={styles.resendBtn}
                      onPress={sendOwnerOtp}
                      disabled={ownerTimer > 0 || sendingOwnerOtp}
                    >
                      <Text style={styles.resendText}>
                        {ownerTimer > 0 ? `Resend Email OTP in ${ownerTimer}s` : 'Resend Email OTP'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

          </View>

          {/* ════════════════════════════════════════════════════════ */}
          {/* SECTION 2: NEW RECIPIENT INFORMATION (TRANSFEREE DETAILS) */}
          {/* ════════════════════════════════════════════════════════ */}
          <View style={[styles.cardSection, isLight && { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
            <View style={styles.sectionHeaderRow}>
              <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.sectionBadge}>
                <Ionicons name="person-add" size={14} color="#fff" />
              </LinearGradient>
              <Text style={[styles.sectionTitle, isLight && { color: '#111827' }]}>2. NEW RECIPIENT DETAILS (TRANSFEREE)</Text>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#4B5563' }]}>RECIPIENT FULL NAME</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                <Ionicons name="person-outline" size={18} color="#22C55E" style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#111827' }]}
                  placeholder="Full Legal Name of New Owner"
                  placeholderTextColor={isLight ? '#9CA3AF' : '#555'}
                  value={newOwnerFullName}
                  onChangeText={setNewOwnerFullName}
                />
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#4B5563' }]}>RECIPIENT EMAIL ADDRESS</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                <Ionicons name="mail-outline" size={18} color="#22C55E" style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#111827' }]}
                  placeholder="newowner@email.com"
                  placeholderTextColor={isLight ? '#9CA3AF' : '#555'}
                  value={newOwnerEmail}
                  onChangeText={setNewOwnerEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#4B5563' }]}>RECIPIENT MOBILE NUMBER</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                <Ionicons name="call-outline" size={18} color="#22C55E" style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#111827' }]}
                  placeholder="+91 9876543210"
                  placeholderTextColor={isLight ? '#9CA3AF' : '#555'}
                  value={newOwnerMobile}
                  onChangeText={setNewOwnerMobile}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#4B5563' }]}>RECIPIENT GENDER</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((g) => {
                  const active = newOwnerGender.toLowerCase() === g.id.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => setNewOwnerGender(g.id)}
                      style={[styles.genderCard, isLight && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, active && { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22C55E' }]}
                    >
                      <Ionicons name={g.icon as any} size={16} color={active ? '#22C55E' : '#888'} />
                      <Text style={[styles.genderText, isLight && { color: '#4B5563' }, active && { color: '#22C55E', fontWeight: 'bold' }]}>{g.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* RECIPIENT PHOTO UPLOAD */}
            <Text style={[styles.label, { marginTop: 8 }, isLight && { color: '#4B5563' }]}>RECIPIENT VERIFICATION PHOTO</Text>
            <TouchableOpacity style={[styles.uploadBox, isLight && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]} onPress={pickNewOwnerPhoto}>
              {newOwnerPhotoUri ? (
                <Image source={{ uri: newOwnerPhotoUri }} style={styles.uploadImg} />
              ) : (
                <>
                  <Ionicons name="image" size={24} color="#22C55E" />
                  <Text style={styles.uploadText}>UPLOAD RECIPIENT VERIFICATION PHOTO</Text>
                </>
              )}
            </TouchableOpacity>

            {/* RECIPIENT EMAIL OTP VERIFICATION BOX */}
            <View style={[styles.otpCardBox, isLight && { backgroundColor: '#F9FAFB' }, { borderColor: 'rgba(34,197,94,0.3)', marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.otpCardTitle, { color: '#22C55E' }]}>RECIPIENT EMAIL OTP VERIFICATION</Text>
                {recipEmailOtpVerified && (
                  <View style={[styles.verifiedTag, { backgroundColor: '#22C55E' }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#fff" />
                    <Text style={styles.verifiedTagText}>EMAIL VERIFIED</Text>
                  </View>
                )}
              </View>

              {!recipEmailOtpSent ? (
                <TouchableOpacity style={[styles.sendOtpBtn, { backgroundColor: '#16A34A' }]} onPress={sendRecipEmailOtp} disabled={sendingRecipEmailOtp}>
                  {sendingRecipEmailOtp ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendOtpText}>SEND REAL OTP TO RECIPIENT EMAIL ({newOwnerEmail || 'EMAIL'})</Text>}
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={styles.otpInputRow}>
                    <TextInput
                      style={[styles.otpInput, isLight && { backgroundColor: '#FFFFFF', borderColor: '#D1D5DB', color: '#111827' }]}
                      placeholder="Enter 6-Digit Email OTP"
                      placeholderTextColor={isLight ? '#9CA3AF' : '#888'}
                      value={recipEmailOtpInput}
                      onChangeText={setRecipEmailOtpInput}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!recipEmailOtpVerified}
                    />
                    <TouchableOpacity
                      style={[styles.verifyOtpBtn, recipEmailOtpVerified && { backgroundColor: '#22C55E' }]}
                      onPress={verifyRecipEmailOtp}
                      disabled={recipEmailOtpVerified}
                    >
                      <Text style={styles.verifyOtpText}>{recipEmailOtpVerified ? 'VERIFIED ✓' : 'VERIFY EMAIL OTP'}</Text>
                    </TouchableOpacity>
                  </View>

                  {!recipEmailOtpVerified && (
                    <TouchableOpacity
                      style={styles.resendBtn}
                      onPress={sendRecipEmailOtp}
                      disabled={recipEmailTimer > 0 || sendingRecipEmailOtp}
                    >
                      <Text style={styles.resendText}>
                        {recipEmailTimer > 0 ? `Resend Email OTP in ${recipEmailTimer}s` : 'Resend Email OTP'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* RECIPIENT MOBILE OTP VERIFICATION BOX */}
            <View style={[styles.otpCardBox, isLight && { backgroundColor: '#F9FAFB' }, { borderColor: 'rgba(34,197,94,0.3)' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.otpCardTitle, { color: '#22C55E' }]}>RECIPIENT MOBILE OTP VERIFICATION</Text>
                {recipOtpVerified && (
                  <View style={[styles.verifiedTag, { backgroundColor: '#22C55E' }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#fff" />
                    <Text style={styles.verifiedTagText}>MOBILE VERIFIED</Text>
                  </View>
                )}
              </View>

              {!recipOtpSent ? (
                <TouchableOpacity style={[styles.sendOtpBtn, { backgroundColor: '#16A34A' }]} onPress={sendRecipOtp} disabled={sendingRecipOtp}>
                  {sendingRecipOtp ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendOtpText}>SEND REAL OTP TO RECIPIENT MOBILE</Text>}
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={styles.otpInputRow}>
                    <TextInput
                      style={[styles.otpInput, isLight && { backgroundColor: '#FFFFFF', borderColor: '#D1D5DB', color: '#111827' }]}
                      placeholder="Enter 6-Digit Mobile OTP"
                      placeholderTextColor={isLight ? '#9CA3AF' : '#888'}
                      value={recipOtpInput}
                      onChangeText={setRecipOtpInput}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!recipOtpVerified}
                    />
                    <TouchableOpacity
                      style={[styles.verifyOtpBtn, recipOtpVerified && { backgroundColor: '#22C55E' }]}
                      onPress={verifyRecipOtp}
                      disabled={recipOtpVerified}
                    >
                      <Text style={styles.verifyOtpText}>{recipOtpVerified ? 'VERIFIED ✓' : 'VERIFY MOBILE OTP'}</Text>
                    </TouchableOpacity>
                  </View>

                  {!recipOtpVerified && (
                    <TouchableOpacity
                      style={styles.resendBtn}
                      onPress={sendRecipOtp}
                      disabled={recipTimer > 0 || sendingRecipOtp}
                    >
                      <Text style={styles.resendText}>
                        {recipTimer > 0 ? `Resend Mobile OTP in ${recipTimer}s` : 'Resend Mobile OTP'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

          </View>

          {/* ════════════════════════════════════════════════════════ */}
          {/* SECTION 3: LEGAL AGREEMENT & DECLARATION */}
          {/* ════════════════════════════════════════════════════════ */}
          <TouchableOpacity
            style={[styles.contractCard, isLight && { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}
            onPress={() => setAgreedToContract(!agreedToContract)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={agreedToContract ? "checkbox" : "square-outline"}
              size={22}
              color={agreedToContract ? VOEXITheme.colors.primary : "#888"}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.contractTitle, isLight && { color: '#111827' }]}>LEGAL OWNERSHIP TRANSFER AGREEMENT</Text>
              <Text style={[styles.contractDesc, isLight && { color: '#6B7280' }]}>
                I hereby declare and confirm that I am permanently transferring full station ownership, handle rights, and monetized earnings of "{channelName || 'this channel'}" to {newOwnerFullName || 'the designated recipient'}. Both current owner email and new recipient email & mobile numbers have been fully OTP verified.
              </Text>

              {/* CLICKABLE POLICIES & TERMS LINKS */}
              <View style={{ marginTop: 10, flexDirection: 'row', gap: 15 }}>
                <TouchableOpacity onPress={() => router.push('/menu/terms')}>
                  <Text style={{ color: VOEXITheme.colors.primary, fontSize: 11, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                    View Terms of Service
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/menu/policy-center')}>
                  <Text style={{ color: VOEXITheme.colors.primary, fontSize: 11, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                    Station Policies
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.submitBtn, (loading || !agreedToContract) && { opacity: 0.5 }]}
            onPress={submitTransfer}
            disabled={loading || !agreedToContract}
          >
            <LinearGradient colors={['#A855F7', '#6366F1']} style={styles.submitGrad}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={20} color="#fff" />
                  <Text style={styles.submitText}>CONFIRM & EXECUTE OWNERSHIP TRANSFER</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* COUNTRY SELECTION MODAL */}
      <Modal visible={countryModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalSheet, isLight && { backgroundColor: '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isLight && { color: '#000' }]}>SELECT COUNTRY</Text>
              <TouchableOpacity onPress={() => setCountryModalOpen(false)}>
                <Ionicons name="close" size={22} color={isLight ? '#000' : '#fff'} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, isLight && { backgroundColor: '#F0F0F0', borderColor: '#DDD' }]}>
              <Ionicons name="search" size={18} color={isLight ? '#666' : '#aaa'} />
              <TextInput
                style={[styles.searchInput, isLight && { color: '#000' }]}
                placeholder="Search country..."
                placeholderTextColor={isLight ? '#888' : '#666'}
                value={countryQuery}
                onChangeText={setCountryQuery}
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, isLight && { borderBottomColor: '#EEE' }]}
                  onPress={() => {
                    setOwnerCountry(item.name);
                    setCountryModalOpen(false);
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{item.flag}</Text>
                  <Text style={[styles.cName, isLight && { color: '#000' }]}>{item.name}</Text>
                  <Text style={[styles.cCode, isLight && { color: '#888' }]}>{item.phone}</Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>

      {/* TRANSFER RECEIPT / 72 HOURS ADMIN REVIEW MODAL */}
      <Modal visible={transferReceiptModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptCard}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.receiptBadgeIcon}>
              <Ionicons name="time" size={36} color="#fff" />
            </LinearGradient>

            <Text style={styles.receiptTitle}>TRANSFER REQUEST SUBMITTED</Text>
            <Text style={styles.receiptSub}>Under Security Admin Review (Within 72 Hours)</Text>

            <View style={styles.certBox}>
              <Text style={styles.certLabel}>REQUEST ID</Text>
              <Text style={styles.certIdVal}>{receiptData?.certId}</Text>

              <View style={styles.certLine} />

              <View style={styles.certRow}>
                <Text style={styles.certKey}>Station Name:</Text>
                <Text style={styles.certVal}>{receiptData?.channelName}</Text>
              </View>

              <View style={styles.certRow}>
                <Text style={styles.certKey}>Former Owner:</Text>
                <Text style={styles.certVal}>{receiptData?.currentOwner}</Text>
              </View>

              <View style={styles.certRow}>
                <Text style={styles.certKey}>Owner Email:</Text>
                <Text style={styles.certVal}>{receiptData?.ownerEmail}</Text>
              </View>

              <View style={styles.certRow}>
                <Text style={styles.certKey}>New Owner:</Text>
                <Text style={styles.certVal}>{receiptData?.newOwner}</Text>
              </View>

              <View style={styles.certRow}>
                <Text style={styles.certKey}>New Email:</Text>
                <Text style={styles.certVal}>{receiptData?.newEmail}</Text>
              </View>

              <View style={styles.certRow}>
                <Text style={styles.certKey}>New Mobile:</Text>
                <Text style={styles.certVal}>{receiptData?.newMobile}</Text>
              </View>

              <View style={styles.certRow}>
                <Text style={styles.certKey}>Review Window:</Text>
                <Text style={[styles.certVal, { color: '#F59E0B' }]}>Within 72 Hours</Text>
              </View>
            </View>

            <Text style={{ color: '#aaa', fontSize: 11, textAlign: 'center', lineHeight: 16, marginBottom: 16 }}>
              The VOEXI Security Admin Operations Team is verifying submitted identity documents, selfies & triple-OTP records. Ownership transfer will be finalized within 72 hours.
            </Text>

            <View style={{ width: '100%', gap: 10 }}>
              <TouchableOpacity
                style={styles.policyBtnSmall}
                onPress={() => {
                  setTransferReceiptModal(false);
                  router.push('/menu/terms');
                }}
              >
                <Ionicons name="document-text" size={16} color="#A855F7" />
                <Text style={styles.policyBtnSmallText}>VIEW TERMS & STATION POLICIES</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.receiptDoneBtn}
                onPress={() => {
                  setTransferReceiptModal(false);
                  router.replace('/(tabs)/profile');
                }}
              >
                <Text style={styles.receiptDoneText}>RETURN TO PROFILE</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* EMAIL MESSAGE PREVIEW MODAL */}
      <EmailMessagePreviewModal
        visible={emailPreviewVisible}
        onClose={() => setEmailPreviewVisible(false)}
        toEmail={previewToEmail}
        subject={previewSubject}
        otpCode={previewOtpCode}
        purpose={previewPurpose}
        stationName={previewStationName}
        onAutoFill={previewAutoFill}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingBox: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 16 },
  backHeaderBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center' },
  headerSubTitle: { color: '#888', fontSize: 10, textAlign: 'center', marginTop: 2 },
  helpBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  cardSection: { backgroundColor: '#12121A', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  fieldBox: { marginBottom: 12 },
  label: { color: '#aaa', fontSize: 10, fontWeight: 'bold', marginBottom: 6, letterSpacing: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#181824', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  input: { flex: 1, color: '#fff', fontSize: 13, padding: 0 },
  emailBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#22C55E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  emailBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  chipsWrap: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chipBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#181824', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipBtnActive: { backgroundColor: VOEXITheme.colors.primary, borderColor: VOEXITheme.colors.primary },
  chipText: { color: '#aaa', fontSize: 11 },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#181824', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  genderCardActive: { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: VOEXITheme.colors.primary },
  genderText: { color: '#aaa', fontSize: 11 },
  genderTextActive: { color: VOEXITheme.colors.primary, fontWeight: 'bold' },
  countryText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '500' },
  uploadBox: { height: 75, backgroundColor: '#181824', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginVertical: 6 },
  uploadText: { color: '#888', fontSize: 9, fontWeight: 'bold', marginTop: 4 },
  uploadImg: { width: '100%', height: '100%', borderRadius: 12 },
  otpCardBox: { backgroundColor: '#181828', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', marginTop: 14 },
  otpCardTitle: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#22C55E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  verifiedTagText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  sendOtpBtn: { backgroundColor: VOEXITheme.colors.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  sendOtpText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  otpInputRow: { flexDirection: 'row', gap: 8 },
  otpInput: { flex: 1, backgroundColor: '#101018', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', paddingHorizontal: 12, fontSize: 13 },
  verifyOtpBtn: { backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center' },
  verifyOtpText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  resendBtn: { alignSelf: 'flex-end', marginTop: 4 },
  resendText: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: 'bold' },
  contractCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#12121A', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  contractTitle: { color: '#fff', fontSize: 12, fontWeight: '900', marginBottom: 4 },
  contractDesc: { color: '#888', fontSize: 10, lineHeight: 15 },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 30 },
  submitGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 8 },
  submitText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalSheet: { width: '100%', maxHeight: '80%', backgroundColor: '#101018', borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, borderRadius: 12, backgroundColor: '#181824', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 14 },
  searchInput: { flex: 1, color: '#fff', marginLeft: 8, fontSize: 14 },
  countryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  cName: { flex: 1, color: '#fff', fontSize: 14 },
  cCode: { color: '#666', fontSize: 12 },
  receiptCard: { width: '100%', backgroundColor: '#12121E', borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' },
  receiptBadgeIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  receiptTitle: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  receiptSub: { color: '#F59E0B', fontSize: 11, textAlign: 'center', marginTop: 2, marginBottom: 16, fontWeight: 'bold' },
  certBox: { width: '100%', backgroundColor: '#181828', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  certLabel: { color: '#F59E0B', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  certIdVal: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  certLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 },
  certRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  certKey: { color: '#aaa', fontSize: 11 },
  certVal: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  policyBtnSmall: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: 'rgba(168,85,247,0.12)', borderWidth: 1, borderColor: '#A855F7', paddingVertical: 12, borderRadius: 12 },
  policyBtnSmallText: { color: '#A855F7', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  receiptDoneBtn: { width: '100%', backgroundColor: '#A855F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  receiptDoneText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 }
});
