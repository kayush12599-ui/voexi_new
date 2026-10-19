import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity, Image, Switch, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { VOEXITheme } from '../../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { LocalLibraryService } from '../../../lib/localLibraryService';

const { width } = Dimensions.get('window');

const REMIX_OPTIONS = [
  { id: 'none', label: 'None', icon: 'close-circle-outline' },
  { id: 'sound', label: 'Sound Only', icon: 'musical-note-outline' },
  { id: 'video', label: 'Video Only', icon: 'videocam-outline' },
  { id: 'both', label: 'Both', icon: 'copy-outline' },
];

export default function VideoManagerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [video, setVideo] = useState<any>(null);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [allowComments, setAllowComments] = useState(true);
  const [commentLimit, setCommentLimit] = useState('0'); // 0 = unlimited
  const [remixType, setRemixType] = useState('both');
  const [allowRating, setAllowRating] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [category, setCategory] = useState('Entertainment');
  const [isAiContent, setIsAiContent] = useState(false);
  const [hideLikes, setHideLikes] = useState(false);
  const [hideComments, setHideComments] = useState(false);
  const [editorName, setEditorName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [nextVideoId, setNextVideoId] = useState('');

  // Stats State
  const [stats, setStats] = useState({
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    avgWatchTime: '0:00'
  });

  const finalUrl = useMemo(() => {
    let url = video?.video_url || video?.media_url || '';
    if (!url) return null;
    url = url.trim();
    if (url.includes('b-cdn.net')) {
        url = url.replace('videosvoexi.b-cdn.net', 'voexi.b-cdn.net');
        url = url.replace('VOEXI.b-cdn.net', 'voexi.b-cdn.net');
    }
    return url;
  }, [video]);

  const player = useVideoPlayer(finalUrl);

  useEffect(() => {
    fetchVideoDetails();
    loadLocalSettings();
  }, [id]);

  const loadLocalSettings = async () => {
    const local = await LocalLibraryService.getSettings();
    setHideLikes(local.hideLikes);
    setHideComments(local.hideComments);
  };

  const fetchVideoDetails = async () => {
    try {
      const { data, error } = await supabase.from('posts').select('*, profiles(username, channel_name)').eq('id', id).single();
      if (data) {
        setVideo(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setTags(data.tags || '');
        setVisibility(data.visibility || 'public');
        setAllowComments(data.allow_comments !== false);
        setCommentLimit(String(data.comment_limit_per_user || 0));
        setRemixType(data.remix_type || (data.allow_remix === false ? 'none' : 'both'));
        setAllowRating(data.allow_rating !== false);
        setAllowDownloads(data.allow_downloads !== false);
        setCategory(data.category || 'Entertainment');
        setIsAiContent(data.is_ai_content || false);
        setHideLikes(data.hide_likes_count || false);
        setHideComments(data.hide_comments_count || false);
        setEditorName(data.editor_name || '');
        setOwnerName(data.owner_name || data.profiles?.channel_name || '');
        setNextVideoId(data.next_video_id || '');

        // Calculate Avg. Retention
        const totalWatch = data.total_watch_time_seconds || 0;
        const totalViews = data.views_count || 1;
        const avgSeconds = totalWatch / totalViews;
        const mins = Math.floor(avgSeconds / 60);
        const secs = Math.floor(avgSeconds % 60);
        const avgFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        // Set Stats
        setStats({
          views: data.views_count || 0,
          likes: data.likes_count || 0,
          comments: data.comments_count || 0,
          shares: data.shares_count || 0,
          saves: data.saves_count || 0,
          avgWatchTime: avgFormatted
        });
      }
    } catch (e) {
      Alert.alert("Error", "Could not load video details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Validation", "Title is required.");

    try {
      setSaving(true);

      // Local Save for Privacy (Not in Supabase)
      await LocalLibraryService.saveSettings({ hideLikes, hideComments });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session expired.");

      const { error } = await supabase.from('posts').update({
        title: title.trim(),
        description: description.trim(),
        tags: tags.trim(),
        visibility,
        allow_comments: allowComments,
        comment_limit_per_user: parseInt(commentLimit) || 0,
        remix_type: remixType,
        allow_remix: remixType !== 'none',
        allow_rating: allowRating,
        allow_downloads: allowDownloads,
        hide_likes_count: hideLikes,
        hide_comments_count: hideComments,
        category: category,
        is_ai_content: isAiContent,
        editor_name: editorName.trim(),
        owner_name: ownerName.trim(),
        next_video_id: nextVideoId.trim()
      }).eq('id', id).eq('user_id', user.id);

      if (error) throw error;

      Alert.alert("Success", "Production intelligence updated successfully.");
      router.back();
    } catch (e: any) {
      console.error("Save Error:", e);
      Alert.alert("Save Failed", e.message || "Could not persist changes to the database.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.loadingBox}><ActivityIndicator color={VOEXITheme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
           <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PRO-MANAGER</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
           {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>PUBLISH CHANGES</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

           {/* 1. TOP PREVIEW ROW */}
           <View style={styles.topRow}>
              <View style={styles.previewBox}>
                 <VideoView player={player} style={styles.videoPreview} contentFit="cover" nativeControls={false} />
                 <View style={styles.playOverlay}><Ionicons name="stats-chart" size={24} color="#fff" /></View>
              </View>

              <View style={styles.basicInfo}>
                 <Text style={styles.inputLabel}>Production Title</Text>
                 <TextInput
                    style={styles.textInput}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter catchy title..."
                    placeholderTextColor="#333"
                 />

                 <Text style={[styles.inputLabel, {marginTop: 12}]}>Discovery Tags</Text>
                 <TextInput
                    style={styles.textInput}
                    value={tags}
                    onChangeText={setTags}
                    placeholder="#ai #remix #vx"
                    placeholderTextColor="#333"
                 />
              </View>
           </View>

           {/* 2. ANALYTICS QUICK GRID */}
           <Text style={styles.sectionTitle}>REAL-TIME PERFORMANCE</Text>
           <View style={styles.statsGrid}>
              <View style={styles.statMiniCard}>
                 <Text style={styles.statMiniVal}>{stats.views.toLocaleString()}</Text>
                 <Text style={styles.statMiniLab}>VIEWS</Text>
                 <View style={[styles.statIndicator, {backgroundColor: '#00F2FE'}]} />
              </View>
              <View style={styles.statMiniCard}>
                 <Text style={styles.statMiniVal}>{stats.likes.toLocaleString()}</Text>
                 <Text style={styles.statMiniLab}>HEARTS</Text>
                 <View style={[styles.statIndicator, {backgroundColor: '#EC4899'}]} />
              </View>
              <View style={styles.statMiniCard}>
                 <Text style={styles.statMiniVal}>{stats.comments.toLocaleString()}</Text>
                 <Text style={styles.statMiniLab}>REPLIES</Text>
                 <View style={[styles.statIndicator, {backgroundColor: '#00C851'}]} />
              </View>
              <View style={styles.statMiniCard}>
                 <Text style={styles.statMiniVal}>{stats.shares}</Text>
                 <Text style={styles.statMiniLab}>SHARES</Text>
                 <View style={[styles.statIndicator, {backgroundColor: '#A855F7'}]} />
              </View>
           </View>

           <TouchableOpacity
              style={styles.fullAnalyticsBtn}
              onPress={() => {
                const vid = Array.isArray(id) ? id[0] : id;
                router.push(`/menu/video-analytics?videoId=${vid}`);
              }}
           >
              <Text style={styles.fullAnalyticsText}>VIEW DEEP DATA INSIGHTS</Text>
              <Ionicons name="arrow-forward" size={14} color={VOEXITheme.colors.primary} />
           </TouchableOpacity>

           <View style={styles.divider} />

           {/* 3. PRIVACY & DISPLAY */}
           <Text style={styles.sectionTitle}>PRIVACY & ENGAGEMENT</Text>
           <View style={styles.permRow}>
              <View style={{flex: 1}}>
                 <Text style={styles.permTitle}>Hide Like Count</Text>
                 <Text style={styles.permSub}>Other users won't see heart counts</Text>
              </View>
              <Switch value={hideLikes} onValueChange={setHideLikes} thumbColor={hideLikes ? '#EC4899' : '#222'} />
           </View>

           <View style={styles.divider} />

           {/* 4. COMMUNICATION HUB (COMMENTS) */}
           <Text style={styles.sectionTitle}>COMMUNICATION HUB</Text>

           <TouchableOpacity
              style={styles.commentManagerBtn}
              onPress={() => router.push({ pathname: '/menu/comment-manager', params: { postId: id } })}
           >
              <LinearGradient colors={['#1A1A24', '#0D0D15']} style={styles.commentManagerInner}>
                 <View style={styles.iconCircle}><Ionicons name="chatbubbles-outline" size={20} color="#00C851" /></View>
                 <View style={{flex: 1, marginLeft: 15}}>
                    <Text style={styles.commentBtnTitle}>Review & Manage Comments</Text>
                    <Text style={styles.commentBtnSub}>Filter, delete or pin feedback</Text>
                 </View>
                 <Ionicons name="chevron-forward" size={18} color="#333" />
              </LinearGradient>
           </TouchableOpacity>

           <View style={[styles.permRow, {marginTop: 20}]}>
              <View style={{flex: 1}}>
                 <Text style={styles.permTitle}>Allow Audience Comments</Text>
                 <Text style={styles.permSub}>Global feedback toggle</Text>
              </View>
              <Switch value={allowComments} onValueChange={setAllowComments} thumbColor={allowComments ? '#00C851' : '#222'} />
           </View>

           {allowComments && (
             <>
               <View style={styles.permRow}>
                  <View style={{flex: 1}}>
                     <Text style={styles.permTitle}>Hide Comment Count</Text>
                     <Text style={styles.permSub}>Replies number will be private</Text>
                  </View>
                  <Switch value={hideComments} onValueChange={setHideComments} thumbColor={hideComments ? '#00C851' : '#222'} />
               </View>

               <View style={styles.limitRow}>
                  <View style={{flex: 1}}>
                     <Text style={styles.limitLabel}>Per-User Limit</Text>
                     <Text style={styles.limitSub}>0 = Unlimited interaction</Text>
                  </View>
                  <TextInput
                     style={styles.smallInput}
                     value={commentLimit}
                     onChangeText={setCommentLimit}
                     keyboardType="numeric"
                     maxLength={2}
                  />
               </View>
             </>
           )}

           <View style={styles.divider} />

           {/* 5. DESCRIPTION & VISIBILITY */}
           <Text style={styles.inputLabel}>Full Description</Text>
           <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Provide context..."
              placeholderTextColor="#333"
           />

           <Text style={[styles.sectionTitle, {marginTop: 25}]}>VISIBILITY MATRIX</Text>
           <View style={styles.visibilityGrid}>
              {['public', 'private', 'unlisted', 'friends'].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.visBtn, visibility === v && styles.visBtnActive]}
                  onPress={() => setVisibility(v)}
                >
                   <Ionicons
                      name={v === 'public' ? 'earth' : v === 'private' ? 'lock-closed' : v === 'unlisted' ? 'link' : 'people'}
                      size={14}
                      color={visibility === v ? '#fff' : '#444'}
                   />
                   <Text style={[styles.visText, visibility === v && styles.visTextActive]}>{v.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
           </View>

           <View style={styles.divider} />

           {/* 6. REMIX & ASSETS */}
           <Text style={styles.sectionTitle}>REMIX PERMISSIONS</Text>
           <View style={styles.remixGrid}>
              {REMIX_OPTIONS.map(opt => (
                <TouchableOpacity
                   key={opt.id}
                   style={[styles.remixCard, remixType === opt.id && styles.remixCardActive]}
                   onPress={() => setRemixType(opt.id)}
                >
                   <Ionicons name={opt.icon as any} size={20} color={remixType === opt.id ? '#00F2FE' : '#444'} />
                   <Text style={[styles.remixLabel, remixType === opt.id && {color: '#fff'}]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
           </View>

           <View style={[styles.permRow, {marginTop: 20}]}>
              <View style={{flex: 1}}>
                 <Text style={styles.permTitle}>Production Rating Scale</Text>
                 <Text style={styles.permSub}>1-5 stars evaluation</Text>
              </View>
              <Switch value={allowRating} onValueChange={setAllowRating} thumbColor={allowRating ? '#FFD700' : '#222'} />
           </View>

           <View style={styles.permRow}>
              <View style={{flex: 1}}>
                 <Text style={styles.permTitle}>Allow Video Downloads</Text>
                 <Text style={styles.permSub}>Save to device storage</Text>
              </View>
              <Switch value={allowDownloads} onValueChange={setAllowDownloads} thumbColor={allowDownloads ? '#00C851' : '#222'} />
           </View>

           <View style={styles.divider} />

           {/* 7. META DATA */}
           <Text style={styles.sectionTitle}>PRODUCTION CATEGORY</Text>
           <View style={styles.visibilityGrid}>
              {['Entertainment', 'Music', 'Dance', 'Tech', 'Comedy', 'Education'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.visBtn, category === cat && styles.visBtnActive, { minWidth: '30%' }]}
                  onPress={() => setCategory(cat)}
                >
                   <Text style={[styles.visText, category === cat && styles.visTextActive]}>{cat.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
           </View>

           <Text style={[styles.sectionTitle, {marginTop: 25}]}>PRODUCTION CREDITS</Text>
           <View style={styles.creditInputRow}>
              <View style={{flex: 1}}>
                 <Text style={styles.inputLabel}>Edited By</Text>
                 <TextInput style={styles.textInput} value={editorName} onChangeText={setEditorName} placeholder="Editor" placeholderTextColor="#333" />
              </View>
              <View style={{flex: 1, marginLeft: 15}}>
                 <Text style={styles.inputLabel}>Owner / Label</Text>
                 <TextInput style={styles.textInput} value={ownerName} onChangeText={setOwnerName} placeholder="Owner" placeholderTextColor="#333" />
              </View>
           </View>

           <View style={[styles.permRow, {marginTop: 20}]}>
              <View style={{flex: 1}}>
                 <Text style={styles.permTitle}>AI Intelligence</Text>
                 <Text style={styles.permSub}>Tag if AI visuals/sound used</Text>
              </View>
              <Switch value={isAiContent} onValueChange={setIsAiContent} thumbColor={isAiContent ? '#00F2FE' : '#222'} />
           </View>

           <View style={styles.divider} />

           {/* NEW: PERMISSIONS PAGE LINK */}
           <Text style={styles.sectionTitle}>SIGNAL ARCHITECTURE</Text>
           <TouchableOpacity
              style={styles.commentManagerBtn}
              onPress={() => router.push({ pathname: '/menu/video-manager/permissions', params: { id } })}
           >
              <LinearGradient colors={['#1A1A24', '#0D0D15']} style={styles.commentManagerInner}>
                 <View style={[styles.iconCircle, { backgroundColor: VOEXITheme.colors.primary + '22' }]}><Ionicons name="shield-lock-outline" size={20} color={VOEXITheme.colors.primary} /></View>
                 <View style={{flex: 1, marginLeft: 15}}>
                    <Text style={styles.commentBtnTitle}>Advanced Signal Permissions</Text>
                    <Text style={styles.commentBtnSub}>Save, Download, Rate & Sharing</Text>
                 </View>
                 <Ionicons name="chevron-forward" size={18} color="#333" />
              </LinearGradient>
           </TouchableOpacity>

           <View style={styles.divider} />

           {/* 8. SEQUENCING */}
           <Text style={styles.sectionTitle}>SMART SEQUENCING</Text>
           <View style={styles.seqBox}>
              <LinearGradient colors={['#111', '#000']} style={styles.seqContent}>
                 <Ionicons name="link-outline" size={24} color="#A855F7" />
                 <View style={{flex: 1, marginLeft: 15}}>
                    <Text style={styles.seqTitle}>Auto-Next ID</Text>
                    <Text style={styles.seqSub}>Play next when this ends.</Text>
                    <TextInput
                       style={[styles.textInput, {marginTop: 10, backgroundColor: '#050505'}]}
                       value={nextVideoId}
                       onChangeText={setNextVideoId}
                       placeholder="Paste Part 2 ID..."
                       placeholderTextColor="#222"
                    />
                 </View>
              </LinearGradient>
           </View>

           <View style={{height: 100}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050C' },
  loadingBox: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  saveBtn: { backgroundColor: VOEXITheme.colors.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 10, letterSpacing: 1 },
  scrollContent: { padding: 20 },

  topRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  previewBox: { width: 140, height: 100, borderRadius: 15, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
  videoPreview: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  basicInfo: { flex: 1 },

  inputLabel: { color: '#444', fontSize: 9, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  textInput: { backgroundColor: '#0D0D15', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#1A1A24' },
  textArea: { height: 80, textAlignVertical: 'top', marginTop: 8 },
  divider: { height: 1, backgroundColor: '#111', marginVertical: 25 },

  sectionTitle: { color: '#6366F1', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 20 },
  visibilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  visBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0D0D15', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1A1A24' },
  visBtnActive: { borderColor: '#A855F7', backgroundColor: '#A855F715' },
  visText: { color: '#444', fontSize: 9, fontWeight: 'bold' },
  visTextActive: { color: '#fff' },

  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  permTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  permSub: { color: '#444', fontSize: 11, marginTop: 2 },

  limitRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D15', padding: 15, borderRadius: 15, marginTop: 10, borderWidth: 1, borderColor: '#1A1A24' },
  limitLabel: { color: '#eee', fontSize: 13, fontWeight: 'bold' },
  limitSub: { color: '#444', fontSize: 10, marginTop: 2 },
  smallInput: { backgroundColor: '#000', width: 50, height: 40, borderRadius: 10, textAlign: 'center', color: VOEXITheme.colors.primary, fontWeight: 'bold', borderWidth: 1, borderColor: '#222' },

  remixGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  remixCard: { flex: 1, minWidth: '45%', backgroundColor: '#0D0D15', padding: 15, borderRadius: 15, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#1A1A24' },
  remixCardActive: { borderColor: '#00F2FE', backgroundColor: '#00F2FE11' },
  remixLabel: { color: '#444', fontSize: 11, fontWeight: 'bold' },

  creditInputRow: { flexDirection: 'row', gap: 0 },
  seqBox: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#A855F722' },
  seqContent: { padding: 20, flexDirection: 'row' },
  seqTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  seqSub: { color: '#555', fontSize: 11, marginTop: 4 },

  commentManagerBtn: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#1A1A24' },
  commentManagerInner: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  commentBtnTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  commentBtnSub: { color: '#444', fontSize: 11, marginTop: 2 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 15 },
  statMiniCard: { flex: 1, backgroundColor: '#0D0D15', padding: 15, borderRadius: 18, borderWidth: 1, borderColor: '#1A1A24', alignItems: 'center' },
  statMiniVal: { color: '#fff', fontSize: 14, fontWeight: '900' },
  statMiniLab: { color: '#444', fontSize: 8, fontWeight: 'bold', marginTop: 4 },
  statIndicator: { width: 10, height: 2, borderRadius: 1, marginTop: 8 },
  fullAnalyticsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, marginBottom: 10 },
  fullAnalyticsText: { color: VOEXITheme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});
