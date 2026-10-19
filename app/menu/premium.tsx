import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Animated, Easing, Platform, StatusBar, Modal, ActivityIndicator, Pressable, TextInput, Switch, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { KisanService, KisanApplicationStatus, KisanApplicationRecord, FarmPlotRecord } from '../../lib/kisanService';
import { StudentService, StudentApplicationStatus, StudentApplicationRecord } from '../../lib/studentService';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

const ALL_FEATURES = [
  { id: 1, name: 'VX Identity Studio', icon: 'card-account-details-star-outline' },
  { id: 3, name: 'VOEXI AI for generating video', icon: 'robot-video' },
  { id: 4, name: 'Message Gifts', icon: 'gift-outline' },
  { id: 5, name: 'Ads Control', icon: 'shield-check-outline' },
  { id: 8, name: 'Sound Create AI', icon: 'waveform' },
  { id: 9, name: 'Background Music', icon: 'music-box-multiple-outline' },
];

const PREMIUM_PLANS = [
  {
    id: 'ultra_m',
    name: 'ULTRA ELITE',
    price: '₹999',
    period: '/MONTHLY',
    color: '#FFD700',
    features: [1, 3, 4, 5, 8, 9],
    grad: ['#2B2100', '#000']
  },
  {
    id: 'ultra_y',
    name: 'ULTRA ELITE',
    price: '₹7,999',
    period: '/YEARLY',
    color: '#FFD700',
    features: [1, 3, 4, 5, 8, 9],
    tag: 'ULTIMATE PATH',
    grad: ['#3d2e00', '#000']
  },
  {
    id: 'wizard_m',
    name: 'AI WIZARD',
    price: '₹599',
    period: '/MONTHLY',
    color: '#6366F1',
    features: [3, 8, 9],
    grad: ['#0A0B2E', '#000']
  },
  {
    id: 'wizard_y',
    name: 'AI WIZARD',
    price: '₹4,499',
    period: '/YEARLY',
    color: '#6366F1',
    features: [3, 8, 9],
    tag: 'NEURAL SUPREMACY',
    grad: ['#12144D', '#000']
  },
  {
    id: 'master_m',
    name: 'STUDIO MASTER',
    price: '₹399',
    period: '/MONTHLY',
    color: '#EC4899',
    features: [1, 3, 9],
    grad: ['#2E0A1F', '#000']
  },
  {
    id: 'master_y',
    name: 'STUDIO MASTER',
    price: '₹2,999',
    period: '/YEARLY',
    color: '#EC4899',
    features: [1, 3, 9],
    grad: ['#4D1235', '#000']
  },
  {
    id: 'king_m',
    name: 'STATION KING',
    price: '₹199',
    period: '/MONTHLY',
    color: '#A855F7',
    features: [1, 5, 9],
    grad: ['#1C0A2E', '#000']
  },
  {
    id: 'king_y',
    name: 'STATION KING',
    price: '₹1,599',
    period: '/YEARLY',
    color: '#A855F7',
    features: [1, 5, 9],
    grad: ['#2D124D', '#000']
  },
];

