import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal, Alert, Dimensions, Animated, Easing, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { VOEXITheme } from '../../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video, ResizeMode } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { uploadToBunny, deleteFromBunny } from '../../../lib/bunnyStorage';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { AIService } from '../../../lib/aiService';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { NeuralAuditModal } from '../../../components/moderation/NeuralAuditModal';
import { useTheme } from '../../../hooks/useTheme';

const { width, height } = Dimensions.get('window');

const CHAT_THEMES = [
  { id: 'stealth', name: 'Stealth Black', colors: ['#000000', '#0a0a0a'], accent: '#ffffff', pattern: 'grid' },
  { id: 'heart', name: 'Heart Drive', colors: ['#ffafbd', '#ffc3a0'], accent: '#ff4d6d', pattern: 'hearts' },
  { id: 'splash', name: 'Splash Blue', colors: ['#2193b0', '#6dd5ed'], accent: '#ffffff', pattern: 'bubbles' },
  { id: 'lofi', name: 'Lo-Fi City', colors: ['#4e54c8', '#8f94fb'], accent: '#00F2FE', pattern: 'lines' },
  { id: 'foliage', name: 'Foliage', colors: ['#11998e', '#38ef7d'], accent: '#ffffff', pattern: 'leaf' },
  { id: 'sunset', name: 'Miami Heat', colors: ['#f12711', '#f5af19'], accent: '#ffffff', pattern: 'gradient' },
  { id: 'googly', name: 'Googly Eyes', colors: ['#00d2ff', '#3a7bd5'], accent: '#ffffff', pattern: 'eyes' },
  { id: 'bubbletea', name: 'Bubble Tea', colors: ['#ffefba', '#ffffff'], accent: '#d4a373', pattern: 'dots' },
];

const QUICK_REACTIONS = ['❤️', '😂', '🔥', '👏', '😮', '👍'];

const GIFTS = [
  { id: 'heart', name: 'Love Heart', icon: 'heart', color: '#ff4d6d', price: 5, premium: false },
  { id: 'fire', name: 'Hot Fire', icon: 'flame', color: '#ff9500', price: 10, premium: false },
  { id: 'diamond', name: 'Diamond', icon: 'diamond', color: '#00d2ff', price: 50, premium: true },
  { id: 'crown', name: 'Golden Crown', icon: 'ribbon', color: '#ffd700', price: 100, premium: true },
  { id: 'rocket', name: 'Rocket Ship', icon: 'rocket', color: '#A855F7', price: 250, premium: true },
  { id: 'vx_star', name: 'VX Superstar', icon: 'star', color: '#ff4081', price: 500, premium: true },
];

