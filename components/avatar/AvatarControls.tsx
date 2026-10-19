import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AvatarControlsProps {
  onRotate: () => void;
  onZoom: () => void;
  onOpenWardrobe: () => void;
  onOpenAnimations: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function AvatarControls({
  onRotate,
  onZoom,
  onOpenWardrobe,
  onOpenAnimations,
  onSave,
  isSaving = false
}: AvatarControlsProps) {
  return (
    <View style={styles.controlsContainer} pointerEvents="box-none">
      {/* LEFT SIDEBAR CONTROLS */}
      <View style={styles.leftGroup}>
        <TouchableOpacity style={styles.controlBtn} onPress={onRotate}>
          <View style={styles.iconBox}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.btnLabel}>Rotate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={onZoom}>
          <View style={styles.iconBox}>
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.btnLabel}>Zoom</Text>
        </TouchableOpacity>
      </View>

      {/* RIGHT SIDEBAR CONTROLS */}
      <View style={styles.rightGroup}>
        <TouchableOpacity style={styles.controlBtn} onPress={onOpenWardrobe}>
          <View style={[styles.iconBox, { borderColor: '#A855F7' }]}>
            <Ionicons name="shirt-outline" size={18} color="#A855F7" />
          </View>
          <Text style={[styles.btnLabel, { color: '#A855F7' }]}>Customize</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={onOpenAnimations}>
          <View style={styles.iconBox}>
            <Ionicons name="walk-outline" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.btnLabel}>Animation</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={onSave} disabled={isSaving}>
          <View style={[styles.iconBox, styles.saveIconBox]}>
            <Ionicons name="checkmark-sharp" size={20} color="#FFFFFF" />
          </View>
          <Text style={[styles.btnLabel, { color: '#22C55E' }]}>{isSaving ? 'Syncing...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justify: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 80,
    paddingBottom: 40,
    zIndex: 20
  },
  leftGroup: {
    gap: 20,
    justifyContent: 'center'
  },
  rightGroup: {
    gap: 20,
    justifyContent: 'center',
    alignItems: 'flex-end'
  },
  controlBtn: {
    alignItems: 'center',
    gap: 4
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(5, 5, 12, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5
  },
  saveIconBox: {
    backgroundColor: '#A855F7',
    borderColor: '#C084FC'
  },
  btnLabel: {
    color: '#A0A0AB',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8
  }
});
