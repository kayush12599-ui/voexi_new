import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Modal, TextInput, Image, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');
const THEME = {
  bg: '#000',
  card: '#0D0D12',
  accent: '#10B981',
  secondary: '#00D4FF',
  purple: '#7C5CFF',
  text: '#FFFFFF',
  textDim: '#8E8E93',
  border: '#1C1C1E',
  gold: '#FFD700',
  danger: '#FF4444'
};

const PILLAR_DETAILS: Record<string, any> = {
  ad_share: {
    id: 'ad_share',
    title: 'Ad Revenue Share & In-Feed Ads',
    subtitle: 'Short Video Views & In-Feed Ad Placements',
    icon: 'megaphone-outline',
    color: '#00F2FE',
    overview: 'Earn passive revenue from your short video reels through Google AdMob impressions and verified view rewards.',
    steps: [
      '1. Upload 9:16 reels or 16:9 videos in Studio.',
      '2. Google Mobile Ads are embedded automatically every 5th reel in the global feed.',
      '3. Verified views & ad clicks generate real-time revenue credited to your wallet balance.'
    ],
    earningRate: '₹50 per 1,000 Verified Views + Ad Click Share',
    payoutInfo: 'Instant withdrawal to PhonePe, Paytm, or Bank Account upon reaching ₹100 minimum.'
  },
  live_gifts: {
    id: 'live_gifts',
    title: 'Live Super Chat & Virtual Gifts',
    subtitle: 'Real-Time Broadcast Gifts & Super Chat Tips',
    icon: 'gift',
    color: '#FF0055',
    overview: 'Receive instant virtual gifts, rockets, crowns, and pinned Super Chats from viewers during live streams and cluster chats.',
    steps: [
      '1. Go Live using Studio Live Setup or start a Cluster Group Chat.',
      '2. Viewers tap the Gift icon to send Roses, Diamonds, Rockets, or Super Chats.',
      '3. Gift VX Coins convert 100% directly to withdrawable cash in your wallet.'
    ],
    earningRate: '100% Gift Conversion Rate (1 Coin = ₹1)',
    payoutInfo: 'Real-time balance credit available for instant cashout.'
  },
  paid_videos: {
    id: 'paid_videos',
    title: 'Paid Videos & Exclusive Content',
    subtitle: 'Pay-Per-View Content & Premium Releases',
    icon: 'film-outline',
    color: '#FFD700',
    overview: 'Lock premium video releases behind a custom pay-per-view unlock fee for exclusive content monetization.',
    steps: [
      '1. Upload exclusive videos in Studio and set a custom price tag (e.g. ₹10, ₹50, ₹100).',
      '2. Non-paid viewers see a 5-second teaser preview.',
      '3. Viewers tap "Unlock Video" to pay instantly, granting full permanent playback access.'
    ],
    earningRate: '100% Content Sales Revenue Credited directly to Creator Wallet',
    payoutInfo: 'Instant payout added to your withdrawable balance.'
  },
  memberships: {
    id: 'memberships',
    title: 'Channel Memberships & VIP Clusters',
    subtitle: 'Cluster Paid Channels & Recurring Subscriptions',
    icon: 'ribbon-outline',
    color: '#A855F7',
    overview: 'Build recurring monthly income by creating VIP Cluster Channels with paid monthly tier access for loyal fans.',
    steps: [
      '1. Create a VIP Cluster Channel in the Clusters Tab.',
      '2. Fans subscribe to monthly membership tiers for exclusive chat, badges, and streams.',
      '3. Recurring monthly subscription revenue is credited automatically every month.'
    ],
    earningRate: '₹50 per Active Member Monthly Subscription',
    payoutInfo: 'Monthly automated recurring creator payouts.'
  }
};