export default function ChatRoom() {
  const { id, type } = useLocalSearchParams();
  const { theme: themeMode, isLight } = useTheme();
  const isGroup = type === 'group';
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const channelRef = useRef<any>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [plusMenuVisible, setPlusMenuVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friend, setFriend] = useState<any>(null);
  const [isFriendOnline, setIsFriendOnline] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(CHAT_THEMES[0]);
  const [nickname, setNickname] = useState<string | null>(null);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  const [members, setMembers] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [messageOptionsVisible, setMessageOptionsVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [giftsModalVisible, setGiftsModalVisible] = useState(false);

  // Poll States
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('');
  const [pollOption2, setPollOption2] = useState('');
  const [pollOption3, setPollOption3] = useState('');
  const [pollOption4, setPollOption4] = useState('');

  const [isMuted, setIsMuted] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'video'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationIntervalRef = useRef<any>(null);

  const [recordingModalVisible, setRecordingModalVisible] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const lastTypingState = useRef(false);
  const typingTimeoutRef = useRef<any>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const formatLastSeen = (lastSeenStr: string | null, isOnline: boolean) => {
    if (isOnline) return '🟢 Active now';
    if (!lastSeenStr) return '⚪ Offline';

    const now = new Date().getTime();
    const seenTime = new Date(lastSeenStr).getTime();
    const diffMs = now - seenTime;

    if (isNaN(seenTime) || diffMs < 0) return '⚪ Offline';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '⚪ Last seen just now';
    if (diffMins < 60) return `⚪ Last seen ${diffMins}m ago`;
    if (diffHours < 24) return `⚪ Last seen ${diffHours}h ago`;
    if (diffDays === 1) return '⚪ Last seen yesterday';
    return `⚪ Last seen ${new Date(lastSeenStr).toLocaleDateString()}`;
  };

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ])
      ).start();
    } else { pulseAnim.setValue(1); }
  }, [isRecording]);

  useEffect(() => {
    setupChat();
    Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })).start();
    const interval = setInterval(markMessagesAsRead, 5000);
    return () => clearInterval(interval);
  }, [id]);

  // Presence & Database Last-Seen Heartbeat Sync
  useEffect(() => {
    if (!currentUser?.id) return;
    const updateMyLastSeen = async () => {
      try {
        const nowIso = new Date().toISOString();
        await supabase
          .from('profiles')
          .update({ last_seen: nowIso, updated_at: nowIso })
          .eq('id', currentUser.id);
      } catch (e) {}
    };

    updateMyLastSeen();
    const heartbeat = setInterval(updateMyLastSeen, 20000);
    return () => {
      clearInterval(heartbeat);
      updateMyLastSeen();
    };
  }, [currentUser?.id]);

  // Periodically Fetch Friend's Real Last-Seen Status
  useEffect(() => {
    if (!id || isGroup) return;
    const fetchFriendStatus = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, channel_name, avatar_url, last_seen')
          .eq('id', String(id))
          .maybeSingle();

        if (data) {
          setFriend((prev: any) => ({ ...prev, ...data }));
        }
      } catch (e) {}
    };

    fetchFriendStatus();
    const interval = setInterval(fetchFriendStatus, 15000);
    return () => clearInterval(interval);
  }, [id, isGroup]);

  useEffect(() => {
    if (!id || !currentUser) return;
    const chatId = isGroup ? `group_${id}` : [String(id), String(currentUser.id)].sort().join('_');
    const channelName = `realtime_prod_v11_${chatId}`;

    // Safely remove any existing subscribed channel with same topic to avoid re-subscribe error
    try {
      const activeChannels = supabase.getChannels();
      const duplicate = activeChannels.find(c => c.topic === `realtime:${channelName}`);
      if (duplicate) {
        supabase.removeChannel(duplicate);
      }
    } catch (e) {}

    const channel = supabase.channel(channelName, { config: { presence: { key: currentUser.id } } });
    channelRef.current = channel;

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p: any) => {
          const newMsg = p.new;
          if (!newMsg) return;
          const isDirectMatch = !isGroup && ((newMsg.sender_id === id && newMsg.receiver_id === currentUser.id) || (newMsg.sender_id === currentUser.id && newMsg.receiver_id === id));
          const isGroupMatch = isGroup && newMsg.group_id === id;

          if (isDirectMatch || isGroupMatch) {
            setMessages(current => {
              if (current.some(m => m.id === newMsg.id)) return current;
              const matchIdx = current.findIndex(m => m.sender_id === newMsg.sender_id && m.content === newMsg.content && String(m.id).startsWith('optimistic-'));
              if (matchIdx !== -1) {
                const next = [...current]; next[matchIdx] = { ...newMsg, status: 'sent' }; return next;
              }
              const newList = [...current, newMsg];
              const uniqueList = newList.filter((msg, index, self) => index === self.findIndex((t) => t.id === msg.id));
              AsyncStorage.setItem(`@cached_chat_history_${id}`, JSON.stringify(uniqueList)).catch(() => {});
              return uniqueList;
            });
            if (newMsg.sender_id !== currentUser.id) markMessagesAsRead();
          }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (p: any) => {
          const updatedMsg = p.new;
          if (updatedMsg.deleted_for && updatedMsg.deleted_for.includes(currentUser?.id)) {
            setMessages(current => current.filter(m => m.id !== updatedMsg.id));
          } else {
            setMessages(current => current.map(m => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m)));
          }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p: any) => {
          setMessages(current => current.filter(m => m.id !== p.old.id));
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.values(state).flat();
        setIsFriendOnline(onlineUsers.some((u: any) => u.user_id === id));
        const typing = onlineUsers.filter((u: any) => u.is_typing === true && u.user_id !== currentUser.id).map((u: any) => u.username || 'Agent');
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUser.id, username: currentUser.user_metadata?.username || 'Agent', is_typing: false, online_at: new Date().toISOString() }).catch(() => {});
        }
      });

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [id, currentUser?.id]);

  const markMessagesAsRead = async () => {
    if (!currentUser || !id) return;
    try {
      if (isGroup) {
        await supabase.from('messages').update({ is_read: true }).eq('group_id', id).neq('sender_id', currentUser.id).eq('is_read', false);
      } else {
        await supabase.from('messages').update({ is_read: true }).eq('receiver_id', currentUser.id).eq('sender_id', id).eq('is_read', false);
      }
    } catch (e) {}
  };

  const setupChat = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    setCurrentUser(user);

    if (user) {
      setLoading(true);
      const cacheKey = `@cached_chat_history_${id}`;
      try {
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        if (cachedRaw) setMessages(JSON.parse(cachedRaw));
      } catch (e) {}

      try {
        let query = supabase.from('messages').select('*, profiles:sender_id(username, avatar_url)');
        if (isGroup) {
           const { data: groupData } = await supabase.from('groups').select('*').eq('id', String(id)).maybeSingle();
           if (groupData) {
             setFriend(groupData);
           } else {
             setFriend({ name: 'Cluster Hub', type: 'public' });
           }
           const { data: mems } = await supabase.from('group_members').select('*, profiles:user_id(username, avatar_url)').eq('group_id', String(id));
           if (mems) setMembers(mems);
           query = query.eq('group_id', String(id));
        } else {
           const { data: friendData } = await supabase.from('profiles').select('*, last_seen').eq('id', String(id)).maybeSingle();
           if (friendData) setFriend(friendData);
           query = query.is('group_id', null).or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`);
        }

        const { data: history } = await query.order('created_at', { ascending: true });
        if (history) {
          const activeMsgs = history.filter(m => !m.deleted_for || !m.deleted_for.includes(user.id));
          setMessages(activeMsgs);
          AsyncStorage.setItem(cacheKey, JSON.stringify(activeMsgs)).catch(() => {});
        }
        loadSavedTheme();
        loadNickname();
        loadMuteStatus();
      } catch (e) {}
      setLoading(false);
      markMessagesAsRead();
    }
  };

  const loadSavedTheme = async () => {
    try {
      const savedThemeId = await AsyncStorage.getItem(`chat_theme_${id}`);
      if (savedThemeId) {
        const theme = CHAT_THEMES.find(t => t.id === savedThemeId);
        if (theme) setSelectedTheme(theme);
      }
    } catch (e) {}
  };

  const loadNickname = async () => {
    try {
      const savedNickname = await AsyncStorage.getItem(`chat_nickname_${id}`);
      if (savedNickname) { setNickname(savedNickname); setNewNickname(savedNickname); }
    } catch (e) {}
  };

  const loadMuteStatus = async () => {
    try {
      const muted = await AsyncStorage.getItem(`chat_muted_${id}`);
      setIsMuted(muted === 'true');
    } catch (e) {}
  };

  const toggleMute = async () => {
    try {
      const newStatus = !isMuted;
      setIsMuted(newStatus);
      await AsyncStorage.setItem(`chat_muted_${id}`, String(newStatus));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
  };

  const saveTheme = async (theme: typeof CHAT_THEMES[0]) => {
    try { setSelectedTheme(theme); await AsyncStorage.setItem(`chat_theme_${id}`, theme.id); } catch (e) {}
  };

  const handleSaveNickname = async () => {
    try {
      const trimmed = newNickname.trim();
      if (trimmed) { await AsyncStorage.setItem(`chat_nickname_${id}`, trimmed); setNickname(trimmed); }
      else { await AsyncStorage.removeItem(`chat_nickname_${id}`); setNickname(null); }
      setNicknameModalVisible(false);
    } catch (e) {}
  };

  const clearChatHistory = async () => {
    Alert.alert(
      "PURGE SPECTRUM",
      "WARNING: This will permanently erase ALL signals from the server for BOTH agents. Proceed?",
      [
        { text: "ABORT", style: 'cancel' },
        {
          text: "PERMANENT PURGE",
          style: "destructive",
          onPress: async () => {
            try {
               setMessages([]);
               const { error } = await supabase.rpc('purge_conversation_permanently', {
                 curr_user_id: currentUser.id,
                 target_id: String(id),
                 is_group_chat: isGroup
               });

               if (error) {
                 Alert.alert("System Failure", `Database rejected purge: ${error.message}`);
                 setupChat();
               } else {
                 Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
               }
            } catch (e: any) {
               Alert.alert("Error", "Could not purge server signals.");
               setupChat();
            }
          }
        }
      ]
    );
  };

  const sendMessage = async (content: string, type = 'text', isViewOnce = false) => {
    if (!content.trim() || !currentUser) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (channelRef.current) channelRef.current.track({ user_id: currentUser.id, is_typing: false });

    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: any = { id: tempId, sender_id: currentUser.id, group_id: isGroup ? id : null, receiver_id: isGroup ? null : id, content: content.trim(), type, created_at: new Date().toISOString(), status: 'sending', is_view_once: isViewOnce };

    setMessages(current => {
      const next = [...current, optimisticMsg];
      AsyncStorage.setItem(`@cached_chat_history_${id}`, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setInputText('');
    setReplyingTo(null);

    const messageData = { sender_id: currentUser.id, content: content.trim(), type, is_view_once: isViewOnce, parent_id: replyingTo?.id || null };
    if (isGroup) Object.assign(messageData, { group_id: String(id) });
    else Object.assign(messageData, { receiver_id: String(id) });

    const { data, error } = await supabase.from('messages').insert(messageData).select().single();
    if (data) {
      setMessages(current => {
        const updated = current.map(m => m.id === tempId ? { ...data, status: 'sent' } : m);
        AsyncStorage.setItem(`@cached_chat_history_${id}`, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } else if (error) {
      setMessages(current => current.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
    }
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (!channelRef.current || !currentUser) return;
    const isTypingNow = text.trim().length > 0;
    if (isTypingNow !== lastTypingState.current) {
      lastTypingState.current = isTypingNow;
      channelRef.current.track({ user_id: currentUser.id, is_typing: isTypingNow, username: currentUser.user_metadata?.username || 'Agent' });
    }
    if (isTypingNow) {
       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
       typingTimeoutRef.current = setTimeout(() => {
          lastTypingState.current = false;
          channelRef.current.track({ user_id: currentUser.id, is_typing: false });
       }, 3000);
    }
  };

  const handleDeleteAction = (msg: any) => {
    if (!msg || !currentUser) return;
    setMessageOptionsVisible(false);
    const isMyMessage = msg.sender_id === currentUser.id;
    const isOptimistic = String(msg.id).startsWith('optimistic-');

    const options = [
      { text: "CANCEL", style: 'cancel' as any },
      { text: "DELETE FOR ME", onPress: async () => {
          setMessages(current => current.filter(m => m.id !== msg.id));
          if (!isOptimistic) {
            await supabase.from('messages').update({
               deleted_for: Array.from(new Set([...(msg.deleted_for || []), currentUser.id]))
            }).eq('id', msg.id);
          }
      }}
    ];

    if (isMyMessage) {
      options.push({ text: "DELETE FOR EVERYONE", style: 'destructive' as any, onPress: async () => {
          try {
            setMessages(current => current.filter(m => m.id !== msg.id));
            if (!isOptimistic) {
               if (['image', 'video', 'voice'].includes(msg.type)) deleteFromBunny(msg.content).catch(() => {});
               const { error } = await supabase.from('messages').delete().eq('id', msg.id);
               if (error) throw error;
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {
            Alert.alert("Action Failed", "Database error or RLS policy block.");
          }
      }});
    }
    Alert.alert("ERASE SIGNAL", "How do you want to remove this transmission?", options);
  };

  const myMemberRecord = members.find(m => m.user_id === currentUser?.id);
  const isLeader = !isGroup || (friend?.created_by === currentUser?.id) || (myMemberRecord?.role === 'leader') || (myMemberRecord?.tier === 'diamond');

  const isModuleEnabled = (modId: string) => {
    if (!isGroup || isLeader) return true; // LEADERS BYPASS ALL MODULE RESTRICTIONS!
    const activeFeatures = friend?.features || ['polls', 'ai_bot', 'voice', 'media', 'gifts', 'sounds', 'view_once', 'reactions'];
    return activeFeatures.includes(modId);
  };

  const handleDisabledModuleNotice = (moduleName: string) => {
    Alert.alert(
      "MODULE RESTRICTED",
      `The Cluster Leader has disabled ${moduleName} for members in this cluster.`
    );
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!isModuleEnabled('reactions')) {
      return handleDisabledModuleNotice('Signal Reactions');
    }
    if (!currentUser) return;
    setMessages(current => current.map(m => m.id === messageId ? { ...m, reactions: { ...(m.reactions || {}), [currentUser.id]: emoji } } : m));
    setMessageOptionsVisible(false);
  };

  const startDurationCounter = () => {
    stopDurationCounter();
    setRecordingDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopDurationCounter = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startVoiceRecording = async () => {
    if (!isModuleEnabled('voice')) {
      return handleDisabledModuleNotice('Voice Signals');
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false, shouldRouteThroughEarpieceAndroid: false });
      if (recordingRef.current) { try { await recordingRef.current.stopAndUnloadAsync(); } catch(e) {} recordingRef.current = null; }
      setIsRecording(true);
      setRecordingModalVisible(true);
      startDurationCounter();
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
    } catch (err) { setIsRecording(false); setRecordingModalVisible(false); }
  };

  const stopVoiceRecording = async (send = true) => {
    if (!isRecording) return;
    setIsRecording(false);
    setRecordingModalVisible(false);
    stopDurationCounter();
    setTimeout(async () => {
        if (!recordingRef.current) return;
        try {
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;
            if (uri && send) {
              setIsUploading(true);
              const url = await uploadToBunny(uri, 'audio');
              await sendMessage(url, 'voice');
              setIsUploading(false);
            }
        } catch (e) { recordingRef.current = null; setIsUploading(false); }
    }, 200);
  };

  const playVoiceMessage = async (url: string, msgId: string) => {
    try {
      if (playingVoiceId === msgId && soundRef.current) { await soundRef.current.pauseAsync(); setPlayingVoiceId(null); return; }
      if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
      setPlayingVoiceId(msgId);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: true, shouldRouteThroughEarpieceAndroid: false });
      const { sound } = await Audio.Sound.createAsync({ uri: url, overrideExtension: 'm4a' }, { shouldPlay: true }, (status: any) => { if (status.didJustFinish) setPlayingVoiceId(null); });
      soundRef.current = sound;
    } catch (e) { setPlayingVoiceId(null); }
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || !pollOption1.trim() || !pollOption2.trim()) {
      return Alert.alert("Required", "Please provide a question and at least 2 choices.");
    }

    const options = [pollOption1.trim(), pollOption2.trim()];
    if (pollOption3.trim()) options.push(pollOption3.trim());
    if (pollOption4.trim()) options.push(pollOption4.trim());

    const pollData = JSON.stringify({
      question: pollQuestion.trim(),
      options,
      votes: {}
    });

    setPollModalVisible(false);
    setPollQuestion('');
    setPollOption1('');
    setPollOption2('');
    setPollOption3('');
    setPollOption4('');

    await sendMessage(pollData, 'poll');
  };

  const handleVotePoll = async (msg: any, optionIndex: number) => {
    if (!currentUser) return;
    try {
      let parsed = JSON.parse(msg.content);
      const votes = parsed.votes || {};

      Object.keys(votes).forEach(opt => {
        votes[opt] = (votes[opt] || []).filter((uId: string) => uId !== currentUser.id);
      });

      votes[optionIndex] = Array.from(new Set([...(votes[optionIndex] || []), currentUser.id]));
      parsed.votes = votes;

      const newContent = JSON.stringify(parsed);
      setMessages(current => current.map(m => m.id === msg.id ? { ...m, content: newContent } : m));
      await supabase.from('messages').update({ content: newContent }).eq('id', msg.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.error("[POLL_VOTE_ERROR]", e);
    }
  };

  const pickMedia = async (type: 'image' | 'video', isViewOnce: boolean) => {
    setPlusMenuVisible(false);
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos, allowsEditing: true, quality: 0.6 });
    if (!result.canceled) { setIsUploading(true); try { const url = await uploadToBunny(result.assets[0].uri, type); await sendMessage(url, type, isViewOnce); } catch (e) {} finally { setIsUploading(false); } }
  };

  const handleSendGift = async (gift: any) => {
    if (!currentUser) return;
    setGiftsModalVisible(false);
    try {
       const giftPayload = JSON.stringify({ giftId: gift.id, name: gift.name, icon: gift.icon, color: gift.color, price: gift.price });
       await sendMessage(giftPayload, 'gift');
    } catch (e) {}
  };

  const processedMessages = useMemo(() => {
    const msgs: any[] = [];
    let lastDate = '';
    [...messages].forEach((msg) => {
      const date = new Date(msg.created_at).toLocaleDateString();
      if (date !== lastDate) {
        msgs.push({ isDate: true, date: date === new Date().toLocaleDateString() ? 'TODAY' : date, id: `date-${msg.created_at}` });
        lastDate = date;
      }
      msgs.push(msg);
    });
    return msgs.reverse();
  }, [messages]);

  const renderMessage = ({ item }: { item: any }) => {
    if (item.isDate) return <View style={styles.dateSeparator}><Text style={styles.dateText}>{item.date}</Text></View>;
    const isMine = item.sender_id === currentUser?.id;
    const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const clusterColor = selectedTheme.accent;

    return (
      <View style={[styles.messageRow, isMine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        <TouchableOpacity
          style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}
          onLongPress={() => { setSelectedMessage(item); setMessageOptionsVisible(true); }}
          onPress={() => { if (item.type === 'voice') playVoiceMessage(item.content, item.id); }}
        >
          {isMine && <LinearGradient colors={[clusterColor, clusterColor + 'CC']} style={styles.myBubbleGradient} />}
          {item.type === 'collab_invite' || (item.content && typeof item.content === 'string' && item.content.includes("COLLABORATION INVITE")) ? (
            (() => {
              let collabData: any = { title: 'Reel Transmission', reelId: '', mediaUrl: '', status: 'pending' };
              try {
                if (item.content && item.content.startsWith('{')) {
                  collabData = JSON.parse(item.content);
                } else if (item.content) {
                  const titleMatch = item.content.match(/"([^"]+)"/);
                  if (titleMatch) collabData.title = titleMatch[1];
                }
              } catch (e) {}

              const handleAcceptInChat = async () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                if (collabData.reelId) {
                  try {
                    await supabase
                      .from('posts')
                      .update({ collab_status: 'accepted' })
                      .eq('id', collabData.reelId);
                  } catch (e) {}
                }
                Alert.alert("COLLABORATION ACCEPTED! 🟢", "You are now an official co-creator on this Reel!");
              };

              const handleDeclineInChat = async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                Alert.alert("COLLABORATION DECLINED 🔴", "You declined the invite.");
              };

              return (
                <View style={{ width: 230, paddingVertical: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Ionicons name="people" size={18} color="#00F2FE" />
                    <Text style={{ color: '#00F2FE', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
                      REEL COLLAB INVITE 🤝
                    </Text>
                  </View>

                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 12 }}>
                    "{collabData.title || 'VOEXI Reel Production'}"
                  </Text>

                  {!isMine && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <TouchableOpacity
                        onPress={handleAcceptInChat}
                        style={{ flex: 1, backgroundColor: 'rgba(0,255,102,0.2)', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#00FF66', alignItems: 'center' }}
                      >
                        <Text style={{ color: '#00FF66', fontSize: 10, fontWeight: '900' }}>ACCEPT 🟢</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleDeclineInChat}
                        style={{ flex: 1, backgroundColor: 'rgba(255,59,48,0.2)', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#FF3B30', alignItems: 'center' }}
                      >
                        <Text style={{ color: '#FF3B30', fontSize: 10, fontWeight: '900' }}>DECLINE 🔴</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })()
          ) : item.type === 'text' ? (
            <Text style={[styles.messageText, { color: '#fff' }]}>{item.content}</Text>
          ) : item.type === 'voice' ? (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
              <Ionicons name={playingVoiceId === item.id ? "pause" : "play"} size={20} color="#fff" />
              <Text style={{color: '#fff', fontSize: 12}}>NEURAL AUDIO</Text>
            </View>
          ) : item.type === 'video' || item.type === 'video_note' ? (
            <Video source={{ uri: item.content }} style={{ width: 220, height: 220, borderRadius: 12 }} useNativeControls resizeMode={ResizeMode.COVER} isLooping />
          ) : item.type === 'gift' ? (
            <View style={{alignItems: 'center'}}>
               <Ionicons name="gift" size={40} color="#FFD700" />
               <Text style={{color: '#fff', fontSize: 12}}>VIRTUAL GIFT</Text>
            </View>
          ) : item.type === 'poll' ? (
            (() => {
              let parsedPoll: any = { question: 'Poll', options: [], votes: {} };
              try { parsedPoll = JSON.parse(item.content); } catch (e) {}

              const totalVotes = Object.values(parsedPoll.votes || {}).reduce((acc: number, arr: any) => acc + (arr?.length || 0), 0) as number;

              return (
                <View style={{ width: 220, paddingVertical: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Ionicons name="stats-chart" size={18} color="#00D4FF" />
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', flex: 1 }}>
                      {parsedPoll.question}
                    </Text>
                  </View>

                  {parsedPoll.options.map((optText: string, optIdx: number) => {
                    const optionVotes = (parsedPoll.votes?.[optIdx] || []).length;
                    const percent = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                    const hasVoted = (parsedPoll.votes?.[optIdx] || []).includes(currentUser?.id);

                    return (
                      <TouchableOpacity
                        key={optIdx}
                        onPress={() => handleVotePoll(item, optIdx)}
                        style={{
                          marginBottom: 8,
                          padding: 10,
                          borderRadius: 12,
                          backgroundColor: hasVoted ? 'rgba(124, 92, 255, 0.35)' : 'rgba(255,255,255,0.06)',
                          borderWidth: 1,
                          borderColor: hasVoted ? '#7C5CFF' : 'rgba(255,255,255,0.1)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 0,
                            width: `${percent}%`,
                            backgroundColor: 'rgba(124, 92, 255, 0.25)'
                          }}
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 }}>
                            {optText}
                          </Text>
                          <Text style={{ color: '#aaa', fontSize: 10, fontWeight: 'bold', marginLeft: 8 }}>
                            {percent}% ({optionVotes})
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <Text style={{ color: '#888', fontSize: 8, fontWeight: 'bold', marginTop: 4, textAlign: 'right', letterSpacing: 0.5 }}>
                    {totalVotes} VOTES TOTAL
                  </Text>
                </View>
              );
            })()
          ) : (
            <Image source={{ uri: item.content }} style={{ width: 220, height: 220, borderRadius: 12 }} />
          )}
          <View style={styles.msgInfo}>
             <Text style={styles.msgTime}>{time}</Text>
             {isMine && (
               item.status === 'sending'
                ? <Ionicons name="time" size={10} color="rgba(255,255,255,0.4)" style={{marginLeft: 4}} />
                : <Ionicons name={item.is_read ? "checkmark-done" : "checkmark"} size={12} color="#00F2FE" style={{marginLeft: 4}} />
             )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={selectedTheme.colors} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['top']} style={{backgroundColor: 'rgba(0,0,0,0.8)'}}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (isGroup) {
                  router.push({ pathname: '/menu/cluster-settings', params: { clusterId: String(id) } });
                } else if (friend?.id) {
                  router.push(`/user/${friend.id}`);
                }
              }}
              style={{flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10}}
              activeOpacity={0.7}
            >
                <Image source={{ uri: friend?.avatar_url || 'https://via.placeholder.com/100' }} style={styles.headerAvatar} />
                <View style={{flex: 1, marginLeft: 10}}>
                    <Text style={styles.headerName} numberOfLines={1}>
                      {nickname || friend?.name || friend?.channel_name || friend?.username || (isGroup ? 'Community Room' : 'VOEXI User')}
                    </Text>
                    <Text style={[styles.onlineStatus, { color: isGroup ? '#00F2FE' : (isFriendOnline ? '#00C851' : '#64748B') }]}>
                      {typingUsers.length > 0
                        ? '✍️ typing...'
                        : (isGroup
                            ? `${members.length || 1} Members Active • Tap for Info`
                            : formatLastSeen(friend?.last_seen, isFriendOnline))
                      }
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 5 }} />
            </TouchableOpacity>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 15}}>
               <TouchableOpacity onPress={() => setMenuVisible(true)}><Ionicons name="ellipsis-vertical" size={22} color="#fff" /></TouchableOpacity>
            </View>
        </View>
      </SafeAreaView>

      <FlatList ref={flatListRef} data={processedMessages} inverted keyExtractor={(item) => item.id.toString()} renderItem={renderMessage} contentContainerStyle={{ padding: 15 }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputArea}>
          <TouchableOpacity onPress={() => setPlusMenuVisible(true)} style={{ padding: 4 }}>
            <Ionicons name="add-circle" size={30} color={selectedTheme.accent} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleTyping}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            multiline
          />
          <TouchableOpacity onPress={startVoiceRecording} style={{ padding: 6 }}>
            <Ionicons name="mic" size={24} color={selectedTheme.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => sendMessage(inputText)}
            activeOpacity={0.7}
            style={[
              styles.sendCircleBtn,
              { backgroundColor: selectedTheme.accent }
            ]}
          >
            <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* MODALS */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.optionsSheet}>
            <View style={styles.dragBar} />
            <Text style={styles.sheetTitle}>CHAT OPTIONS</Text>
            <View style={styles.menuGrid}>
              <TouchableOpacity style={styles.menuGridItem} onPress={() => { setThemeModalVisible(true); setMenuVisible(false); }}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#3B82F6' }]}><Ionicons name="color-palette" size={22} color="#fff" /></View>
                <Text style={styles.menuGridText}>Theme</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuGridItem} onPress={() => { setNicknameModalVisible(true); setMenuVisible(false); }}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#10B981' }]}><Ionicons name="pencil" size={22} color="#fff" /></View>
                <Text style={styles.menuGridText}>Nickname</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuGridItem} onPress={() => { toggleMute(); setMenuVisible(false); }}>
                <View style={[styles.menuIconCircle, { backgroundColor: isMuted ? '#6B7280' : '#F59E0B' }]}><Ionicons name={isMuted ? "notifications-off" : "notifications"} size={22} color="#fff" /></View>
                <Text style={styles.menuGridText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuGridItem} onPress={() => { clearChatHistory(); setMenuVisible(false); }}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#EF4444' }]}><Ionicons name="trash" size={22} color="#fff" /></View>
                <Text style={styles.menuGridText}>Purge</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sheetDivider} />
            {isGroup && (
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  setMenuVisible(false);
                  router.push({ pathname: '/menu/cluster-settings', params: { clusterId: String(id) } });
                }}
              >
                <Ionicons name="document-text-outline" size={20} color="#7C5CFF" />
                <Text style={styles.sheetText}>Cluster Rules & Info</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.sheetItem} onPress={() => { setMenuVisible(false); }}>
              <Ionicons name="ban" size={20} color="#ff4444" />
              <Text style={[styles.sheetText, {color: '#ff4444'}]}>{isGroup ? 'Leave Cluster' : 'Block User'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeBtn}><Text style={styles.closeText}>CANCEL</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={plusMenuVisible} transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={() => setPlusMenuVisible(false)}>
            <View style={styles.plusSheet}>
              <View style={styles.dragBar} /><Text style={styles.plusTitle}>SEND CONTENT</Text>
              <View style={styles.plusGrid}>
                {/* GALLERY */}
                <TouchableOpacity
                  style={styles.plusItem}
                  onPress={() => {
                    if (!isModuleEnabled('media')) return handleDisabledModuleNotice('Ultra Media Gallery');
                    pickMedia('image', false);
                  }}
                >
                  <View style={[styles.plusIcon, { backgroundColor: isModuleEnabled('media') ? '#2196F3' : '#222' }]}>
                    <Ionicons name="image" size={28} color={isModuleEnabled('media') ? '#fff' : '#666'} />
                    {!isModuleEnabled('media') && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={10} color="#ff4444" /></View>}
                  </View>
                  <Text style={[styles.plusText, !isModuleEnabled('media') && { color: '#666' }]}>GALLERY</Text>
                </TouchableOpacity>

                {/* VIDEO */}
                <TouchableOpacity
                  style={styles.plusItem}
                  onPress={() => {
                    if (!isModuleEnabled('media')) return handleDisabledModuleNotice('Ultra Media Gallery');
                    pickMedia('video', false);
                  }}
                >
                  <View style={[styles.plusIcon, { backgroundColor: isModuleEnabled('media') ? '#9C27B0' : '#222' }]}>
                    <Ionicons name="videocam" size={28} color={isModuleEnabled('media') ? '#fff' : '#666'} />
                    {!isModuleEnabled('media') && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={10} color="#ff4444" /></View>}
                  </View>
                  <Text style={[styles.plusText, !isModuleEnabled('media') && { color: '#666' }]}>VIDEO</Text>
                </TouchableOpacity>

                {/* V-ONCE PHOTO */}
                <TouchableOpacity
                  style={styles.plusItem}
                  onPress={() => {
                    if (!isModuleEnabled('view_once')) return handleDisabledModuleNotice('View-Once Signals');
                    pickMedia('image', true);
                  }}
                >
                  <View style={[styles.plusIcon, { backgroundColor: isModuleEnabled('view_once') ? '#00BCD4' : '#222' }]}>
                    <Ionicons name="eye" size={28} color={isModuleEnabled('view_once') ? '#fff' : '#666'} />
                    {!isModuleEnabled('view_once') && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={10} color="#ff4444" /></View>}
                  </View>
                  <Text style={[styles.plusText, !isModuleEnabled('view_once') && { color: '#666' }]}>V-ONCE</Text>
                </TouchableOpacity>

                {/* V-ONCE VID */}
                <TouchableOpacity
                  style={styles.plusItem}
                  onPress={() => {
                    if (!isModuleEnabled('view_once')) return handleDisabledModuleNotice('View-Once Signals');
                    pickMedia('video', true);
                  }}
                >
                  <View style={[styles.plusIcon, { backgroundColor: isModuleEnabled('view_once') ? '#FF9800' : '#222' }]}>
                    <Ionicons name="flash" size={28} color={isModuleEnabled('view_once') ? '#fff' : '#666'} />
                    {!isModuleEnabled('view_once') && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={10} color="#ff4444" /></View>}
                  </View>
                  <Text style={[styles.plusText, !isModuleEnabled('view_once') && { color: '#666' }]}>V-ONCE VID</Text>
                </TouchableOpacity>

                {/* SOUNDS */}
                <TouchableOpacity
                  style={styles.plusItem}
                  onPress={() => {
                    if (!isModuleEnabled('sounds')) return handleDisabledModuleNotice('Sound Library');
                    setPlusMenuVisible(false);
                    router.push({ pathname: '/menu/sound-library', params: { fromChat: 'true', chatId: String(id) } });
                  }}
                >
                  <View style={[styles.plusIcon, { backgroundColor: isModuleEnabled('sounds') ? '#E91E63' : '#222' }]}>
                    <Ionicons name="musical-notes" size={28} color={isModuleEnabled('sounds') ? '#fff' : '#666'} />
                    {!isModuleEnabled('sounds') && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={10} color="#ff4444" /></View>}
                  </View>
                  <Text style={[styles.plusText, !isModuleEnabled('sounds') && { color: '#666' }]}>SOUNDS</Text>
                </TouchableOpacity>

                {/* GIFTS */}
                <TouchableOpacity
                  style={styles.plusItem}
                  onPress={() => {
                    if (!isModuleEnabled('gifts')) return handleDisabledModuleNotice('VX Virtual Gifts');
                    setPlusMenuVisible(false);
                    setGiftsModalVisible(true);
                  }}
                >
                  <View style={[styles.plusIcon, { backgroundColor: isModuleEnabled('gifts') ? '#FF4081' : '#222' }]}>
                    <Ionicons name="gift" size={28} color={isModuleEnabled('gifts') ? '#fff' : '#666'} />
                    {!isModuleEnabled('gifts') && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={10} color="#ff4444" /></View>}
                  </View>
                  <Text style={[styles.plusText, !isModuleEnabled('gifts') && { color: '#666' }]}>GIFTS</Text>
                </TouchableOpacity>

                {/* POLLS */}
                <TouchableOpacity
                  style={styles.plusItem}
                  onPress={() => {
                    if (!isModuleEnabled('polls')) return handleDisabledModuleNotice('Live Polls & Voting');
                    setPlusMenuVisible(false);
                    setPollModalVisible(true);
                  }}
                >
                  <View style={[styles.plusIcon, { backgroundColor: isModuleEnabled('polls') ? '#7C5CFF' : '#222' }]}>
                    <Ionicons name="stats-chart" size={28} color={isModuleEnabled('polls') ? '#fff' : '#666'} />
                    {!isModuleEnabled('polls') && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={10} color="#ff4444" /></View>}
                  </View>
                  <Text style={[styles.plusText, !isModuleEnabled('polls') && { color: '#666' }]}>POLLS</Text>
                </TouchableOpacity>

                {/* AI ASSISTANT */}
                <TouchableOpacity
                  style={styles.plusItem}
                  onPress={() => {
                    if (!isModuleEnabled('ai_bot')) return handleDisabledModuleNotice('Neural AI Assistant');
                    setPlusMenuVisible(false);
                    setInputText('@VOEXI_AI ');
                    setTimeout(() => inputRef.current?.focus(), 200);
                  }}
                >
                  <View style={[styles.plusIcon, { backgroundColor: isModuleEnabled('ai_bot') ? '#00D4FF' : '#222' }]}>
                    <Ionicons name="hardware-chip" size={28} color={isModuleEnabled('ai_bot') ? '#fff' : '#666'} />
                    {!isModuleEnabled('ai_bot') && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={10} color="#ff4444" /></View>}
                  </View>
                  <Text style={[styles.plusText, !isModuleEnabled('ai_bot') && { color: '#666' }]}>VOEXI AI</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
      </Modal>

      <Modal visible={messageOptionsVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setMessageOptionsVisible(false)}>
          <View style={styles.optionsSheet}>
            <View style={styles.quickReactions}>{QUICK_REACTIONS.map(emoji => (<TouchableOpacity key={emoji} onPress={() => handleReaction(selectedMessage.id, emoji)} style={styles.reactionBtn}><Text style={{fontSize: 24}}>{emoji}</Text></TouchableOpacity>))}</View><View style={styles.sheetDivider} />
            <TouchableOpacity style={styles.sheetItem} onPress={() => { setReplyingTo(selectedMessage); setMessageOptionsVisible(false); }}><Ionicons name="arrow-undo" size={20} color="#fff" /><Text style={styles.sheetText}>Reply</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sheetItem} onPress={() => handleDeleteAction(selectedMessage)}><Ionicons name="trash" size={20} color="#ff4444" /><Text style={[styles.sheetText, {color: '#ff4444'}]}>Delete</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setMessageOptionsVisible(false)} style={styles.closeBtn}><Text style={styles.closeText}>CANCEL</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={giftsModalVisible} transparent animationType="slide">
         <View style={styles.modalOverlay}><View style={styles.giftsSheet}><View style={styles.dragBar} /><Text style={styles.sheetTitle}>VX VIRTUAL GIFTS</Text>
         <View style={styles.giftsGrid}>{GIFTS.map(gift => (<TouchableOpacity key={gift.id} style={styles.giftItem} onPress={() => handleSendGift(gift)}><View style={[styles.giftIconCircle, { backgroundColor: gift.color + '22' }]}><Ionicons name={gift.icon as any} size={32} color={gift.color} /></View><Text style={styles.giftName}>{gift.name}</Text></TouchableOpacity>))}</View>
         <TouchableOpacity onPress={() => setGiftsModalVisible(false)} style={styles.closeBtn}><Text style={styles.closeText}>CLOSE</Text></TouchableOpacity></View></View>
      </Modal>

      {/* CREATE POLL MODAL */}
      <Modal visible={pollModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pollModalSheet}>
            <View style={styles.dragBar} />
            <Text style={styles.sheetTitle}>CREATE LIVE POLL</Text>

            <Text style={styles.pollInputLabel}>POLL QUESTION *</Text>
            <TextInput
              style={styles.pollInput}
              placeholder="Ask cluster members a question..."
              placeholderTextColor="#555"
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />

            <Text style={styles.pollInputLabel}>CHOICE 1 *</Text>
            <TextInput style={styles.pollInput} placeholder="Option 1..." placeholderTextColor="#555" value={pollOption1} onChangeText={setPollOption1} />

            <Text style={styles.pollInputLabel}>CHOICE 2 *</Text>
            <TextInput style={styles.pollInput} placeholder="Option 2..." placeholderTextColor="#555" value={pollOption2} onChangeText={setPollOption2} />

            <Text style={styles.pollInputLabel}>CHOICE 3 (OPTIONAL)</Text>
            <TextInput style={styles.pollInput} placeholder="Option 3..." placeholderTextColor="#555" value={pollOption3} onChangeText={setPollOption3} />

            <Text style={styles.pollInputLabel}>CHOICE 4 (OPTIONAL)</Text>
            <TextInput style={styles.pollInput} placeholder="Option 4..." placeholderTextColor="#555" value={pollOption4} onChangeText={setPollOption4} />

            <TouchableOpacity style={styles.launchPollBtn} onPress={handleCreatePoll}>
              <LinearGradient colors={['#7C5CFF', '#00D4FF']} style={styles.launchPollGradient}>
                <Text style={styles.launchPollText}>LAUNCH POLL</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPollModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={themeModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}><View style={styles.themeModal}><Text style={styles.modalTitle}>CHAT THEMES</Text><ScrollView contentContainerStyle={styles.themeGrid}>{CHAT_THEMES.map((t) => (<TouchableOpacity key={t.id} style={styles.themeCard} onPress={() => { saveTheme(t); setThemeModalVisible(false); }}><LinearGradient colors={t.colors} style={styles.themeBox} /><Text style={styles.themeNameLabel}>{t.name}</Text></TouchableOpacity>))}</ScrollView><TouchableOpacity onPress={() => setThemeModalVisible(false)} style={styles.closeBtn}><Text style={styles.closeText}>CANCEL</Text></TouchableOpacity></View></View>
      </Modal>

      <Modal visible={nicknameModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}><View style={styles.nicknameSheet}><Text style={styles.sheetTitle}>SET NICKNAME</Text><TextInput style={styles.nicknameInput} placeholder="Enter name..." placeholderTextColor="#555" value={newNickname} onChangeText={setNewNickname} autoFocus /><View style={{flexDirection: 'row', gap: 10, marginTop: 20}}><TouchableOpacity onPress={() => setNicknameModalVisible(false)} style={[styles.modalBtn, {backgroundColor: '#222'}]}><Text style={{color: '#fff'}}>CANCEL</Text></TouchableOpacity><TouchableOpacity onPress={handleSaveNickname} style={[styles.modalBtn, {backgroundColor: selectedTheme.accent}]}><Text style={{color: '#fff'}}>SAVE</Text></TouchableOpacity></View></View></View>
      </Modal>

      <Modal visible={recordingModalVisible} transparent animationType="fade">
        <View style={styles.recordingOverlay}><View style={styles.recordingCircle}><Text style={{color:'#fff', fontSize: 24, fontWeight: 'bold'}}>{formatDuration(recordingDuration)}</Text><TouchableOpacity onPress={() => stopVoiceRecording(true)} style={styles.stopRecordingBtn}><Ionicons name="square" size={40} color="#fff" /></TouchableOpacity></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, justifyContent: 'space-between' },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  onlineStatus: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  messageRow: { flexDirection: 'row', marginBottom: 10 },
  messageBubble: { padding: 12, paddingHorizontal: 16, borderRadius: 20, maxWidth: '80%', position: 'relative' },
  myMessage: { alignSelf: 'flex-end', borderBottomRightRadius: 2, overflow: 'hidden' },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#111', borderBottomLeftRadius: 2 },
  myBubbleGradient: { ...StyleSheet.absoluteFillObject },
  messageText: { fontSize: 15, lineHeight: 20, color: '#fff' },
  msgInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: 'flex-end' },
  msgTime: { fontSize: 8, color: 'rgba(255,255,255,0.5)' },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#050505', borderTopWidth: 1, borderTopColor: '#111' },
  input: { flex: 1, color: '#fff', paddingHorizontal: 12, fontSize: 15, minHeight: 45 },
  sendCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  dateSeparator: { alignItems: 'center', marginVertical: 20 },
  dateText: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  optionsSheet: { backgroundColor: '#0A0A0F', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  menuGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 20 },
  menuGridItem: { alignItems: 'center', gap: 8, width: '22%' },
  menuIconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  menuGridText: { color: '#888', fontSize: 10, fontWeight: '700' },
  sheetTitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 25 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: '#111' },
  sheetText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sheetDivider: { height: 1, backgroundColor: '#1A1A24', marginVertical: 10 },
  dragBar: { width: 40, height: 4, backgroundColor: '#222', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  closeBtn: { padding: 15, alignItems: 'center', marginTop: 10 },
  closeText: { color: '#666', fontWeight: 'bold', letterSpacing: 1 },
  plusSheet: { backgroundColor: '#111', padding: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  plusTitle: { color: '#fff', textAlign: 'center', marginBottom: 20, fontWeight: 'bold' },
  plusGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 },
  plusItem: { width: '45%', alignItems: 'center', gap: 10 },
  plusIcon: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  lockBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#000', width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ff4444', justifyContent: 'center', alignItems: 'center' },
  plusText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  giftsSheet: { backgroundColor: '#0A0A10', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  giftsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15 },
  giftItem: { width: '30%', alignItems: 'center', gap: 5 },
  giftIconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  giftName: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  themeModal: { backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, height: '80%' },
  modalTitle: { color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  themeCard: { width: '48%', marginBottom: 20 },
  themeBox: { height: 80, borderRadius: 15 },
  themeNameLabel: { color: '#888', textAlign: 'center', marginTop: 5 },
  nicknameSheet: { backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  nicknameInput: { backgroundColor: '#000', color: '#fff', padding: 15, borderRadius: 15, fontSize: 16, borderWidth: 1, borderColor: '#333', marginTop: 20 },
  modalBtn: { flex: 1, padding: 15, borderRadius: 15, alignItems: 'center' },
  quickReactions: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  reactionBtn: { padding: 5 },
  recordingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  recordingCircle: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#FF4444', justifyContent: 'center', alignItems: 'center' },
  stopRecordingBtn: { marginTop: 20 },
  pollModalSheet: { backgroundColor: '#0A0A10', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderTopWidth: 1, borderColor: '#1A1A24' },
  pollInputLabel: { color: '#7C5CFF', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  pollInput: { backgroundColor: '#050508', color: '#fff', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#1C1C24', fontSize: 13 },
  launchPollBtn: { marginTop: 22, borderRadius: 15, overflow: 'hidden' },
  launchPollGradient: { padding: 16, alignItems: 'center' },
  launchPollText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 }
});
