import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, StatusBar, Share } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const getValidAvatarUrl = (rawUrl?: string | null, name: string = 'User'): string => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=A855F7&color=fff&bold=true`;
  }
  let url = rawUrl.trim();
  if (url === '' || url === 'null' || url === 'undefined') {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=A855F7&color=fff&bold=true`;
  }
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/uploads/') || url.startsWith('/files/') || url.startsWith('/avatar/') || url.startsWith('/logos/')) {
    return `http://192.168.31.39:8080${url}`;
  }
  if (url.startsWith('uploads/') || url.startsWith('files/') || url.startsWith('avatar/') || url.startsWith('logos/')) {
    return `http://192.168.31.39:8080/${url}`;
  }
  if (url.startsWith('/')) return `https://voexi.b-cdn.net${url}`;
  if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('content://')) {
    return `https://voexi.b-cdn.net/${url}`;
  }
  return url;
};

export default function PhotoFeedPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const photoUri = String(params.media_url || params.thumbnail_url || '');
  const rawTitle = String(params.title || params.content || 'VOEXI Photo');
  const description = String(params.description || '');
  const channelName = String(params.channel_name || params.uploader || 'VOEXI Official');
  const uploader = String(params.uploader || 'voexi_official');
  const avatarUrl = getValidAvatarUrl(params.avatar_url as string, channelName);
  const likesCount = String(params.likes_count || '0');

  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(parseInt(likesCount) || 0);

  const cleanTitle = (() => {
    let raw = rawTitle;
    if (raw.endsWith('.mp4') || raw.endsWith('.jpg') || raw.endsWith('.png') || raw.startsWith('VID_') || raw.startsWith('file_')) {
      raw = raw.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/-/g, " ");
      raw = raw.replace(/VID\s*\d+/gi, "VOEXI Photo Release");
    }
    return raw;
  })();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this photo on VOEXI by @${uploader}:\n\n${cleanTitle}\n${photoUri}`,
        url: photoUri
      });
    } catch {
      // Share optional
    }
  };

  const handleLike = () => {
    setIsLiked(prev => !prev);
    setLikes(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>PHOTO PORTFOLIO</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* CREATOR ROW */}
        <View style={styles.creatorRow}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.channelName}>{channelName}</Text>
              <Ionicons name="checkmark-circle" size={14} color="#00F2FE" />
            </View>
            <Text style={styles.username}>@{uploader}</Text>
          </View>
        </View>

        {/* FULL IMAGE DISPLAY */}
        {photoUri ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: photoUri }}
              style={styles.mainPhoto}
              contentFit="contain"
            />
          </View>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Ionicons name="image-outline" size={50} color="#333" />
            <Text style={{ color: '#666', marginTop: 10 }}>Photo unrenderable</Text>
          </View>
        )}

        {/* ACTIONS & CAPTION */}
        <View style={styles.detailsContainer}>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "#FF017E" : "#fff"} />
              <Text style={styles.actionText}>{likes}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
              <Ionicons name="paper-plane-outline" size={22} color="#fff" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{cleanTitle}</Text>
          {description ? <Text style={styles.desc}>{description}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.08)', justifyContent: 'center', alignItems: 'center' },
  creatorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#333' },
  channelName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  username: { color: '#888', fontSize: 11, marginTop: 1 },
  imageWrapper: { width: '100%', minHeight: 350, backgroundColor: '#050508', justifyContent: 'center', alignItems: 'center' },
  mainPhoto: { width: '100%', height: 420 },
  noImagePlaceholder: { width: '100%', height: 280, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  detailsContainer: { paddingHorizontal: 16, paddingTop: 16 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: '#ccc', fontSize: 12, fontWeight: 'bold' },
  title: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  desc: { color: '#aaa', fontSize: 13, lineHeight: 18 },
});