export default function PremiumScreen() {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<'confirm' | 'processing' | 'success'>('confirm');
  const [isKisanPassActive, setIsKisanPassActive] = useState<boolean>(false);

  // KISAN VERIFICATION PAGE STATE
  const [showKisanModal, setShowKisanModal] = useState<boolean>(false);
  const [kisanVerifyStep, setKisanVerifyStep] = useState<'input' | 'processing' | 'success'>('input');
  const [kisanMethod, setKisanMethod] = useState<'pm_id' | 'doc_photo' | 'declaration'>('pm_id');
  const [kisanFullName, setKisanFullName] = useState<string>('');
  const [kisanFatherName, setKisanFatherName] = useState<string>('');
  const [kisanCountry, setKisanCountry] = useState<string>('India 🇮🇳');
  const [kisanResidentialAddress, setKisanResidentialAddress] = useState<string>('');
  const [kisanResidentialPinCode, setKisanResidentialPinCode] = useState<string>('');
  const [kisanState, setKisanState] = useState<string>('Maharashtra');
  const [kisanDistrict, setKisanDistrict] = useState<string>('Nashik');
  const [kisanVillagePanchayat, setKisanVillagePanchayat] = useState<string>('');
  const [kisanFarmerCategory, setKisanFarmerCategory] = useState<string>('Small/Marginal (<2 Ha)');
  const [kisanCropType, setKisanCropType] = useState<string>('Wheat / Rice / Cereals');

  // Multi-Land Farm Plot Records State
  const [kisanFarms, setKisanFarms] = useState<FarmPlotRecord[]>([
    { id: '1', farmAddress: '', state: 'Maharashtra', district: 'Nashik', pinCode: '', khasraPlotNumber: '' },
  ]);

  const [kisanIdInput, setKisanIdInput] = useState<string>('');
  const [kisanAttachedFile, setKisanAttachedFile] = useState<any>(null);
  const [isKisanVerified, setIsKisanVerified] = useState<boolean>(false);
  const [kisanAppStatus, setKisanAppStatus] = useState<KisanApplicationStatus>('not_applied');
  const [kisanRecord, setKisanRecord] = useState<KisanApplicationRecord | null>(null);

  const handleAddFarmPlot = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setKisanFarms(prev => [
      ...prev,
      { id: String(Date.now()), farmAddress: '', state: kisanState || 'Maharashtra', district: kisanDistrict || 'Nashik', pinCode: '', khasraPlotNumber: '' }
    ]);
  };

  const handleRemoveFarmPlot = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setKisanFarms(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdateFarmPlot = (id: string, field: keyof FarmPlotRecord, val: string) => {
    setKisanFarms(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  };

  // STUDENT VERIFICATION STATE
  const [showStudentModal, setShowStudentModal] = useState<boolean>(false);
  const [studentVerifyStep, setStudentVerifyStep] = useState<'input' | 'processing' | 'success'>('input');
  const [studentMethod, setStudentMethod] = useState<'student_id_card' | 'fee_receipt' | 'edu_email' | 'self_declaration'>('student_id_card');
  const [studentFullName, setStudentFullName] = useState<string>('');
  const [studentDob, setStudentDob] = useState<string>('');
  const [studentCountry, setStudentCountry] = useState<string>('India 🇮🇳');
  const [studentState, setStudentState] = useState<string>('Maharashtra');
  const [studentDistrict, setStudentDistrict] = useState<string>('Mumbai');
  const [studentInstitutionName, setStudentInstitutionName] = useState<string>('');
  const [studentRollNumber, setStudentRollNumber] = useState<string>('');
  const [studentCourseName, setStudentCourseName] = useState<string>('B.Tech / B.Sc / Higher Sec');
  const [studentCurrentYear, setStudentCurrentYear] = useState<string>('1st Year');
  const [studentGraduationYear, setStudentGraduationYear] = useState<string>('2027');
  const [studentAttachedFile, setStudentAttachedFile] = useState<any>(null);
  const [isStudentVerified, setIsStudentVerified] = useState<boolean>(false);
  const [studentAppStatus, setStudentAppStatus] = useState<StudentApplicationStatus>('not_applied');
  const [studentRecord, setStudentRecord] = useState<StudentApplicationRecord | null>(null);
  const [isStudentPassActive, setIsStudentPassActive] = useState<boolean>(false);

  useEffect(() => {
    fetchUserKisanStatus();
    fetchUserStudentStatus();
  }, []);

  const fetchUserStudentStatus = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;

      const { status, application } = await StudentService.getUserApplicationStatus(uid);
      setStudentAppStatus(status);
      setStudentRecord(application);

      if (application) {
        setStudentFullName(application.full_name || '');
        setStudentInstitutionName(application.institution_name || '');
        setStudentRollNumber(application.roll_number || '');
        setStudentCourseName(application.course_name || 'B.Tech / B.Sc');
      }

      if (status === 'approved') {
        setIsStudentVerified(true);
        setIsStudentPassActive(true);
      } else {
        setIsStudentVerified(false);
        setIsStudentPassActive(false);
      }
    } catch (e) {
      console.warn('[STUDENT_STATUS_FETCH]', e);
    }
  };

  const handlePickStudentIdImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setStudentAttachedFile({
          uri: asset.uri,
          name: asset.fileName || 'student_id.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
        Alert.alert('Student ID Attached', 'Student ID Card / Receipt photo attached successfully.');
      }
    } catch (e: any) {
      Alert.alert('Picker Error', e.message);
    }
  };

  const startStudentVerification = async () => {
    if (!studentFullName || studentFullName.trim().length < 2) {
      Alert.alert('Name Required', 'Please enter your Full Name as on Student ID.');
      return;
    }
    if (!studentInstitutionName || studentInstitutionName.trim().length < 2) {
      Alert.alert('Institution Required', 'Please enter your School / College / University Name.');
      return;
    }
    if (!studentRollNumber || studentRollNumber.trim().length < 2) {
      Alert.alert('Roll Number Required', 'Please enter your Student ID / Roll / USN Number.');
      return;
    }

    setStudentVerifyStep('processing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id || 'demo_user';

      const res = await StudentService.submitApplication(
        uid,
        {
          fullName: studentFullName,
          dob: studentDob,
          country: studentCountry,
          state: studentState,
          district: studentDistrict,
          institutionName: studentInstitutionName,
          rollNumber: studentRollNumber,
          courseName: studentCourseName,
          currentYear: studentCurrentYear,
          graduationYear: studentGraduationYear,
          documentType: studentMethod,
          documentNumber: studentRollNumber,
          declarationConsent: true,
        },
        studentAttachedFile || undefined
      );

      if (res.success) {
        setStudentVerifyStep('success');
        setStudentAppStatus('pending');
        fetchUserStudentStatus();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setStudentVerifyStep('input');
        Alert.alert('Submission Failed', res.message);
      }
    } catch (e: any) {
      setStudentVerifyStep('input');
      Alert.alert('Error', e.message);
    }
  };

  const fetchUserKisanStatus = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;

      const { status, application } = await KisanService.getUserApplicationStatus(uid);
      setKisanAppStatus(status);
      setKisanRecord(application);

      if (application) {
        setKisanFullName(application.full_name || '');
        setKisanFatherName(application.father_name || '');
        setKisanCountry(application.country || 'India 🇮🇳');
        setKisanResidentialAddress(application.residential_address || '');
        setKisanResidentialPinCode(application.residential_pincode || '');
        setKisanState(application.state || 'Maharashtra');
        setKisanDistrict(application.district || 'Nashik');
        setKisanVillagePanchayat(application.village_panchayat || '');

        if (application.farms_json) {
          try {
            const parsedFarms = JSON.parse(application.farms_json);
            if (Array.isArray(parsedFarms) && parsedFarms.length > 0) {
              setKisanFarms(parsedFarms);
            }
          } catch (e) {}
        }
      }

      if (status === 'approved') {
        setIsKisanVerified(true);
        setIsKisanPassActive(true);
      } else {
        setIsKisanVerified(false);
        setIsKisanPassActive(false);
      }
    } catch (e) {
      console.warn('[KISAN_STATUS_FETCH]', e);
    }
  };

  const handlePickDocumentImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setKisanAttachedFile({
          uri: asset.uri,
          name: asset.fileName || 'kisan_doc.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
        Alert.alert('Document Selected', 'Kisan document image attached successfully.');
      }
    } catch (e: any) {
      Alert.alert('Picker Error', e.message);
    }
  };

  // Farming Details State
  const [kisanPreferredLanguage, setKisanPreferredLanguage] = useState<string>('Hindi / English');
  const [kisanFarmingType, setKisanFarmingType] = useState<'owner' | 'tenant' | 'family_worker' | 'other'>('owner');
  const [kisanFarmingActivity, setKisanFarmingActivity] = useState<'crop' | 'horticulture' | 'mixed' | 'other'>('crop');
  const [kisanFarmingExperience, setKisanFarmingExperience] = useState<'under_3' | '3_to_10' | 'over_10'>('3_to_10');

  const startKisanVerification = async () => {
    if (!kisanFullName || kisanFullName.trim().length < 2) {
      Alert.alert('Name Required', 'Please enter your Full Name.');
      return;
    }
    if (!kisanState || !kisanDistrict) {
      Alert.alert('Location Required', 'Please enter your State and District.');
      return;
    }
    if (kisanMethod === 'pm_id' && (!kisanIdInput || kisanIdInput.trim().length < 4)) {
      Alert.alert('PM-Kisan ID Required', 'Please enter your PM-Kisan Registration or KCC Number.');
      return;
    }

    setKisanVerifyStep('processing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id || 'demo_user';

      const res = await KisanService.submitApplication(
        uid,
        {
          fullName: kisanFullName,
          fatherName: kisanFatherName,
          country: kisanCountry,
          residentialAddress: kisanResidentialAddress,
          residentialPinCode: kisanResidentialPinCode,
          state: kisanState,
          district: kisanDistrict,
          villagePanchayat: kisanVillagePanchayat,
          preferredLanguage: kisanPreferredLanguage,
          farmerCategory: kisanFarmerCategory,
          farmingType: kisanFarmingType,
          farmingActivity: kisanFarmingActivity,
          farmingExperience: kisanFarmingExperience,
          cropType: kisanCropType,
          farms: kisanFarms,
          documentType: kisanMethod === 'pm_id' ? 'pm_kisan_id' : kisanMethod === 'doc_photo' ? 'kisan_card' : 'self_declaration',
          documentNumber: kisanIdInput,
          declarationConsent: true,
        },
        kisanAttachedFile || undefined
      );

      if (res.success) {
        setKisanVerifyStep('success');
        setKisanAppStatus('pending');
        fetchUserKisanStatus();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setKisanVerifyStep('input');
        Alert.alert('Submission Failed', res.message);
      }
    } catch (e: any) {
      setKisanVerifyStep('input');
      Alert.alert('Error', e.message);
    }
  };

  const getDiscountedPrice = (rawPriceStr: string, percent: number) => {
    const num = parseInt(rawPriceStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return rawPriceStr;
    const discounted = Math.round(num * (1 - percent / 100));
    return `₹${discounted.toLocaleString('en-IN')}`;
  };

  const handleBuy = (item: any) => {
    setSelectedItem(item);
    setPurchaseStep('confirm');
    setShowPurchaseModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const processActivation = () => {
    setPurchaseStep('processing');
    setTimeout(() => {
      setPurchaseStep('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2500);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F0524', '#000']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
           </TouchableOpacity>
           <Text style={styles.headerTitle}>ELITE<Text style={{color: VOEXITheme.colors.primary}}> SPECTRUM</Text></Text>
           <TouchableOpacity style={styles.restoreBtn}><Text style={styles.restoreTxt}>RESTORE</Text></TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          <View style={styles.heroSection}>
             <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.crownGlow}>
                <FontAwesome5 name="crown" size={32} color="#000" />
             </LinearGradient>
             <Text style={styles.heroTitle}>UNLEASH THE ALPHA</Text>
             <Text style={styles.heroSub}>Choose your tier of neural station dominance.</Text>
          </View>

          <View style={styles.plansContainer}>
             {PREMIUM_PLANS.map((plan) => (
               <TouchableOpacity key={plan.id} style={[styles.planCard, { borderColor: plan.color + '44' }]} onPress={() => handleBuy(plan)} activeOpacity={0.95}>
                  <LinearGradient colors={plan.grad as any} style={StyleSheet.absoluteFill} />
                  {plan.tag && <View style={[styles.planTag, { backgroundColor: plan.color }]}><Text style={styles.planTagText}>{plan.tag}</Text></View>}
                  <View style={styles.planHeader}>
                     <View>
                        <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                        <View style={styles.priceRow}>
                           <Text style={styles.priceVal}>{plan.price}</Text>
                           <Text style={styles.pricePeriod}>{plan.period}</Text>
                        </View>
                     </View>
                     <View style={[styles.planIconCircle, { backgroundColor: plan.color + '22' }]}>
                        <Ionicons name="flash" size={20} color={plan.color} />
                     </View>
                  </View>
                  <View style={styles.featuresList}>
                     {ALL_FEATURES.map((f) => {
                       const isIncluded = plan.features.includes(f.id);
                       if (!isIncluded) return null;
                       return (
                         <View key={f.id} style={styles.featureRow}>
                            <MaterialCommunityIcons name={f.icon as any} size={16} color={plan.color} />
                            <Text style={styles.featureName}>{f.name}</Text>
                         </View>
                       );
                     })}
                  </View>
                  <View style={[styles.activateBtn, { borderColor: plan.color }]}>
                     <Text style={[styles.activateTxt, { color: plan.color }]}>ACTIVATE LINK</Text>
                  </View>
               </TouchableOpacity>
             ))}
          </View>

          <Text style={styles.footerInfo}>NEURAL-SECURE ENCRYPTION • SPECTRUM GUARANTEED</Text>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showPurchaseModal} transparent animationType="slide">
         <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPurchaseModal(false)} />
            <View style={styles.checkoutSheet}>
               <LinearGradient colors={['#14082B', '#080314']} style={StyleSheet.absoluteFill} />

               {/* HEADER HANDLE & TITLE */}
               <View style={styles.sheetHandleBar} />
               <View style={styles.checkoutHeader}>
                  <Text style={styles.checkoutHeaderTitle}>CONFIRM SUBSCRIPTION</Text>
                  <TouchableOpacity onPress={() => setShowPurchaseModal(false)} style={styles.sheetCloseBtn}>
                     <Ionicons name="close" size={20} color="#FFF" />
                  </TouchableOpacity>
               </View>

               {purchaseStep === 'confirm' && (
                 <>
                   {/* PLAN SUMMARY CARD */}
                   <View style={[styles.summaryCard, { borderColor: selectedItem?.color + '55' }]}>
                      <View style={[styles.summaryIconCirc, { backgroundColor: selectedItem?.color + '22' }]}>
                         <FontAwesome5 name="crown" size={22} color={selectedItem?.color || '#FFD700'} />
                      </View>
                      <View style={{ flex: 1 }}>
                         <Text style={[styles.summaryPlanName, { color: selectedItem?.color }]}>
                           {selectedItem?.name}
                         </Text>
                         <Text style={styles.summaryPlanPeriod}>{selectedItem?.period?.replace('/', '') || 'MONTHLY'}</Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                         {isKisanPassActive ? (
                           <>
                             <Text style={styles.summaryPriceActive}>
                               {getDiscountedPrice(selectedItem?.price, 25)}
                             </Text>
                             <Text style={styles.summaryPriceOld}>{selectedItem?.price}</Text>
                           </>
                         ) : (
                           <Text style={styles.summaryPriceActive}>{selectedItem?.price}</Text>
                         )}
                      </View>
                   </View>

                   {/* 🌾 KISAN WELFARE PASS CARD */}
                   <TouchableOpacity
                     style={[styles.kisanSwitchCard, isKisanPassActive && styles.kisanSwitchCardActive]}
                     onPress={() => {
                       setShowKisanModal(true);
                       setKisanVerifyStep('input');
                     }}
                     activeOpacity={0.85}
                   >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                         <View style={styles.kisanIconCirc}>
                            <Text style={{ fontSize: 18 }}>🌾</Text>
                         </View>
                         <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                               <Text style={styles.kisanCardTitle}>Kisan Welfare Pass</Text>
                               <View style={styles.kisanTagPill}>
                                  <Text style={styles.kisanTagTxt}>25% OFF</Text>
                               </View>
                            </View>
                            <Text style={styles.kisanCardSub}>
                              {isKisanVerified ? '✓ Verified Farmer • 25% Discount Active' : 'Tap to verify Kisan status'}
                            </Text>
                         </View>
                      </View>

                      <Ionicons name={isKisanVerified ? "checkmark-circle" : "chevron-forward"} size={22} color={isKisanVerified ? "#10B981" : "#666"} />
                   </TouchableOpacity>

                   {/* 🎓 STUDENT WELFARE PASS CARD */}
                   <TouchableOpacity
                     style={[styles.kisanSwitchCard, isStudentPassActive && styles.studentSwitchCardActive]}
                     onPress={() => {
                       setShowStudentModal(true);
                       setStudentVerifyStep('input');
                     }}
                     activeOpacity={0.85}
                   >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                         <View style={[styles.kisanIconCirc, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
                            <Text style={{ fontSize: 18 }}>🎓</Text>
                         </View>
                         <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                               <Text style={styles.kisanCardTitle}>Student Welfare Pass</Text>
                               <View style={[styles.kisanTagPill, { borderColor: '#00F2FE', backgroundColor: 'rgba(0, 242, 254, 0.2)' }]}>
                                  <Text style={[styles.kisanTagTxt, { color: '#00F2FE' }]}>25% OFF</Text>
                               </View>
                            </View>
                            <Text style={styles.kisanCardSub}>
                              {isStudentVerified ? '✓ Verified Student • 25% Discount Active' : 'Tap to verify Student status'}
                            </Text>
                         </View>
                      </View>

                      <Ionicons name={isStudentVerified ? "checkmark-circle" : "chevron-forward"} size={22} color={isStudentVerified ? "#00F2FE" : "#666"} />
                   </TouchableOpacity>

                   {/* PRIMARY ACTION BUTTON */}
                   <TouchableOpacity
                     style={styles.subscribeBtn}
                     onPress={processActivation}
                     activeOpacity={0.9}
                   >
                      <LinearGradient
                        colors={(isKisanPassActive || isStudentPassActive) ? ['#10B981', '#059669'] : ['#A855F7', '#EC4899']}
                        style={styles.subscribeGrad}
                      >
                         <Text style={styles.subscribeBtnTxt}>
                           SUBSCRIBE • {(isKisanPassActive || isStudentPassActive) ? getDiscountedPrice(selectedItem?.price, 25) : selectedItem?.price}
                         </Text>
                      </LinearGradient>
                   </TouchableOpacity>

                   <Text style={styles.secureFooterTxt}>🔒 256-BIT ENCRYPTED • INSTANT ACTIVATION • CANCEL ANYTIME</Text>
                 </>
               )}
               {purchaseStep === 'processing' && (
                 <View style={styles.statusView}>
                    <ActivityIndicator size="large" color={selectedItem?.color || '#A855F7'} />
                    <Text style={styles.statusTxt}>PROCESSING PAYMENT...</Text>
                    <Text style={styles.statusSub}>Verifying Station ID & Biometrics</Text>
                 </View>
               )}
               {purchaseStep === 'success' && (
                 <View style={styles.statusView}>
                    <View style={styles.successRing}>
                       <Ionicons name="checkmark-circle" size={60} color="#10B981" />
                    </View>
                    <Text style={styles.statusTxt}>ACCESS GRANTED</Text>
                    <Text style={styles.statusSub}>Welcome to the Elite Domain, Broadcaster.</Text>
                    <TouchableOpacity onPress={() => setShowPurchaseModal(false)} style={styles.enterBtn}><Text style={styles.enterTxt}>ENTER DOMAIN</Text></TouchableOpacity>
                 </View>
               )}
            </View>
         </View>
      </Modal>

      {/* DEDICATED KISAN VERIFICATION PAGE / SHEET */}
      <Modal visible={showKisanModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowKisanModal(false)} />
          <View style={styles.kisanSheet}>
            <LinearGradient colors={['#0D1A14', '#040A07']} style={StyleSheet.absoluteFill} />

            {/* HEADER WITH PROMINENT BACK BUTTON */}
            <View style={styles.sheetHandleBar} />
            <View style={styles.checkoutHeader}>
              <TouchableOpacity
                onPress={() => setShowKisanModal(false)}
                style={styles.sheetBackBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={20} color="#10B981" />
                <Text style={styles.sheetBackTxt}>BACK</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16 }}>🌾</Text>
                <Text style={styles.checkoutHeaderTitle}>KISAN VERIFICATION</Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowKisanModal(false)}
                style={styles.sheetCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {kisanVerifyStep === 'input' && (
              <ScrollView
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 50 }}
              >
                {/* APPLICATION STATUS DISPLAY IF ALREADY APPLIED */}
                {kisanAppStatus !== 'not_applied' && (
                  <View style={[styles.statusBoxBanner, { borderColor: kisanAppStatus === 'approved' ? '#10B981' : kisanAppStatus === 'pending' ? '#EAB308' : '#EF4444' }]}>
                    <Text style={{ color: kisanAppStatus === 'approved' ? '#10B981' : kisanAppStatus === 'pending' ? '#EAB308' : '#EF4444', fontSize: 11, fontWeight: '900' }}>
                      STATUS: {kisanAppStatus.toUpperCase()}
                    </Text>
                    {kisanRecord?.rejection_reason ? (
                      <Text style={{ color: '#EF4444', fontSize: 10, marginTop: 4 }}>
                        Reason: {kisanRecord.rejection_reason}
                      </Text>
                    ) : null}
                  </View>
                )}

                <Text style={styles.kisanPageSub}>
                  Complete your farmer details to verify agriculture status and unlock 25% OFF on all VOEXI Elite plans.
                </Text>

                {/* SECTION 1: PERSONAL & RESIDENTIAL ADDRESS */}
                <View style={styles.methodContentBox}>
                  <Text style={styles.sectionHeaderTitle}>1. PERSONAL & RESIDENTIAL ADDRESS</Text>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>FULL NAME (As on ID)</Text>
                      <TextInput
                        style={styles.kisanTextInput}
                        placeholder="e.g. Ramesh Kumar"
                        placeholderTextColor="#555"
                        value={kisanFullName}
                        onChangeText={setKisanFullName}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>FATHER / HUSBAND NAME</Text>
                      <TextInput
                        style={styles.kisanTextInput}
                        placeholder="e.g. Suresh Kumar"
                        placeholderTextColor="#555"
                        value={kisanFatherName}
                        onChangeText={setKisanFatherName}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.inputLabel}>RESIDENTIAL ADDRESS</Text>
                      <TextInput
                        style={styles.kisanTextInput}
                        placeholder="House No, Village, Street"
                        placeholderTextColor="#555"
                        value={kisanResidentialAddress}
                        onChangeText={setKisanResidentialAddress}
                      />
                    </View>
                    <View style={{ flex: 0.8 }}>
                      <Text style={styles.inputLabel}>PIN CODE</Text>
                      <TextInput
                        style={styles.kisanTextInput}
                        placeholder="422003"
                        placeholderTextColor="#555"
                        value={kisanResidentialPinCode}
                        onChangeText={setKisanResidentialPinCode}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>COUNTRY</Text>
                      <TextInput
                        style={styles.kisanTextInput}
                        placeholder="India 🇮🇳"
                        placeholderTextColor="#555"
                        value={kisanCountry}
                        onChangeText={setKisanCountry}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>STATE & DISTRICT</Text>
                      <TextInput
                        style={styles.kisanTextInput}
                        placeholder="Maharashtra, Nashik"
                        placeholderTextColor="#555"
                        value={`${kisanState}, ${kisanDistrict}`}
                        onChangeText={(txt) => {
                          const parts = txt.split(',');
                          setKisanState(parts[0] || txt);
                          if (parts[1]) setKisanDistrict(parts[1].trim());
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* SECTION 2: FARM LANDS & MULTI-LAND PLOTS (+) */}
                <View style={styles.methodContentBox}>
                  <Text style={styles.sectionHeaderTitle}>2. FARM LAND PLOTS & KHASRA DETAILS ({kisanFarms.length})</Text>

                  {kisanFarms.map((farm, idx) => (
                    <View key={farm.id || idx} style={styles.farmPlotCard}>
                      <View style={styles.farmCardHeader}>
                        <Text style={styles.farmCardTitle}>🌾 FARM PLOT #{idx + 1}</Text>
                        {kisanFarms.length > 1 && (
                          <TouchableOpacity onPress={() => handleRemoveFarmPlot(farm.id)}>
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={{ gap: 10 }}>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <View style={{ flex: 1.2 }}>
                            <Text style={styles.inputSubLabel}>FARM LOCATION / VILLAGE</Text>
                            <TextInput
                              style={styles.kisanTextInput}
                              placeholder="Dindori Gram Panchayat"
                              placeholderTextColor="#555"
                              value={farm.farmAddress}
                              onChangeText={(val) => handleUpdateFarmPlot(farm.id, 'farmAddress', val)}
                            />
                          </View>
                          <View style={{ flex: 0.8 }}>
                            <Text style={styles.inputSubLabel}>FARM PIN CODE</Text>
                            <TextInput
                              style={styles.kisanTextInput}
                              placeholder="422004"
                              placeholderTextColor="#555"
                              value={farm.pinCode}
                              onChangeText={(val) => handleUpdateFarmPlot(farm.id, 'pinCode', val)}
                              keyboardType="numeric"
                            />
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.inputSubLabel}>STATE & DISTRICT</Text>
                            <TextInput
                              style={styles.kisanTextInput}
                              placeholder="Maharashtra, Nashik"
                              placeholderTextColor="#555"
                              value={`${farm.state || kisanState}, ${farm.district || kisanDistrict}`}
                              onChangeText={(val) => {
                                const parts = val.split(',');
                                handleUpdateFarmPlot(farm.id, 'state', parts[0] || val);
                                if (parts[1]) handleUpdateFarmPlot(farm.id, 'district', parts[1].trim());
                              }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.inputSubLabel}>KHASRA / PLOT / AADHAAR REF</Text>
                            <TextInput
                              style={styles.kisanTextInput}
                              placeholder="Khatauni #108 / Plot #4"
                              placeholderTextColor="#555"
                              value={farm.khasraPlotNumber}
                              onChangeText={(val) => handleUpdateFarmPlot(farm.id, 'khasraPlotNumber', val)}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* + ADD ANOTHER FARM BUTTON */}
                  <TouchableOpacity style={styles.addFarmBtn} onPress={handleAddFarmPlot}>
                    <Ionicons name="add-circle-outline" size={18} color="#10B981" />
                    <Text style={styles.addFarmBtnTxt}>+ ADD ANOTHER FARM / LAND PLOT</Text>
                  </TouchableOpacity>

                  {/* FARMER CATEGORY SELECTOR */}
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.inputLabel}>FARMER CATEGORY</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {['Small/Marginal (<2 Ha)', 'Medium (2-5 Ha)', 'Large (>5 Ha)', 'Agri-Creator / Allied'].map((cat) => {
                          const isSel = kisanFarmerCategory === cat;
                          return (
                            <TouchableOpacity
                              key={cat}
                              style={[styles.kisanChip, isSel && styles.kisanChipActive]}
                              onPress={() => setKisanFarmerCategory(cat)}
                            >
                              <Text style={[styles.kisanChipTxt, isSel && { color: '#10B981' }]}>{cat}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>

                  {/* PRIMARY CROP TYPE SELECTOR */}
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.inputLabel}>PRIMARY CROP / AGRICULTURE</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {['Wheat / Rice / Cereals', 'Fruits & Vegetables', 'Cotton / Sugarcane', 'Dairy & Livestock', 'Organic / Mixed'].map((crop) => {
                          const isSel = kisanCropType === crop;
                          return (
                            <TouchableOpacity
                              key={crop}
                              style={[styles.kisanChip, isSel && styles.kisanChipActive]}
                              onPress={() => setKisanCropType(crop)}
                            >
                              <Text style={[styles.kisanChipTxt, isSel && { color: '#10B981' }]}>{crop}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                </View>

                {/* SECTION 3: FARMING DETAILS & EXPERIENCE */}
                <View style={styles.methodContentBox}>
                  <Text style={styles.sectionHeaderTitle}>3. FARMING DETAILS & EXPERIENCE</Text>

                  {/* FARMING TYPE */}
                  <Text style={styles.inputLabel}>FARMING TYPE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {[
                        { id: 'owner', label: 'Owner Cultivator' },
                        { id: 'tenant', label: 'Tenant / Sharecropper' },
                        { id: 'family_worker', label: 'Family Farm Worker' },
                        { id: 'other', label: 'Other Cultivator' },
                      ].map((t) => {
                        const isSel = kisanFarmingType === t.id;
                        return (
                          <TouchableOpacity
                            key={t.id}
                            style={[styles.kisanChip, isSel && styles.kisanChipActive]}
                            onPress={() => setKisanFarmingType(t.id as any)}
                          >
                            <Text style={[styles.kisanChipTxt, isSel && { color: '#10B981' }]}>{t.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* FARMING ACTIVITY */}
                  <Text style={styles.inputLabel}>FARMING ACTIVITY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {[
                        { id: 'crop', label: 'Crop Farming' },
                        { id: 'horticulture', label: 'Horticulture' },
                        { id: 'mixed', label: 'Mixed Farming' },
                        { id: 'other', label: 'Dairy / Allied' },
                      ].map((act) => {
                        const isSel = kisanFarmingActivity === act.id;
                        return (
                          <TouchableOpacity
                            key={act.id}
                            style={[styles.kisanChip, isSel && styles.kisanChipActive]}
                            onPress={() => setKisanFarmingActivity(act.id as any)}
                          >
                            <Text style={[styles.kisanChipTxt, isSel && { color: '#10B981' }]}>{act.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* FARMING EXPERIENCE */}
                  <Text style={styles.inputLabel}>FARMING EXPERIENCE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {[
                        { id: 'under_3', label: 'Under 3 Years' },
                        { id: '3_to_10', label: '3 – 10 Years' },
                        { id: 'over_10', label: 'Over 10 Years' },
                      ].map((exp) => {
                        const isSel = kisanFarmingExperience === exp.id;
                        return (
                          <TouchableOpacity
                            key={exp.id}
                            style={[styles.kisanChip, isSel && styles.kisanChipActive]}
                            onPress={() => setKisanFarmingExperience(exp.id as any)}
                          >
                            <Text style={[styles.kisanChipTxt, isSel && { color: '#10B981' }]}>{exp.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* PREFERRED LANGUAGE */}
                  <Text style={styles.inputLabel}>PREFERRED LANGUAGE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {['Hindi', 'Marathi', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Gujarati', 'English'].map((lang) => {
                        const isSel = kisanPreferredLanguage === lang;
                        return (
                          <TouchableOpacity
                            key={lang}
                            style={[styles.kisanChip, isSel && styles.kisanChipActive]}
                            onPress={() => setKisanPreferredLanguage(lang)}
                          >
                            <Text style={[styles.kisanChipTxt, isSel && { color: '#10B981' }]}>{lang}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* VERIFICATION METHOD TABS */}
                <Text style={styles.inputLabel}>VERIFICATION METHOD</Text>
                <View style={styles.kisanMethodRow}>
                  <TouchableOpacity
                    style={[styles.methodTab, kisanMethod === 'pm_id' && styles.methodTabActive]}
                    onPress={() => setKisanMethod('pm_id')}
                  >
                    <Ionicons name="card-outline" size={16} color={kisanMethod === 'pm_id' ? "#10B981" : "#888"} />
                    <Text style={[styles.methodTabTxt, kisanMethod === 'pm_id' && styles.methodTabTxtActive]}>PM-Kisan ID</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.methodTab, kisanMethod === 'doc_photo' && styles.methodTabActive]}
                    onPress={() => setKisanMethod('doc_photo')}
                  >
                    <Ionicons name="camera-outline" size={16} color={kisanMethod === 'doc_photo' ? "#10B981" : "#888"} />
                    <Text style={[styles.methodTabTxt, kisanMethod === 'doc_photo' && styles.methodTabTxtActive]}>Kisan Card</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.methodTab, kisanMethod === 'declaration' && styles.methodTabActive]}
                    onPress={() => setKisanMethod('declaration')}
                  >
                    <Ionicons name="leaf-outline" size={16} color={kisanMethod === 'declaration' ? "#10B981" : "#888"} />
                    <Text style={[styles.methodTabTxt, kisanMethod === 'declaration' && styles.methodTabTxtActive]}>Self Declare</Text>
                  </TouchableOpacity>
                </View>

                {/* METHOD A: PM-KISAN ID INPUT */}
                {kisanMethod === 'pm_id' && (
                  <View style={styles.methodContentBox}>
                    <Text style={styles.inputLabel}>PM-KISAN REGISTRATION / KCC NUMBER</Text>
                    <TextInput
                      style={styles.kisanTextInput}
                      placeholder="e.g. PMK-9082-1120 or KCC-7842"
                      placeholderTextColor="#555"
                      value={kisanIdInput}
                      onChangeText={setKisanIdInput}
                      autoCapitalize="characters"
                    />
                  </View>
                )}

                {/* METHOD B: DOCUMENT UPLOAD */}
                {kisanMethod === 'doc_photo' && (
                  <TouchableOpacity
                    style={styles.docUploadBox}
                    onPress={handlePickDocumentImage}
                  >
                    <Ionicons name={kisanAttachedFile ? "checkmark-circle" : "cloud-upload-outline"} size={28} color="#10B981" />
                    <Text style={styles.docUploadTxt}>
                      {kisanAttachedFile ? `✓ ${kisanAttachedFile.name}` : 'Tap to Upload Kisan Card or Passbook Photo'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* METHOD C: SELF DECLARATION */}
                {kisanMethod === 'declaration' && (
                  <View style={styles.declarationBox}>
                    <Ionicons name="shield-checkmark-outline" size={24} color="#10B981" />
                    <Text style={styles.declarationTxt}>
                      I hereby declare that I am a farmer / agriculture creator or connected with farming communities.
                    </Text>
                  </View>
                )}

                {/* VERIFY BUTTON */}
                <TouchableOpacity
                  style={styles.verifyActionBtn}
                  onPress={startKisanVerification}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={['#10B981', '#059669']} style={styles.verifyGrad}>
                    <Text style={styles.verifyActionTxt} numberOfLines={1} adjustsFontSizeToFit>
                      SUBMIT & UNLOCK 25% DISCOUNT
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            )}

            {kisanVerifyStep === 'processing' && (
              <View style={styles.statusView}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.statusTxt}>VERIFYING WITH KRISHI PORTAL...</Text>
                <Text style={styles.statusSub}>Checking Station ID, Land Registry & AI Credentials</Text>
              </View>
            )}

            {kisanVerifyStep === 'success' && (
              <View style={styles.statusView}>
                <View style={styles.successRing}>
                  <Ionicons name="checkmark-circle" size={60} color="#10B981" />
                </View>
                <Text style={styles.statusTxt}>VERIFICATION SUCCESSFUL!</Text>
                <Text style={styles.statusSub}>🌾 Kisan Welfare 25% Discount Unlocked for your Account.</Text>
                <TouchableOpacity onPress={() => setShowKisanModal(false)} style={styles.enterBtn}>
                  <Text style={styles.enterTxt}>RETURN TO CHECKOUT</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* DEDICATED STUDENT VERIFICATION PAGE / SHEET */}
      <Modal visible={showStudentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowStudentModal(false)} />
          <View style={styles.studentSheet}>
            <LinearGradient colors={['#08121E', '#02070D']} style={StyleSheet.absoluteFill} />

            {/* HEADER */}
            <View style={styles.sheetHandleBar} />
            <View style={styles.checkoutHeader}>
              <TouchableOpacity
                onPress={() => setShowStudentModal(false)}
                style={[styles.sheetBackBtn, { borderColor: '#00F2FE', backgroundColor: 'rgba(0, 242, 254, 0.12)' }]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={20} color="#00F2FE" />
                <Text style={[styles.sheetBackTxt, { color: '#00F2FE' }]}>BACK</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16 }}>🎓</Text>
                <Text style={styles.checkoutHeaderTitle}>STUDENT VERIFICATION</Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowStudentModal(false)}
                style={styles.sheetCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {studentVerifyStep === 'input' && (
              <ScrollView
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 50 }}
              >
                {/* APPLICATION STATUS DISPLAY IF ALREADY APPLIED */}
                {studentAppStatus !== 'not_applied' && (
                  <View style={[styles.statusBoxBanner, { borderColor: studentAppStatus === 'approved' ? '#00F2FE' : studentAppStatus === 'pending' ? '#EAB308' : '#EF4444' }]}>
                    <Text style={{ color: studentAppStatus === 'approved' ? '#00F2FE' : studentAppStatus === 'pending' ? '#EAB308' : '#EF4444', fontSize: 11, fontWeight: '900' }}>
                      STUDENT STATUS: {studentAppStatus.toUpperCase()}
                    </Text>
                    {studentRecord?.rejection_reason ? (
                      <Text style={{ color: '#EF4444', fontSize: 10, marginTop: 4 }}>
                        Reason: {studentRecord.rejection_reason}
                      </Text>
                    ) : null}
                  </View>
                )}

                <Text style={styles.kisanPageSub}>
                  Complete your student details to verify educational enrollment and unlock 25% OFF on all VOEXI Elite plans.
                </Text>

                {/* CARD 1: PERSONAL DETAILS */}
                <View style={[styles.formGlassCard, { borderColor: 'rgba(0, 242, 254, 0.25)' }]}>
                  <Text style={styles.cardHeaderTitle}>👤 1. PERSONAL DETAILS</Text>

                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: '#00F2FE' }]}>FULL NAME (As on Student ID)</Text>
                        <TextInput
                          style={[styles.kisanTextInput, { borderColor: 'rgba(0, 242, 254, 0.4)' }]}
                          placeholder="e.g. Ananya Sharma"
                          placeholderTextColor="#555"
                          value={studentFullName}
                          onChangeText={setStudentFullName}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: '#00F2FE' }]}>DATE OF BIRTH (DD/MM/YYYY)</Text>
                        <TextInput
                          style={[styles.kisanTextInput, { borderColor: 'rgba(0, 242, 254, 0.4)' }]}
                          placeholder="15/08/2004"
                          placeholderTextColor="#555"
                          value={studentDob}
                          onChangeText={setStudentDob}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: '#00F2FE' }]}>COUNTRY & STATE</Text>
                        <TextInput
                          style={[styles.kisanTextInput, { borderColor: 'rgba(0, 242, 254, 0.4)' }]}
                          placeholder="India, Maharashtra"
                          placeholderTextColor="#555"
                          value={`${studentCountry}, ${studentState}`}
                          onChangeText={(txt) => {
                            const parts = txt.split(',');
                            setStudentCountry(parts[0] || txt);
                            if (parts[1]) setStudentState(parts[1].trim());
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: '#00F2FE' }]}>DISTRICT / CITY</Text>
                        <TextInput
                          style={[styles.kisanTextInput, { borderColor: 'rgba(0, 242, 254, 0.4)' }]}
                          placeholder="Mumbai / Pune"
                          placeholderTextColor="#555"
                          value={studentDistrict}
                          onChangeText={setStudentDistrict}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* CARD 2: EDUCATIONAL INSTITUTION DETAILS */}
                <View style={[styles.formGlassCard, { borderColor: 'rgba(0, 242, 254, 0.25)' }]}>
                  <Text style={styles.cardHeaderTitle}>🏫 2. INSTITUTION DETAILS</Text>

                  <View style={{ gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: '#00F2FE' }]}>COLLEGE / SCHOOL / UNIVERSITY NAME</Text>
                      <TextInput
                        style={[styles.kisanTextInput, { borderColor: 'rgba(0, 242, 254, 0.4)' }]}
                        placeholder="e.g. IIT Bombay / Delhi University"
                        placeholderTextColor="#555"
                        value={studentInstitutionName}
                        onChangeText={setStudentInstitutionName}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: '#00F2FE' }]}>STUDENT ID / ROLL NO / USN</Text>
                        <TextInput
                          style={[styles.kisanTextInput, { borderColor: 'rgba(0, 242, 254, 0.4)' }]}
                          placeholder="e.g. 21CS089 or USN-102"
                          placeholderTextColor="#555"
                          value={studentRollNumber}
                          onChangeText={setStudentRollNumber}
                          autoCapitalize="characters"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: '#00F2FE' }]}>COURSE / PROGRAM</Text>
                        <TextInput
                          style={[styles.kisanTextInput, { borderColor: 'rgba(0, 242, 254, 0.4)' }]}
                          placeholder="e.g. B.Tech Computer Science"
                          placeholderTextColor="#555"
                          value={studentCourseName}
                          onChangeText={setStudentCourseName}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: '#00F2FE' }]}>CURRENT YEAR / SEMESTER</Text>
                        <TextInput
                          style={[styles.kisanTextInput, { borderColor: 'rgba(0, 242, 254, 0.4)' }]}
                          placeholder="e.g. 2nd Year / 4th Sem"
                          placeholderTextColor="#555"
                          value={studentCurrentYear}
                          onChangeText={setStudentCurrentYear}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: '#00F2FE' }]}>EXPECTED GRADUATION YEAR</Text>
                        <TextInput
                          style={[styles.kisanTextInput, { borderColor: 'rgba(0, 242, 254, 0.4)' }]}
                          placeholder="2027"
                          placeholderTextColor="#555"
                          value={studentGraduationYear}
                          onChangeText={setStudentGraduationYear}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* CARD 3: VERIFICATION PROOF */}
                <View style={[styles.formGlassCard, { borderColor: 'rgba(0, 242, 254, 0.25)' }]}>
                  <Text style={styles.cardHeaderTitle}>📄 3. VERIFICATION PROOF & ID ATTACHMENT</Text>

                  <View style={styles.kisanMethodRow}>
                    <TouchableOpacity
                      style={[styles.methodTab, studentMethod === 'student_id_card' && { backgroundColor: 'rgba(0, 242, 254, 0.15)', borderColor: '#00F2FE' }]}
                      onPress={() => setStudentMethod('student_id_card')}
                    >
                      <Ionicons name="card-outline" size={16} color={studentMethod === 'student_id_card' ? "#00F2FE" : "#888"} />
                      <Text style={[styles.methodTabTxt, studentMethod === 'student_id_card' && { color: '#00F2FE' }]}>Student ID</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.methodTab, studentMethod === 'fee_receipt' && { backgroundColor: 'rgba(0, 242, 254, 0.15)', borderColor: '#00F2FE' }]}
                      onPress={() => setStudentMethod('fee_receipt')}
                    >
                      <Ionicons name="receipt-outline" size={16} color={studentMethod === 'fee_receipt' ? "#00F2FE" : "#888"} />
                      <Text style={[styles.methodTabTxt, studentMethod === 'fee_receipt' && { color: '#00F2FE' }]}>Fee Receipt</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.methodTab, studentMethod === 'declaration' && { backgroundColor: 'rgba(0, 242, 254, 0.15)', borderColor: '#00F2FE' }]}
                      onPress={() => setStudentMethod('declaration')}
                    >
                      <Ionicons name="school-outline" size={16} color={studentMethod === 'declaration' ? "#00F2FE" : "#888"} />
                      <Text style={[styles.methodTabTxt, studentMethod === 'declaration' && { color: '#00F2FE' }]}>Self Declare</Text>
                    </TouchableOpacity>
                  </View>

                  {studentMethod !== 'declaration' && (
                    <TouchableOpacity
                      style={[styles.docUploadBox, { borderColor: '#00F2FE', backgroundColor: 'rgba(0, 242, 254, 0.05)' }]}
                      onPress={handlePickStudentIdImage}
                    >
                      <Ionicons name={studentAttachedFile ? "checkmark-circle" : "cloud-upload-outline"} size={26} color="#00F2FE" />
                      <Text style={[styles.docUploadTxt, { color: '#00F2FE' }]}>
                        {studentAttachedFile ? `✓ ${studentAttachedFile.name}` : 'Tap to Upload Photo of Student ID Card or Receipt'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {studentMethod === 'declaration' && (
                    <View style={[styles.declarationBox, { borderColor: 'rgba(0, 242, 254, 0.3)', backgroundColor: 'rgba(0, 242, 254, 0.08)' }]}>
                      <Ionicons name="shield-checkmark-outline" size={22} color="#00F2FE" />
                      <Text style={styles.declarationTxt}>
                        I hereby declare that I am a currently enrolled student at an accredited educational institution.
                      </Text>
                    </View>
                  )}
                </View>

                {/* VERIFY SUBMIT BUTTON */}
                <TouchableOpacity
                  style={styles.verifyActionBtn}
                  onPress={startStudentVerification}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={['#00F2FE', '#0072FF']} style={styles.verifyGrad}>
                    <Text style={styles.verifyActionTxt} numberOfLines={1} adjustsFontSizeToFit>
                      SUBMIT & UNLOCK 25% STUDENT OFF
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            )}

            {studentVerifyStep === 'processing' && (
              <View style={styles.statusView}>
                <ActivityIndicator size="large" color="#00F2FE" />
                <Text style={styles.statusTxt}>VERIFYING STUDENT CREDENTIALS...</Text>
                <Text style={styles.statusSub}>Checking Institution Database & AI Credentials</Text>
              </View>
            )}

            {studentVerifyStep === 'success' && (
              <View style={styles.statusView}>
                <View style={[styles.successRing, { backgroundColor: 'rgba(0, 242, 254, 0.1)' }]}>
                  <Ionicons name="checkmark-circle" size={60} color="#00F2FE" />
                </View>
                <Text style={styles.statusTxt}>VERIFICATION SUCCESSFUL!</Text>
                <Text style={styles.statusSub}>🎓 Student Welfare 25% Discount Unlocked for your Account.</Text>
                <TouchableOpacity onPress={() => setShowStudentModal(false)} style={styles.enterBtn}>
                  <Text style={styles.enterTxt}>RETURN TO CHECKOUT</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 65 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 4 },
  restoreBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#333' },
  restoreTxt: { color: '#666', fontSize: 9, fontWeight: 'bold' },
  heroSection: { alignItems: 'center', marginVertical: 35 },
  crownGlow: { width: 75, height: 75, borderRadius: 37.5, justifyContent: 'center', alignItems: 'center', marginBottom: 25, shadowColor: '#FFD700', shadowRadius: 25, shadowOpacity: 0.6 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 5 },
  heroSub: { color: '#666', fontSize: 12, fontWeight: '600', marginTop: 8, textAlign: 'center', width: '80%' },
  promoBoxContainerModal: { width: '100%', marginVertical: 18, padding: 14, borderRadius: 20, backgroundColor: 'rgba(16, 185, 129, 0.08)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  kisanHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  kisanTitleTxt: { color: '#10B981', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.8 },
  kisanPresetBtn: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#10B981' },
  kisanPresetTxt: { color: '#10B981', fontSize: 9, fontWeight: '900' },
  promoInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  promoInput: { flex: 1, height: 42, backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 12, color: '#FFF', fontSize: 11, fontWeight: 'bold', borderWidth: 1, borderColor: '#222' },
  promoApplyBtn: { height: 42, paddingHorizontal: 16, backgroundColor: '#10B981', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  promoApplyTxt: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  appliedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: 7, borderRadius: 8 },
  appliedBannerTxt: { color: '#10B981', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },
  promoErrorTxt: { color: '#EF4444', fontSize: 9.5, fontWeight: 'bold', marginTop: 6 },
  priceValOriginal: { color: '#666', fontSize: 16, fontWeight: 'bold', textDecorationLine: 'line-through', marginLeft: 6 },
  discountBadgePill: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8, borderWidth: 1, borderColor: '#10B981' },
  discountBadgeTxt: { color: '#10B981', fontSize: 9, fontWeight: '900' },
  plansContainer: { paddingHorizontal: 20, gap: 25 },
  planCard: { borderRadius: 35, padding: 25, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden' },
  planTag: { position: 'absolute', top: 0, right: 30, paddingHorizontal: 15, paddingVertical: 6, borderBottomLeftRadius: 15, borderBottomRightRadius: 15 },
  planTagText: { color: '#000', fontSize: 9, fontWeight: '900' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  planName: { fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 5 },
  priceVal: { color: '#fff', fontSize: 26, fontWeight: '900' },
  pricePeriod: { color: '#555', fontSize: 11, fontWeight: 'bold', marginLeft: 6 },
  planIconCircle: { width: 48, height: 48, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  featuresList: { gap: 15, marginBottom: 30 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureName: { color: '#fff', fontSize: 13, fontWeight: '600', opacity: 0.9 },
  activateBtn: { width: '100%', height: 55, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  activateTxt: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  footerInfo: { color: '#222', fontSize: 10, fontWeight: '900', textAlign: 'center', marginTop: 50, letterSpacing: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  checkoutSheet: { width: '100%', backgroundColor: '#0B0418', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 40 : 28, borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.3)', overflow: 'hidden' },
  kisanSheet: { width: '100%', maxHeight: '92%', backgroundColor: '#050E09', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 22 : 18, paddingBottom: Platform.OS === 'ios' ? 36 : 24, borderWidth: 1.5, borderColor: 'rgba(16, 185, 129, 0.4)', overflow: 'hidden' },
  studentSheet: { width: '100%', maxHeight: '92%', backgroundColor: '#03080E', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 22 : 18, paddingBottom: Platform.OS === 'ios' ? 36 : 24, borderWidth: 1.5, borderColor: 'rgba(0, 242, 254, 0.4)', overflow: 'hidden' },
  studentSwitchCardActive: { backgroundColor: 'rgba(0, 242, 254, 0.08)', borderColor: 'rgba(0, 242, 254, 0.4)' },
  sheetHandleBar: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  checkoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  checkoutHeaderTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  sheetBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: '#10B981' },
  sheetBackTxt: { color: '#10B981', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  sheetCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  statusBoxBanner: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, marginBottom: 16 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 20, marginBottom: 18, borderWidth: 1, gap: 14 },
  summaryIconCirc: { width: 44, height: 44, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  summaryPlanName: { fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  summaryPlanPeriod: { color: '#666', fontSize: 10, fontWeight: '800', marginTop: 2, letterSpacing: 1 },
  summaryPriceActive: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  summaryPriceOld: { color: '#666', fontSize: 13, fontWeight: 'bold', textDecorationLine: 'line-through' },
  kisanSwitchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 20, marginBottom: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  kisanSwitchCardActive: { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.4)' },
  kisanIconCirc: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(16, 185, 129, 0.15)', justifyContent: 'center', alignItems: 'center' },
  kisanCardTitle: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  kisanTagPill: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#10B981' },
  kisanTagTxt: { color: '#10B981', fontSize: 8.5, fontWeight: '900' },
  kisanCardSub: { color: '#888', fontSize: 10, fontWeight: '600', marginTop: 3 },
  kisanPageSub: { color: '#888', fontSize: 11, fontWeight: '500', marginBottom: 18, lineHeight: 16 },
  kisanMethodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  methodTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  methodTabActive: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10B981' },
  methodTabTxt: { color: '#888', fontSize: 10, fontWeight: '800' },
  methodTabTxtActive: { color: '#10B981', fontWeight: '900' },
  methodContentBox: { marginBottom: 22 },
  formGlassCard: { padding: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', marginBottom: 16 },
  cardHeaderTitle: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 14 },
  sectionHeaderTitle: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 12 },
  farmPlotCard: { padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)', marginBottom: 12 },
  farmCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  farmCardTitle: { color: '#10B981', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.8 },
  inputSubLabel: { color: '#888', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
  addFarmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(16, 185, 129, 0.08)', borderWidth: 1, borderColor: '#10B981', borderStyle: 'dashed', marginTop: 4 },
  addFarmBtnTxt: { color: '#10B981', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.8 },
  kisanChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  kisanChipActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' },
  kisanChipTxt: { color: '#888', fontSize: 10, fontWeight: '800' },
  inputLabel: { color: '#10B981', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8, marginBottom: 8 },
  kisanTextInput: { height: 48, backgroundColor: '#000', borderRadius: 14, paddingHorizontal: 16, color: '#FFF', fontSize: 13, fontWeight: 'bold', borderWidth: 1, borderColor: '#10B981' },
  docUploadBox: { height: 90, borderRadius: 18, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.05)', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 22, paddingHorizontal: 15 },
  docUploadTxt: { color: '#10B981', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  declarationBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: 'rgba(16, 185, 129, 0.08)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', marginBottom: 22 },
  declarationTxt: { flex: 1, color: '#DDD', fontSize: 11, fontWeight: '600', lineHeight: 16 },
  verifyActionBtn: { width: '100%', borderRadius: 18, overflow: 'hidden', elevation: 6 },
  verifyGrad: { paddingVertical: 15, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  verifyActionTxt: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' },
  subscribeBtn: { width: '100%', borderRadius: 20, overflow: 'hidden', elevation: 8 },
  subscribeGrad: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  subscribeBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  secureFooterTxt: { color: '#555', fontSize: 9, fontWeight: '900', textAlign: 'center', marginTop: 16, letterSpacing: 1 },
  statusView: { paddingVertical: 35, alignItems: 'center' },
  statusTxt: { color: '#fff', fontSize: 15, fontWeight: '900', marginTop: 30, letterSpacing: 3 },
  statusSub: { color: '#666', fontSize: 11, marginTop: 8 },
  successRing: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(16,185,129,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  enterBtn: { marginTop: 35, paddingHorizontal: 35, paddingVertical: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)' },
  enterTxt: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 }
});
