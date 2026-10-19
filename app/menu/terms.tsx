import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');
const THEME = {
  bg: '#000',
  card: '#0D0D12',
  accent: '#7C5CFF',
  green: '#10B981',
  secondary: '#00D4FF',
  text: '#FFFFFF',
  textDim: '#8E8E93',
  border: '#1C1C1E',
  gold: '#FFD700'
};

export default function TermsAndGuidelinesScreen() {
  const router = useRouter();
  const { theme: themeMode, isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<'terms' | 'guidelines' | 'monetization' | 'privacy'>('terms');

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: '#fff' }]}>
      <LinearGradient colors={isLight ? ['#fff', '#f9f9f9'] : ['#000', '#050505']} style={StyleSheet.absoluteFill} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={isLight ? '#000' : '#fff'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>TERMS & GUIDELINES</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* TABS SELECTOR */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
        {[
          { id: 'terms', label: 'TERMS OF SERVICE', icon: 'document-text-outline' },
          { id: 'guidelines', label: 'COMMUNITY GUIDELINES', icon: 'shield-checkmark-outline' },
          { id: 'monetization', label: 'CREATOR MONETIZATION', icon: 'wallet-outline' },
          { id: 'privacy', label: 'PRIVACY POLICY', icon: 'lock-closed-outline' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setActiveTab(t.id as any)}
            style={[
              styles.tabPill,
              activeTab === t.id && { backgroundColor: THEME.accent, borderColor: THEME.accent },
              isLight && activeTab !== t.id && { backgroundColor: '#F5F5F5', borderColor: '#EEE' }
            ]}
          >
            <Ionicons name={t.icon as any} size={14} color={activeTab === t.id ? '#fff' : (isLight ? '#333' : '#888')} />
            <Text style={[styles.tabPillText, activeTab === t.id && { color: '#fff', fontWeight: 'bold' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* SECTION 1: TERMS OF SERVICE */}
        {activeTab === 'terms' && (
          <View style={styles.contentSection}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={22} color={THEME.accent} />
              <Text style={styles.cardTitle}>VOEXI TERMS OF SERVICE</Text>
            </View>

            <Text style={styles.paragraph}>
              Welcome to VOEXI. By accessing or using our application, media feeds, AI services, and community clusters, you agree to be bound by these Terms of Service.
            </Text>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>1. Account Ownership & Identity</Text>
              <Text style={styles.ruleDesc}>
                Each VOEXI user is assigned a unique Neural Identity (VX Station ID). You are solely responsible for maintaining the confidentiality of your account credentials, security PIN, and connected emails.
              </Text>
            </View>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>2. Content Ownership & Rights</Text>
              <Text style={styles.ruleDesc}>
                Creators retain full ownership of all original short videos, live streams, and media published on VOEXI. By uploading, you grant VOEXI a non-exclusive license to index, stream, and distribute your content across the network.
              </Text>
            </View>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>3. AI Assistant & Automated Services</Text>
              <Text style={styles.ruleDesc}>
                VOEXI AI responses and image synthesis features are provided for creative assistance. Generated content must comply with community safety rules and copyright regulations.
              </Text>
            </View>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>4. Account Termination</Text>
              <Text style={styles.ruleDesc}>
                VOEXI reserves the right to suspend or terminate accounts that engage in spam, fraud, abusive behavior, or severe policy violations.
              </Text>
            </View>
          </View>
        )}

        {/* SECTION 2: COMMUNITY GUIDELINES */}
        {activeTab === 'guidelines' && (
          <View style={styles.contentSection}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={22} color={THEME.secondary} />
              <Text style={styles.cardTitle}>COMMUNITY SAFETY GUIDELINES</Text>
            </View>

            <Text style={styles.paragraph}>
              VOEXI is committed to maintaining a safe, creative, and respectful environment for all broadcasters and community members.
            </Text>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>🚫 Zero Tolerance for Harassment & Hate Speech</Text>
              <Text style={styles.ruleDesc}>
                Bullying, discrimination, hate speech, or targeted harassment against any individual or group in chats, comments, or live streams is strictly prohibited.
              </Text>
            </View>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>🔞 Harmful & Explicit Content</Text>
              <Text style={styles.ruleDesc}>
                Explicit adult content, violence, self-harm promotion, and illegal activities are strictly banned and filtered by the automated Neural Audit Engine.
              </Text>
            </View>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>🛡️ Cluster & Group Moderation</Text>
              <Text style={styles.ruleDesc}>
                Cluster Leaders and Admins have full authority to set cluster rules, restrict member powers, and manage active agents to maintain community safety.
              </Text>
            </View>
          </View>
        )}

        {/* SECTION 3: CREATOR MONETIZATION POLICY */}
        {activeTab === 'monetization' && (
          <View style={styles.contentSection}>
            <View style={styles.cardHeader}>
              <Ionicons name="wallet" size={22} color={THEME.green} />
              <Text style={styles.cardTitle}>CREATOR MONETIZATION POLICY</Text>
            </View>

            <Text style={styles.paragraph}>
              Our monetization program rewards creators for authentic engagement, high-quality content, and cluster community building.
            </Text>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>🎯 Eligibility Criteria</Text>
              <Text style={styles.ruleDesc}>
                To apply for monetization, creators must achieve a minimum of 500 Subscribers and 100,000 Verified Video Views, followed by Channel Phone & Email OTP verification.
              </Text>
            </View>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>💎 100% Real Revenue Breakdown</Text>
              <Text style={styles.ruleDesc}>
                • Virtual Gifts: Receive 100% real value from chat & live stream gifts.{"\n"}
                • Short Video Ad Share: Earn ₹50 per 1,000 verified views.{"\n"}
                • Cluster Subscriptions: Retain channel membership revenue.
              </Text>
            </View>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>🔒 Transaction PIN & Cashouts</Text>
              <Text style={styles.ruleDesc}>
                All withdrawal requests require verification with your 4-Digit Security PIN. Minimum cashout is ₹100 via UPI, Paytm, or Direct Bank Transfer.
              </Text>
            </View>
          </View>
        )}

        {/* SECTION 4: PRIVACY POLICY */}
        {activeTab === 'privacy' && (
          <View style={styles.contentSection}>
            <View style={styles.cardHeader}>
              <Ionicons name="lock-closed" size={22} color={THEME.gold} />
              <Text style={styles.cardTitle}>PRIVACY & DATA SECURITY</Text>
            </View>

            <Text style={styles.paragraph}>
              Your privacy and data security are our top priorities. VOEXI uses advanced encryption to protect your personal information and messages.
            </Text>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>🔒 Encrypted Signals & Messages</Text>
              <Text style={styles.ruleDesc}>
                Direct signals, voice notes, and private view-once media are protected using end-to-end security protocols.
              </Text>
            </View>

            <View style={styles.ruleBox}>
              <Text style={styles.ruleTitle}>🛡️ No Third-Party Data Selling</Text>
              <Text style={styles.ruleDesc}>
                VOEXI never sells your personal contact details, residential address, or financial payout data to third-party advertisers.
              </Text>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  tabsScroll: { paddingHorizontal: 20, gap: 10, paddingBottom: 15 },
  tabPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: '#0A0A10', borderWidth: 1, borderColor: '#1A1A24' },
  tabPillText: { color: '#888', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  contentSection: { gap: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  paragraph: { color: '#aaa', fontSize: 13, lineHeight: 20 },
  ruleBox: { backgroundColor: THEME.card, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: THEME.border, gap: 6 },
  ruleTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  ruleDesc: { color: '#888', fontSize: 12, lineHeight: 18 }
});
