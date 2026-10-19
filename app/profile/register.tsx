import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Switch, Modal, Image, StatusBar, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import { NeonInput } from '../../components/NeonInput';
import { NeonButton } from '../../components/NeonButton';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../../lib/authService';
import * as ImagePicker from 'expo-image-picker';
import { uploadToBunny } from '../../lib/bunnyStorage';
import { MailService } from '../../lib/mailService';
import { useTheme } from '../../hooks/useTheme';
import { COUNTRIES } from '../../constants/countries';

export default function ChannelRegistration() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isMobileLocked, setIsMobileLocked] = useState(false);

  // Capture State
  const [selfie, setSelfie] = useState<string | null>(null);
  const [idDoc, setIdDoc] = useState<string | null>(null);

  // Station Info
  const [vxId, setVxId] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [regNum, setRegNum] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);

  // Date Selection
  const [selDay, setSelDay] = useState('01');
  const [selMonth, setSelMonth] = useState('January');
  const [selYear, setSelYear] = useState('2024');

  const [formData, setFormData] = useState({
    countryCode: '+91',
    mobile: '', password: '', ownerName: '', editorName: '',
    fullName: '',
    country: 'India',
    state: '', district: '',
    licenseType: 'Personal', broadcastCoverage: 'Global',
    gender: 'Male',
    idDocumentType: 'passport',
    channelCategory: 'Entertainment',
    otp: '',
    isOtpSent: false,
    isOtpVerified: false
  });

  const sendOtp = async () => {
    if (formData.mobile.length < 8) return Alert.alert("INVALID", "Enter a valid mobile number.");
    setLoading(true);
    // Mock OTP for now - usually calls supabase.auth.signInWithOtp({ phone: ... })
    setTimeout(() => {
      setLoading(false);
      setFormData(prev => ({ ...prev, isOtpSent: true }));
      Alert.alert("OTP SENT", "Verification code transmitted to your mobile.");
    }, 1500);
  };

  const verifyOtp = async () => {
    if (formData.otp.length !== 6) return Alert.alert("INVALID", "Enter 6 digit code.");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFormData(prev => ({ ...prev, isOtpVerified: true }));
      Alert.alert("VERIFIED", "Mobile identity confirmed.");
    }, 1500);
  };

  const COUNTRY_PREFIXES = [
    { code: '+91', label: '🇮🇳 India (+91)' },
    { code: '+92', label: '🇵🇰 Pakistan (+92)' },
    { code: '+1', label: '🇺🇸 USA (+1)' },
    { code: '+44', label: '🇬🇧 UK (+44)' },
    { code: '+971', label: '🇦🇪 UAE (+971)' },
    { code: '+880', label: '🇧🇩 BD (+880)' },
  ];

  const CATEGORIES = ['Entertainment', 'Education', 'News', 'Gaming', 'Music', 'Tech', 'Vibe', 'Other'];

  const ID_OPTIONS = [
    { id: 'passport', label: 'Passport' },
    { id: 'aadhar', label: 'Aadhar Card' },
    { id: 'pan', label: 'PAN Card' },
    { id: 'national_id', label: 'National ID' },
    { id: 'driving_license', label: 'Driving License' }
  ];

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const YEARS = Array.from({ length: 50 }, (_, i) => (2025 - i).toString());
  const GENDERS = [ { id: 'Male', icon: 'male' }, { id: 'Female', icon: 'female' }, { id: 'Other', icon: 'transgender' } ];

  useEffect(() => { fetchRegistrationData(); }, []);

  const fetchRegistrationData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (data) {
          setFormData({
            mobile: data.mobile || '', password: data.security_password || '', ownerName: data.owner_name || '',
            editorName: data.editor_name || '', country: data.country || '', state: data.state || '',
            district: data.district || '',
            licenseType: data.license_type || 'Personal', broadcastCoverage: data.broadcast_coverage || 'Global',
            gender: data.gender || 'Male',
          });
          setVxId(data.vx_id_number || 'OFFLINE');
          setCurrentUsername(data.username || 'unknown');
          setRegNum(data.registration_number || '');
          setSelfie(data.live_selfie_url || null);
          if (data.mobile) setIsMobileLocked(true);
          if (!data.registration_number) setRegNum(await AuthService.generateUniqueRegNumber());
        }
      }
    } catch (e) {} finally { setFetching(false); }
  };

  const takeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Camera Denied');
    let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!result.canceled) {
      setSelfie(result.assets[0].uri);
    }
  };

  const pickIdDoc = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6
    });
    if (!result.canceled) {
      setIdDoc(result.assets[0].uri);
    }
  };

  const handleCountrySelect = (country: any) => {
    setFormData(prev => ({
      ...prev,
      country: country.name,
      countryCode: country.phone
    }));
    setShowCountryModal(false);
  };

  const handleInputChange = (field: string, value: string) => { setFormData(prev => ({ ...prev, [field]: value })); };

  const handleRegister = async () => {
    if (!selfie) return Alert.alert('REQUIRED', 'Verification Selfie is mandatory.');
    if (!idDoc) return Alert.alert('REQUIRED', 'ID Document upload is mandatory.');
    if (!formData.fullName || !formData.mobile || !formData.ownerName || !formData.country) return Alert.alert('REQUIRED', 'Fill all mandatory fields (*).');
    if (formData.mobile.length !== 10) return Alert.alert('INVALID', 'Mobile number must be exactly 10 digits.');
    if (!isAgreed) return Alert.alert('LEGAL', 'Please agree to Terms and Community Guidelines.');

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;

      const fullMobile = `${formData.countryCode}${formData.mobile}`;

      // 1. Upload ID Document to PRIVATE bucket
      const fileExt = idDoc.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}_id.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('id_documents')
        .upload(fileName, {
          uri: idDoc,
          type: `image/${fileExt}`,
          name: fileName
        } as any);

      if (uploadError) throw new Error("ID Document Upload Failed: " + uploadError.message);

      // 2. Upload Verification Selfie (Public/Bunny as before)
      const selfieUrl = selfie.startsWith('http') ? selfie : await uploadToBunny(selfie, 'image');

      const monthIndex = MONTHS.indexOf(selMonth);
      const foundingDate = `${selYear}-${(monthIndex + 1).toString().padStart(2, '0')}-${selDay}`;

      // 3. Create Verification Request record
      const { error: reqError } = await supabase.from('verification_requests').insert({
        user_id: user.id,
        full_name: formData.fullName,
        country: formData.country,
        id_document_type: formData.idDocumentType,
        id_document_url: fileName, // Save storage path
        channel_name: formData.ownerName, // Reusing ownerName as channel label for now
        channel_category: formData.channelCategory,
        content_declaration: isAgreed,
        phone_number: `${formData.countryCode}${formData.mobile}`,
        phone_verified: formData.isOtpVerified,
        status: 'pending'
      });
      if (reqError) throw reqError;

      // 4. Update Profile State (Optional, keeping legacy sync)
      await supabase.from('profiles').update({
        mobile: `${formData.countryCode}${formData.mobile}`,
        owner_name: formData.ownerName,
        country: formData.country,
        live_selfie_url: selfieUrl,
        verification_status: 'pending',
        updated_at: new Date(),
      }).eq('id', user.id);

      // 5. Trigger Cloud Notify
      supabase.functions.invoke('send-verification-email', {
        body: {
          userId: user.id,
          username: currentUsername,
          fullName: formData.fullName,
          country: formData.country,
          docType: formData.idDocumentType,
          email: user.email
        }
      }).catch(e => console.warn("[VNC CLOUD FAIL]", e.message));

      Alert.alert('SUCCESS', 'Your verification request has been transmitted for review.');
      router.replace('/(tabs)/profile');
    } catch (e: any) {
      Alert.alert('TRANSMISSION ERROR', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <View style={[styles.center, isLight && { backgroundColor: '#fff' }]}><ActivityIndicator size="large" color={VOEXITheme.colors.primary} /></View>;

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <StatusBar barStyle={isLight ? "dark-content" : "light-content"} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={isLight ? '#000' : '#fff'} /></TouchableOpacity>
            <Text style={[styles.title, isLight && { color: '#000' }]}>CHANNEL VERIFICATION PROTOCOL</Text>
            <TouchableOpacity onPress={() => setSelfie(null)}><Text style={[styles.reset, isLight && { color: '#999' }]}>CLEAR</Text></TouchableOpacity>
          </View>

          {/* SIMPLIFIED SELFIE CAPTURE */}
          <View style={styles.selfieSection}>
             <TouchableOpacity style={[styles.selfieBox, isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }, selfie && {borderColor: VOEXITheme.colors.primary}]} onPress={takeSelfie}>
                {selfie ? (
                   <Image source={{ uri: selfie }} style={styles.fullImg} />
                ) : (
                   <View style={styles.empty}>
                      <MaterialCommunityIcons name="face-recognition" size={40} color={isLight ? "#CCC" : "#333"} />
                      <Text style={[styles.slotT, isLight && { color: '#999' }]}>TAKE VERIFICATION SELFIE</Text>
                      <Text style={[styles.hintText, isLight && { color: '#BBB' }]}>Ensure your face is clearly visible</Text>
                   </View>
                )}
             </TouchableOpacity>
             <Text style={styles.protocolText}>NEURAL IDENTITY UPLINK ACTIVE</Text>
          </View>

          <View style={styles.vipDashboard}>
             <View style={[styles.vipPill, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}><Text style={styles.vipL}>VOICE ID</Text><Text style={[styles.vipV, isLight && { color: '#000' }]}>{vxId}</Text></View>
             <View style={[styles.vipPill, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}><Text style={styles.vipL}>PENDING LICENSE</Text><Text style={[styles.vipV, {color: VOEXITheme.colors.primary}]}>{regNum}</Text></View>
          </View>

          <View style={styles.section}>
            <Text style={styles.secLabel}>STATION IDENTITY</Text>
            <NeonInput label="FULL LEGAL NAME *" value={formData.fullName} onChangeText={(v)=>handleInputChange('fullName', v)} icon="person-outline" placeholder="Enter your full name" />

            <TouchableOpacity style={styles.countryBtn} onPress={() => setShowCountryModal(true)}>
               <View>
                 <Text style={styles.countryLabel}>RESIDENCE COUNTRY *</Text>
                 <Text style={styles.countryVal}>{formData.country || 'Select Country'}</Text>
               </View>
               <Ionicons name="chevron-down" size={18} color={VOEXITheme.colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.secLabel, { marginTop: 20 }]}>ID DOCUMENT VERIFICATION *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docTypeRow}>
               {ID_OPTIONS.map(opt => (
                 <TouchableOpacity
                    key={opt.id}
                    style={[styles.docPill, { minWidth: 100, marginRight: 10 }, formData.idDocumentType === opt.id && styles.docPillActive]}
                    onPress={() => handleInputChange('idDocumentType', opt.id)}
                 >
                    <Text style={[styles.docPillText, formData.idDocumentType === opt.id && { color: '#fff' }]}>{opt.label}</Text>
                 </TouchableOpacity>
               ))}
            </ScrollView>

            <TouchableOpacity style={[styles.uploadBox, idDoc && { borderColor: VOEXITheme.colors.primary }]} onPress={pickIdDoc}>
               {idDoc ? (
                 <Image source={{ uri: idDoc }} style={styles.docPreview} />
               ) : (
                 <View style={styles.emptyUpload}>
                    <Ionicons name="cloud-upload-outline" size={32} color="#444" />
                    <Text style={styles.uploadT}>TAP TO UPLOAD ID</Text>
                 </View>
               )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.secLabel}>GENDER & SECURITY</Text>
            <View style={styles.selRow}>{GENDERS.map(g => (<TouchableOpacity key={g.id} style={[styles.pill, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }, formData.gender===g.id && styles.pillA]} onPress={()=>handleInputChange('gender',g.id)}><Ionicons name={g.icon as any} size={16} color={formData.gender===g.id?'#fff':(isLight ? '#BBB' : '#333')}/><Text style={[styles.pillT, formData.gender===g.id&&{color:'#fff'}]}>{g.id}</Text></TouchableOpacity>))}</View>

            <View style={styles.mobileInputRow}>
              <View>
                <Text style={styles.fieldLabel}>COUNTRY CODE</Text>
                <TouchableOpacity
                  style={[styles.countryCodePill, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    Alert.alert("SELECT REGION", "Choose your country", COUNTRIES.map(c => ({
                      text: `${c.flag} ${c.name} (${c.phone})`,
                      onPress: () => handleInputChange('countryCode', c.phone)
                    })));
                  }}
                >
                  <Text style={[styles.countryCodeText, isLight && { color: '#000' }]}>{formData.countryCode}</Text>
                  <Ionicons name="chevron-down" size={10} color={VOEXITheme.colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={{flex: 1}}>
                <NeonInput
                  label="SUBSCRIBER NUMBER *"
                  value={formData.mobile}
                  placeholder="Exactly 10 digits"
                  onChangeText={(v) => {
                    const clean = v.replace(/[^0-9]/g, '');
                    if (clean.length <= 10) handleInputChange('mobile', clean);
                  }}
                  icon="call-outline"
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!formData.isOtpVerified}
                />
              </View>
              {!formData.isOtpVerified && !formData.isOtpSent && (
                <TouchableOpacity style={styles.otpBtn} onPress={sendOtp}><Text style={styles.otpBtnText}>SEND OTP</Text></TouchableOpacity>
              )}
            </View>

            {formData.isOtpSent && !formData.isOtpVerified && (
              <View style={styles.otpRow}>
                 <View style={{flex: 1}}><NeonInput label="OTP CODE" value={formData.otp} onChangeText={(v)=>handleInputChange('otp',v)} placeholder="6 digits" keyboardType="numeric" maxLength={6} /></View>
                 <TouchableOpacity style={styles.verifyBtn} onPress={verifyOtp}><Text style={styles.verifyBtnText}>VERIFY</Text></TouchableOpacity>
              </View>
            )}

            {formData.isOtpVerified && (
              <View style={styles.verifiedRow}><Ionicons name="checkmark-circle" size={16} color="#00ff00" /><Text style={styles.verifiedText}>Mobile Identity Verified</Text></View>
            )}

            <NeonInput label="ACCESS KEY (PASSWORD) *" value={formData.password} placeholder="Enter station password" onChangeText={(v)=>handleInputChange('password',v)} icon="key-outline" secureTextEntry />
          </View>

          {/* GEOGRAPHY & DISTRICT */}
          <View style={styles.section}>
            <Text style={styles.secLabel}>GEOGRAPHY & DISTRICT</Text>
            <View style={{flexDirection:'row', gap: 10, marginBottom: 15}}>
               <View style={{flex:1}}><NeonInput label="COUNTRY *" value={formData.country} placeholder="e.g. India" onChangeText={(v)=>handleInputChange('country',v)} /></View>
               <View style={{flex:1}}><NeonInput label="STATE *" value={formData.state} placeholder="e.g. Delhi" onChangeText={(v)=>handleInputChange('state',v)} /></View>
            </View>
            <NeonInput label="DISTRICT / COUNTY *" value={formData.district} placeholder="e.g. North Delhi" onChangeText={(v)=>handleInputChange('district',v)} icon="navigate-outline" />
            <TouchableOpacity style={[styles.dobBtn, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]} onPress={()=>setShowDateModal(true)}><Text style={[styles.dobV, isLight && { color: '#000' }]}>{selDay} {selMonth} {selYear}</Text><Ionicons name="calendar-outline" size={18} color={VOEXITheme.colors.primary} /></TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.secLabel}>OWNERSHIP & CATEGORY</Text>
            <NeonInput label="STATION OWNER *" value={formData.ownerName} onChangeText={(v)=>handleInputChange('ownerName',v)} icon="person-outline" placeholder="Enter owner name" />

            <Text style={styles.countryLabel}>STATION CATEGORY *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
               {CATEGORIES.map(c => (
                 <TouchableOpacity
                   key={c}
                   style={[styles.catPill, formData.channelCategory === c && styles.catPillActive]}
                   onPress={() => handleInputChange('channelCategory', c)}
                 >
                    <Text style={[styles.catPillText, formData.channelCategory === c && { color: '#fff' }]}>{c}</Text>
                 </TouchableOpacity>
               ))}
            </ScrollView>
          </View>

          {/* PLATFORM TERMS & COMMUNITY GUIDELINES CARD */}
          <View style={[styles.termsCard, isLight && { backgroundColor: '#F9F9FB', borderColor: '#EEE' }]}>
            <View style={styles.termsCardHeader}>
              <Ionicons name="document-text" size={18} color={VOEXITheme.colors.primary} />
              <Text style={[styles.termsCardTitle, isLight && { color: '#000' }]}>PLATFORM TERMS & RULES</Text>
            </View>
            <Text style={[styles.termsCardDesc, isLight && { color: '#666' }]}>
              Please review our broadcaster policies and community guidelines before submitting your channel verification.
            </Text>
            <View style={styles.termsBtnRow}>
              <TouchableOpacity
                style={[styles.policyBtn, isLight && { backgroundColor: '#FFF', borderColor: '#DDD' }]}
                onPress={() => router.push('/menu/terms')}
              >
                <Ionicons name="shield-outline" size={14} color="#A855F7" />
                <Text style={[styles.policyBtnText, isLight && { color: '#000' }]}>TERMS OF SERVICE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.policyBtn, isLight && { backgroundColor: '#FFF', borderColor: '#DDD' }]}
                onPress={() => router.push('/menu/community-guidelines')}
              >
                <Ionicons name="ribbon-outline" size={14} color="#EC4899" />
                <Text style={[styles.policyBtnText, isLight && { color: '#000' }]}>COMMUNITY RULES</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* AGREEMENT SWITCH ROW WITH CLICKABLE LINKS */}
          <View style={styles.agreeR}>
            <Switch
              value={isAgreed}
              onValueChange={setIsAgreed}
              trackColor={{ false: isLight ? '#DDD' : '#222', true: VOEXITheme.colors.primary }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.agreeT, isLight && { color: '#888' }]}>
                I confirm official channel verification request to Spectrum HQ. I agree to comply with VOEXI{' '}
                <Text style={styles.agreeLink} onPress={() => router.push('/menu/terms')}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.agreeLink} onPress={() => router.push('/menu/community-guidelines')}>Community Guidelines</Text>.
              </Text>
            </View>
          </View>

          <NeonButton title="TRANSMIT VERIFICATION" onPress={handleRegister} loading={loading} />
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCountryModal} transparent animationType="slide">
         <View style={styles.modalOverlay}>
            <View style={[styles.pickerCard, { height: '80%', backgroundColor: isLight ? '#FFF' : '#0A0A0A', borderColor: isLight ? '#EEE' : '#222' }]}>
               <Text style={[styles.modalTitle, isLight && { color: '#000' }]}>SELECT COUNTRY</Text>
               <FlatList
                  data={COUNTRIES}
                  keyExtractor={c => c.code}
                  renderItem={({ item: c }) => (
                    <TouchableOpacity style={[styles.countryRow, isLight && { borderBottomColor: '#EEE' }]} onPress={() => handleCountrySelect(c)}>
                       <Text style={styles.flag}>{c.flag}</Text>
                       <Text style={[styles.countryNameText, isLight && { color: '#000' }]}>{c.name}</Text>
                       {formData.country === c.name && <Ionicons name="checkmark-circle" size={18} color={VOEXITheme.colors.primary} />}
                    </TouchableOpacity>
                  )}
               />
               <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowCountryModal(false)}>
                  <Text style={styles.closeModalText}>CANCEL</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>

      <Modal visible={showDateModal} transparent animationType="slide"><View style={styles.modalOverlay}><View style={[styles.pickerCard, isLight && { backgroundColor: '#FFF', borderColor: '#EEE' }]}><Text style={[styles.modalTitle, isLight && { color: '#000' }]}>STATION FOUNDING DATE</Text><View style={styles.pickerRow}><ScrollView style={{flex:1}} contentContainerStyle={styles.colStyle}>{DAYS.map(d=><TouchableOpacity key={d} onPress={()=>setSelDay(d)}><Text style={[styles.num, isLight && { color: '#DDD' }, selDay===d&&{color:VOEXITheme.colors.primary}]}>{d}</Text></TouchableOpacity>)}</ScrollView><ScrollView style={{flex:1}} contentContainerStyle={styles.colStyle}>{MONTHS.map(m=><TouchableOpacity key={m} onPress={()=>setSelMonth(m)}><Text style={[styles.num, isLight && { color: '#DDD' }, selMonth===m&&{color:VOEXITheme.colors.secondary}]}>{m.substring(0,3)}</Text></TouchableOpacity>)}</ScrollView><ScrollView style={{flex:1}} contentContainerStyle={styles.colStyle}>{YEARS.map(y=><TouchableOpacity key={y} onPress={()=>setSelYear(y)}><Text style={[styles.num, isLight && { color: '#DDD' }, selYear===y&&{color:VOEXITheme.colors.primary}]}>{y}</Text></TouchableOpacity>)}</ScrollView></View><TouchableOpacity style={styles.confirmBtn} onPress={()=>setShowDateModal(false)}><Text style={{color:'#000', fontWeight:'900'}}>CONFIRM</Text></TouchableOpacity></View></View></Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  scroll: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  reset: { color: '#333', fontSize: 10, fontWeight: 'bold' },
  selfieSection: { alignItems: 'center', marginBottom: 35 },
  selfieBox: { width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: '#111', overflow: 'hidden', backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center', shadowColor: VOEXITheme.colors.primary, shadowRadius: 20, shadowOpacity: 0.2 },
  fullImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  empty: { alignItems: 'center', gap: 10 },
  slotT: { color: '#eee', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  hintText: { color: '#444', fontSize: 8, fontWeight: 'bold' },
  protocolText: { color: VOEXITheme.colors.secondary, fontSize: 8, fontWeight: '900', letterSpacing: 2, marginTop: 15 },
  vipDashboard: { flexDirection: 'row', gap: 15, marginBottom: 35 },
  vipPill: { flex: 1, backgroundColor: '#0A0A0A', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#111' },
  vipL: { color: '#444', fontSize: 7, fontWeight: '900', marginBottom: 4 },
  vipV: { color: '#fff', fontSize: 11, fontWeight: '900' },
  section: { marginBottom: 35 },
  secLabel: { color: VOEXITheme.colors.primary, fontSize: 9, fontWeight: '900', marginBottom: 15, letterSpacing: 2 },
  selRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  mobileInputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: 15 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0A0A0A', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#111' },
  pillA: { borderColor: VOEXITheme.colors.primary, backgroundColor: 'rgba(168,85,247,0.1)' },
  pillT: { color: '#444', fontSize: 11, fontWeight: 'bold' },
  dobBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#080808', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#111' },
  dobV: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  agreeR: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 35 },
  agreeT: { color: '#555', fontSize: 11, lineHeight: 16 },
  agreeLink: { color: VOEXITheme.colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  pickerCard: { backgroundColor: '#0A0A0A', width: '90%', borderRadius: 30, padding: 25, borderWidth: 1, borderColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 12, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  pickerRow: { flexDirection: 'row', height: 200 },
  colStyle: { alignItems: 'center' },
  num: { color: '#333', fontSize: 16, fontWeight: 'bold', paddingVertical: 15 },
  confirmBtn: { backgroundColor: VOEXITheme.colors.primary, padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 25 },
  countryBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0A0A0A', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#111', marginBottom: 15 },
  countryLabel: { color: '#444', fontSize: 8, fontWeight: '900', marginBottom: 4 },
  countryVal: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  docTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  docPill: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  docPillActive: { borderColor: VOEXITheme.colors.primary, backgroundColor: VOEXITheme.colors.primary + '22' },
  docPillText: { color: '#444', fontSize: 10, fontWeight: '900' },
  uploadBox: { height: 180, borderRadius: 15, borderWidth: 1, borderColor: '#111', borderStyle: 'dashed', backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  docPreview: { width: '100%', height: '100%' },
  emptyUpload: { alignItems: 'center', gap: 8 },
  uploadT: { color: '#444', fontSize: 10, fontWeight: 'bold' },
  catScroll: { marginBottom: 15 },
  catPill: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111', marginRight: 10, borderWidth: 1, borderColor: '#222' },
  catPillActive: { borderColor: VOEXITheme.colors.primary, backgroundColor: VOEXITheme.colors.primary + '22' },
  catPillText: { color: '#444', fontSize: 11, fontWeight: 'bold' },
  countryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#111' },
  flag: { fontSize: 20, marginRight: 15 },
  countryNameText: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 },
  closeModalBtn: { marginTop: 20, alignItems: 'center' },
  closeModalText: { color: '#666', fontWeight: 'bold' },
  otpBtn: { backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 12, height: 52, borderRadius: 12, justifyContent: 'center', marginBottom: 5 },
  otpBtnText: { color: '#000', fontSize: 10, fontWeight: '900' },
  otpRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: 15 },
  verifyBtn: { backgroundColor: VOEXITheme.colors.secondary, paddingHorizontal: 12, height: 52, borderRadius: 12, justifyContent: 'center', marginBottom: 5 },
  verifyBtnText: { color: '#000', fontSize: 10, fontWeight: '900' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15, backgroundColor: 'rgba(0,255,0,0.05)', padding: 10, borderRadius: 10 },
  verifiedText: { color: '#00ff00', fontSize: 12, fontWeight: 'bold' },
  fieldLabel: { color: VOEXITheme.colors.textDim, fontSize: 12, marginBottom: 6, marginLeft: 4, fontWeight: 'bold' },
  countryCodePill: {
    backgroundColor: '#0A0A0A',
    height: 55,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  // Terms & Rules Card
  termsCard: {
    backgroundColor: '#0A0A10',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#181824',
    marginBottom: 25
  },
  termsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  termsCardTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  termsCardDesc: { color: '#777', fontSize: 11, lineHeight: 16, marginBottom: 14 },
  termsBtnRow: { flexDirection: 'row', gap: 10 },
  policyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#12121A',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222'
  },
  policyBtnText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }
});
