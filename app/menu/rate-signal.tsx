import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, Animated, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { VOEXITheme } from '../../constants/theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function RateSignal() {
  const router = useRouter();
  const { postId, title } = useLocalSearchParams();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const glowAnim = useState(new Animated.Value(0))[0];

  const handleRate = (val: number) => {
    setRating(val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(glowAnim, { toValue: val / 5, useNativeDriver: false }).start();
  };

  const submitRating = async () => {
    if (rating === 0) return Alert.alert("SIGNAL ERROR", "Please select point intensity (1-5).");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication Lost");

      const { error } = await supabase.from('post_ratings').upsert({
        user_id: user.id,
        post_id: postId,
        rating,
        comment: comment.trim()
      });

      if (error) throw error;

      Alert.alert("SIGNAL SYNCED", "Your neural rating has been locked into the spectrum.");
      router.back();
    } catch (e: any) {
      Alert.alert("SYNC FAILED", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0a0a1a', '#000']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={30} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>NEURAL RATING</Text>
        <View style={{width: 30}} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subTitle}>AUDITING SIGNAL:</Text>
        <Text style={styles.postTitle}>"{title}"</Text>

        <View style={styles.starContainer}>
          {[1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity key={num} onPress={() => handleRate(num)} activeOpacity={0.7}>
              <Animated.View style={{ transform: [{ scale: rating === num ? 1.2 : 1 }] }}>
                 <Ionicons
                    name={num <= rating ? "star" : "star-outline"}
                    size={45}
                    color={num <= rating ? VOEXITheme.colors.primary : "#222"}
                 />
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.intensityText}>INTENSITY: {rating}/5 POINTS</Text>

        <View style={styles.inputBox}>
          <Text style={styles.label}>TRANSMISSION LOG (REVIEW)</Text>
          <TextInput
            style={styles.input}
            placeholder="What is your psychological feedback on this broadcast?"
            placeholderTextColor="#333"
            multiline
            value={comment}
            onChangeText={setComment}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={submitRating} disabled={loading}>
          <LinearGradient colors={[VOEXITheme.colors.primary, '#4c1d95']} style={styles.btnGrad}>
             {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>SYNC RATING</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  content: { padding: 30, alignItems: 'center' },
  subTitle: { color: '#444', fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  postTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  starContainer: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  intensityText: { color: VOEXITheme.colors.primary, fontWeight: '900', fontSize: 12, letterSpacing: 2, marginBottom: 50 },
  inputBox: { width: '100%', marginBottom: 40 },
  label: { color: '#444', fontSize: 9, fontWeight: '900', marginBottom: 15 },
  input: { backgroundColor: '#050505', borderBottomWidth: 1, borderColor: '#111', color: '#fff', padding: 20, fontSize: 14, minHeight: 120, textAlignVertical: 'top', borderRadius: 20 },
  submitBtn: { width: '100%', borderRadius: 20, overflow: 'hidden', height: 65 },
  btnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 14 }
});
