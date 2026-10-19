import React, { memo } from 'react';
import { StyleSheet, View, Text, Image, Platform, Animated, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getThemeById, CardTheme } from '../constants/cardThemes';

const CARD_HEIGHT = 200;

export const formatVxId = (id?: string | null): string => {
  if (!id) return 'VX-0000 0000 0000';
  let clean = id.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.startsWith('VX')) clean = clean.slice(2);
  if (!clean) return 'VX-0000 0000 0000';
  const formatted = clean.match(/.{1,4}/g)?.join(' ') || clean;
  return `VX-${formatted}`;
};

interface Props {
  profile: any;
  themeId?: string;
  isDirty?: boolean;
  dirtLevel?: number;
  onPress?: () => void;
}

function VXIdentityCard({ profile, themeId = 'default', onPress }: Props) {
  const theme: CardTheme = getThemeById(themeId);
  const customBgUri = profile?.card_background_uri || profile?.custom_bg_uri;

  const handleTap = () => {
    if (onPress) onPress();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const copyIdToClipboard = async () => {
    const idToCopy = formatVxId(profile?.vx_id_number);
    await Clipboard.setStringAsync(idToCopy);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert("COPIED", "Neural Identity ID copied to clipboard.");
  };

  const renderEffectLayer = () => {
    switch(theme.pattern) {
      case 'fire':
        return (
          <View style={StyleSheet.absoluteFill}>
            <View style={[styles.glowBeam, { backgroundColor: '#f00', transform: [{ rotate: '45deg' }], top: -50 }]} />
            <View style={[styles.glowBeam, { backgroundColor: '#f00', transform: [{ rotate: '45deg' }], bottom: -50, right: 0 }]} />
          </View>
        );
      case 'nebula':
        return (
          <View style={StyleSheet.absoluteFill}>
            <View style={[styles.nebulaCloud, { backgroundColor: theme.glowColor, top: 0, left: 0 }]} />
            <View style={[styles.nebulaCloud, { backgroundColor: theme.badgeColors[0], bottom: 0, right: 0, opacity: 0.25 }]} />
          </View>
        );
      default:
        return <MaterialCommunityIcons name="hexagon-multiple-outline" size={240} color={theme.borderColor + '15'} style={styles.patternIcon} />;
    }
  };

  const pulseAnim = React.useRef(new Animated.Value(0.2)).current;
  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.45, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 2200, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handleTap}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={theme.colors as [string, string, ...string[]]}
          style={[styles.profileCard, { borderColor: theme.borderColor + '55' }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* CUSTOM UPLOADED BACKGROUND PHOTO AS CARD THEME */}
          {customBgUri ? (
            <Image
              source={{ uri: customBgUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}

          {/* DARK GRADIENT OVERLAY FOR CRISP TEXT READABILITY */}
          {customBgUri && (
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']}
              style={StyleSheet.absoluteFill}
            />
          )}

          {!customBgUri && <View style={styles.designLayer}>{renderEffectLayer()}</View>}
          <Animated.View style={[styles.cardGlow, { backgroundColor: theme.glowColor, opacity: pulseAnim }]} />

          <View style={styles.cardTop}>
            <View style={[styles.avatarContainer, { borderColor: theme.textColor + '44' }]}>
              <Image
                source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
                resizeMode="cover"
              />
            </View>

            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.channelName, { color: theme.textColor }]} numberOfLines={1}>
                  {profile?.channel_name || 'Station Name'}
                </Text>
                {profile?.verification_status === 'verified' && <View style={[styles.verifiedDot, { backgroundColor: '#00ff00' }]} />}
              </View>
              <Text style={[styles.username, { color: theme.textColor, opacity: 0.75 }]} numberOfLines={1}>
                @{profile?.username || 'username'}
              </Text>
              <View style={styles.badgeRow}>
                <LinearGradient colors={theme.badgeColors as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{profile?.category || profile?.channel_category || 'BROADCASTER'}</Text>
                </LinearGradient>
              </View>
            </View>

            <View style={[styles.vLogoMini, { borderColor: theme.textColor + '33' }]}>
              <Text style={[styles.vLetterMini, { color: theme.textColor }]}>V</Text>
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: theme.textColor + '15' }]} />

          <View style={styles.cardBottom}>
            <View style={styles.idBox}>
              <Text style={[styles.idLabel, { color: theme.textColor, opacity: 0.6 }]}>
                {profile?.custom_label ? profile.custom_label.toUpperCase() : 'VOEXI IDENTITY CARD'}
              </Text>
              <TouchableOpacity onLongPress={copyIdToClipboard} activeOpacity={0.8}>
                 <Text style={[styles.idValue, { color: theme.textColor }]} numberOfLines={1}>
                   {formatVxId(profile?.vx_id_number)}
                 </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chipIcon}>
               <MaterialCommunityIcons name="integrated-circuit-chip" size={28} color={theme.chipColor} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export default memo(VXIdentityCard);

const styles = StyleSheet.create({
  cardContainer: { width: '100%', height: CARD_HEIGHT, borderRadius: 20, overflow: 'hidden' },
  profileCard: { width: '100%', height: CARD_HEIGHT, borderRadius: 20, padding: 18, borderWidth: 1.5, overflow: 'hidden' },
  designLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', opacity: 0.7 },
  glowBeam: { position: 'absolute', width: 2, height: 400, opacity: 0.3 },
  nebulaCloud: { position: 'absolute', width: 140, height: 140, borderRadius: 70, opacity: 0.35 },
  patternIcon: { position: 'absolute', top: -20, right: -40 },
  cardGlow: { position: 'absolute', top: -90, right: -90, width: 220, height: 220, borderRadius: 110 },
  cardTop: { flexDirection: 'row', alignItems: 'center', zIndex: 5 },
  avatarContainer: { width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, marginRight: 12, backgroundColor: 'rgba(0,0,0,0.2)', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', borderRadius: 30 },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  channelName: { fontSize: 16, fontWeight: 'bold' },
  verifiedDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 5 },
  username: { fontSize: 12, marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: 6 },
  categoryBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
  categoryText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  vLogoMini: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  vLetterMini: { fontSize: 14, fontWeight: '900' },
  cardDivider: { height: 1, marginVertical: 12, zIndex: 5 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 5 },
  idBox: { flex: 1, marginRight: 10 },
  idLabel: { fontSize: 8, fontWeight: 'bold', letterSpacing: 1.2 },
  idValue: { fontSize: 16, fontWeight: '900', marginTop: 4, letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  chipIcon: { opacity: 0.8, alignItems: 'center' },
});
