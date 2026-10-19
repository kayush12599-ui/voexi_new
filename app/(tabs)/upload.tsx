import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Modal, Pressable, Dimensions, StatusBar, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { uploadToBunny } from '../../lib/bunnyStorage';
import { rewardCoins } from '../../lib/earnings';
import { useLanguage } from '../../hooks/useLanguage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

const STUDIO_CONFIG = [
  { id: 'Video', num: '01', title: 'Video', desc: 'Create high-quality\nlong videos', icon: 'play-box-outline', color: '#9D50FF', isLarge: true },
  { id: 'Reels', num: '02', title: 'Reels', desc: 'Short, engaging\nvertical videos', icon: 'filmstrip', color: '#FF409C', isLarge: true },
  { id: 'Photo', num: '03', title: 'Photo', desc: 'Capture and share\nbeautiful moments', icon: 'image-outline', color: '#FF9D42', isLarge: true },
  { id: 'Sound', num: '04', title: 'Sound', desc: 'Add or create\namazing sounds', icon: 'music', color: '#4D9FFF', isLarge: false },
  { id: 'Live', num: '05', title: 'Live', desc: 'Go live and connect\nin real time', icon: 'broadcast', color: '#FF3B30', isLive: true, isLarge: false },
  { id: 'Neural Writing', num: '06', title: 'Neural\nWriting', desc: 'AI-powered writing\nfor your ideas', icon: 'brain', color: '#00F2FE', isLarge: false },
  { id: 'Story_Mini', num: '07', title: 'Story', desc: 'Share moments\nthat disappear', icon: 'creation-outline', color: '#B066FF', isLarge: false },
];

