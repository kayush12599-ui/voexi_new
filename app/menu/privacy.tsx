import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VOEXITheme } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MEDIA_SERVER_URL } from '../../constants/config';

const LOCAL_SERVER_URL = MEDIA_SERVER_URL;

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const [privacyData, setPrivacyData] = useState<any>({
    last_updated: "November 2026",
    section_1_title: "1. Data Collection & Usage",
    section_1_body: "VOEXI collects minimal data required for a premium experience, including username, email, and media uploaded by you. We do not sell your personal data to third parties.",
    section_2_title: "2. AI Disclosure",
    section_2_body: "Our platform uses Artificial Intelligence (AI) to enhance video quality and process premium audio. By using VOEXI, you acknowledge that some content or responses may be AI-generated.",
    section_3_title: "3. Media Permissions",
    section_3_body: "We request access to your Camera and Microphone only when you choose to record or upload a production. Your media is securely stored on our encrypted servers.",
    section_4_title: "4. Monetization & Coins",
    section_4_body: "Data related to your earnings and VX Coins is encrypted. We use this information only to process your rewards and withdrawals.",
    section_5_title: "5. Contact Us",
    section_5_body: "If you have any questions regarding your privacy, please contact our support team at support@voexi.com."
  });

  useEffect(() => {
    loadPrivacyContent();
  }, []);

  const loadPrivacyContent = async () => {
    // 1. Instant Cache Restore
    try {
      const cached = await AsyncStorage.getItem('@cached_layer3_privacy_data');
      if (cached) setPrivacyData(JSON.parse(cached));
    } catch (e) {}

    // 2. Fetch Live Updates from Local Server 2
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${LOCAL_SERVER_URL}/app-info.json`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timer);

      if (res && res.ok) {
        const data = await res.json();
        const pData = data?.layer3_privacy || null;
        if (pData) {
          setPrivacyData(pData);
          await AsyncStorage.setItem('@cached_layer3_privacy_data', JSON.stringify(pData));
        }
      }
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PRIVACY POLICY</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: {privacyData?.last_updated || 'November 2026'}</Text>

        <Text style={styles.sectionTitle}>{privacyData?.section_1_title || '1. Data Collection & Usage'}</Text>
        <Text style={styles.text}>{privacyData?.section_1_body}</Text>

        <Text style={styles.sectionTitle}>{privacyData?.section_2_title || '2. AI Disclosure'}</Text>
        <Text style={styles.text}>{privacyData?.section_2_body}</Text>

        <Text style={styles.sectionTitle}>{privacyData?.section_3_title || '3. Media Permissions'}</Text>
        <Text style={styles.text}>{privacyData?.section_3_body}</Text>

        <Text style={styles.sectionTitle}>{privacyData?.section_4_title || '4. Monetization & Coins'}</Text>
        <Text style={styles.text}>{privacyData?.section_4_body}</Text>

        <Text style={styles.sectionTitle}>{privacyData?.section_5_title || '5. Contact Us'}</Text>
        <Text style={styles.text}>{privacyData?.section_5_body}</Text>

        {Array.isArray(privacyData?.extra_sections) && privacyData.extra_sections.map((sec: any, idx: number) => (
          <View key={`extra_sec_${idx}`}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <Text style={styles.text}>{sec.body}</Text>
          </View>
        ))}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  content: { padding: 25 },
  lastUpdated: { color: '#444', fontSize: 10, marginBottom: 20, fontWeight: 'bold' },
  sectionTitle: { color: VOEXITheme.colors.primary, fontSize: 14, fontWeight: 'bold', marginTop: 25, marginBottom: 10 },
  text: { color: '#888', fontSize: 13, lineHeight: 22 }
});
