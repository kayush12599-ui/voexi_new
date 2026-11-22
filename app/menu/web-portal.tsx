import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * VOEXI SECURE WEB PORTAL
 * Unified interface for loading official VOEXI web content & Local Media Server Web Dashboard.
 */
export default function WebPortal() {
  const router = useRouter();
  const { url, title } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const targetUrl = typeof url === 'string' ? url : 'http://192.168.31.39:8080';
  const displayTitle = typeof title === 'string' ? title : 'VOEXI WEB SERVER';

  // 2500ms Safety Timeout Shield for Loading Spinner
  useEffect(() => {
    let timer: any = null;
    if (loading) {
      timer = setTimeout(() => {
        setLoading(false);
      }, 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading]);

  const openInSystemBrowser = () => {
    try {
      Linking.openURL(targetUrl).catch(() => {});
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle.toUpperCase()}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity onPress={openInSystemBrowser} style={styles.openBrowserBtn}>
            <Ionicons name="open-outline" size={18} color="#00F2FE" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setError(false); setLoading(true); }} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color="#A855F7" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {Platform.OS === 'web' ? (
          /* Web Browser Viewport */
          <View style={styles.webFallbackContainer}>
            <LinearGradient colors={['#0B0B0F', '#050508']} style={StyleSheet.absoluteFill} />
            <Ionicons name="server-outline" size={70} color="#00F2FE" />
            <Text style={styles.errorTitle}>{displayTitle.toUpperCase()}</Text>
            <Text style={styles.errorSub}>Tap below to open the Local Media Server Web Dashboard directly in your browser.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={openInSystemBrowser}>
              <Text style={styles.retryText}>🌐 OPEN WEB DASHBOARD ({targetUrl})</Text>
            </TouchableOpacity>
          </View>
        ) : !error ? (
          <WebView
            source={{ uri: targetUrl }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setError(true);
              setLoading(false);
            }}
            style={styles.webview}
            scalesPageToFit
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            allowFileAccess={true}
            allowsInlineMediaPlayback={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#A855F7" />
              </View>
            )}
          />
        ) : (
          <View style={styles.errorContainer}>
            <LinearGradient colors={['#0B0B0F', '#000']} style={StyleSheet.absoluteFill} />
            <Ionicons name="cloud-offline-outline" size={70} color="#FF0080" />
            <Text style={styles.errorTitle}>CONNECTION LOST</Text>
            <Text style={styles.errorSub}>The neural uplink to Local Media Server ({targetUrl}) could not be established.</Text>
            <TouchableOpacity style={[styles.retryBtn, { marginTop: 15 }]} onPress={openInSystemBrowser}>
              <Text style={styles.retryText}>🌐 OPEN IN BROWSER</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.retryBtn, { marginTop: 10, borderColor: '#A855F7' }]} onPress={() => { setError(false); setLoading(true); }}>
              <Text style={[styles.retryText, { color: '#A855F7' }]}>RETRY CONNECTION</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && !error && Platform.OS !== 'web' && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#A855F7" />
            <Text style={styles.loadingText}>SYNCHRONIZING...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  refreshBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  openBrowserBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 242, 254, 0.12)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.3)' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center', marginHorizontal: 8 },
  content: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#0B0B0F' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  webFallbackContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B0B0F',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: { color: '#A855F7', fontSize: 10, fontWeight: '900', marginTop: 15, letterSpacing: 3 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  errorTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 20, letterSpacing: 2 },
  errorSub: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#00F2FE',
  },
  retryText: { color: '#00F2FE', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});
