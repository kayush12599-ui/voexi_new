import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MEDIA_SERVER_URL } from '../../constants/config';

const LOCAL_SERVER_URL = MEDIA_SERVER_URL;

export default function CommunityGuidelines() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverGuidelines, setServerGuidelines] = useState<any>(null);

  useEffect(() => {
    loadServerGuidelines();
  }, []);

  const loadServerGuidelines = async () => {
    // 1. Instant Cache Restore
    try {
      const cached = await AsyncStorage.getItem('@cached_community_guidelines_data');
      if (cached) setServerGuidelines(JSON.parse(cached));
    } catch (e) {}

    // 2. Fetch Live Updates from Local Server 2
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${LOCAL_SERVER_URL}/app-info.json`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timer);

      if (res && res.ok) {
        const data = await res.json();
        const gData = data?.layer2_guidelines || data?.community_guidelines_data || null;
        if (gData) {
          setServerGuidelines(gData);
          await AsyncStorage.setItem('@cached_community_guidelines_data', JSON.stringify(gData));
        }
      }
    } catch (e) {}
  };

  const DEFAULT_GUIDELINES = [
    {
      title: "Content Safety",
      icon: "shield-checkmark",
      rules: [
        serverGuidelines?.rule_1 || "Do not upload sexually explicit or adult content.",
        serverGuidelines?.rule_2 || "Violence and graphic content that encourages harm is strictly prohibited.",
        serverGuidelines?.rule_3 || "Illegal acts, including drug use or promotion, are not allowed."
      ]
    },
    {
      title: "Respect & Harassment",
      icon: "people",
      rules: [
        "Treat all creators and viewers with respect.",
        "Hate speech based on race, religion, gender, or orientation will result in an immediate ban.",
        "Harassment, bullying, and doxxing are strictly forbidden."
      ]
    },
    {
      title: "Intellectual Property",
      icon: "copy",
      rules: [
        "Only upload content that you own or have permission to use.",
        "Copyright infringement will lead to content removal and potential strikes."
      ]
    },
    {
      title: "Spam & Deception",
      icon: "alert-circle",
      rules: [
        "Do not post spam, scams, or deceptive metadata.",
        "Impersonation of other users or public figures is prohibited."
      ]
    }
  ];

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          router.replace('/(auth)/login');
          return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ guidelines_accepted: true })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert("Welcome to VOEXI", "Guidelines accepted. You now have full access to the Spectrum Network.");
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert("Error", "Transmission failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', left: 20 }}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{serverGuidelines?.title || 'COMMUNITY GUIDELINES'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          VOEXI is a platform for creativity and signal sharing. To maintain the integrity of our network, all broadcasters must adhere to these rules.
        </Text>

        {DEFAULT_GUIDELINES.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon as any} size={20} color={VOEXITheme.colors.primary} />
              <Text style={sectionStyles.title}>{section.title.toUpperCase()}</Text>
            </View>
            <View style={styles.ruleBox}>
              {section.rules.map((rule, rIdx) => (
                <View key={rIdx} style={styles.ruleRow}>
                  <View style={styles.dot} />
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
           <Text style={styles.footerText}>By clicking accept, you agree to follow these guidelines. Violations may result in content removal, warnings, or account suspension.</Text>

           <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={loading}>
              <LinearGradient colors={[VOEXITheme.colors.primary, '#9333ea']} style={styles.btnInner}>
                 {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>I ACCEPT THE GUIDELINES</Text>}
              </LinearGradient>
           </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const sectionStyles = StyleSheet.create({
    title: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1.5, marginLeft: 10 }
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 25, borderBottomWidth: 1, borderBottomColor: '#111', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  content: { padding: 25 },
  intro: { color: '#666', fontSize: 13, lineHeight: 22, marginBottom: 30, textAlign: 'center' },
  section: { marginBottom: 35 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  ruleBox: { backgroundColor: '#080808', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#111' },
  ruleRow: { flexDirection: 'row', marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: VOEXITheme.colors.secondary, marginTop: 8, marginRight: 12 },
  ruleText: { flex: 1, color: '#aaa', fontSize: 13, lineHeight: 20 },
  footer: { marginTop: 20, marginBottom: 50 },
  footerText: { color: '#444', fontSize: 11, textAlign: 'center', marginBottom: 30, lineHeight: 18 },
  acceptBtn: { borderRadius: 30, overflow: 'hidden' },
  btnInner: { paddingVertical: 18, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 }
});