export default function StandardUpload() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLanguage();
  const [userData, setUserData] = useState<any>(null);

  const isEditMode = params.mode === 'edit';
  const [step, setStep] = useState(isEditMode ? 2 : 1);
  const [type, setType] = useState<'Video' | 'Reels' | 'Photo' | 'Sound' | 'Letter'>((params.initialType as any) || 'Video');
  const [media, setMedia] = useState<string | null>(null);
  const [title, setTitle] = useState((params.initialTitle as string) || '');
  const [description, setDescription] = useState((params.initialDescription as string) || '');
  const [loading, setLoading] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showSoundSourceModal, setShowSoundSourceModal] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioSoundRef = useRef<Audio.Sound | null>(null);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (audioSoundRef.current) {
          audioSoundRef.current.stopAsync().catch(() => {});
          audioSoundRef.current.unloadAsync().catch(() => {});
          audioSoundRef.current = null;
        }
        setIsPlayingAudio(false);
      };
    }, [])
  );

  const togglePlayAudio = async () => {
    if (!media) return;
    try {
      if (isPlayingAudio && audioSoundRef.current) {
        await audioSoundRef.current.pauseAsync();
        setIsPlayingAudio(false);
        return;
      }
      if (audioSoundRef.current) {
        await audioSoundRef.current.unloadAsync();
        audioSoundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: media },
        { shouldPlay: true, volume: 1.0 },
        (status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlayingAudio(false);
          }
        }
      );
      audioSoundRef.current = sound;
      setIsPlayingAudio(true);
    } catch (e) {
      setIsPlayingAudio(false);
      Alert.alert("Audio Error", "Unable to play selected audio file.");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        supabase.from('profiles').select('avatar_url, channel_name').eq('id', data.session.user.id).single()
          .then(({ data: profile }) => setUserData(profile));
      }
    });
  }, []);

  useEffect(() => {
    if (params.soundUrl) {
      setMedia(params.soundUrl as string);
      if (params.soundName) {
        setTitle(params.soundName as string);
      }
      setType('Sound');
      setStep(2);
    }
  }, [params.soundUrl, params.soundName]);

  useEffect(() => {
    if (params.initialType) {
      const initType = params.initialType as string;
      if (initType === 'Photo') {
        setShowSourceModal(true);
      } else if (initType === 'Sound') {
        setShowSoundSourceModal(true);
      } else if (initType === 'Neural Writing' || initType === 'Letter') {
        setType('Letter');
        setStep(2);
      }
    }
  }, [params.initialType]);

  const pickPhotoFromLibrary = async () => {
    setShowSourceModal(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setMedia(result.assets[0].uri);
        setType('Photo');
        setStep(2);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to pick image from gallery");
    }
  };

  const pickPhotoFromCamera = async () => {
    setShowSourceModal(false);
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission Required", "Camera access is needed to take a photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setMedia(result.assets[0].uri);
        setType('Photo');
        setStep(2);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to capture photo");
    }
  };

  const pickAudioFromDevice = async () => {
    setShowSoundSourceModal(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/m4a', 'audio/ogg', 'application/ogg'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        setMedia(pickedAsset.uri);
        if (pickedAsset.name) {
          const cleanName = pickedAsset.name.replace(/\.[^/.]+$/, '');
          setTitle(cleanName);
        }
        setType('Sound');
        setStep(2);
      }
    } catch (e: any) {
      try {
        const fallback = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        if (!fallback.canceled && fallback.assets && fallback.assets.length > 0) {
          const pickedAsset = fallback.assets[0];
          setMedia(pickedAsset.uri);
          if (pickedAsset.name) {
            const cleanName = pickedAsset.name.replace(/\.[^/.]+$/, '');
            setTitle(cleanName);
          }
          setType('Sound');
          setStep(2);
        }
      } catch (err: any) {
        Alert.alert("Audio Error", "Unable to load audio file from device storage.");
      }
    }
  };

  const openSoundLibrary = () => {
    setShowSoundSourceModal(false);
    router.push('/menu/sound-library');
  };

  const openAudioStudioEditor = () => {
    setShowSoundSourceModal(false);
    router.push('/studio/video-editor');
  };

  const startPicking = async (selectedType: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setType(selectedType === 'Neural Writing' ? 'Letter' : selectedType);
    if (selectedType === 'Sound') {
      setShowSoundSourceModal(true);
    } else if (selectedType === 'Video') {
      router.push('/studio/video-editor');
    } else if (selectedType === 'Reels') {
      router.push('/studio/reels-editor');
    } else if (selectedType === 'Live') {
      router.push('/studio/live-setup');
    } else if (selectedType === 'Letter' || selectedType === 'Neural Writing') {
      setType('Letter'); setStep(2);
    } else if (selectedType === 'Story' || selectedType === 'Story_Mini') {
      router.push('/studio/story-editor');
    } else {
      setShowSourceModal(true);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) return Alert.alert("Error", "Enter title");
    if (type !== 'Letter' && !media) return Alert.alert("Error", "Please select a file first");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let activeUserId = user?.id;

      if (!activeUserId) {
        const { data: sessionData } = await supabase.auth.getSession();
        activeUserId = sessionData?.session?.user?.id;
      }

      const sanitizeUUID = (inputStr: string): string => {
        if (!inputStr) return '';
        const clean = inputStr.trim().toLowerCase();
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
          return clean;
        }
        const parts = clean.split('-');
        if (parts.length === 5) {
          const p1 = parts[0].padStart(8, '0').slice(0, 8);
          const p2 = parts[1].padStart(4, '0').slice(0, 4);
          const p3 = parts[2].padStart(4, '0').slice(0, 4);
          const p4 = parts[3].padStart(4, '0').slice(0, 4);
          const p5 = parts[4].padStart(12, '0').slice(0, 12);
          const result = `${p1}-${p2}-${p3}-${p4}-${p5}`;
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result)) {
            return result;
          }
        }
        const hexOnly = clean.replace(/[^0-9a-f]/g, '');
        if (hexOnly.length >= 32) {
          return `${hexOnly.slice(0, 8)}-${hexOnly.slice(8, 12)}-${hexOnly.slice(12, 16)}-${hexOnly.slice(16, 20)}-${hexOnly.slice(20, 32)}`;
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3f | 0x80);
          return v.toString(16);
        });
      };

      const cleanUserId = sanitizeUUID(activeUserId || '');

      if (!cleanUserId) {
        setLoading(false);
        return Alert.alert("Auth Error", "Please log in again to publish content.");
      }

      const resourceType = type === 'Photo' ? 'image' : (type === 'Sound' ? 'audio' : 'video');
      const userEnteredTitle = title.trim();
      const finalTitle = userEnteredTitle.length > 0
        ? userEnteredTitle
        : `VOEXI ${type} Production`;

      const uploaderHandle = userData?.username || userData?.channel_name || 'admin_creator';
      const targetCategory = type === 'Sound' ? 'SOUNDS' : (type === 'Photo' ? 'PHOTOS' : (type === 'Reels' ? 'REELS' : 'ENTERTAINMENT'));

      const url = type !== 'Letter' ? await uploadToBunny(media!, resourceType, undefined, finalTitle, uploaderHandle, description.trim(), targetCategory) : '';

      const generateUUID = () => {
        const u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3f | 0x80);
          return v.toString(16);
        });
        return sanitizeUUID(u);
      };

      const isReelType = type === 'Reels';
      const determinedMediaType = type === 'Photo' ? 'image' : (type === 'Letter' ? 'text' : (type === 'Sound' ? 'audio' : 'video'));

      const postData = {
        id: generateUUID(),
        user_id: cleanUserId,
        title: finalTitle,
        description: description.trim(),
        media_url: url || null,
        post_type: type,
        media_type: determinedMediaType,
        is_reel: isReelType,
        width: isReelType ? 1080 : 1920,
        height: isReelType ? 1920 : 1080,
        aspect_ratio: isReelType ? 0.5625 : 1.7777,
        thumbnail_url: url || null,
        visibility: 'public',
        moderation_status: 'approved',
        created_at: new Date().toISOString(),
        views_count: 1,
        likes_count: 0,
        profiles: {
          id: cleanUserId,
          username: userData?.username || 'user',
          channel_name: userData?.channel_name || 'VOEXI Station',
          avatar_url: userData?.avatar_url || ''
        }
      };

      const { error: insertError } = await supabase.from('posts').insert({
        id: postData.id,
        user_id: postData.user_id,
        title: postData.title,
        description: postData.description,
        media_url: postData.media_url,
        post_type: postData.post_type,
        media_type: postData.media_type,
        is_reel: postData.is_reel,
        width: postData.width,
        height: postData.height,
        aspect_ratio: postData.aspect_ratio,
        thumbnail_url: postData.thumbnail_url,
        visibility: postData.visibility,
        moderation_status: postData.moderation_status,
        created_at: postData.created_at,
        views_count: postData.views_count,
        likes_count: postData.likes_count
      });

      if (insertError) {
        console.error("[SUPABASE INSERT ERROR]:", insertError.message);
      }

      // Also register sound in vx_sounds catalog if post_type is Sound
      if (type === 'Sound') {
        try {
          await supabase.from('vx_sounds').upsert({
            id: postData.id,
            user_id: postData.user_id,
            name: postData.title,
            url: postData.media_url,
            category: 'SOUNDS',
            thumbnail_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
            created_at: postData.created_at
          }, { onConflict: 'id' });
        } catch (sErr) {
          console.warn("[VX_SOUNDS INSERT FALLBACK]:", sErr);
        }
      }

      // Save to local uploads in AsyncStorage so it INSTANTLY shows up in Profile screen
      try {
        const localRaw = await AsyncStorage.getItem('@my_local_uploads');
        const existing = localRaw ? JSON.parse(localRaw) : [];
        await AsyncStorage.setItem('@my_local_uploads', JSON.stringify([postData, ...existing]));
      } catch (e) {}

      // Correct tab navigation: Reels go to Reels feed, Videos/Photos go to Home feed
      if (type === 'Reels') {
        router.replace({
          pathname: '/(tabs)/video-feed',
          params: { newReelUrl: url, newReelTitle: title.trim() }
        });
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Alert.alert("Upload Failed", e.message || "Could not publish");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* nebula background */}
      <View style={StyleSheet.absoluteFill}>
        <View style={{flex: 1, backgroundColor: '#020005'}} />
        <View style={styles.nebulaTop} />
        <View style={styles.nebulaBottom} />
      </View>

      {/* HEADER SECTION */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn}>
           <View style={styles.iconCircle}>
             <MaterialCommunityIcons name="magic-staff" size={20} color="#fff" />
           </View>
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerStudioTitle}>VOEXI <Text style={{color: '#9D50FF'}}>STUDIO</Text> ✨</Text>
          <Text style={styles.headerStudioSubtitle}>Create. Share. Inspire.</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.headerAvatarBox}>
           {userData?.avatar_url ? (
             <Image source={{ uri: userData.avatar_url }} style={styles.headerAvatar} contentFit="cover" />
           ) : (
             <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={20} color="#666" />
             </View>
           )}
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollArea}>

        {/* ROW 1: 3 CARDS */}
        <View style={styles.topGrid}>
           {STUDIO_CONFIG.slice(0, 3).map((item) => (
             <GlassStudioCard key={item.id} {...item} isLarge onPress={() => startPicking(item.id)} />
           ))}
        </View>

        {/* ROW 2: 4 CARDS */}
        <View style={styles.bottomGrid}>
           {STUDIO_CONFIG.slice(3, 7).map((item) => (
             <GlassStudioCard key={item.id} {...item} onPress={() => startPicking(item.id)} />
           ))}
        </View>

        {/* THE MASTER BANNER ANIMATED */}
        <AnimatedStoryBanner onPress={() => startPicking('Story')} />

      </ScrollView>

      {/* PHOTO SOURCE SELECTION MODAL */}
      <Modal
        visible={showSourceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSourceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSourceModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PHOTO TRANSMISSION SOURCE</Text>
            <TouchableOpacity style={styles.modalOptionBtn} onPress={pickPhotoFromCamera}>
              <Ionicons name="camera-outline" size={24} color="#A855F7" />
              <Text style={styles.modalOptionText}>Take Photo (Camera)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOptionBtn} onPress={pickPhotoFromLibrary}>
              <Ionicons name="images-outline" size={24} color="#00F2FE" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSourceModal(false)}>
              <Text style={styles.modalCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* SOUND SOURCE SELECTION MODAL */}
      <Modal
        visible={showSoundSourceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSoundSourceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSoundSourceModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>SOUND TRANSMISSION SOURCE</Text>

            <TouchableOpacity style={styles.modalOptionBtn} onPress={openSoundLibrary}>
              <Ionicons name="musical-notes-outline" size={24} color="#4D9FFF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionText}>1. Sound Studio Library</Text>
                <Text style={styles.modalOptionSub}>Browse trending music & community tracks</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOptionBtn} onPress={openAudioStudioEditor}>
              <Ionicons name="options-outline" size={24} color="#A855F7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionText}>2. Audio Studio & Dual Mixer</Text>
                <Text style={styles.modalOptionSub}>Mix original audio & background volume</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOptionBtn} onPress={pickAudioFromDevice}>
              <Ionicons name="folder-open-outline" size={24} color="#00F2FE" />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionText}>3. Phone Storage (MP3 / WAV / M4A)</Text>
                <Text style={styles.modalOptionSub}>Pick any audio file directly from device</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSoundSourceModal(false)}>
              <Text style={styles.modalCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#050505', '#000']} style={StyleSheet.absoluteFill} />
      <View style={styles.headerStep2}>
        <TouchableOpacity onPress={() => setStep(1)}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.titleStep2}>{type === 'Letter' ? 'NEURAL LETTER MODE' : `FINALIZE ${type.toUpperCase()}`}</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
        <ScrollView style={{padding: 20}} keyboardShouldPersistTaps="handled">
           {type === 'Letter' ? (
             <View style={styles.letterEditorContainer}>
                <LinearGradient colors={['#0F0524', '#000']} style={styles.letterEditorBg} />
                <View style={styles.editorField}>
                   <View style={styles.labelRow}><Text style={styles.editorLabel}>TRANSMISSION TITLE</Text><Text style={styles.microCounter}>{title.length}/100</Text></View>
                   <TextInput style={styles.letterTitleInput} placeholder="Name your broadcast..." placeholderTextColor="rgba(255,255,255,0.2)" value={title} onChangeText={setTitle} maxLength={100} />
                </View>
                <View style={styles.letterDivider} />
                <View style={[styles.editorField, { flex: 1 }]}>
                  <Text style={styles.editorLabel}>ABOUT YOUR SIGNAL / THOUGHTS</Text>
                  <TextInput style={styles.letterBodyInput} placeholder="Share your story or your thoughts with the world..." placeholderTextColor="rgba(255,255,255,0.15)" multiline value={description} onChangeText={setDescription} textAlignVertical="top" maxLength={1550} />
                </View>
             </View>
           ) : (
             <>
               <View style={styles.previewBox}>
                 <Ionicons
                   name={type === 'Sound' ? (isPlayingAudio ? "pause-circle" : "musical-notes") : (type === 'Photo' ? "image" : "videocam")}
                   size={44}
                   color={VOEXITheme.colors.primary}
                 />
                 <Text style={{color:'#fff', marginTop:8, fontSize:13, fontWeight:'bold', paddingHorizontal: 15, textAlign: 'center'}} numberOfLines={1}>
                   {media?.split('/').pop() || title || 'Selected File'}
                 </Text>

                 {type === 'Sound' && (
                   <TouchableOpacity style={styles.listenBtn} onPress={togglePlayAudio}>
                     <Ionicons name={isPlayingAudio ? "pause" : "play"} size={14} color="#fff" />
                     <Text style={styles.listenBtnText}>{isPlayingAudio ? "PAUSE PREVIEW" : "LISTEN PREVIEW"}</Text>
                   </TouchableOpacity>
                 )}

                 <TouchableOpacity
                   style={styles.changeFileBtn}
                   onPress={() => {
                     if (isPlayingAudio && audioSoundRef.current) {
                       audioSoundRef.current.pauseAsync().catch(() => {});
                       setIsPlayingAudio(false);
                     }
                     if (type === 'Sound') {
                       pickAudioFromDevice();
                     } else if (type === 'Photo') {
                       setShowSourceModal(true);
                     } else {
                       setStep(1);
                     }
                   }}
                 >
                   <Ionicons name="swap-horizontal" size={14} color="#00F2FE" />
                   <Text style={styles.changeFileBtnText}>CHANGE {type.toUpperCase()} FILE</Text>
                 </TouchableOpacity>
               </View>
               <Text style={styles.inputLabel}>{type === 'Sound' ? 'SOUND NAME' : 'TITLE'}</Text>
               <TextInput style={styles.inputStep2} placeholder="Enter name..." placeholderTextColor="#444" value={title} onChangeText={setTitle} />
               <Text style={styles.inputLabel}>DESCRIPTION</Text>
               <TextInput style={[styles.inputStep2, {height: 100, textAlignVertical: 'top'}]} placeholder="Tell your fans more..." placeholderTextColor="#444" multiline value={description} onChangeText={setDescription} />
             </>
           )}
           <TouchableOpacity style={[styles.pubBtn, loading && {opacity: 0.6}]} onPress={handlePublish} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{color: '#fff', fontWeight:'bold', letterSpacing:1}}>PUBLISH TO VOEXI</Text>}
           </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Micro-Interactions Card using Pure React Native Animated
