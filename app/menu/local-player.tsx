import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LocalPlayer() {
  const { uri, type } = useLocalSearchParams();
  const router = useRouter();
  const player = useVideoPlayer(String(uri));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={30} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>OFFLINE PLAYER</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.playerContainer}>
        {type === 'video' ? (
          <VideoView player={player} style={styles.video} contentFit="contain" />
        ) : (
          <View style={styles.audioPlaceholder}>
             <Ionicons name="musical-note" size={100} color="#222" />
             <Text style={styles.audioText}>Playing Local Audio</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
         <TouchableOpacity onPress={() => player.playing ? player.pause() : player.play()}>
            <Ionicons name={player.playing ? "pause-circle" : "play-circle"} size={80} color="#fff" />
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  playerContainer: { flex: 1, justifyContent: 'center' },
  video: { width: '100%', height: '100%' },
  audioPlaceholder: { alignItems: 'center' },
  audioText: { color: '#444', marginTop: 20, fontWeight: 'bold' },
  controls: { padding: 40, alignItems: 'center' }
});
