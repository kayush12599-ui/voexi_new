import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { VOEXITheme } from '../../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const POLICY_DATA: Record<string, any> = {
  community: {
    title: 'Community Guidelines',
    icon: 'account-group',
    color: '#ff0055',
    sections: [
      { t: 'Original Content Only', d: 'VOEXI is a platform for original broadcast signals. All transmitted media must be your own creation.' },
      { t: 'No Spam', d: 'Automated transmissions, repetitive messaging, or deceptive behavior is strictly prohibited.' },
      { t: 'No Fake Engagement', d: 'Any attempt to artificially inflate views, likes, or subscribers will lead to immediate station suspension.' },
      { t: 'No Harassment or Bullying', d: 'We maintain a respectful frequency. Hate speech, bullying, or harassment is forbidden.' },
      { t: 'No Illegal Content', d: 'Transmitting content promoting illegal activities, weapons, or harmful substances is prohibited.' },
      { t: 'No Copyright Infringement', d: 'Respect intellectual property. Do not broadcast content that you do not own rights to.' },
      { t: 'Respect Other Users', d: 'Treat every broadcaster and viewer with respect to maintain a healthy network environment.' }
    ]
  },
  creator: {
    title: 'Creator Guidelines',
    icon: 'fountain-pen-tip',
    color: '#00ccff',
    sections: [
      { t: 'Create Original Content', d: 'Your station should reflect your unique voice. High-quality original productions are our priority.' },
      { t: 'No Fake Followers', d: 'Buying subscribers or using bot services is a direct violation of platform integrity.' },
      { t: 'No Fake Views', d: 'Using software to loop or simulate views will result in monetization termination.' },
      { t: 'No Engagement Manipulation', d: 'Coordinated like-for-like or comment-for-comment schemes are not permitted.' },
      { t: 'No Multiple-Account Farming', d: 'Creating multiple accounts to boost engagement or farm rewards is strictly forbidden.' },
      { t: 'Follow Platform Rules', d: 'Adhere to all safety and technical standards provided in the Signal Studio.' }
    ]
  },
  monetization: {
    title: 'Monetization Rules',
    icon: 'database',
    color: '#ffcc00',
    sections: [
      { t: 'No Earning Abuse', d: 'VX Coins must be earned through genuine interaction and original uploads only.' },
      { t: 'No Fake Traffic', d: 'Earnings will be restricted for accounts detected using traffic-exchange or VPN services.' },
      { t: 'No Bot Activity', d: 'Accounts using automated scripts to claim rewards will be permanently banned.' },
      { t: 'No Reward Farming', d: 'Coordinated efforts to exploit reward systems are tracked and penalized.' },
      { t: 'Violation Penalties', d: 'Policy violations will lead to earning restrictions, coin deduction, or account termination.' }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    icon: 'shield-lock',
    color: '#00ffaa',
    sections: [
      { t: 'Data Collection', d: 'We collect minimal data necessary for broadcasting services, including account details and device IDs.' },
      { t: 'Information Usage', d: 'Your information is used to personalize your feed, secure your VX Wallet, and improve AI features.' },
      { t: 'Storage & Security', d: 'All media is stored on encrypted Bunny.net storage with strict enterprise-level security.' },
      { t: 'User Rights', d: 'You have the right to access your data, request deletion, or update your privacy mode at any time.' }
    ]
  },
  terms: {
    title: 'Terms of Use',
    icon: 'file-document-edit',
    color: '#aa00ff',
    sections: [
      { t: 'User Responsibilities', d: 'You are legally responsible for all content transmitted from your station.' },
      { t: 'Account Rules', d: 'One person, one account. Account sharing or unauthorized access attempts are prohibited.' },
      { t: 'Content Ownership', d: 'You retain ownership, but grant VOEXI a global license to broadcast your content.' },
      { t: 'Platform Rights', d: 'VOEXI reserves the right to remove content or disable stations that violate guidelines.' },
      { t: 'Enforcement Actions', d: 'Decisions made by the VOEXI AI and safety team regarding policy enforcement are final.' }
    ]
  }
};

export default function PolicyDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const data = POLICY_DATA[id as string];

  if (!data) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleStack}>
          <Text style={styles.headerTitle}>{data.title.toUpperCase()}</Text>
          <Text style={styles.headerSub}>Effective October 2024</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={[data.color + '22', 'transparent']} style={styles.topIconSection}>
           <MaterialCommunityIcons name={data.icon} size={60} color={data.color} />
        </LinearGradient>

        <View style={styles.content}>
           {data.sections.map((s: any, i: number) => (
             <View key={i} style={styles.section}>
                <View style={styles.bulletRow}>
                   <View style={[styles.bullet, { backgroundColor: data.color }]} />
                   <Text style={[styles.sectionTitle, { color: data.color }]}>{s.t}</Text>
                </View>
                <Text style={styles.sectionDesc}>{s.d}</Text>
             </View>
           ))}
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerText}>Need more help? Contact our Support Team.</Text>
           <TouchableOpacity
             style={[styles.contactBtn, { borderColor: data.color }]}
             onPress={() => router.push({
               pathname: '/menu/web-portal',
               params: { url: 'https://support.voexi.com/support/login', title: 'VOEXI SUPPORT' }
             })}
           >
              <Text style={[styles.contactBtnText, { color: data.color }]}>OPEN SUPPORT SIGNAL</Text>
           </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  titleStack: { marginLeft: 15 },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: '#444', fontSize: 9, fontWeight: 'bold', marginTop: 2 },
  scrollContent: { paddingBottom: 50 },
  topIconSection: { height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  content: { padding: 25 },
  section: { marginBottom: 35 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  bullet: { width: 4, height: 15, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  sectionDesc: { color: '#888', fontSize: 13, lineHeight: 22, fontWeight: '500' },
  footer: { padding: 30, alignItems: 'center', backgroundColor: '#050505', marginTop: 20 },
  footerText: { color: '#444', fontSize: 11, fontWeight: 'bold', marginBottom: 20 },
  contactBtn: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 30, borderWidth: 1 },
  contactBtnText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});