function GlassStudioCard({ title, icon, color, onPress, isLarge, num, desc, isLive }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[styles.cardWrapper, isLarge ? styles.cardLargeDim : styles.cardSmallDim]}
    >
      <Animated.View style={[styles.glassCardBody, { transform: [{ scale: scaleAnim }], borderColor: color + 'AA' }]}>
        <LinearGradient colors={['rgba(255,255,255,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />

        <View style={styles.idxBadge}><Text style={styles.indexTxt}>{num}</Text></View>
        {isLive && <View style={styles.liveBadge}><Text style={styles.liveBadgeTxt}>LIVE</Text></View>}

        <View style={styles.sphereContainer}>
           <View style={[styles.iconInnerCircle, { borderColor: color + '44' }]}>
              <MaterialCommunityIcons name={icon as any} size={isLarge ? 34 : 24} color={color} />
           </View>
        </View>

        <View style={styles.textContainer}>
           <Text
              style={[styles.mainLabel, !isLarge && { fontSize: 10.5, lineHeight: 12 }]}
              numberOfLines={2}
           >
              {title}
           </Text>
           <Text style={styles.subLabel} numberOfLines={2}>{desc}</Text>
        </View>

        <View style={styles.chevronBox}>
           <Ionicons name="chevron-down" size={14} color={color} style={{ opacity: 0.6 }} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Micro-Interactions Story Banner using Pure React Native Animated
function AnimatedStoryBanner({ onPress }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.masterStoryBanner}
    >
      <Animated.View style={[styles.bannerContainer, { transform: [{ scale: scaleAnim }] }]}>
         <View style={styles.bannerLeftInfo}>
            <View style={styles.bannerIconBox}>
               <MaterialCommunityIcons name="magic-staff" size={20} color="#B066FF" />
            </View>
            <View style={{marginLeft: 12}}>
               <Text style={styles.bannerMainTxt}>Create Story</Text>
               <Text style={styles.bannerSubTxt}>Share your world in a story</Text>
            </View>
         </View>

         <View style={styles.centralOrbContainer}>
            <View style={styles.plusButtonCircle}>
               <Ionicons name="add" size={34} color="#fff" />
            </View>
         </View>

         <View style={styles.pillLetsGoBox}>
            <Text style={styles.letsGoLabel}>Let's Go</Text>
            <Ionicons name="chevron-forward" size={12} color="#fff" />
         </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  nebulaTop: { position: 'absolute', top: -100, left: -50, width: 400, height: 400, borderRadius: 200, backgroundColor: '#4C1D95', opacity: 0.15 },
  nebulaBottom: { position: 'absolute', bottom: 50, right: -50, width: 400, height: 400, borderRadius: 200, backgroundColor: '#100030', opacity: 0.15 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 25 },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  iconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  headerTitleBox: { alignItems: 'center' },
  headerStudioTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  headerStudioSubtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', marginTop: 4 },

  headerAvatarBox: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: '#A855F7', overflow: 'hidden', backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerAvatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A24' },

  scrollArea: { paddingBottom: 150 },
  topGrid: { flexDirection: 'row', paddingHorizontal: 12, gap: 12, marginTop: 10 },
  bottomGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginTop: 15 },

  cardWrapper: { },
  cardLargeDim: { width: (width - 48) / 3, height: 265 },
  cardSmallDim: { width: (width - 56) / 4, height: 215 },

  glassCardBody: { flex: 1, borderRadius: 32, borderWidth: 1.5, overflow: 'hidden', padding: 15, paddingBottom: 25, justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.03)' },
  idxBadge: { width: 26, height: 18, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  indexTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900' },

  liveBadge: { position: 'absolute', top: 15, right: 12, backgroundColor: '#FF3B30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveBadgeTxt: { color: '#fff', fontSize: 6, fontWeight: '900' },

  sphereContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconInnerCircle: { width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },

  textContainer: { alignItems: 'center', marginBottom: 5 },
  mainLabel: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' },
  subLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 7, fontWeight: '700', textAlign: 'center', marginTop: 6, lineHeight: 10 },
  chevronBox: { alignSelf: 'center' },

  masterStoryBanner: { marginHorizontal: 12, height: 110, borderRadius: 45, overflow: 'hidden', marginTop: 30, borderWidth: 1.5, borderColor: 'rgba(168, 85, 247, 0.4)', backgroundColor: '#020008' },
  bannerContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)' },
  bannerLeftInfo: { flexDirection: 'row', alignItems: 'center' },
  bannerIconBox: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  bannerMainTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
  bannerSubTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 'bold', marginTop: 2 },

  centralOrbContainer: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  plusButtonCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#A855F7', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 4, borderColor: '#000' },

  pillLetsGoBox: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  letsGoLabel: { color: '#fff', fontSize: 10, fontWeight: '900' },

  headerStep2: { padding: 20, flexDirection:'row', alignItems:'center', gap: 15 },
  titleStep2: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  previewBox: { minHeight: 180, backgroundColor: '#080808', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#111', padding: 15 },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(168, 85, 247, 0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: VOEXITheme.colors.primary, marginTop: 10 },
  listenBtnText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  changeFileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0, 242, 254, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.3)', marginTop: 10 },
  changeFileBtnText: { color: '#00F2FE', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  inputLabel: { color: '#444', fontSize: 10, fontWeight: '900', marginBottom: 8, marginLeft: 5 },
  inputStep2: { backgroundColor: '#080808', color: '#fff', padding: 18, borderRadius: 15, marginBottom: 30, borderWidth: 1, borderColor: '#111', fontWeight: 'bold' },
  pubBtn: { backgroundColor: VOEXITheme.colors.primary, padding: 20, borderRadius: 18, alignItems: 'center' },
  letterEditorContainer: { minHeight: 450, borderRadius: 30, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)' },
  letterEditorBg: { ...StyleSheet.absoluteFillObject, opacity: 0.8 },
  editorField: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  editorLabel: { color: '#00F2FE', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, opacity: 0.6 },
  microCounter: { color: '#333', fontSize: 8, fontWeight: 'bold' },
  letterTitleInput: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 1, padding: 0 },
  letterDivider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 20 },
  letterBodyInput: { color: '#aaa', fontSize: 16, lineHeight: 26, fontWeight: '500', minHeight: 250, padding: 0 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalContent: { width: '100%', backgroundColor: '#0A0A12', borderRadius: 28, padding: 25, borderWidth: 1.5, borderColor: 'rgba(168, 85, 247, 0.4)', alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1.5, marginBottom: 20 },
  modalOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 15, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 18, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalOptionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOptionSub: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2, fontWeight: 'bold' },
  modalCancelBtn: { marginTop: 8, paddingVertical: 12 },
  modalCancelText: { color: '#666', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});
