import React, { useState, useRef, useEffect, memo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Dimensions, Modal, ScrollView, Animated, Easing, Image, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { AIService, AIMessage } from '../../lib/aiService';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { id: 'solve', label: '🧠 Solve', prompt: 'Help me solve this logic problem: ' },
  { id: 'image', label: '🖼 Image', prompt: 'Create a high-quality premium image of: ' },
  { id: 'code', label: '💻 Code', prompt: 'Write production-ready code for: ' },
  { id: 'logo', label: '🎨 Logo', prompt: 'Design a professional premium logo for: ' },
  { id: 'video', label: '🎬 Video', prompt: 'Create a creative storyboard for: ' },
  { id: 'learn', label: '📚 Learn', prompt: 'Explain the complex concept of: ' },
];

const PERSONALITIES = [
  { id: 'default', name: 'Neural Core', icon: 'atom', color: '#00D4FF' },
  { id: 'assistant', name: 'Assistant', icon: 'chat-processing', color: '#7C5CFF' },
  { id: 'hacker', name: 'Cyber-Core', icon: 'incognito', color: '#00FF41' },
  { id: 'creator', name: 'Studio Master', icon: 'movie-filter', color: '#FF0080' },
];

const MessageBubble = memo(({ item }: { item: AIMessage }) => {
  const isAI = item.role === 'assistant';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [imgLoading, setImgLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    return () => { if (sound) sound.unloadAsync(); };
  }, [sound]);

  const playVoice = async () => {
    if (item.audioUrl) {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: item.audioUrl });
      setSound(newSound);
      await newSound.playAsync();
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(item.content);
    Alert.alert('COPIED', 'Signal data saved to clipboard.');
  };

  const speak = () => {
    Speech.speak(item.content, { pitch: 1.0, rate: 1.0 });
  };

  const downloadImage = async () => {
    if (item.imageUrl) {
      Alert.alert('VOEXI ENGINE', 'Image saved to gallery (simulated).');
    }
  };

  return (
    <Animated.View style={[styles.msgRow, isAI ? styles.aiRow : styles.userRow, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={isAI ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] : ['#7C5CFF', '#00D4FF']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble, item.isError && styles.errorBubble]}
      >
        {isAI && (
          <View style={styles.aiHeader}>
            <MaterialCommunityIcons name="brain" size={14} color="#00D4FF" />
            <Text style={styles.aiLabel}>VOEXI NEURAL CORE</Text>
          </View>
        )}

        {item.userImage && (
          <View style={styles.imageContainer}>
             <Image source={{ uri: item.userImage }} style={[styles.generatedImg, { height: 200, width: width * 0.7 }]} resizeMode="cover" />
          </View>
        )}

        {item.audioUrl && (
          <TouchableOpacity style={styles.voiceBubble} onPress={playVoice}>
             <Ionicons name="play-circle" size={32} color={isAI ? "#00D4FF" : "#fff"} />
             <View style={styles.voiceWaveform}>
                {[1,2,3,4,5,6].map(i => <View key={i} style={[styles.waveBar, { height: Math.random()*20 + 5 }]} />)}
             </View>
             <Text style={styles.voiceDuration}>Voice Message</Text>
          </TouchableOpacity>
        )}

        {item.imageUrl && (
          <View style={styles.imageContainer}>
            {imgLoading && (
              <View style={styles.imgPlaceholder}>
                <ActivityIndicator color="#00D4FF" />
                <Text style={styles.loadingText}>Rendering Visual...</Text>
              </View>
            )}
            <Image
              source={{ uri: item.imageUrl }}
              style={[styles.generatedImg, { aspectRatio: item.imageUrl.includes('width=1280') ? 16/9 : (item.imageUrl.includes('width=720') ? 9/16 : 1) }]}
              onLoadEnd={() => setImgLoading(false)}
            />
            {!imgLoading && (
              <TouchableOpacity style={styles.imgDownloadBtn} onPress={downloadImage}>
                <Ionicons name="download-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={[styles.msgText, item.isError && { color: '#ff4444' }]}>{item.content}</Text>

        {isAI && !item.isError && (
          <View style={styles.bubbleActions}>
             <TouchableOpacity onPress={copyToClipboard} style={styles.actionIcon}><Ionicons name="copy-outline" size={14} color="#666" /></TouchableOpacity>
             <TouchableOpacity onPress={speak} style={styles.actionIcon}><Ionicons name="volume-medium-outline" size={14} color="#666" /></TouchableOpacity>
             <TouchableOpacity style={styles.actionIcon}><Ionicons name="share-social-outline" size={14} color="#666" /></TouchableOpacity>
             <TouchableOpacity style={styles.actionIcon}><Ionicons name="flash-outline" size={14} color="#666" /></TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
});

export default function VOEXI_AI_ULTIMATE() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setAiStatus] = useState('Checking Neural Link...');
  const [userId, setUserId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [brainOnline, setBrainOnline] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [serverIp, setServerIp] = useState('');
  const [selectedPersonality, setPersonality] = useState<any>(PERSONALITIES[0]);

  const flatListRef = useRef<FlatList>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setupSession();
    checkHealth();
    loadIp();
    const timer = setInterval(checkHealth, 15000);
    Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })).start();
    return () => clearInterval(timer);
  }, []);

  const loadIp = async () => {
    const ip = await AIService.getServerIp();
    setServerIp(ip);
  };

  const checkHealth = async () => {
    const status = await AIService.checkBrainStatus();
    setBrainOnline(status);
    setAiStatus(status ? 'Neural Engine Active' : 'Uplink Offline');
  };

  const setupSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const defaultWelcome: AIMessage = { role: 'assistant', content: "Namaste! Main VOEXI AI Assistant hoon. Aapka swagat hai! Main aapki kya madad kar sakta hoon?" };

      if (!user) {
        setMessages([defaultWelcome]);
        return;
      }

      const { data: participant } = await supabase
        .from('ai_chat_participants')
        .select('chat_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (participant && participant.chat_id) {
        setChatId(participant.chat_id);
        const { data: history } = await supabase
          .from('ai_messages')
          .select('*')
          .eq('chat_id', participant.chat_id)
          .order('created_at', { ascending: true })
          .limit(20);

        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([defaultWelcome]);
        }
      } else {
        const newChat = await AIService.startSharedChat(user.id);
        if (newChat && newChat.id) {
          setChatId(newChat.id);
        }
        setMessages([defaultWelcome]);
      }
    } catch (err) {
      console.warn('setupSession fallback:', err);
      setMessages([{ role: 'assistant', content: "Namaste! Main VOEXI AI Assistant hoon. Main aapki kya madad kar sakta hoon?" }]);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text && !selectedImage && !loading) return;

    const userMsg: AIMessage = {
      role: 'user',
      content: text || (selectedImage ? "Uploaded an image" : "Sent a voice message"),
      userImage: selectedImage || undefined
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    if (chatId) {
      AIService.saveMessage(chatId, 'user', userMsg.content, userId || undefined).catch(() => {});
    }

    const statuses = ['Understanding request...', 'Analyzing signals...', 'Processing...', 'Synthesizing...'];
    let idx = 0;
    const interval = setInterval(() => {
       setAiStatus(statuses[idx % statuses.length]);
       idx++;
    }, 800);

    try {
      const response = await AIService.generateResponse(text || "Describe this image", updatedMessages, userId || undefined, selectedPersonality.id);
      clearInterval(interval);
      setAiStatus('Neural Engine Active');

      const aiMsg: AIMessage = {
        role: 'assistant',
        content: response.text || "Main aapki sahayata karne ke liye taiyaar hoon!",
        imageUrl: response.imageUrl,
        isError: !!response.error
      };

      setMessages(prev => [...prev, aiMsg]);
      if (chatId && !response.error && response.text) {
        AIService.saveMessage(chatId, 'assistant', response.text, userId || undefined).catch(() => {});
      }
    } catch (e: any) {
      clearInterval(interval);
      setAiStatus('Neural Engine Active');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Kripya apna sawaal dobara likhein, main aapki poori sahayata karne ke liye ready hoon!"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    await AIService.setServerIp(serverIp);
    setSettingsVisible(false);
    checkHealth();
    Alert.alert("SYNCED", "Neural uplink configuration updated.");
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setAiStatus('Recording Audio...');
    } catch (err) { Alert.alert('Error', 'Failed to start recording'); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(null);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        const userMsg: AIMessage = { role: 'user', content: "Voice message", audioUrl: uri };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        const response = await AIService.generateResponse("I sent a voice message. Please acknowledge.", [...messages, userMsg], userId || undefined, selectedPersonality.id);
        setMessages(prev => [...prev, { role: 'assistant', content: response.text, imageUrl: response.imageUrl }]);
        setLoading(false);
      }
    } catch (e) { console.error(e); }
  };

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView edges={['top']} style={styles.header}>
         <View style={styles.headerContent}>
            <View style={styles.logoRow}>
               <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <LinearGradient colors={['#7C5CFF', '#00D4FF']} style={styles.logoIcon}>
                     <MaterialCommunityIcons name={selectedPersonality.icon as any} size={20} color="#fff" />
                  </LinearGradient>
               </Animated.View>
               <View style={styles.headerTextCol}>
                  <Text style={styles.branding}>VOEXI <Text style={{color: selectedPersonality.color}}>{selectedPersonality.name.toUpperCase()}</Text></Text>
                  <View style={styles.statusRow}>
                     <View style={[styles.statusDot, { backgroundColor: brainOnline ? '#00ff00' : '#ff4444' }]} />
                     <Text style={styles.statusLabel}>{statusMsg}</Text>
                  </View>
               </View>
            </View>
            <View style={styles.headerActions}>
               <TouchableOpacity style={styles.iconBtn} onPress={() => setSettingsVisible(true)}>
                  <Ionicons name="settings-outline" size={20} color="#fff" />
               </TouchableOpacity>
               <TouchableOpacity style={styles.iconBtn} onPress={() => setMessages([{ role: 'assistant', content: "Neural buffer cleared. Memory fresh." }])}>
                  <Ionicons name="refresh" size={20} color="#fff" />
               </TouchableOpacity>
            </View>
         </View>
      </SafeAreaView>

      <View style={styles.quickBar}>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {PERSONALITIES.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.personalityPill, selectedPersonality.id === p.id && { borderColor: p.color, backgroundColor: p.color + '11' }]}
                onPress={() => setPersonality(p)}
              >
                <MaterialCommunityIcons name={p.icon as any} size={14} color={selectedPersonality.id === p.id ? p.color : '#444'} />
                <Text style={[styles.quickLabel, selectedPersonality.id === p.id && { color: p.color }]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ width: 30 }} />
            {QUICK_ACTIONS.map(action => (
               <TouchableOpacity key={action.id} style={styles.quickPill} onPress={() => handleSend(action.prompt)}>
                  <Text style={styles.quickLabel}>{action.label}</Text>
               </TouchableOpacity>
            ))}
         </ScrollView>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => <MessageBubble item={item} />}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={10}>
         {selectedImage && (
            <View style={styles.imagePreview}>
               <Image source={{ uri: selectedImage }} style={styles.previewThumb} />
               <TouchableOpacity style={styles.closePreview} onPress={() => setSelectedImage(null)}>
                  <Ionicons name="close-circle" size={24} color="#ff4444" />
               </TouchableOpacity>
            </View>
         )}
         <View style={styles.inputContainer}>
            <View style={styles.inputGlass}>
               <View style={styles.leftActions}>
                  <TouchableOpacity style={styles.utilBtn} onPress={pickImage}><Ionicons name="image-outline" size={22} color={selectedImage ? "#00D4FF" : "#444"} /></TouchableOpacity>
                  <TouchableOpacity style={styles.utilBtn} onPressIn={startRecording} onPressOut={stopRecording}>
                     <Ionicons name="mic-outline" size={22} color={recording ? "#00D4FF" : "#444"} />
                  </TouchableOpacity>
               </View>
               <TextInput
                  style={styles.input}
                  placeholder={`Ask ${selectedPersonality.name}...`}
                  placeholderTextColor="#333"
                  value={input}
                  onChangeText={setInput}
                  multiline
               />
               <TouchableOpacity onPress={() => handleSend()} disabled={(!input.trim() && !selectedImage) || loading}>
                  <LinearGradient colors={['#7C5CFF', '#00D4FF']} style={[styles.sendBtn, (!input.trim() && !selectedImage) && { opacity: 0.3 }]}>
                     {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
                  </LinearGradient>
               </TouchableOpacity>
            </View>
         </View>
      </KeyboardAvoidingView>

      {/* Settings Modal */}
      <Modal visible={settingsVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>AI NEURAL SETTINGS</Text>
                 <TouchableOpacity onPress={() => setSettingsVisible(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Laptop/Server IP Address</Text>
              <View style={styles.settingInputRow}>
                 <Ionicons name="wifi" size={20} color="#00D4FF" />
                 <TextInput
                   style={styles.settingInput}
                   value={serverIp}
                   onChangeText={setServerIp}
                   placeholder="192.168.x.x"
                   placeholderTextColor="#444"
                 />
              </View>
              <Text style={styles.helperText}>Find this by running 'ipconfig' on your laptop. Current Port: 8000</Text>

              <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
                 <Text style={styles.saveBtnText}>SYNC UPLINK</Text>
              </TouchableOpacity>

              <View style={styles.healthCheck}>
                 <View style={[styles.statusDot, { backgroundColor: brainOnline ? '#00ff00' : '#ff4444' }]} />
                 <Text style={{color: '#aaa', fontSize: 12, fontWeight: 'bold'}}>Status: {brainOnline ? 'Connected to VNC' : 'Server Offline'}</Text>
              </View>
           </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090909' },
  header: { backgroundColor: 'rgba(9,9,9,0.95)', borderBottomWidth: 1, borderBottomColor: '#151515' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#7C5CFF', shadowRadius: 10, shadowOpacity: 0.5 },
  headerTextCol: { gap: 2 },
  branding: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { color: '#555', fontSize: 8, fontWeight: 'bold', letterSpacing: 0.5 },
  headerActions: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 5 },
  quickBar: { paddingVertical: 12 },
  quickPill: { backgroundColor: '#0f0f0f', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  personalityPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f0f0f', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#1a1a1a' },
  quickLabel: { color: '#aaa', fontSize: 10, fontWeight: 'bold' },
  chatList: { padding: 20, paddingBottom: 30 },
  msgRow: { marginBottom: 20, width: '100%' },
  userRow: { alignItems: 'flex-end' },
  aiRow: { alignItems: 'flex-start' },
  bubble: { padding: 16, borderRadius: 22, maxWidth: '85%' },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(0,212,255,0.1)' },
  errorBubble: { borderColor: 'rgba(255,0,0,0.2)', backgroundColor: 'rgba(255,0,0,0.05)' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiLabel: { color: '#00D4FF', fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  msgText: { color: '#eee', fontSize: 15, lineHeight: 22 },
  imageContainer: { width: '100%', borderRadius: 15, overflow: 'hidden', marginBottom: 15, backgroundColor: '#111' },
  generatedImg: { width: '100%', borderRadius: 15 },
  imgPlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { color: '#00D4FF', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  imgDownloadBtn: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
  voiceBubble: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5, marginBottom: 5 },
  voiceWaveform: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  waveBar: { width: 3, backgroundColor: '#555', borderRadius: 2 },
  voiceDuration: { color: '#666', fontSize: 10, fontWeight: 'bold' },
  imagePreview: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 10, alignItems: 'flex-end' },
  previewThumb: { width: 60, height: 60, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  closePreview: { marginLeft: -15, marginBottom: 40 },
  bubbleActions: { flexDirection: 'row', gap: 15, marginTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 10 },
  actionIcon: { padding: 2 },
  inputContainer: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 35 : 15 },
  inputGlass: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f0f0f', borderRadius: 25, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#1a1a1a' },
  leftActions: { flexDirection: 'row', gap: 5, marginRight: 8 },
  utilBtn: { padding: 8 },
  input: { flex: 1, color: '#fff', fontSize: 15, maxHeight: 120, paddingVertical: 10 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0a0a0a', padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 1, borderTopColor: '#222' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  inputLabel: { color: '#666', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  settingInputRow: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#050505', borderRadius: 15, paddingHorizontal: 20, height: 55, borderWidth: 1, borderColor: '#111' },
  settingInput: { flex: 1, color: '#fff', fontSize: 16, fontWeight: 'bold' },
  helperText: { color: '#444', fontSize: 10, marginTop: 10, fontStyle: 'italic' },
  saveBtn: { backgroundColor: '#00D4FF', height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  healthCheck: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, alignSelf: 'center' }
});
