import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';

export interface AvatarLoadingProps {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function AvatarLoading({ isLoading, error, onRetry }: AvatarLoadingProps) {
  if (!isLoading && !error) return null;

  return (
    <View style={styles.loadingContainer}>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={styles.errorTitle}>Avatar couldn't be loaded</Text>
          <Text style={styles.errorSub}>{error}</Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={VOEXITheme.colors.primary} />
          <Text style={styles.loadingText}>Preparing your Avatar...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05050A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50
  },
  loadingBox: {
    alignItems: 'center',
    gap: 15
  },
  loadingText: {
    color: '#A855F7',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  errorBox: {
    alignItems: 'center',
    paddingHorizontal: 30,
    gap: 10
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900'
  },
  errorSub: {
    color: '#71717A',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16
  },
  retryBtn: {
    marginTop: 15,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#A855F7'
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900'
  }
});
