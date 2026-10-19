import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * VOEXI SECURE WEB PORTAL
 * Unified interface for loading official VOEXI web content.
 */
export default function WebPortal() {
  const router = useRouter();
  const { url, title } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const targetUrl = typeof url === 'string' ? url : 'https://support.voexi.com/support/login';
  const displayTitle = typeof title === 'string' ? title : 'VOEXI WEB';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayTitle.toUpperCase()}</Text>
        <TouchableOpacity onPress={() => { setError(false); setLoading(true); }} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#00F2FE" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {!error ? (
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
            <Ionicons name="cloud-offline-outline" size={80} color="#FF0080" />
            <Text style={styles.errorTitle}>CONNECTION LOST</Text>
            <Text style={styles.errorSub}>The neural uplink to VOEXI servers could not be established.</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setError(false); setLoading(true); }}
            >
              <Text style={styles.retryText}>RETRY CONNECTION</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && !error && (
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
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  refreshBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  content: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#0B0B0F' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B0B0F',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  loadingText: { color: '#A855F7', fontSize: 10, fontWeight: '900', marginTop: 15, letterSpacing: 3 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 25, letterSpacing: 2 },
  errorSub: { color: '#666', fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  retryBtn: {
    marginTop: 30,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#00F2FE'
  },
  retryText: { color: '#00F2FE', fontSize: 11, fontWeight: '900', letterSpacing: 1 }
});
