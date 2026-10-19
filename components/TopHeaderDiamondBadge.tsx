import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useDiamondTheme } from '../hooks/useDiamondTheme';
import { GlowingDiamond } from './ui/GlowingDiamond';

interface TopHeaderDiamondBadgeProps {
  isLight?: boolean;
}

export function TopHeaderDiamondBadge({ isLight: propIsLight }: TopHeaderDiamondBadgeProps) {
  const router = useRouter();
  const { isLight: themeIsLight } = useTheme();
  const isLight = propIsLight ?? themeIsLight;
  const { activeColor, glowEnabled } = useDiamondTheme();

  const [balance, setBalance] = useState<number>(0);

  const fetchDiamondBalance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from('profiles')
        .select('diamond_balance')
        .eq('id', session.user.id)
        .maybeSingle();

      if (data && data.diamond_balance !== undefined && data.diamond_balance !== null) {
        setBalance(data.diamond_balance);
      }
    } catch (e) {
      console.error('Diamond balance fetch error:', e);
    }
  };

  useEffect(() => {
    fetchDiamondBalance();

    let channel: any = null;
    let isMounted = true;

    const setupRealtime = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id || !isMounted) return;

        const channelName = `profile-diamonds-${session.user.id}-${Date.now()}`;
        channel = supabase.channel(channelName);
        channel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`,
          },
          (payload: any) => {
            if (isMounted && payload?.new && payload.new.diamond_balance !== undefined) {
              setBalance(payload.new.diamond_balance || 0);
            }
          }
        );
        channel.subscribe();
      } catch (err) {
        console.error('Diamond realtime error:', err);
      }
    };

    setupRealtime();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchDiamondBalance();
    }, [])
  );

  const formatBalance = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push('/menu/wallet')}
      style={[
        styles.badgeContainer,
        {
          borderColor: activeColor.mainColor,
          shadowColor: activeColor.mainColor,
        },
        isLight && styles.badgeContainerLight,
      ]}
    >
      <LinearGradient
        colors={isLight ? ['#FFFFFF', '#F1F5F9'] : ['#0F172A', '#1E1B4B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      >
        <GlowingDiamond size={18} glow={glowEnabled} animated />

        <Text
          style={[
            styles.balanceText,
            { color: activeColor.mainColor },
            isLight && styles.balanceTextLight,
          ]}
        >
          {formatBalance(balance)}
        </Text>

        <View style={[styles.plusBox, { backgroundColor: activeColor.secondaryColor }]}>
          <Ionicons name="add" size={10} color="#FFFFFF" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 5,
    flexShrink: 0,
    alignSelf: 'center',
    minWidth: 68,
  },
  badgeContainerLight: {
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  gradientBg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 5,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  balanceTextLight: {
    fontWeight: '900',
  },
  plusBox: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
});
