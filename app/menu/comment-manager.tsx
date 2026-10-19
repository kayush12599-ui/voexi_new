import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CommentManagerScreen() {
  const { postId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (postId) fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const isMediaServerPost = postId && (String(postId).includes('pendrive_media') || String(postId).includes('.mp4') || String(postId).includes('VX_'));

      if (isMediaServerPost) {
        const cleanName = String(postId).replace(/^pendrive_media_\d+_/, '');
        const res = await fetch(`http://192.168.31.39:8080/api/comments?file=${encodeURIComponent(cleanName)}`);
        const data = await res.json();
        if (data.success && data.comments) {
          const formatted = data.comments.map((c: any) => ({
            id: c.id,
            content: c.text,
            is_pinned: false,
            created_at: c.created_at,
            profiles: { username: c.user || '@viewer', avatar_url: c.avatar || 'https://via.placeholder.com/40' }
          }));
          setComments(formatted);
        } else {
          setComments([]);
        }
      } else {
        const { data, error } = await supabase
          .from('comments')
          .select('*, profiles(username, avatar_url)')
          .eq('post_id', postId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setComments(data || []);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    Alert.alert("Delete Comment", "Are you sure you want to remove this feedback?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          const isMediaServerPost = postId && (String(postId).includes('pendrive_media') || String(postId).includes('.mp4') || String(postId).includes('VX_'));
          if (isMediaServerPost) {
            const cleanName = String(postId).replace(/^pendrive_media_\d+_/, '');
            await fetch(`http://192.168.31.39:8080/api/comments?file=${encodeURIComponent(cleanName)}&cmtId=${encodeURIComponent(commentId)}`, {
              method: 'DELETE'
            }).catch(() => {});
            setComments(c => c.filter(item => item.id !== commentId));
          } else {
            const { error } = await supabase.from('comments').delete().eq('id', commentId);
            if (!error) setComments(c => c.filter(item => item.id !== commentId));
          }
      }}
    ]);
  };

  const togglePin = async (commentId: string, isPinned: boolean) => {
    const { error } = await supabase.from('comments').update({ is_pinned: !isPinned }).eq('id', commentId);
    if (!error) {
       setComments(c => c.map(item => item.id === commentId ? { ...item, is_pinned: !isPinned } : item));
    }
  };

  const renderComment = ({ item }: { item: any }) => (
    <View style={styles.commentItem}>
      <Image source={{ uri: item.profiles?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.avatar} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.commentHeader}>
          <Text style={styles.username}>{item.profiles?.username}</Text>
          {item.is_pinned && <Ionicons name="pin" size={12} color={VOEXITheme.colors.primary} />}
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <View style={styles.actions}>
         <TouchableOpacity onPress={() => togglePin(item.id, item.is_pinned)} style={styles.actionBtn}>
            <Ionicons name="pin-outline" size={18} color={item.is_pinned ? VOEXITheme.colors.primary : "#444"} />
         </TouchableOpacity>
         <TouchableOpacity onPress={() => deleteComment(item.id)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color="#ff4444" />
         </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>COMMENT MODERATOR</Text>
        <TouchableOpacity onPress={fetchComments}><Ionicons name="refresh" size={20} color="#fff" /></TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={VOEXITheme.colors.primary} /></View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={item => item.id}
          renderItem={renderComment}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No comments found for this production.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  commentItem: { flexDirection: 'row', backgroundColor: '#080808', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#111' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  username: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  commentText: { color: '#888', fontSize: 13, marginTop: 4 },
  date: { color: '#333', fontSize: 10, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 15, alignItems: 'center' },
  actionBtn: { padding: 5 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50, fontWeight: 'bold' }
});
