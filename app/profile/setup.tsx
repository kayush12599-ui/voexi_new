import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../lib/supabase';
import { uploadToBunny } from '../../lib/bunnyStorage';
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
  { id: 'Other', label: 'Other', icon: 'transgender' },
  { id: 'Prefer not to say', label: 'Secret', icon: 'eye-off' }
];

export default function ProfileSetup() {
  const router = useRouter();
  const { isLight } = useTheme();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarHasChanged, setAvatarHasChanged] = useState(false);

  // Form Fields
  const [channelName, setChannelName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [gender, setGender] = useState('Male');
  const [country, setCountry] = useState('India');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');

  // Sender profile data
  const [senderProfile, setSenderProfile] = useState<any>(null);

  // Modals State
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [editHelpOpen, setEditHelpOpen] = useState(false);
  const [optionsModalOpen, setOptionsMenuOpen] = useState(false);

  // Transfer System State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferType, setTransferType] = useState<'channel' | 'earnings' | 'diamonds' | 'category'>('channel');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [searchingRecipient, setSearchingRecipient] = useState(false);
  const [foundRecipient, setFoundRecipient] = useState<any>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setFetching(true);
      const { data: { user } } = await supabase.auth.getUser();
      let activeUserId = user?.id;

      if (!activeUserId) {
        const { data: sess } = await supabase.auth.getSession();
        activeUserId = sess?.session?.user?.id;
      }

      if (!activeUserId) {
        Alert.alert('Authentication Required', 'Please log in to edit your profile.');
        router.replace('/(auth)/login');
        return;
      }

      if (activeUserId) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', activeUserId).maybeSingle();
        if (prof) {
          setSenderProfile(prof);
          setChannelName(prof.channel_name || prof.username || '');
          setUsername(prof.username || '');
          setBio(prof.bio || '');
          setCategory(prof.category || prof.channel_category || 'Entertainment');
          setGender(prof.gender || 'Male');
          setCountry(prof.country || 'India');
          setStateName(prof.state || '');
          setDistrict(prof.district || '');
          if (prof.avatar_url) setAvatarUri(prof.avatar_url);
        }
      }
    } catch (e) {
      console.error('[ProfileSetup] Error loading profile:', e);
    } finally {
      setFetching(false);
    }
  };

  const pickAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setAvatarUri(res.assets[0].uri);
        setAvatarHasChanged(true);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const saveProfile = async () => {
    if (!channelName.trim() || !username.trim()) {
      Alert.alert('Required', 'Please fill Channel Name and Username.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let activeUserId = user?.id;

      if (!activeUserId) {
        const { data: sess } = await supabase.auth.getSession();
        activeUserId = sess?.session?.user?.id;
      }

      if (!activeUserId) throw new Error('Session Expired. Please login again.');

      const cleanUsername = username.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_.]/g, '').trim();
      let finalAvatarUrl = avatarUri;

      if (avatarUri && avatarHasChanged) {
        try {
          finalAvatarUrl = await uploadToBunny(avatarUri, 'image');
        } catch (imgErr) {
          console.warn('[ProfileSetup] Bunny avatar upload fallback:', imgErr);
        }
      }

      const updatePayload: any = {
        channel_name: channelName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        avatar_url: finalAvatarUrl,
        category: category,
        channel_category: category,
        gender: gender,
        country: country,
        state: stateName.trim(),
        district: district.trim(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('profiles').update(updatePayload).eq('id', activeUserId);

      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          throw new Error('This username is already taken. Please choose another username.');
        }
        throw new Error(error.message);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('SAVED', 'Profile and category updated successfully.');
      router.replace('/(tabs)/profile');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile.');
    } finally {
      setLoading(false);
    }
  };

  // RECIPIENT SEARCH
  const handleSearchRecipient = async () => {
    if (!recipientQuery.trim()) {
      Alert.alert('Empty Search', 'Please enter a Username, VX-ID number, or Email address.');
      return;
    }
    setSearchingRecipient(true);
    setFoundRecipient(null);
    try {
      const q = recipientQuery.trim().toLowerCase().replace('@', '');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, channel_name, avatar_url, vx_id_number, channel_balance, diamonds_balance, email')
        .or(`username.ilike.%${q}%,vx_id_number.eq.${q},email.ilike.%${q}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        Alert.alert('User Not Found', 'No VOEXI station found matching handle, VX-ID, or email.');
      } else if (data.id === senderProfile?.id) {
        Alert.alert('Self Transfer Prohibited', 'You cannot transfer assets to your own station.');
      } else {
        setFoundRecipient(data);
      }
    } catch (e: any) {
      Alert.alert('Search Error', e.message || 'Could not locate recipient station.');
    } finally {
      setSearchingRecipient(false);
    }
  };

  // EXECUTE TRANSFER
  const executeAssetTransfer = async () => {
    if (!foundRecipient) {
      Alert.alert('Recipient Missing', 'Please search and select a valid recipient profile first.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const activeUserId = user?.id || senderProfile?.id;
    if (!activeUserId) {
      Alert.alert('Session Error', 'Please log in again to complete transfer.');
      return;
    }

    setTransferLoading(true);
    try {
      if (transferType === 'earnings') {
        const amt = parseFloat(transferAmount);
        if (isNaN(amt) || amt <= 0) {
          throw new Error('Please enter a valid transfer amount in ₹ INR.');
        }
        const senderBalance = Number(senderProfile?.channel_balance || 0);
        if (amt > senderBalance) {
          throw new Error(`Insufficient earnings balance. Available: ₹${senderBalance.toFixed(2)}`);
        }

        const newSenderBal = senderBalance - amt;
        const { error: err1 } = await supabase
          .from('profiles')
          .update({ channel_balance: newSenderBal, updated_at: new Date().toISOString() })
          .eq('id', activeUserId);
        if (err1) throw err1;

        const recipBalance = Number(foundRecipient.channel_balance || 0);
        const newRecipBal = recipBalance + amt;
        const { error: err2 } = await supabase
          .from('profiles')
          .update({ channel_balance: newRecipBal, updated_at: new Date().toISOString() })
          .eq('id', foundRecipient.id);
        if (err2) throw err2;

        try {
          await supabase.from('wallets').upsert({ user_id: activeUserId, balance: newSenderBal });
          await supabase.from('wallets').upsert({ user_id: foundRecipient.id, balance: newRecipBal });
        } catch (e) {}

        try {
          await supabase.from('diamond_transactions').insert([
            { user_id: activeUserId, transaction_type: 'transfer_out', amount: amt, notes: `Transferred ₹${amt} to @${foundRecipient.username}` },
            { user_id: foundRecipient.id, transaction_type: 'transfer_in', amount: amt, notes: `Received ₹${amt} from @${senderProfile?.username}` }
          ]);
        } catch (e) {}

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert('🎉 TRANSFER COMPLETED', `₹${amt.toFixed(2)} Earnings successfully transferred to @${foundRecipient.username}!`);
        setSenderProfile((prev: any) => ({ ...prev, channel_balance: newSenderBal }));
      }
      else if (transferType === 'diamonds') {
        const amt = parseInt(transferAmount, 10);
        if (isNaN(amt) || amt <= 0) {
          throw new Error('Please enter a valid number of Diamonds.');
        }
        const senderGems = Number(senderProfile?.diamonds_balance || 0);
        if (amt > senderGems) {
          throw new Error(`Insufficient diamond balance. Available: 💎 ${senderGems}`);
        }

        const newSenderGems = senderGems - amt;
        const { error: err1 } = await supabase
          .from('profiles')
          .update({ diamonds_balance: newSenderGems, updated_at: new Date().toISOString() })
          .eq('id', activeUserId);
        if (err1) throw err1;

        const recipGems = Number(foundRecipient.diamonds_balance || 0);
        const newRecipGems = recipGems + amt;
        const { error: err2 } = await supabase
          .from('profiles')
          .update({ diamonds_balance: newRecipGems, updated_at: new Date().toISOString() })
          .eq('id', foundRecipient.id);
        if (err2) throw err2;

        try {
          await supabase.from('diamond_transactions').insert([
            { user_id: activeUserId, transaction_type: 'diamond_transfer_out', diamond_amount: amt, notes: `Gifting 💎 ${amt} to @${foundRecipient.username}` },
            { user_id: foundRecipient.id, transaction_type: 'diamond_transfer_in', diamond_amount: amt, notes: `Received 💎 ${amt} from @${senderProfile?.username}` }
          ]);
        } catch (e) {}

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert('💎 DIAMONDS TRANSFERRED', `💎 ${amt} Diamonds transferred to @${foundRecipient.username} successfully!`);
        setSenderProfile((prev: any) => ({ ...prev, diamonds_balance: newSenderGems }));
      }
      else if (transferType === 'channel') {
        const { error: err1 } = await supabase
          .from('profiles')
          .update({
            bio: `Channel ownership transfer notice issued to @${foundRecipient.username}. ${bio}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeUserId);

        if (err1) throw err1;

        try {
          await supabase.from('security_logs').insert({
            user_id: activeUserId,
            event_type: 'channel_ownership_transfer',
            details: JSON.stringify({ recipient_id: foundRecipient.id, recipient_username: foundRecipient.username })
          });
        } catch (e) {}

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert('🔄 CHANNEL TRANSFER SENT', `Station ownership notice for "${channelName}" sent to @${foundRecipient.username}!`);
      }
      else if (transferType === 'category') {
        const { error: err1 } = await supabase
          .from('profiles')
          .update({
            category: category,
            channel_category: category,
            updated_at: new Date().toISOString()
          })
          .eq('id', foundRecipient.id);

        if (err1) throw err1;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert('🏷️ CATEGORY TRANSFERRED', `Station Category "${category}" successfully transferred to @${foundRecipient.username}!`);
      }

      setTransferModalOpen(false);
      setFoundRecipient(null);
      setRecipientQuery('');
      setTransferAmount('');
    } catch (err: any) {
      Alert.alert('Transfer Failed', err.message || 'Could not execute transfer.');
    } finally {
      setTransferLoading(false);
    }
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countryQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(countryQuery.toLowerCase())
  );

  const selectedCountryObj = COUNTRIES.find(c => c.name.toLowerCase() === country.toLowerCase()) || {
    flag: '🌐',
    name: country || 'Select Country'
  };

  if (fetching) {
    return (
      <View style={[styles.loadingBox, isLight && { backgroundColor: '#fff' }]}>
        <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* HEADER WITH UPPER RIGHT 3 DOTS MENU */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backHeaderBtn}>
              <Ionicons name="arrow-back" size={20} color={isLight ? '#000' : '#fff'} />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>EDIT PROFILE</Text>

            {/* UPPER RIGHT SIDE 3 DOTS ICON BUTTON */}
            <TouchableOpacity
              onPress={() => setOptionsMenuOpen(true)}
              style={[styles.threeDotsBtn, isLight && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={isLight ? '#000' : '#fff'} />
            </TouchableOpacity>
          </View>

          {/* AVATAR */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
              <View style={[styles.avatarCircle, isLight && { backgroundColor: '#F0F0F0', borderColor: VOEXITheme.colors.primary }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                ) : (
                  <Ionicons name="person" size={48} color={isLight ? '#ccc' : '#444'} />
                )}
                <View style={styles.camBadge}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* 1. BASIC INFO */}
          <View style={[styles.cardSection, isLight && { backgroundColor: '#FAFAFA', borderColor: '#EEE' }]}>
            <Text style={styles.sectionHeader}>BASIC INFO</Text>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#555' }]}>CHANNEL NAME</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#FFF', borderColor: '#DDD' }]}>
                <Ionicons name="radio-outline" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#000' }]}
                  placeholder="Enter channel name"
                  placeholderTextColor={isLight ? '#aaa' : '#555'}
                  value={channelName}
                  onChangeText={setChannelName}
                />
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#555' }]}>USERNAME</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#FFF', borderColor: '#DDD' }]}>
                <Ionicons name="at-outline" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#000' }]}
                  placeholder="username"
                  placeholderTextColor={isLight ? '#aaa' : '#555'}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#555' }]}>STATION BIO</Text>
              <View style={[styles.inputWrapper, styles.bioWrapper, isLight && { backgroundColor: '#FFF', borderColor: '#DDD' }]}>
                <Ionicons name="document-text-outline" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 10, marginTop: 4 }} />
                <TextInput
                  style={[styles.input, styles.bioInput, isLight && { color: '#000' }]}
                  placeholder="Tell us about your station..."
                  placeholderTextColor={isLight ? '#aaa' : '#555'}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>

          {/* 2. CHANNEL CATEGORY */}
          <View style={[styles.cardSection, isLight && { backgroundColor: '#FAFAFA', borderColor: '#EEE' }]}>
            <Text style={styles.sectionHeader}>CHANNEL CATEGORY</Text>

            <View style={[styles.selectedCategoryBox, isLight && { backgroundColor: '#F0E6FF', borderColor: '#DDD' }]}>
              <Ionicons name="pricetag" size={16} color={VOEXITheme.colors.primary} />
              <Text style={[styles.selectedCategoryLabel, isLight && { color: '#555' }]}>Selected: </Text>
              <Text style={styles.selectedCategoryValue}>{category || 'Entertainment'}</Text>
            </View>

            <View style={styles.chipsWrap}>
              {CATEGORY_LIST.map((item) => {
                const active = category.toLowerCase() === item.toLowerCase();
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setCategory(item)}
                    style={[
                      styles.chipBtn,
                      isLight && { backgroundColor: '#FFF', borderColor: '#DDD' },
                      active && { backgroundColor: VOEXITheme.colors.primary, borderColor: VOEXITheme.colors.primary }
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      isLight && { color: '#444' },
                      active && { color: '#fff', fontWeight: 'bold' }
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#555' }]}>OR TYPE CUSTOM CATEGORY</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#FFF', borderColor: '#DDD' }]}>
                <Ionicons name="create-outline" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#000' }]}
                  placeholder="e.g. Vlogger, Comedy, Tech"
                  placeholderTextColor={isLight ? '#aaa' : '#555'}
                  value={category}
                  onChangeText={setCategory}
                />
              </View>
            </View>
          </View>

          {/* 3. GENDER */}
          <View style={[styles.cardSection, isLight && { backgroundColor: '#FAFAFA', borderColor: '#EEE' }]}>
            <Text style={styles.sectionHeader}>GENDER</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((g) => {
                const active = gender.toLowerCase() === g.id.toLowerCase();
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setGender(g.id)}
                    style={[
                      styles.genderCard,
                      isLight && { backgroundColor: '#FFF', borderColor: '#DDD' },
                      active && { backgroundColor: 'rgba(168,85,247,0.2)', borderColor: VOEXITheme.colors.primary }
                    ]}
                  >
                    <Ionicons
                      name={g.icon as any}
                      size={18}
                      color={active ? VOEXITheme.colors.primary : (isLight ? '#666' : '#aaa')}
                    />
                    <Text style={[
                      styles.genderText,
                      isLight && { color: '#444' },
                      active && { color: VOEXITheme.colors.primary, fontWeight: 'bold' }
                    ]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. LOCATION DETAILS */}
          <View style={[styles.cardSection, isLight && { backgroundColor: '#FAFAFA', borderColor: '#EEE' }]}>
            <Text style={styles.sectionHeader}>LOCATION DETAILS</Text>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#555' }]}>COUNTRY</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, isLight && { backgroundColor: '#FFF', borderColor: '#DDD' }]}
                onPress={() => setCountryModalOpen(true)}
              >
                <Text style={{ fontSize: 20, marginRight: 10 }}>{selectedCountryObj.flag}</Text>
                <Text style={[styles.countryText, isLight && { color: '#000' }]}>{selectedCountryObj.name}</Text>
                <Ionicons name="chevron-down" size={18} color={isLight ? '#666' : '#aaa'} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#555' }]}>STATE / REGION</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#FFF', borderColor: '#DDD' }]}>
                <Ionicons name="location-outline" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#000' }]}
                  placeholder="e.g. Maharashtra, California, London"
                  placeholderTextColor={isLight ? '#aaa' : '#555'}
                  value={stateName}
                  onChangeText={setStateName}
                />
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={[styles.label, isLight && { color: '#555' }]}>DISTRICT / CITY</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#FFF', borderColor: '#DDD' }]}>
                <Ionicons name="map-outline" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#000' }]}
                  placeholder="e.g. Mumbai, Los Angeles, Westminster"
                  placeholderTextColor={isLight ? '#aaa' : '#555'}
                  value={district}
                  onChangeText={setDistrict}
                />
              </View>
            </View>
          </View>

          {/* SAVE BUTTON */}
          <TouchableOpacity
            style={[styles.saveButton, loading && { opacity: 0.7 }]}
            onPress={saveProfile}
            disabled={loading}
          >
            <LinearGradient
              colors={['#a855f7', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGrad}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveText}>SAVE CHANGES</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* VERIFY BANNER */}
          <TouchableOpacity
            style={styles.verifyBanner}
            onPress={() => router.push('/profile/register')}
          >
            <LinearGradient colors={['#7c3aed', '#4c1d95']} style={styles.verifyGrad}>
              <Ionicons name="shield-checkmark" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyTitle}>Verify Channel</Text>
                <Text style={styles.verifyDesc}>Official badge and neural identity locking.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* 3-DOTS OPTIONS HUB MODAL (1 2 3 4 5 6 OPTIONS) */}
      <Modal visible={optionsModalOpen} animationType="slide" transparent={true}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOptionsMenuOpen(false)}
        >
          <View style={[styles.helpModalSheet, isLight && { backgroundColor: '#fff' }]}>
            <View style={styles.dragHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <LinearGradient colors={['#A855F7', '#6366F1']} style={{ width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="options" size={18} color="#fff" />
                </LinearGradient>
                <View>
                  <Text style={[styles.sheetTitle, isLight && { color: '#000' }]}>EDIT PROFILE & TRANSFER OPTIONS</Text>
                  <Text style={styles.sheetSubTitle}>Select an option below to proceed</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setOptionsMenuOpen(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={20} color={isLight ? '#000' : '#fff'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 16, paddingTop: 10 }} showsVerticalScrollIndicator={false}>

              {/* OPTION 1 */}
              <TouchableOpacity
                style={styles.optionHubCard}
                onPress={() => {
                  setOptionsMenuOpen(false);
                  router.push('/profile/transfer-ownership');
                }}
              >
                <LinearGradient colors={['#A855F7', '#7C3AED']} style={styles.optionNumBadge}>
                  <Text style={styles.optionNumText}>1</Text>
                </LinearGradient>
                <View style={styles.optionIconBox}>
                  <Ionicons name="sync-circle" size={20} color="#A855F7" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.optionHubTitle, isLight && { color: '#000' }]}>Transfer Channel Ownership</Text>
                  <Text style={styles.optionHubDesc}>Transfer station title, handle & broadcast rights to another user.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#888" />
              </TouchableOpacity>

              {/* OPTION 2 */}
              <TouchableOpacity
                style={styles.optionHubCard}
                onPress={() => {
                  setOptionsMenuOpen(false);
                  setTransferType('earnings');
                  setTransferModalOpen(true);
                }}
              >
                <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.optionNumBadge}>
                  <Text style={styles.optionNumText}>2</Text>
                </LinearGradient>
                <View style={styles.optionIconBox}>
                  <Ionicons name="cash" size={20} color="#22C55E" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.optionHubTitle, isLight && { color: '#000' }]}>Transfer Cash Earnings (₹ INR)</Text>
                  <Text style={styles.optionHubDesc}>Send channel balance (₹{senderProfile?.channel_balance || 0}) directly to another user.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#888" />
              </TouchableOpacity>

              {/* OPTION 3 */}
              <TouchableOpacity
                style={styles.optionHubCard}
                onPress={() => {
                  setOptionsMenuOpen(false);
                  setTransferType('diamonds');
                  setTransferModalOpen(true);
                }}
              >
                <LinearGradient colors={['#00F2FE', '#0284C7']} style={styles.optionNumBadge}>
                  <Text style={styles.optionNumText}>3</Text>
                </LinearGradient>
                <View style={styles.optionIconBox}>
                  <Ionicons name="diamond" size={20} color="#00F2FE" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.optionHubTitle, isLight && { color: '#000' }]}>Transfer VX-Diamonds & Coins</Text>
                  <Text style={styles.optionHubDesc}>Gift diamond gems (💎 {senderProfile?.diamonds_balance || 0}) to another broadcaster.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#888" />
              </TouchableOpacity>

              {/* OPTION 4 */}
              <TouchableOpacity
                style={styles.optionHubCard}
                onPress={() => {
                  setOptionsMenuOpen(false);
                  setTransferType('category');
                  setTransferModalOpen(true);
                }}
              >
                <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.optionNumBadge}>
                  <Text style={styles.optionNumText}>4</Text>
                </LinearGradient>
                <View style={styles.optionIconBox}>
                  <Ionicons name="pricetag" size={20} color="#EC4899" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.optionHubTitle, isLight && { color: '#000' }]}>Transfer Category & Station Style</Text>
                  <Text style={styles.optionHubDesc}>Apply your station category ("{category}") to another station.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#888" />
              </TouchableOpacity>

              {/* OPTION 5 */}
              <TouchableOpacity
                style={styles.optionHubCard}
                onPress={() => {
                  setOptionsMenuOpen(false);
                  setEditHelpOpen(true);
                }}
              >
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.optionNumBadge}>
                  <Text style={styles.optionNumText}>5</Text>
                </LinearGradient>
                <View style={styles.optionIconBox}>
                  <Ionicons name="help-circle" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.optionHubTitle, isLight && { color: '#000' }]}>Edit Profile Help & Support</Text>
                  <Text style={styles.optionHubDesc}>Learn how to update bio, avatar, category & location details.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#888" />
              </TouchableOpacity>

              {/* OPTION 6 */}
              <TouchableOpacity
                style={styles.optionHubCard}
                onPress={() => {
                  setOptionsMenuOpen(false);
                  router.push('/profile/register');
                }}
              >
                <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.optionNumBadge}>
                  <Text style={styles.optionNumText}>6</Text>
                </LinearGradient>
                <View style={styles.optionIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.optionHubTitle, isLight && { color: '#000' }]}>Verify Channel & Identity Lock</Text>
                  <Text style={styles.optionHubDesc}>Apply for official badge and Aadhaar-grade 12-digit VX-ID lock.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#888" />
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* TRANSFER EXECUTION MODAL */}
      <Modal visible={transferModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.helpModalSheet, isLight && { backgroundColor: '#fff' }]}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={
                    transferType === 'earnings' ? "cash" :
                    transferType === 'diamonds' ? "diamond" :
                    transferType === 'category' ? "pricetag" : "swap-horizontal"
                  }
                  size={20}
                  color={
                    transferType === 'earnings' ? "#22C55E" :
                    transferType === 'diamonds' ? "#00F2FE" :
                    transferType === 'category' ? "#EC4899" : "#A855F7"
                  }
                />
                <Text style={[styles.sheetTitle, isLight && { color: '#000' }]}>
                  {transferType === 'earnings' ? 'TRANSFER CASH EARNINGS' :
                   transferType === 'diamonds' ? 'TRANSFER VX-DIAMONDS' :
                   transferType === 'category' ? 'TRANSFER CATEGORY STYLE' :
                   'TRANSFER CHANNEL OWNERSHIP'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setTransferModalOpen(false); setFoundRecipient(null); }} style={styles.closeModalBtn}>
                <Ionicons name="close" size={20} color={isLight ? '#000' : '#fff'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {/* SENDER BALANCE CARD */}
              <View style={styles.senderBalanceCard}>
                <Text style={styles.senderBalLabel}>YOUR AVAILABLE ASSETS</Text>
                <View style={styles.senderBalRow}>
                  <View style={styles.balItem}>
                    <Text style={styles.balItemVal}>₹{senderProfile?.channel_balance || 0}</Text>
                    <Text style={styles.balItemKey}>Earnings</Text>
                  </View>
                  <View style={styles.balDivider} />
                  <View style={styles.balItem}>
                    <Text style={styles.balItemVal}>💎 {senderProfile?.diamonds_balance || 0}</Text>
                    <Text style={styles.balItemKey}>Diamonds</Text>
                  </View>
                </View>
              </View>

              {/* RECIPIENT SEARCH */}
              <Text style={[styles.label, { marginTop: 12 }, isLight && { color: '#555' }]}>RECIPIENT HANDLE / VX-ID / EMAIL</Text>
              <View style={[styles.inputWrapper, isLight && { backgroundColor: '#FFF', borderColor: '#DDD' }]}>
                <Ionicons name="at" size={18} color={VOEXITheme.colors.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, isLight && { color: '#000' }]}
                  placeholder="e.g. username, 12-digit VX-ID, or email"
                  placeholderTextColor={isLight ? '#aaa' : '#666'}
                  value={recipientQuery}
                  onChangeText={setRecipientQuery}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.searchRecipBtn}
                  onPress={handleSearchRecipient}
                  disabled={searchingRecipient}
                >
                  {searchingRecipient ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.searchRecipText}>SEARCH</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* RECIPIENT CARD */}
              {foundRecipient && (
                <View style={styles.foundRecipCard}>
                  <Image
                    source={{ uri: foundRecipient.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde' }}
                    style={styles.recipAvatar}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.recipName}>{foundRecipient.channel_name || 'VOEXI User'}</Text>
                    <Text style={styles.recipUser}>@{foundRecipient.username}</Text>
                    {foundRecipient.vx_id_number && (
                      <Text style={styles.recipVxId}>VX-ID: {foundRecipient.vx_id_number}</Text>
                    )}
                  </View>
                  <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                </View>
              )}

              {/* AMOUNT INPUT */}
              {(transferType === 'earnings' || transferType === 'diamonds') && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.label, isLight && { color: '#555' }]}>
                    {transferType === 'earnings' ? 'AMOUNT TO TRANSFER (₹ INR)' : 'NUMBER OF DIAMONDS (💎)'}
                  </Text>
                  <View style={[styles.inputWrapper, isLight && { backgroundColor: '#FFF', borderColor: '#DDD' }]}>
                    <Ionicons
                      name={transferType === 'earnings' ? "cash-outline" : "diamond-outline"}
                      size={18}
                      color={transferType === 'earnings' ? "#22C55E" : "#00F2FE"}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={[styles.input, isLight && { color: '#000' }]}
                      placeholder={transferType === 'earnings' ? "Enter ₹ amount" : "Enter number of diamonds"}
                      placeholderTextColor={isLight ? '#aaa' : '#666'}
                      value={transferAmount}
                      onChangeText={setTransferAmount}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              {/* CONFIRM TRANSFER BUTTON */}
              <TouchableOpacity
                style={[
                  styles.executeTransferBtn,
                  (!foundRecipient || transferLoading) && { opacity: 0.5 }
                ]}
                onPress={executeAssetTransfer}
                disabled={!foundRecipient || transferLoading}
              >
                <LinearGradient
                  colors={
                    transferType === 'earnings' ? ['#22C55E', '#16A34A'] :
                    transferType === 'diamonds' ? ['#00F2FE', '#0284C7'] :
                    ['#A855F7', '#6366F1']
                  }
                  style={styles.executeGrad}
                >
                  {transferLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={18} color="#fff" />
                      <Text style={styles.executeText}>CONFIRM & SEND TRANSFER</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* EDIT HELP MODAL */}
      <Modal visible={editHelpOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.helpModalSheet, isLight && { backgroundColor: '#fff' }]}>
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="help-circle" size={22} color="#A855F7" />
                <Text style={[styles.sheetTitle, isLight && { color: '#000' }]}>EDIT PROFILE HELP</Text>
              </View>
              <TouchableOpacity onPress={() => setEditHelpOpen(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={20} color={isLight ? '#000' : '#fff'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Text style={[styles.helpGuideSubtitle, isLight && { color: '#555' }]}>
                Need assistance editing your VOEXI station details? Follow this simple guide:
              </Text>

              <View style={styles.helpGuideItem}>
                <Ionicons name="radio" size={18} color="#A855F7" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.helpGuideItemTitle, isLight && { color: '#000' }]}>Channel Name & Username</Text>
                  <Text style={styles.helpGuideItemDesc}>Type your station broadcast title and unique handle. Usernames must be unique.</Text>
                </View>
              </View>

              <View style={styles.helpGuideItem}>
                <Ionicons name="apps" size={18} color="#EC4899" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.helpGuideItemTitle, isLight && { color: '#000' }]}>Category & Gender</Text>
                  <Text style={styles.helpGuideItemDesc}>Tap any category chip (e.g. Gaming, Music, Vibe) and select your Gender for audience targeting.</Text>
                </View>
              </View>

              <View style={styles.helpGuideItem}>
                <Ionicons name="location" size={18} color="#3B82F6" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.helpGuideItemTitle, isLight && { color: '#000' }]}>Location Details</Text>
                  <Text style={styles.helpGuideItemDesc}>Select your Country from the flag picker and type your State & District for localized monetization.</Text>
                </View>
              </View>

              <View style={styles.helpGuideItem}>
                <Ionicons name="shield-checkmark" size={18} color="#22C55E" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.helpGuideItemTitle, isLight && { color: '#000' }]}>Permanent VX-ID</Text>
                  <Text style={styles.helpGuideItemDesc}>Your 12-digit VX-ID is a permanent locked Aadhaar-grade security ID and cannot be changed.</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.contactSupportHelpBtn}
                onPress={() => {
                  setEditHelpOpen(false);
                  router.push('/menu/report');
                }}
              >
                <LinearGradient colors={['#A855F7', '#EC4899']} style={styles.contactSupportGrad}>
                  <Ionicons name="headset" size={18} color="#fff" />
                  <Text style={styles.contactSupportText}>24/7 HELP DESK & SUPPORT</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

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
                    setCountry(item.name);
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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  loadingBox: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 50
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16
  },
  backHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center'
  },
  threeDotsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 15
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#12121A',
    borderWidth: 2,
    borderColor: VOEXITheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45
  },
  camBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: VOEXITheme.colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000'
  },
  cardSection: {
    backgroundColor: '#12121A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  sectionHeader: {
    color: VOEXITheme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 14
  },
  fieldBox: {
    marginBottom: 12
  },
  label: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 1
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181824',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48
  },
  bioWrapper: {
    height: 85,
    alignItems: 'flex-start',
    paddingTop: 10
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    padding: 0
  },
  bioInput: {
    height: '100%',
    textAlignVertical: 'top'
  },
  selectedCategoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181828',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12
  },
  selectedCategoryLabel: {
    color: '#aaa',
    fontSize: 12
  },
  selectedCategoryValue: {
    color: VOEXITheme.colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#181824',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  chipText: {
    color: '#aaa',
    fontSize: 12
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8
  },
  genderCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#181824',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  genderText: {
    color: '#aaa',
    fontSize: 11
  },
  countryText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  saveButton: {
    marginTop: 6,
    borderRadius: 14,
    overflow: 'hidden'
  },
  saveGrad: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 8
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2
  },
  verifyBanner: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden'
  },
  verifyGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12
  },
  verifyTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  verifyDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end'
  },
  modalSheet: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#101018',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#181824',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 14
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    marginLeft: 8,
    fontSize: 14
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  cName: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  cCode: {
    color: '#666',
    fontSize: 12
  },

  // Options & Help Sheet Styles
  helpModalSheet: {
    width: '100%',
    backgroundColor: '#12121C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginTop: 10
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  sheetSubTitle: {
    color: '#888',
    fontSize: 10,
    marginTop: 2
  },
  helpGuideSubtitle: {
    color: '#aaa',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16
  },
  helpGuideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  helpGuideItemTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2
  },
  helpGuideItemDesc: {
    color: '#888',
    fontSize: 11,
    lineHeight: 16
  },
  contactSupportHelpBtn: {
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden'
  },
  contactSupportGrad: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 8
  },
  contactSupportText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1
  },

  // Options Hub Card Styles
  optionHubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  optionNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  optionNumText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900'
  },
  optionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  optionHubTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2
  },
  optionHubDesc: {
    color: '#888',
    fontSize: 10,
    lineHeight: 14
  },

  // Transfer System Styles
  senderBalanceCard: {
    backgroundColor: '#181828',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8
  },
  senderBalLabel: {
    color: '#A855F7',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8
  },
  senderBalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  balItem: {
    alignItems: 'center'
  },
  balItemVal: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900'
  },
  balItemKey: {
    color: '#aaa',
    fontSize: 10,
    marginTop: 2
  },
  balDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  searchRecipBtn: {
    backgroundColor: VOEXITheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8
  },
  searchRecipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900'
  },
  foundRecipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181828',
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  recipAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  recipName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  recipUser: {
    color: '#A855F7',
    fontSize: 11
  },
  recipVxId: {
    color: '#888',
    fontSize: 10,
    marginTop: 1
  },
  executeTransferBtn: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20
  },
  executeGrad: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8
  },
  executeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1
  }
});
