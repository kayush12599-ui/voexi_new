import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface SubscribeButtonProps {
  isSubscribed: boolean;
  onPress: () => void;
  showBell?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function SubscribeButton({
  isSubscribed,
  onPress,
  showBell = true,
  size = 'medium'
}: SubscribeButtonProps) {
  const [bellActive, setBellActive] = useState(isSubscribed);

  const handleSubscribe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };

  const handleBellToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setBellActive(!bellActive);
    Alert.alert("NOTIFICATIONS", bellActive ? "Notifications muted for this channel." : "All notifications enabled for this channel!");
  };

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleSubscribe}
        style={[
          styles.pillTouch,
          isSmall && styles.pillTouchSmall,
          isLarge && styles.pillTouchLarge
        ]}
      >
        <LinearGradient
          colors={isSubscribed ? ['#181824', '#0f0f18'] : ['#a855f7', '#ec4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradientPill,
            isSubscribed && styles.subscribedBorder,
            isSmall && styles.gradientPillSmall,
            isLarge && styles.gradientPillLarge
          ]}
        >
          {isSubscribed ? (
            <>
              <Ionicons name="checkmark-circle" size={isSmall ? 13 : 16} color="#a855f7" />
              <Text style={[styles.btnText, styles.subscribedText, isSmall && styles.btnTextSmall]}>SUBSCRIBED</Text>
            </>
          ) : (
            <>
              <Ionicons name="add" size={isSmall ? 14 : 18} color="#fff" />
              <Text style={[styles.btnText, isSmall && styles.btnTextSmall]}>SUBSCRIBE</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {showBell && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleBellToggle}
          style={[
            styles.bellBtn,
            isSmall && styles.bellBtnSmall,
            bellActive && styles.bellBtnActive
          ]}
        >
          <Ionicons
            name={bellActive ? "notifications" : "notifications-outline"}
            size={isSmall ? 14 : 18}
            color={bellActive ? "#FFD700" : "#fff"}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillTouch: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  pillTouchSmall: {
    borderRadius: 18,
  },
  pillTouchLarge: {
    borderRadius: 30,
  },
  gradientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  gradientPillSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 4,
  },
  gradientPillLarge: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  subscribedBorder: {
    borderWidth: 1.5,
    borderColor: '#a855f7',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  btnTextSmall: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  subscribedText: {
    color: '#e9d5ff',
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#181824',
    borderWidth: 1,
    borderColor: '#2A2A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  bellBtnActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderColor: '#FFD700',
  },
});
