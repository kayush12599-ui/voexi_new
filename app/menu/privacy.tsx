import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VOEXITheme } from '../../constants/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PRIVACY POLICY</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: October 2023</Text>

        <Text style={styles.sectionTitle}>1. Data Collection</Text>
        <Text style={styles.text}>
          VOEXI collects minimal data required for a premium experience, including username, email, and media uploaded by you. We do not sell your personal data to third parties.
        </Text>

        <Text style={styles.sectionTitle}>2. AI Disclosure</Text>
        <Text style={styles.text}>
          Our platform uses Artificial Intelligence (AI) to enhance video quality and process premium audio. By using VOEXI, you acknowledge that some content or responses may be AI-generated.
        </Text>

        <Text style={styles.sectionTitle}>3. Media Permissions</Text>
        <Text style={styles.text}>
          We request access to your Camera and Microphone only when you choose to record or upload a production. Your media is securely stored on our encrypted servers.
        </Text>

        <Text style={styles.sectionTitle}>4. Monetization & Coins</Text>
        <Text style={styles.text}>
          Data related to your earnings and VX Coins is encrypted. We use this information only to process your rewards and withdrawals.
        </Text>

        <Text style={styles.sectionTitle}>5. Contact Us</Text>
        <Text style={styles.text}>
          If you have any questions regarding your privacy, please contact our support team at support@voexi.com.
        </Text>

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