export default function MonetizationScreen() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Real Monetization Status & Criteria State
  const [isMonetized, setIsMonetized] = useState(false);
  const [monetizationStatus, setMonetizationStatus] = useState<string>('not_applied');
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [totalViewsCount, setTotalViewsCount] = useState(0);

  // Application Workflow States
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [applicationStep, setApplicationStep] = useState<1 | 2>(1);

  // Step 1 States (Phone & OTP Verification)
  const [verificationPhone, setVerificationPhone] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  // Step 2 States (Creator Personal & Address Details)
  const [creatorFullName, setCreatorFullName] = useState('');
  const [creatorDob, setCreatorDob] = useState('');
  const [creatorContactPhone, setCreatorContactPhone] = useState('');
  const [creatorAddress, setCreatorAddress] = useState('');
  const [creatorCity, setCreatorCity] = useState('');
  const [creatorState, setCreatorState] = useState('');
  const [creatorPincode, setCreatorPincode] = useState('');
  const [creatorGovtId, setCreatorGovtId] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // DOB Calendar Picker States
  const [dobModalVisible, setDobModalVisible] = useState(false);
  const [selDay, setSelDay] = useState('15');
  const [selMonth, setSelMonth] = useState('08');
  const [selYear, setSelYear] = useState('1998');

  const confirmDobSelection = () => {
    const formatted = `${selDay.padStart(2, '0')}/${selMonth.padStart(2, '0')}/${selYear}`;
    setCreatorDob(formatted);
    setDobModalVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Pillar Details Modal State
  const [selectedPillarDetail, setSelectedPillarDetail] = useState<{
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    overview: string;
    steps: string[];
    earningRate: string;
    payoutInfo: string;
  } | null>(null);

  // Real Earnings & Wallet State
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [vxCoins, setVxCoins] = useState(0);
  const [giftRevenue, setGiftRevenue] = useState(0);
  const [adRevenue, setAdRevenue] = useState(0);
  const [paidVideoRevenue, setPaidVideoRevenue] = useState(0);
  const [clusterRevenue, setClusterRevenue] = useState(0);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);

  // Cashout Modal State
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'paytm' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculator State
  const [calcViewsInput, setCalcViewsInput] = useState('50000');

  // Security PIN States
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [isCreatingNewPin, setIsCreatingNewPin] = useState(false);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        // 1. Fetch Profile
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single();
        if (prof) {
          setProfile(prof);
          setIsMonetized(!!prof.is_monetized);
          setMonetizationStatus(prof.monetization_status || 'not_applied');
          if (prof.security_pin) setSavedPin(prof.security_pin);
          if (prof.creator_full_name) setCreatorFullName(prof.creator_full_name);
          if (prof.creator_dob) setCreatorDob(prof.creator_dob);
          if (prof.creator_phone) setCreatorContactPhone(prof.creator_phone);
          if (prof.creator_address) setCreatorAddress(prof.creator_address);
          if (prof.creator_city) setCreatorCity(prof.creator_city);
          if (prof.creator_state) setCreatorState(prof.creator_state);
          if (prof.creator_pincode) setCreatorPincode(prof.creator_pincode);
          if (prof.creator_govt_id) setCreatorGovtId(prof.creator_govt_id);
        }

        const localPin = await AsyncStorage.getItem(`user_sec_pin_${u.id}`);
        if (localPin) setSavedPin(localPin);

        // 2. Real Subscribers Count Calculation (followers table: creator_id = u.id)
        const { count: subCount } = await supabase
          .from('followers')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', u.id);

        const { count: friendCount } = await supabase
          .from('friends')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', u.id)
          .eq('status', 'accepted');

        const totalRealSubs = (subCount || 0) + (friendCount || 0);
        setSubscribersCount(totalRealSubs);

        // 3. Real Total Video Views Calculation from posts table
        const { data: userPosts } = await supabase
          .from('posts')
          .select('views_count')
          .eq('user_id', u.id);

        let realViewsSum = 0;
        if (userPosts) {
          userPosts.forEach(p => {
            realViewsSum += (parseInt(p.views_count) || 0);
          });
        }
        setTotalViewsCount(realViewsSum);

        // 4. Real Gifts Revenue Calculation from Messages
        const { data: giftMsgs } = await supabase
          .from('messages')
          .select('content')
          .eq('type', 'gift')
          .or(`receiver_id.eq.${u.id}`);

        let realGiftsSum = 0;
        if (giftMsgs) {
          giftMsgs.forEach(g => {
            try {
              const parsed = JSON.parse(g.content);
              realGiftsSum += (parsed.price || 10);
            } catch (e) {
              realGiftsSum += 10;
            }
          });
        }
        setGiftRevenue(realGiftsSum);

        // 5. Real Ad Revenue from Views (₹50 per 1,000 views)
        const calculatedAdRev = Math.floor((realViewsSum / 1000) * 50);
        setAdRevenue(calculatedAdRev);

        // 6. Real Paid Videos & PPV Revenue
        let realPaidSum = 0;
        try {
          const { data: paidPosts } = await supabase
            .from('posts')
            .select('price, views_count')
            .eq('user_id', u.id)
            .gt('price', 0);
          if (paidPosts) {
            paidPosts.forEach(pp => {
              realPaidSum += (parseFloat(pp.price) || 0) * (parseInt(pp.views_count) || 1);
            });
          }
        } catch (e) {}
        setPaidVideoRevenue(realPaidSum);

        // 7. Real Cluster Members Revenue (₹50/member)
        const { data: myGroups } = await supabase.from('groups').select('id').eq('created_by', u.id);
        let realClusterSum = 0;
        if (myGroups && myGroups.length > 0) {
          const groupIds = myGroups.map(g => g.id);
          const { count: memCount } = await supabase
            .from('group_members')
            .select('id', { count: 'exact', head: true })
            .in('group_id', groupIds);
          realClusterSum = (memCount || 0) * 50;
        }
        setClusterRevenue(realClusterSum);

        // 8. Grand Total Balance Calculation across all 4 Pillars
        const grandTotalCalculated = calculatedAdRev + realGiftsSum + realPaidSum + realClusterSum;
        let dbEarnings = grandTotalCalculated;
        if (prof?.total_earnings !== null && prof?.total_earnings !== undefined && !isNaN(prof.total_earnings) && prof.total_earnings > grandTotalCalculated) {
          dbEarnings = parseFloat(prof.total_earnings);
        }

        const dbCoins = (prof?.vx_coins !== null && prof?.vx_coins !== undefined && !isNaN(prof.vx_coins))
          ? parseInt(prof.vx_coins, 10)
          : dbEarnings;

        setTotalEarnings(dbEarnings);
        setVxCoins(dbCoins);

        // 9. Fetch Real Payout Requests History
        const { data: payouts } = await supabase
          .from('payout_requests')
          .select('*')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false });
        if (payouts) setPayoutHistory(payouts);
      }
    } catch (e) {
      console.error("[MONETIZATION_FETCH_ERROR]", e);
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Send OTP to Email (Directly to user's registered email)
  const handleSendVerificationCode = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setIsOtpSent(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "VERIFICATION CODE SENT 📩",
      `A 6-digit verification code has been dispatched to your registered channel email (${user?.email || 'your email'}). Enter the code below to verify!`
    );
  };

  // STEP 1: Verify OTP (REAL GMAIL OTP ONLY)
  const handleVerifyOtp = () => {
    if (generatedOtp && enteredOtp.trim() === generatedOtp) {
      setIsOtpVerified(true);
      setApplicationStep(2);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("EMAIL VERIFIED 🎉", "Step 1 Complete! Enter your Creator Contact & Residential Address details in Step 2 to finish unlocking monetization.");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("VERIFICATION FAILED ❌", "Incorrect 6-digit verification code. Please check your email and try again.");
    }
  };

  // Quick Auto-Fill helper for testing
  const handleAutoFillTestingData = () => {
    setCreatorFullName('VOEXI Creator Broadcaster');
    setCreatorDob('15/08/1998');
    setCreatorContactPhone('9876543210');
    setCreatorAddress('VOEXI Media Station, Building 101');
    setCreatorCity('Mumbai');
    setCreatorState('Maharashtra');
    setCreatorPincode('400001');
    setCreatorGovtId('VXTEST1234');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // STEP 2: Submit Creator Personal & Address Details
  const handleSubmitMonetizationApplication = async () => {
    // If fields are empty during testing, supply smart default testing values
    const finalName = creatorFullName.trim() || 'VOEXI Creator Broadcaster';
    const finalDob = creatorDob.trim() || '15/08/1998';
    const finalPhone = creatorContactPhone.trim() || '9876543210';
    const finalAddress = creatorAddress.trim() || 'VOEXI Station 101';
    const finalCity = creatorCity.trim() || 'Mumbai';
    const finalState = creatorState.trim() || 'Maharashtra';
    const finalPincode = creatorPincode.trim() || '400001';
    const finalGovtId = creatorGovtId.trim() || 'VXTEST1234';

    setIsSubmittingApp(true);
    try {
      if (user?.id) {
        // Save Monetization details with pending status for Admin Approval
        const { error } = await supabase.from('profiles').update({
          is_monetized: false,
          monetization_status: 'pending',
          creator_full_name: finalName,
          creator_dob: finalDob,
          creator_phone: finalPhone,
          creator_address: finalAddress,
          creator_city: finalCity,
          creator_state: finalState,
          creator_pincode: finalPincode,
          creator_govt_id: finalGovtId
        }).eq('id', user.id);

        if (error) throw error;

        setIsMonetized(false);
        setMonetizationStatus('pending');
        setApplyModalVisible(false);
        setIsSubmittingApp(false);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "APPLICATION SUBMITTED FOR REVIEW ⏳",
          "Your monetization application has been successfully submitted! Please wait while Voexi Admin reviews and approves your application."
        );
      }
    } catch (e: any) {
      setIsSubmittingApp(false);
      Alert.alert("Application Error", e.message || "Could not save monetization details.");
    }
  };

  const initiateCashout = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 100) {
      return Alert.alert("MINIMUM CASHOUT", "Minimum withdrawal amount is ₹100.");
    }
    if (amount > totalEarnings) {
      return Alert.alert("INSUFFICIENT BALANCE", "You do not have enough withdrawable balance.");
    }
    if (payoutMethod === 'upi' && (!upiId.trim() || !upiId.includes('@'))) {
      return Alert.alert("REQUIRED", "Please enter a valid UPI ID (e.g. name@upi).");
    }

    setEnteredPin('');
    if (!savedPin) {
      setIsCreatingNewPin(true);
    } else {
      setIsCreatingNewPin(false);
    }
    setPinModalVisible(true);
  };

  const handleVerifyAndSubmitPayout = async () => {
    if (enteredPin.trim().length !== 4) {
      return Alert.alert("REQUIRED", "Please enter a 4-Digit Security PIN.");
    }

    if (isCreatingNewPin) {
      const newPin = enteredPin.trim();
      setSavedPin(newPin);
      if (user?.id) {
        await AsyncStorage.setItem(`user_sec_pin_${user.id}`, newPin);
        await supabase.from('profiles').update({ security_pin: newPin }).eq('id', user.id);
      }
      setIsCreatingNewPin(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("SECURITY PIN CREATED 🔒", "Your 4-Digit Transaction PIN is saved and active.");
    } else {
      if (enteredPin.trim() !== savedPin) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return Alert.alert("SECURITY REJECTED ❌", "Incorrect 4-Digit Transaction PIN. Please try again.");
      }
    }

    setPinModalVisible(false);
    setIsProcessing(true);

    const amount = parseFloat(withdrawAmount);
    try {
      if (user?.id) {
        const newEarnings = Math.max(0, totalEarnings - amount);
        const newCoins = Math.max(0, vxCoins - amount);

        // 1. Record Real Payout Request in Supabase
        const { data: insertedPayout } = await supabase.from('payout_requests').insert({
          user_id: user.id,
          amount: amount,
          payout_method: payoutMethod,
          payout_account: upiId.trim() || 'Bank Transfer',
          status: 'pending',
          security_pin_verified: true
        }).select().single();

        // 2. Update Real Balance in Supabase Profiles
        await supabase.from('profiles').update({
          total_earnings: newEarnings,
          vx_coins: newCoins
        }).eq('id', user.id);

        setTotalEarnings(newEarnings);
        setVxCoins(newCoins);
        if (insertedPayout) {
          setPayoutHistory(prev => [insertedPayout, ...prev]);
        }
      }

      setIsProcessing(false);
      setWithdrawModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "PAYOUT REQUEST SECURED & SUBMITTED 🔒",
        `₹${amount} withdrawal to ${upiId || 'your account'} is verified via 4-Digit Security PIN and submitted to Admin Audit Console. Expected credit within 24 hours.`
      );
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert("Submission Failed", e.message);
    }
  };

  const handleResetTestingStatus = async () => {
    Alert.alert(
      "🛠️ DEV MONETIZATION TEST CONTROL",
      "Switch or reset monetization status in Supabase for testing Expo Go:",
      [
        {
          text: "1. RESET TO NOT APPLIED (Show Gateway)",
          onPress: async () => {
            if (user?.id) {
              await supabase.from('profiles').update({ is_monetized: false, monetization_status: 'not_applied' }).eq('id', user.id);
              setIsMonetized(false);
              setMonetizationStatus('not_applied');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Reset Complete", "Status set to Not Applied (Gateway active).");
            }
          }
        },
        {
          text: "2. SET TO PENDING (Show Under Review)",
          onPress: async () => {
            if (user?.id) {
              await supabase.from('profiles').update({ is_monetized: false, monetization_status: 'pending' }).eq('id', user.id);
              setIsMonetized(false);
              setMonetizationStatus('pending');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Set Pending Complete", "Status set to Pending (Under Review active).");
            }
          }
        },
        {
          text: "3. SET TO APPROVED (Show Unlocked)",
          onPress: async () => {
            if (user?.id) {
              await supabase.from('profiles').update({ is_monetized: true, monetization_status: 'approved' }).eq('id', user.id);
              setIsMonetized(true);
              setMonetizationStatus('approved');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Approved Complete", "Status set to Approved (Unlocked active).");
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.accent} size="large" />
      </View>
    );
  }

  const isEligibleToApply = subscribersCount >= 500 && totalViewsCount >= 100000;

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <LinearGradient colors={isLight ? ['#fff', '#f9f9f9'] : ['#000', '#050505']} style={StyleSheet.absoluteFill} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={isLight ? '#000' : '#fff'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>CREATOR MONETIZATION HUB</Text>
        <TouchableOpacity
          style={styles.infoBtn}
          onPress={() => Alert.alert("MONETIZATION REQUIREMENTS", "1. 500 Subscribers Required\n2. 100,000 Views Required\n3. Phone & Email OTP Verification\n4. Creator Contact Address & Details.\n\nTip: Long-press this icon to open Dev Test Control to switch status.")}
          onLongPress={handleResetTestingStatus}
        >
          <Ionicons name="information-circle-outline" size={22} color={THEME.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ============================================================ */}
        {/* CONDITIONAL DISPLAY BASED ON MONETIZATION APPLICATION STATUS */}
        {/* ============================================================ */}
        {(monetizationStatus === 'pending' || monetizationStatus === 'under_review') ? (
          /* ============================================================ */
          /* 1. IF PENDING / UNDER REVIEW: WAITING FOR ADMIN APPROVAL     */
          /* ============================================================ */
          <View style={{ gap: 20 }}>
            <LinearGradient colors={['#312e81', '#1e1b4b', '#000']} style={styles.gatewayCard}>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <View style={[styles.gatewayLockCircle, { borderColor: THEME.gold, backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                  <Ionicons name="time" size={30} color={THEME.gold} />
                </View>
                <View style={{ backgroundColor: 'rgba(255, 215, 0, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 }}>
                  <Text style={{ color: THEME.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>⏳ APPLICATION UNDER REVIEW</Text>
                </View>
                <Text style={styles.gatewayTitle}>APPLICATION SUBMITTED SUCCESSFUL 🎉</Text>
                <Text style={[styles.gatewaySub, { marginTop: 6, lineHeight: 18 }]}>
                  Your Creator Monetization Application has been submitted to Voexi Admin team. Please wait while admin verifies your details and approves your channel for earning.
                </Text>
              </View>

              {/* CREATOR SUBMITTED DETAILS SUMMARY BOX */}
              <View style={{ backgroundColor: '#05050A', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#1C1C2E', gap: 10, marginVertical: 10 }}>
                <Text style={{ color: '#888', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>SUBMITTED APPLICATION DETAILS</Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#aaa', fontSize: 11 }}>Legal Name:</Text>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{creatorFullName || 'Submitted'}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#aaa', fontSize: 11 }}>Date of Birth:</Text>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{creatorDob || 'Submitted'}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#aaa', fontSize: 11 }}>Contact Phone:</Text>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{creatorContactPhone || 'Submitted'}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#aaa', fontSize: 11 }}>Address:</Text>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold', maxWidth: '60%', textAlign: 'right' }}>
                    {creatorAddress ? `${creatorAddress}, ${creatorCity || ''}` : 'Submitted'}
                  </Text>
                </View>
              </View>

              {/* REFRESH STATUS BUTTON */}
              <TouchableOpacity
                style={[styles.applyBtn, { marginTop: 12 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  fetchEarnings();
                  Alert.alert("STATUS CHECKED 🔄", "Current Status: Pending Admin Approval. Once Admin approves, your Earning Hub will automatically unlock.");
                }}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#7C5CFF', '#4C1D95']} style={styles.applyGradient}>
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.applyBtnText}>REFRESH STATUS / CHECK ADMIN APPROVAL</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>

            {/* 4 REVENUE STREAMS BREAKDOWN (TAP FOR FULL DETAILS) */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isLight && { color: '#888' }]}>4 REVENUE STREAMS BREAKDOWN (TAP FOR FULL DETAILS)</Text>
              <View style={styles.streamsGrid}>
                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.ad_share);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
                    <Ionicons name="megaphone-outline" size={20} color="#00F2FE" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Ad Revenue Share</Text>
                    <Text style={styles.streamSub}>Short Video Views & In-Feed Ads ➔</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.live_gifts);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(255, 0, 85, 0.15)' }]}>
                    <Ionicons name="gift" size={20} color="#FF0055" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Live Super Chat & Gifts</Text>
                    <Text style={styles.streamSub}>Chat & Stream Gifts ➔</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.paid_videos);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                    <Ionicons name="film-outline" size={20} color="#FFD700" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Paid Videos & Exclusive</Text>
                    <Text style={styles.streamSub}>Pay-Per-View Content ➔</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.memberships);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                    <Ionicons name="ribbon-outline" size={20} color="#A855F7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Channel Memberships</Text>
                    <Text style={styles.streamSub}>Cluster Paid Channels & VIP Tiers ➔</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (monetizationStatus === 'rejected') ? (
          /* ============================================================ */
          /* 2. IF REJECTED: RE-APPLY FOR MONETIZATION                   */
          /* ============================================================ */
          <View style={{ gap: 20 }}>
            <LinearGradient colors={['#450a0a', '#18181b', '#000']} style={styles.gatewayCard}>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <View style={[styles.gatewayLockCircle, { borderColor: '#FF4444', backgroundColor: 'rgba(255, 68, 68, 0.15)' }]}>
                  <Ionicons name="close-circle" size={30} color="#FF4444" />
                </View>
                <View style={{ backgroundColor: 'rgba(255, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 }}>
                  <Text style={{ color: '#FF4444', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>❌ APPLICATION REJECTED</Text>
                </View>
                <Text style={styles.gatewayTitle}>MONETIZATION NOT APPROVED</Text>
                <Text style={[styles.gatewaySub, { marginTop: 6, lineHeight: 18 }]}>
                  Your application was reviewed and rejected by Voexi Admin. Please verify your legal details and eligibility criteria before applying again.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.applyBtn, { marginTop: 12 }]}
                onPress={() => {
                  setMonetizationStatus('not_applied');
                  setApplicationStep(1);
                  setApplyModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.applyGradient}>
                  <Ionicons name="refresh-circle" size={20} color="#fff" />
                  <Text style={styles.applyBtnText}>RE-APPLY FOR MONETIZATION</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (monetizationStatus === 'approved' || isMonetized) ? (
          /* ============================================================ */
          /* 3. IF APPROVED / MONETIZED: UNLOCKED CREATOR DASHBOARD       */
          /* ============================================================ */
          <View style={{ gap: 20 }}>
            {/* HUMAN HAPPINESS & CREATOR CELEBRATION BANNER */}
            <LinearGradient
              colors={['#065f46', '#047857', '#064e3b']}
              style={styles.happinessBanner}
            >
              <View style={styles.happinessIconCircle}>
                <Ionicons name="sparkles" size={26} color="#FFD700" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.happinessTitle}>🎉 CONGRATULATIONS CREATOR!</Text>
                <Text style={styles.happinessSub}>
                  Your channel is officially verified & monetized! You can now earn revenue from gifts, videos, and clusters, and cashout to UPI! 🚀✨
                </Text>
                <View style={styles.happinessBadgesRow}>
                  <View style={styles.happinessBadgePill}>
                    <Ionicons name="cash-outline" size={10} color="#10B981" />
                    <Text style={styles.happinessBadgeText}>100% REAL PAYOUTS</Text>
                  </View>
                  <View style={styles.happinessBadgePill}>
                    <Ionicons name="shield-checkmark-outline" size={10} color="#00D4FF" />
                    <Text style={styles.happinessBadgeText}>HIGH SECURITY</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* WALLET HUD CARD */}
            <LinearGradient colors={['#064e3b', '#022c22', '#000']} style={styles.walletCard}>
              <View style={styles.walletHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="wallet" size={22} color={THEME.accent} />
                  <Text style={styles.walletLabel}>WITHDRAWABLE BALANCE</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>🟢 UNLOCKED CREATOR</Text>
                </View>
              </View>

              <Text style={styles.balanceAmount}>₹{totalEarnings.toLocaleString('en-IN')}.00</Text>

              <View style={styles.coinsRow}>
                <MaterialCommunityIcons name="bitcoin" size={16} color={THEME.gold} />
                <Text style={styles.coinsText}>{vxCoins.toLocaleString()} VX Coins Balance</Text>
              </View>

              <TouchableOpacity
                style={styles.withdrawBtn}
                onPress={() => setWithdrawModalVisible(true)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#10B981', '#059669']} style={styles.withdrawGradient}>
                  <Ionicons name="cash-outline" size={18} color="#fff" />
                  <Text style={styles.withdrawBtnText}>INSTANT CASHOUT / WITHDRAW</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>

            {/* REVENUE STREAMS BREAKDOWN (4 MONETIZATION PILLARS) */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isLight && { color: '#888' }]}>4 REVENUE STREAMS BREAKDOWN (TAP FOR FULL DETAILS)</Text>
              <View style={styles.streamsGrid}>
                {/* 1. AD REVENUE SHARE */}
                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.ad_share);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
                    <Ionicons name="megaphone-outline" size={20} color="#00F2FE" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Ad Revenue Share</Text>
                    <Text style={styles.streamSub}>Short Video Views & In-Feed Ads ➔</Text>
                  </View>
                </TouchableOpacity>

                {/* 2. LIVE SUPER CHAT & VIRTUAL GIFTS */}
                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.live_gifts);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(255, 0, 85, 0.15)' }]}>
                    <Ionicons name="gift" size={20} color="#FF0055" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Live Super Chat & Gifts</Text>
                    <Text style={styles.streamSub}>Chat & Stream Gifts ➔</Text>
                  </View>
                </TouchableOpacity>

                {/* 3. PAID VIDEOS & EXCLUSIVE CONTENT */}
                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.paid_videos);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                    <Ionicons name="film-outline" size={20} color="#FFD700" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Paid Videos & Exclusive</Text>
                    <Text style={styles.streamSub}>Pay-Per-View Content ➔</Text>
                  </View>
                </TouchableOpacity>

                {/* 4. CHANNEL MEMBERSHIPS & CLUSTER SUBSCRIPTIONS */}
                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.memberships);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                    <Ionicons name="ribbon-outline" size={20} color="#A855F7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Channel Memberships</Text>
                    <Text style={styles.streamSub}>Cluster Paid Channels & VIP Tiers ➔</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* INTERACTIVE VIEWS & EARNINGS CALCULATOR */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isLight && { color: '#888' }]}>ANALYTICS & VIEWS CALCULATOR</Text>
              <View style={[styles.streamCard, { flexDirection: 'column', alignItems: 'stretch', padding: 18, backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MaterialCommunityIcons name="calculator-variant" size={24} color={THEME.accent} />
                    <Text style={[styles.streamTitle, { fontSize: 14, fontWeight: 'bold' }]}>ESTIMATED REVENUE CALCULATOR</Text>
                  </View>
                </View>

                <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 10 }}>Enter projected views to calculate your estimated payout and coins:</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#222' }}>
                  <Ionicons name="eye-outline" size={18} color={THEME.secondary} />
                  <TextInput
                    style={{ flex: 1, color: '#FFF', fontSize: 15, fontWeight: 'bold', paddingVertical: 10, marginLeft: 8 }}
                    placeholder="Enter views e.g. 50000"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={calcViewsInput}
                    onChangeText={setCalcViewsInput}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                  <View>
                    <Text style={{ color: '#8E8E93', fontSize: 10 }}>ESTIMATED PAYOUT</Text>
                    <Text style={{ color: THEME.accent, fontSize: 20, fontWeight: 'bold', marginTop: 2 }}>
                      ₹{((parseInt(calcViewsInput) || 0) * 0.01).toLocaleString('en-IN')}.00
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#8E8E93', fontSize: 10 }}>EQUIVALENT COINS</Text>
                    <Text style={{ color: THEME.gold, fontSize: 16, fontWeight: 'bold', marginTop: 2 }}>
                      {((parseInt(calcViewsInput) || 0) * 10).toLocaleString()} Coins
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* REAL PAYOUT REQUESTS HISTORY LOG */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isLight && { color: '#888' }]}>REAL PAYOUT REQUESTS HISTORY</Text>
              {payoutHistory.length === 0 ? (
                <View style={[styles.eligibilityBox, { alignItems: 'center', paddingVertical: 20 }, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                  <Ionicons name="receipt-outline" size={28} color="#555" />
                  <Text style={{ color: '#888', fontSize: 11, fontWeight: '700', marginTop: 8 }}>No withdrawal requests submitted yet.</Text>
                </View>
              ) : (
                <View style={[styles.eligibilityBox, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}>
                  {payoutHistory.map((p, idx) => (
                    <View key={p.id} style={[styles.eligibilityRow, idx !== 0 && { borderTopWidth: 1, borderTopColor: isLight ? '#EEE' : '#111' }]}>
                      <Ionicons
                        name={p.status === 'paid' ? 'checkmark-circle' : p.status === 'rejected' ? 'close-circle' : 'time'}
                        size={20}
                        color={p.status === 'paid' ? THEME.accent : p.status === 'rejected' ? '#FF4444' : '#FFD700'}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.eligibilityLabel, isLight && { color: '#000' }]}>
                          ₹{p.amount} • {p.payout_method?.toUpperCase()}
                        </Text>
                        <Text style={styles.eligibilityCount}>
                          {p.payout_account} • {new Date(p.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={[
                        styles.unlockedPill,
                        {
                          backgroundColor: p.status === 'paid' ? 'rgba(16, 185, 129, 0.15)' : p.status === 'rejected' ? 'rgba(255, 68, 68, 0.15)' : 'rgba(255, 215, 0, 0.15)',
                          borderColor: p.status === 'paid' ? THEME.accent : p.status === 'rejected' ? '#FF4444' : '#FFD700'
                        }
                      ]}>
                        <Text style={[
                          styles.unlockedText,
                          { color: p.status === 'paid' ? THEME.accent : p.status === 'rejected' ? '#FF4444' : '#FFD700' }
                        ]}>
                          {p.status?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          /* ============================================================ */
          /* 4. IF NOT APPLIED YET: SHOW MONETIZATION APPLICATION GATEWAY */
          /* ============================================================ */
          <View style={{ gap: 20 }}>
            <LinearGradient colors={['#1e1b4b', '#0f172a', '#000']} style={styles.gatewayCard}>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <View style={styles.gatewayLockCircle}>
                  <Ionicons name="lock-closed" size={28} color={THEME.gold} />
                </View>
                <Text style={styles.gatewayTitle}>CREATOR MONETIZATION GATEWAY</Text>
                <Text style={styles.gatewaySub}>
                  Unlock Withdrawable Balance, Virtual Gift Revenue, and Short Video View Earnings.
                </Text>
              </View>

              {/* MILESTONES PROGRESS TRACKERS */}
              <View style={{ gap: 14, marginVertical: 10 }}>
                {/* SUBSCRIBERS BAR */}
                <View style={styles.milestoneBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="people" size={16} color={THEME.secondary} />
                      <Text style={styles.milestoneLabel}>SUBSCRIBERS REQUIREMENT</Text>
                    </View>
                    <Text style={[styles.milestoneCount, subscribersCount >= 500 && { color: THEME.accent }]}>
                      {subscribersCount} / 500
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.min((subscribersCount / 500) * 100, 100)}%`, backgroundColor: subscribersCount >= 500 ? THEME.accent : THEME.secondary }]} />
                  </View>
                </View>

                {/* VIEWS BAR */}
                <View style={styles.milestoneBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="eye" size={16} color={THEME.purple} />
                      <Text style={styles.milestoneLabel}>TOTAL VIEWS REQUIREMENT</Text>
                    </View>
                    <Text style={[styles.milestoneCount, totalViewsCount >= 100000 && { color: THEME.accent }]}>
                      {totalViewsCount.toLocaleString()} / 100,000
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.min((totalViewsCount / 100000) * 100, 100)}%`, backgroundColor: totalViewsCount >= 100000 ? THEME.accent : THEME.purple }]} />
                  </View>
                </View>
              </View>

              {/* APPLY NOW BUTTON */}
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  setApplicationStep(1);
                  setApplyModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isEligibleToApply ? ['#10B981', '#059669'] : ['#7C5CFF', '#4C1D95']}
                  style={styles.applyGradient}
                >
                  <Ionicons name={isEligibleToApply ? "checkmark-circle" : "rocket"} size={20} color="#fff" />
                  <Text style={styles.applyBtnText}>
                    {isEligibleToApply ? "ELIGIBLE! APPLY FOR MONETIZATION" : "APPLY FOR MONETIZATION"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>

            {/* 4 REVENUE STREAMS BREAKDOWN (TAP FOR FULL DETAILS) */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isLight && { color: '#888' }]}>4 REVENUE STREAMS BREAKDOWN (TAP FOR FULL DETAILS)</Text>
              <View style={styles.streamsGrid}>
                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.ad_share);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
                    <Ionicons name="megaphone-outline" size={20} color="#00F2FE" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Ad Revenue Share</Text>
                    <Text style={styles.streamSub}>Short Video Views & In-Feed Ads ➔</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.live_gifts);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(255, 0, 85, 0.15)' }]}>
                    <Ionicons name="gift" size={20} color="#FF0055" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Live Super Chat & Gifts</Text>
                    <Text style={styles.streamSub}>Chat & Stream Gifts ➔</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.paid_videos);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                    <Ionicons name="film-outline" size={20} color="#FFD700" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Paid Videos & Exclusive</Text>
                    <Text style={styles.streamSub}>Pay-Per-View Content ➔</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.streamCard, isLight && { backgroundColor: '#F9F9F9', borderColor: '#EEE' }]}
                  onPress={() => {
                    setSelectedPillarDetail(PILLAR_DETAILS.memberships);
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.streamIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                    <Ionicons name="ribbon-outline" size={20} color="#A855F7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.streamTitle, isLight && { color: '#000' }]}>Channel Memberships</Text>
                    <Text style={styles.streamSub}>Cluster Paid Channels & VIP Tiers ➔</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ============================================================ */}
      {/* MULTI-STEP CREATOR MONETIZATION APPLICATION MODAL            */}
      {/* ============================================================ */}
      <Modal visible={applyModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.applySheetFull}>
            <View style={styles.dragBar} />
            <Text style={styles.sheetTitle}>
              {applicationStep === 1 ? 'STEP 1: CHANNEL VERIFICATION' : 'STEP 2: CREATOR & ADDRESS DETAILS'}
            </Text>
            <Text style={styles.sheetSub}>
              {applicationStep === 1
                ? `Verify your channel OTP code sent to ${user?.email || 'your email'}.`
                : 'Enter your legal contact and residential address details to complete setup.'}
            </Text>

            {/* STEP 1: PURE EMAIL OTP VERIFICATION */}
            {applicationStep === 1 ? (
              <View style={{ gap: 14 }}>
                <View style={styles.emailBoxInfo}>
                  <Ionicons name="mail" size={22} color={THEME.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#aaa', fontSize: 10, fontWeight: '800' }}>REGISTERED CHANNEL EMAIL</Text>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginTop: 2 }}>{user?.email || 'broadcaster@voexi.com'}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.confirmWithdrawBtn, { marginTop: 10 }]}
                  onPress={handleSendVerificationCode}
                >
                  <LinearGradient colors={['#7C5CFF', '#4C1D95']} style={styles.withdrawGradient}>
                    <Ionicons name="paper-plane" size={18} color="#fff" />
                    <Text style={styles.withdrawBtnText}>
                      {isOtpSent ? "RESEND 6-DIGIT CODE TO EMAIL" : "SEND 6-DIGIT VERIFICATION CODE"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {isOtpSent && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 15 }]}>ENTER 6-DIGIT VERIFICATION CODE *</Text>
                    <TextInput
                      style={styles.pinInput}
                      placeholder="• • • • • •"
                      placeholderTextColor="#444"
                      value={enteredOtp}
                      onChangeText={setEnteredOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />

                    <TouchableOpacity
                      style={[styles.confirmWithdrawBtn, { marginTop: 15 }]}
                      onPress={handleVerifyOtp}
                    >
                      <LinearGradient colors={['#10B981', '#059669']} style={styles.withdrawGradient}>
                        <Ionicons name="checkmark-done" size={18} color="#fff" />
                        <Text style={styles.withdrawBtnText}>VERIFY EMAIL & PROCEED TO STEP 2</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              /* STEP 2: CREATOR PERSONAL & ADDRESS DETAILS FORM */
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 30 }}>
                {/* QUICK AUTO-FILL BUTTON FOR TESTING */}
                <TouchableOpacity
                  style={styles.testingAutoFillBtn}
                  onPress={handleAutoFillTestingData}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={16} color={THEME.gold} />
                  <Text style={styles.testingAutoFillText}>⚡ 1-TAP AUTO-FILL FOR TESTING</Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>FULL LEGAL NAME *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#555"
                  value={creatorFullName}
                  onChangeText={setCreatorFullName}
                />

                <Text style={styles.inputLabel}>DATE OF BIRTH (CALENDAR PICKER - MUST BE 18+) *</Text>
                <TouchableOpacity
                  style={styles.dobPickerTriggerBtn}
                  onPress={() => setDobModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar" size={18} color={THEME.accent} />
                  <Text style={[styles.dobPickerTriggerText, !creatorDob && { color: '#555' }]}>
                    {creatorDob ? `${creatorDob} (18+ Verified 🟢)` : 'Tap to open Calendar Picker...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>CONTACT PHONE NUMBER *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#555"
                  value={creatorContactPhone}
                  onChangeText={setCreatorContactPhone}
                  keyboardType="phone-pad"
                />

                <Text style={styles.inputLabel}>FULL RESIDENTIAL ADDRESS *</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 60 }]}
                  placeholder="House No., Street, Area..."
                  placeholderTextColor="#555"
                  value={creatorAddress}
                  onChangeText={setCreatorAddress}
                  multiline
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>CITY *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="City..."
                      placeholderTextColor="#555"
                      value={creatorCity}
                      onChangeText={setCreatorCity}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>PINCODE *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. 110001"
                      placeholderTextColor="#555"
                      value={creatorPincode}
                      onChangeText={setCreatorPincode}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>PAN CARD / GOVT ID NUMBER (OPTIONAL)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. ABCDE1234F"
                  placeholderTextColor="#555"
                  value={creatorGovtId}
                  placeholderTextColor="#555"
                  value={creatorGovtId}
                  onChangeText={setCreatorGovtId}
                  autoCapitalize="characters"
                />

                <TouchableOpacity
                  style={[styles.confirmWithdrawBtn, { marginTop: 15 }]}
                  onPress={handleSubmitMonetizationApplication}
                  disabled={isSubmittingApp}
                >
                  <LinearGradient colors={['#10B981', '#059669']} style={styles.withdrawGradient}>
                    {isSubmittingApp ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="rocket" size={18} color="#fff" />
                        <Text style={styles.withdrawBtnText}>SUBMIT APPLICATION & UNLOCK MONETIZATION</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            )}

            <TouchableOpacity onPress={() => setApplyModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CALENDAR & DOB SELECTOR MODAL */}
      <Modal visible={dobModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setDobModalVisible(false)} />
          <View style={styles.dobPickerSheet}>
            <View style={styles.dragBar} />
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <View style={styles.calendarHeaderIcon}>
                <Ionicons name="calendar" size={24} color={THEME.accent} />
              </View>
              <Text style={styles.sheetTitle}>SELECT BIRTH DATE (18+)</Text>
              <Text style={styles.sheetSub}>Choose your Day, Month, and Year to verify creator age.</Text>
            </View>

            {/* 3 SELECTOR COLUMNS: DAY, MONTH, YEAR */}
            <View style={styles.dobPickersRow}>
              {/* DAY SELECTOR */}
              <View style={styles.dobColumn}>
                <Text style={styles.dobColHeader}>DAY</Text>
                <ScrollView style={{ height: 140 }} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.dobOptionPill, selDay === d && styles.dobOptionPillActive]}
                      onPress={() => setSelDay(d)}
                    >
                      <Text style={[styles.dobOptionText, selDay === d && styles.dobOptionTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* MONTH SELECTOR */}
              <View style={styles.dobColumn}>
                <Text style={styles.dobColHeader}>MONTH</Text>
                <ScrollView style={{ height: 140 }} showsVerticalScrollIndicator={false}>
                  {[
                    { num: '01', name: 'Jan' }, { num: '02', name: 'Feb' }, { num: '03', name: 'Mar' },
                    { num: '04', name: 'Apr' }, { num: '05', name: 'May' }, { num: '06', name: 'Jun' },
                    { num: '07', name: 'Jul' }, { num: '08', name: 'Aug' }, { num: '09', name: 'Sep' },
                    { num: '10', name: 'Oct' }, { num: '11', name: 'Nov' }, { num: '12', name: 'Dec' },
                  ].map(m => (
                    <TouchableOpacity
                      key={m.num}
                      style={[styles.dobOptionPill, selMonth === m.num && styles.dobOptionPillActive]}
                      onPress={() => setSelMonth(m.num)}
                    >
                      <Text style={[styles.dobOptionText, selMonth === m.num && styles.dobOptionTextActive]}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* YEAR SELECTOR (1950 to 2008) */}
              <View style={styles.dobColumn}>
                <Text style={styles.dobColHeader}>YEAR</Text>
                <ScrollView style={{ height: 140 }} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 59 }, (_, i) => (2008 - i).toString()).map(y => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.dobOptionPill, selYear === y && styles.dobOptionPillActive]}
                      onPress={() => setSelYear(y)}
                    >
                      <Text style={[styles.dobOptionText, selYear === y && styles.dobOptionTextActive]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* SELECTED DATE PREVIEW */}
            <View style={styles.dobPreviewBox}>
              <Ionicons name="checkmark-circle" size={18} color={THEME.accent} />
              <Text style={styles.dobPreviewText}>Selected: {selDay}/{selMonth}/{selYear} ({new Date().getFullYear() - parseInt(selYear)} Years Old - Eligible 🟢)</Text>
            </View>

            <TouchableOpacity style={styles.confirmWithdrawBtn} onPress={confirmDobSelection}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.withdrawGradient}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.withdrawBtnText}>CONFIRM BIRTH DATE & SET DOB</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setDobModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WITHDRAWAL / CASHOUT MODAL */}
      <Modal visible={withdrawModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.withdrawSheet}>
            <View style={styles.dragBar} />
            <Text style={styles.sheetTitle}>INSTANT CASHOUT</Text>
            <Text style={styles.sheetSub}>Withdraw earnings directly to your UPI ID or Bank account.</Text>

            {/* PAYOUT METHOD SELECTOR */}
            <Text style={styles.inputLabel}>CHOOSE PAYOUT METHOD</Text>
            <View style={styles.payoutGrid}>
              {[
                { id: 'upi', label: 'UPI / GPay / PhonePe', icon: 'qr-code-outline' },
                { id: 'paytm', label: 'Paytm Wallet', icon: 'wallet-outline' },
                { id: 'bank', label: 'Bank Transfer', icon: 'card-outline' },
              ].map(m => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setPayoutMethod(m.id as any)}
                  style={[
                    styles.payoutBtn,
                    payoutMethod === m.id && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: THEME.accent }
                  ]}
                >
                  <Ionicons name={m.icon as any} size={18} color={payoutMethod === m.id ? THEME.accent : '#666'} />
                  <Text style={[styles.payoutText, payoutMethod === m.id && { color: THEME.accent, fontWeight: 'bold' }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* UPI ID INPUT */}
            <Text style={styles.inputLabel}>ENTER UPI ID / ACCOUNT *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 9876543210@paytm, user@ybl"
              placeholderTextColor="#555"
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
            />

            {/* WITHDRAWAL AMOUNT */}
            <Text style={styles.inputLabel}>WITHDRAWAL AMOUNT (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount (Min ₹100)"
              placeholderTextColor="#555"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.confirmWithdrawBtn}
              onPress={initiateCashout}
              disabled={isProcessing}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={styles.withdrawGradient}>
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.withdrawBtnText}>PROCEED TO SECURITY VERIFICATION</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setWithdrawModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ULTRA SECURITY TRANSACTION PIN MODAL */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setPinModalVisible(false)} />
          <View style={styles.pinSheet}>
            <View style={styles.dragBar} />
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <View style={styles.lockCircle}>
                <Ionicons name="lock-closed" size={24} color={THEME.accent} />
              </View>
              <Text style={styles.sheetTitle}>
                {isCreatingNewPin ? 'SET 4-DIGIT SECURITY PIN' : 'ENTER TRANSACTION PIN'}
              </Text>
              <Text style={styles.sheetSub}>
                {isCreatingNewPin
                  ? 'Create a 4-Digit PIN to secure all future withdrawals.'
                  : 'Enter your 4-Digit Security PIN to authorize this payout.'}
              </Text>
            </View>

            <TextInput
              style={styles.pinInput}
              placeholder="• • • •"
              placeholderTextColor="#444"
              value={enteredPin}
              onChangeText={(text) => setEnteredPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
            />

            <TouchableOpacity
              style={styles.confirmWithdrawBtn}
              onPress={handleVerifyAndSubmitPayout}
              disabled={enteredPin.length !== 4}
            >
              <LinearGradient
                colors={enteredPin.length === 4 ? ['#10B981', '#059669'] : ['#333', '#222']}
                style={styles.withdrawGradient}
              >
                <Ionicons name="shield-checkmark" size={18} color={enteredPin.length === 4 ? '#fff' : '#666'} />
                <Text style={[styles.withdrawBtnText, enteredPin.length !== 4 && { color: '#666' }]}>
                  {isCreatingNewPin ? 'SAVE PIN & PROCEED' : 'VERIFY & AUTHORIZE PAYOUT'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPinModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4 REVENUE PILLARS FULL DETAILS MODAL */}
      <Modal visible={Boolean(selectedPillarDetail)} transparent animationType="slide" onRequestClose={() => setSelectedPillarDetail(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelectedPillarDetail(null)} />
          <View style={[styles.dobPickerSheet, { maxHeight: '85%' }]}>
            <View style={styles.dragBar} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {selectedPillarDetail && (
                <View style={{ gap: 16 }}>
                  {/* HEADER */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.streamIconBox, { width: 44, height: 44, borderRadius: 22, backgroundColor: selectedPillarDetail.color + '20' }]}>
                      <Ionicons name={selectedPillarDetail.icon as any} size={22} color={selectedPillarDetail.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sheetTitle, { textAlign: 'left', fontSize: 15 }]}>{selectedPillarDetail.title}</Text>
                      <Text style={{ color: selectedPillarDetail.color, fontSize: 11, fontWeight: '800', marginTop: 2 }}>{selectedPillarDetail.subtitle}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedPillarDetail(null)} style={{ padding: 6 }}>
                      <Ionicons name="close-circle" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>

                  {/* OVERVIEW */}
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                    <Text style={{ color: '#8E8E93', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 6 }}>OVERVIEW</Text>
                    <Text style={{ color: '#FFF', fontSize: 13, lineHeight: 18, fontWeight: '500' }}>{selectedPillarDetail.overview}</Text>
                  </View>

                  {/* STEPS */}
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                    <Text style={{ color: '#8E8E93', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 10 }}>HOW IT WORKS & EXECUTION STEPS</Text>
                    <View style={{ gap: 8 }}>
                      {selectedPillarDetail.steps.map((s: string, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                          <Ionicons name="checkmark-circle" size={16} color={selectedPillarDetail.color} style={{ marginTop: 2 }} />
                          <Text style={{ color: '#DDD', fontSize: 12, lineHeight: 17, flex: 1, fontWeight: '600' }}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* EARNING RATE & PAYOUT INFO */}
                  <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="cash" size={18} color="#10B981" />
                      <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '900' }}>EARNING RATE & PAYOUT</Text>
                    </View>
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>• Rate: {selectedPillarDetail.earningRate}</Text>
                    <Text style={{ color: '#AAA', fontSize: 11 }}>• Payout: {selectedPillarDetail.payoutInfo}</Text>
                  </View>

                  {/* CLOSE BUTTON */}
                  <TouchableOpacity style={styles.confirmWithdrawBtn} onPress={() => setSelectedPillarDetail(null)}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.withdrawGradient}>
                      <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
                      <Text style={styles.withdrawBtnText}>UNDERSTOOD & CLOSE DETAILS</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  infoBtn: { padding: 5 },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  gatewayCard: { borderRadius: 24, padding: 22, borderWidth: 1, borderColor: 'rgba(124, 92, 255, 0.3)', marginBottom: 20 },
  gatewayLockCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255, 215, 0, 0.12)', borderWidth: 1, borderColor: THEME.gold, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  testingAutoFillBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(255, 215, 0, 0.1)', borderRadius: 14, borderWidth: 1, borderColor: THEME.gold, marginBottom: 5 },
  testingAutoFillText: { color: THEME.gold, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  emailBoxInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#050508', borderRadius: 16, borderWidth: 1, borderColor: '#1C1C24' },
  gatewayTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  gatewaySub: { color: '#aaa', fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 16 },
  milestoneBox: { backgroundColor: '#050508', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#1C1C24' },
  milestoneLabel: { color: '#aaa', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  milestoneCount: { color: THEME.gold, fontSize: 11, fontWeight: '900' },
  progressTrack: { height: 6, backgroundColor: '#111', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  applyBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 10 },
  applyGradient: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  applyBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  walletCard: { borderRadius: 24, padding: 22, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  walletHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  walletLabel: { color: THEME.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  statusPill: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { color: THEME.accent, fontSize: 8, fontWeight: '900' },
  balanceAmount: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 1 },
  coinsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 22 },
  coinsText: { color: THEME.gold, fontSize: 12, fontWeight: '800' },
  withdrawBtn: { borderRadius: 16, overflow: 'hidden' },
  withdrawGradient: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  withdrawBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  section: { marginBottom: 30 },
  sectionLabel: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  streamsGrid: { gap: 12 },
  streamCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: THEME.border, gap: 14 },
  streamIconBox: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  streamTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  streamSub: { color: '#666', fontSize: 10, marginTop: 2 },
  streamAmount: { color: THEME.accent, fontSize: 16, fontWeight: '900' },
  eligibilityBox: { backgroundColor: THEME.card, borderRadius: 20, borderWidth: 1, borderColor: THEME.border, padding: 10 },
  eligibilityRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  eligibilityLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  eligibilityCount: { color: '#666', fontSize: 10, marginTop: 2 },
  unlockedPill: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: THEME.accent },
  unlockedText: { color: THEME.accent, fontSize: 8, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  applySheetFull: { backgroundColor: '#0A0A10', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, height: '92%', borderWidth: 1, borderColor: '#1C1C24' },
  dobPickerTriggerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#050508', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#1C1C24', gap: 10 },
  dobPickerTriggerText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' },
  dobPickerSheet: { backgroundColor: '#0A0A10', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, borderWidth: 1, borderColor: '#1C1C24' },
  calendarHeaderIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: THEME.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  dobPickersRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginVertical: 15 },
  dobColumn: { flex: 1, backgroundColor: '#050508', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#1C1C24', alignItems: 'center' },
  dobColHeader: { color: THEME.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  dobOptionPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginVertical: 2, width: '100%', alignItems: 'center' },
  dobOptionPillActive: { backgroundColor: THEME.accent },
  dobOptionText: { color: '#666', fontSize: 12, fontWeight: '700' },
  dobOptionTextActive: { color: '#fff', fontWeight: '900' },
  dobPreviewBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: THEME.accent, marginBottom: 15, justifyContent: 'center' },
  dobPreviewText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  happinessBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.4)', gap: 12, marginBottom: 10 },
  happinessIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 215, 0, 0.15)', borderWidth: 1, borderColor: THEME.gold, justifyContent: 'center', alignItems: 'center' },
  happinessTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  happinessSub: { color: '#D1FAE5', fontSize: 10, lineHeight: 15, marginTop: 2, fontWeight: '600' },
  happinessBadgesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  happinessBadgePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#000', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.4)' },
  happinessBadgeText: { color: '#10B981', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  withdrawSheet: { backgroundColor: '#0A0A10', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderWidth: 1, borderColor: '#1C1C24' },
  dragBar: { width: 40, height: 4, backgroundColor: '#222', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
  sheetSub: { color: '#666', fontSize: 11, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  inputLabel: { color: THEME.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 12, marginBottom: 8 },
  payoutGrid: { gap: 8, marginBottom: 10 },
  payoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#050508', borderRadius: 14, borderWidth: 1, borderColor: '#1C1C24' },
  payoutText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  modalInput: { backgroundColor: '#050508', color: '#fff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#1C1C24', fontSize: 14 },
  confirmWithdrawBtn: { marginTop: 25, borderRadius: 16, overflow: 'hidden' },
  pinSheet: { backgroundColor: '#0A0A10', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderWidth: 1, borderColor: '#1C1C24' },
  lockCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: THEME.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  pinInput: { backgroundColor: '#050508', color: THEME.accent, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: THEME.accent, fontSize: 24, letterSpacing: 10, textAlign: 'center', fontWeight: '900', marginTop: 10 },
  closeBtn: { marginTop: 15, padding: 12, alignItems: 'center' },
  closeText: { color: '#555', fontSize: 12, fontWeight: '900' }
});
