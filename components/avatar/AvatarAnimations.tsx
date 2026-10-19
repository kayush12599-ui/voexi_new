import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export interface AnimationPreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  emote: string;
}

export interface AvatarAnimationsProps {
  visible: boolean;
  activeAnimationName: string;
  onClose: () => void;
  onSelectAnimation: (anim: AnimationPreset) => void;
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  { id: 'wave', name: 'Cyber Wave', category: 'Actions', icon: 'human-handsup', emote: 'Wave' },
  { id: 'dance', name: 'Neural Dance', category: 'Dances', icon: 'dance-pole', emote: 'Celebrate' },
  { id: 'victory', name: 'Victory Flex', category: 'Poses', icon: 'trophy', emote: 'Victory' },
  { id: 'jump', name: 'Celebration Jump', category: 'Dances', icon: 'run-fast', emote: 'Jump' },
  { id: 'heart', name: 'Heart Pulse', category: 'Actions', icon: 'heart-flash', emote: 'Heart' },
  { id: 'clap', name: 'Clap & Cheer', category: 'Actions', icon: 'hand-clap', emote: 'Clap' },
  { id: 'spin', name: 'Flash 360 Spin', category: 'Poses', icon: 'rotate-3d-variant', emote: 'Spin' },
  { id: 'hello', name: 'Friendly Hello', category: 'Actions', icon: 'hand-wave', emote: 'Hello' },
];

export function AvatarAnimations({
  visible,
  activeAnimationName,
  onClose,
  onSelectAnimation
}: AvatarAnimationsProps) {
  const [filterCategory, setFilterCategory] = useState('All');

  const filteredPresets = filterCategory === 'All'
    ? ANIMATION_PRESETS
    : ANIMATION_PRESETS.filter(a => a.category === filterCategory);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.animationModalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialCommunityIcons name="motion-pause-outline" size={22} color="#A855F7" />
              <Text style={styles.modalTitle}>3D AVATAR ANIMATIONS</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeModalBtn}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubTitle}>Select an animation to play live on your 3D character</Text>

          {/* CATEGORIES FILTER */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 14 }}>
            {['All', 'Dances', 'Poses', 'Actions'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.modalCatChip, filterCategory === cat && styles.activeModalCatChip]}
                onPress={() => setFilterCategory(cat)}
              >
                <Text style={[styles.modalCatText, filterCategory === cat && { color: '#FFFFFF' }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ANIMATIONS LIST */}
          <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
            <View style={styles.animGrid}>
              {filteredPresets.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.animCard, activeAnimationName === item.name && styles.activeAnimCard]}
                  onPress={() => onSelectAnimation(item)}
                >
                  <View style={[styles.animIconBox, activeAnimationName === item.name && { backgroundColor: '#A855F7' }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.animCardTitle}>{item.name}</Text>
                    <Text style={styles.animCardSub}>{item.category}</Text>
                  </View>
                  <View style={styles.playAnimIcon}>
                    <Ionicons name={activeAnimationName === item.name ? "pause-circle" : "play-circle"} size={24} color="#A855F7" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.applyAnimBtn}
            onPress={onClose}
          >
            <LinearGradient colors={['#A855F7', '#7c3aed']} style={styles.applyAnimGrad}>
              <Text style={styles.applyAnimText}>PLAY ANIMATION</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justify: 'flex-end'
  },
  animationModalContent: {
    backgroundColor: '#0B0B12',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1
  },
  modalSubTitle: {
    color: '#71717A',
    fontSize: 10,
    marginTop: 4
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalCatChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  activeModalCatChip: {
    backgroundColor: '#A855F7',
    borderColor: '#C084FC'
  },
  modalCatText: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '800'
  },
  animGrid: {
    gap: 10
  },
  animCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12
  },
  activeAnimCard: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.12)'
  },
  animIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  animCardTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  animCardSub: {
    color: '#71717A',
    fontSize: 9,
    marginTop: 2
  },
  playAnimIcon: {
    marginLeft: 'auto'
  },
  applyAnimBtn: {
    marginTop: 18,
    borderRadius: 16,
    overflow: 'hidden'
  },
  applyAnimGrad: {
    paddingVertical: 14,
    alignItems: 'center'
  },
  applyAnimText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1
  }
});
