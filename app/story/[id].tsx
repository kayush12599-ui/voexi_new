import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, TextInput, Keyboard, StatusBar, Pressable, Alert, Animated, Easing, ScrollView, PanResponder, ActivityIndicator, Share, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFollow } from '../../lib/social';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function StoryViewerPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [navHintsVisible, setNavHintsVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const storyProgress = useRef(new Animated.Value(0)).current;
  const heartPopAnim = useRef(new Animated.Value(0)).current;
  const hintsOpacity = useRef(new Animated.Value(0)).current;

  const activeStory = stories[activeIndex];
  const { isFollowing, toggleFollow } = useFollow(currentUserId, activeStory?.user_id);

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const myId = sessionData?.session?.user.id || null;
      setCurrentUserId(myId);

      let storyData: any[] = [];

      if (id === 'me' && myId) {
        const { data } = await supabase.from('posts').select('*, profiles:profiles!posts_user_id_fkey(*)').eq('user_id', myId).eq('post_type', 'Story').order('created_at', { ascending: false });
        storyData = data || [];
      } else if (id && id !== 'me') {
        const { data } = await supabase.from('posts').select('*, profiles:profiles!posts_user_id_fkey(*)').eq('user_id', id).eq('post_type', 'Story').order('created_at', { ascending: false });
        storyData = data || [];
      }

      setStories(storyData.map(s => ({
        ...s,
        username: s.profiles?.username || s.username || 'user',
        avatar_url: s.profiles?.avatar_url || 'https://via.placeholder.com/200',
        verified: s.profiles?.verification_status === 'verified'
      })));
      setLoading(false);
    } catch (e) {
      console.error("Story Load Error:", e);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  useEffect(() => {
    if (stories.length > 0 && !isPaused) {
      storyProgress.setValue(0);
      Animated.timing(storyProgress, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) nextStory();
      });
    } else {
      storyProgress.stopAnimation();
    }
  }, [activeIndex, stories, isPaused]);

  const nextStory = () => {
    if (activeIndex < stories.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      router.back();
    }
  };

  const prevStory = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const handlePress = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < width * 0.3) prevStory();
    else nextStory();
  };

  const showHints = () => {
    setNavHintsVisible(true);
    Animated.timing(hintsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(hintsOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setNavHintsVisible(false));
    }, 1000);
  };

  const handleDoubleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    heartPopAnim.setValue(0);
    Animated.sequence([
      Animated.spring(heartPopAnim, { toValue: 1.2, friction: 4, useNativeDriver: true }),
      Animated.timing(heartPopAnim, { toValue: 0, duration: 200, delay: 600, useNativeDriver: true })
    ]).start();
  };

  const handleRepost = async () => {
    if (!currentUserId || !activeStory) return;
    try {
      setOptionsModalVisible(false);
      setLoading(true);

      const { error } = await supabase.from('posts').insert({
        user_id: currentUserId,
        title: `Reposted from @${activeStory.username}`,
        media_url: activeStory.media_url,
        post_type: 'Story',
        media_type: activeStory.media_type || 'video',
        thumbnail_url: activeStory.thumbnail_url || activeStory.media_url,
        visibility: 'public'
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert("SIGNAL SYNCED", `You tagged @${activeStory.username} in your station.`);
    } catch (e: any) {
      Alert.alert("Sync Error", e.message);
    } finally {
      setLoading(false);
      setIsPaused(false);
    }
  };

  const handleMention = () => {
    setOptionsModalVisible(false);
    setIsPaused(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push(`/user/${activeStory.user_id}`);
  };

  if (loading) return <View style={styles.darkContainer}><ActivityIndicator color="#7C3AED" size="large" /></View>;

  if (stories.length === 0) {
    return (
      <View style={styles.darkContainer}>
        <StatusBar hidden />
        <Ionicons name="flash-outline" size={60} color="#333" />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 15 }}>NO STORIES FOUND</Text>
        <Text style={{ color: '#666', fontSize: 12, marginTop: 5 }}>This station has no active stories.</Text>
        <TouchableOpacity style={{ marginTop: 25, backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* FULL SCREEN MEDIA */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handlePress}
        onLongPress={showHints}
        delayLongPress={150}
      >
        <Image
          source={{ uri: activeStory.media_url }}
          style={styles.fullMedia}
          contentFit="cover"
          priority="high"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFill}
        />
      </Pressable>

      {/* TOP OVERLAY */}
      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        {/* PROGRESS BARS */}
        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: index === activeIndex
                      ? storyProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                      : index < activeIndex ? '100%' : '0%'
                  }
                ]}
              />
            </View>
          ))}
        </View>

        {/* HEADER INFO */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatarBorder}>
              <Image source={{ uri: activeStory.avatar_url }} style={styles.avatar} />
            </View>
            <View style={styles.nameMeta}>
              <View style={styles.row}>
                <Text style={styles.username}>@{activeStory.username}</Text>
                {activeStory.verified && <MaterialCommunityIcons name="check-decagram" size={14} color="#7C3AED" />}
              </View>
              {activeStory.audio && (
                <View style={styles.row}>
                  <Ionicons name="musical-notes" size={10} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.audioName}>{activeStory.audio}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.headerActions} pointerEvents="auto">
            {currentUserId !== activeStory.user_id && !isFollowing && (
              <TouchableOpacity style={styles.subBtn} onPress={toggleFollow}>
                <Text style={styles.subText}>SUBSCRIBE</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setIsPaused(true);
                setOptionsModalVisible(true);
              }}
              style={styles.iconBtn}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* INTERACTION SIDEBAR */}
      <View style={styles.sidebar}>
        <TouchableOpacity style={styles.sideAction} onPress={handleDoubleTap}>
          <View style={styles.glassCircle}>
            <Ionicons name="heart" size={26} color="#fff" />
          </View>
          <Text style={styles.sideLabel}>{activeStory.likes_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction}>
          <View style={styles.glassCircle}>
            <Ionicons name="chatbubble" size={24} color="#fff" />
          </View>
          <Text style={styles.sideLabel}>{activeStory.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={() => Share.share({ url: activeStory.media_url })}>
          <View style={styles.glassCircle}>
            <Ionicons name="paper-plane" size={24} color="#fff" />
          </View>
          <Text style={styles.sideLabel}>SHARE</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM REPLY BAR */}
      {!isPaused && (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.bottomBar}
        >
            <View style={styles.replyBarGlass}>
            <View style={styles.inputWrapper}>
                <TextInput
                placeholder="Send a reaction..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.input}
                value={replyText}
                onChangeText={setReplyText}
                />
            </View>
            </View>
        </KeyboardAvoidingView>
      )}

      {/* DOUBLE TAP HEART ANIMATION */}
      <Animated.View
        pointerEvents="none"
        style={[styles.bigHeart, { transform: [{ scale: heartPopAnim }], opacity: heartPopAnim }]}
      >
        <Ionicons name="heart" size={150} color="#fff" />
      </Animated.View>

      {/* NAV HINTS */}
      {navHintsVisible && (
        <Animated.View style={[styles.navHintsContainer, { opacity: hintsOpacity }]}>
          <View style={styles.hintSection}><Text style={styles.hintTxt}>BACK</Text></View>
          <View style={styles.hintSection}><Text style={styles.hintTxt}>NEXT</Text></View>
        </Animated.View>
      )}

      {/* MORE OPTIONS MODAL */}
      <Modal visible={optionsModalVisible} transparent animationType="slide" onRequestClose={() => { setOptionsModalVisible(false); setIsPaused(false); }}>
         <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => { setOptionsModalVisible(false); setIsPaused(false); }} />
            <View style={styles.modalContent}>
               <View style={styles.dragHandle} />
               <Text style={styles.modalTitle}>STATION COMMANDS</Text>

               {currentUserId !== activeStory.user_id && (
                 <>
                   <TouchableOpacity style={styles.modalItem} onPress={handleRepost}>
                      <Text style={[styles.modalText, { color: VOEXITheme.colors.secondary }]}>Repost Signal</Text>
                      <View style={[styles.modalIconBox, { backgroundColor: 'rgba(0, 242, 254, 0.1)' }]}><MaterialCommunityIcons name="repeat-variant" size={22} color={VOEXITheme.colors.secondary} /></View>
                   </TouchableOpacity>

                   <TouchableOpacity style={styles.modalItem} onPress={handleMention}>
                      <Text style={styles.modalText}>Mention Broadcaster</Text>
                      <View style={[styles.modalIconBox, { backgroundColor: '#111' }]}><MaterialCommunityIcons name="at" size={22} color="#fff" /></View>
                   </TouchableOpacity>
                 </>
               )}

               <TouchableOpacity style={styles.modalItem} onPress={() => { setOptionsModalVisible(false); setIsPaused(false); Share.share({ url: activeStory.media_url }); }}>
                  <Text style={styles.modalText}>Share Frequency</Text>
                  <View style={[styles.modalIconBox, { backgroundColor: VOEXITheme.colors.primary }]}><Ionicons name="share-social" size={20} color="#fff" /></View>
               </TouchableOpacity>

               <TouchableOpacity style={styles.modalDivider} />
               <TouchableOpacity style={styles.modalCancel} onPress={() => { setOptionsModalVisible(false); setIsPaused(false); }}>
                  <Text style={styles.cancelText}>CLOSE</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  darkContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullMedia: { width: width, height: SCREEN_HEIGHT },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 15, zIndex: 10 },
  progressContainer: { flexDirection: 'row', gap: 4, marginTop: 10, marginBottom: 15 },
  progressBarBg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBorder: { padding: 2, borderRadius: 25, borderWidth: 1, borderColor: '#7C3AED' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  nameMeta: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  username: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  audioName: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  subText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  iconBtn: { padding: 4 },
  sidebar: { position: 'absolute', right: 15, bottom: 130, alignItems: 'center', gap: 20, zIndex: 20 },
  sideAction: { alignItems: 'center', gap: 5 },
  glassCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sideLabel: { color: '#fff', fontSize: 10, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  bottomBar: { position: 'absolute', bottom: 35, left: 15, right: 15, zIndex: 20 },
  replyBarGlass: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 25, paddingHorizontal: 15, height: 46 },
  input: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  bigHeart: { position: 'absolute', top: '35%', alignSelf: 'center', zIndex: 100 },
  navHintsContainer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 5 },
  hintSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hintTxt: { color: 'rgba(255,255,255,0.1)', fontSize: 40, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 40, backgroundColor: '#080808', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 25 },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 15, borderRadius: 2 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 },
  modalText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 },
  modalIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  modalCancel: { padding: 15, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontWeight: '900' }
});
