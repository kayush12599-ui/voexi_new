import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDiamondTheme, DIAMOND_COLOR_OPTIONS, DiamondColorOption } from '../hooks/useDiamondTheme';
import { GlowingDiamond } from './ui/GlowingDiamond';
import { useTheme } from '../hooks/useTheme';

interface DiamondColorPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export function DiamondColorPickerModal({ visible, onClose }: DiamondColorPickerModalProps) {
  const { isLight } = useTheme();
  const { activeColor, glowEnabled, setActiveColorId, setGlowEnabled } = useDiamondTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, isLight && styles.cardLight]}>
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <GlowingDiamond size={24} animated glow={false} />
              <Text style={[styles.headerTitle, isLight && { color: '#000' }]}>
                DIAMOND COLOR & GLOW
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={26} color={isLight ? '#666' : '#AAA'} />
            </TouchableOpacity>
          </View>

          {/* LIVE PREVIEW BOX */}
          <View style={[styles.previewContainer, { borderColor: activeColor.mainColor }]}>
            <LinearGradient
              colors={isLight ? ['#F1F5F9', '#E2E8F0'] : ['#0B132B', '#1C2541']}
              style={styles.previewGradient}
            >
              <View style={styles.previewDiamondBox}>
                <GlowingDiamond size="hero" glow={glowEnabled} animated />
              </View>

              <Text style={[styles.previewTitle, { color: activeColor.mainColor }]}>
                {activeColor.name.toUpperCase()} {activeColor.emoji}
              </Text>
              <Text style={[styles.previewSubtitle, isLight && { color: '#64748B' }]}>
                {glowEnabled ? '⚡ Active Neon Light Glow' : '🌙 Stealth Diamond Mode'}
              </Text>
            </LinearGradient>
          </View>

          {/* GLOW SWITCH TOGGLE */}
          <View style={[styles.switchRow, isLight && styles.switchRowLight]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchTitle, isLight && { color: '#000' }]}>LIGHT GLOW EFFECT</Text>
              <Text style={styles.switchSub}>Aura halo & pulsating glow around gems</Text>
            </View>
            <Switch
              value={glowEnabled}
              onValueChange={setGlowEnabled}
              trackColor={{ false: '#334155', true: activeColor.mainColor }}
              thumbColor={glowEnabled ? '#FFFFFF' : '#94A3B8'}
            />
          </View>

          {/* COLOR THEME SELECTOR GRID */}
          <Text style={[styles.gridLabel, isLight && { color: '#000' }]}>SELECT DIAMOND COLOR THEME</Text>

          <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            <View style={styles.gridContainer}>
              {DIAMOND_COLOR_OPTIONS.map((item: DiamondColorOption) => {
                const isSelected = activeColor.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    style={[
                      styles.colorOptionCard,
                      isLight && styles.colorOptionCardLight,
                      isSelected && {
                        borderColor: item.mainColor,
                        borderWidth: 2,
                        backgroundColor: isLight ? '#F8FAFC' : '#1E293B',
                      },
                    ]}
                    onPress={() => setActiveColorId(item.id)}
                  >
                    <GlowingDiamond size="medium" colorOverride={item} glow={isSelected && glowEnabled} animated={isSelected} />

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.colorName, isLight && { color: '#000' }, isSelected && { color: item.mainColor, fontWeight: '800' }]}>
                          {item.name}
                        </Text>
                        <Text style={styles.tagText}>{item.tag}</Text>
                      </View>

                      {/* Color Palette Indicators */}
                      <View style={styles.paletteRow}>
                        {item.gradient.map((c, idx) => (
                          <View key={idx} style={[styles.dot, { backgroundColor: c }]} />
                        ))}
                      </View>
                    </View>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={item.mainColor} style={{ marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* APPLY & CLOSE ACTION */}
          <TouchableOpacity style={styles.applyBtn} onPress={onClose}>
            <LinearGradient
              colors={[activeColor.mainColor, activeColor.secondaryColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applyGradient}
            >
              <Text style={styles.applyBtnText}>APPLY DIAMOND THEME ✨</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: width - 32,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 2,
  },
  previewContainer: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  previewDiamondBox: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  previewSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  switchRowLight: {
    backgroundColor: '#F1F5F9',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  switchSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  gridContainer: {
    gap: 8,
    paddingBottom: 8,
  },
  colorOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B00',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    padding: 10,
  },
  colorOptionCardLight: {
    borderColor: '#E2E8F0',
  },
  colorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  applyBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  applyGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
