import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AvatarGenderSelectorProps {
  gender: 'Male' | 'Female';
  onSelectGender: (selected: 'Male' | 'Female') => void;
}

export function AvatarGenderSelector({ gender, onSelectGender }: AvatarGenderSelectorProps) {
  return (
    <View style={styles.selectorPill}>
      <TouchableOpacity
        style={[styles.genderBtn, gender === 'Male' && styles.activeMaleBtn]}
        onPress={() => onSelectGender('Male')}
        activeOpacity={0.8}
      >
        <Ionicons name="male" size={14} color={gender === 'Male' ? '#FFFFFF' : '#71717A'} />
        <Text style={[styles.genderLabel, gender === 'Male' && styles.activeLabel]}>MALE</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.genderBtn, gender === 'Female' && styles.activeFemaleBtn]}
        onPress={() => onSelectGender('Female')}
        activeOpacity={0.8}
      >
        <Ionicons name="female" size={14} color={gender === 'Female' ? '#FFFFFF' : '#71717A'} />
        <Text style={[styles.genderLabel, gender === 'Female' && styles.activeLabel]}>FEMALE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorPill: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 10, 20, 0.85)',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 30,
    elevation: 8
  },
  genderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20
  },
  activeMaleBtn: {
    backgroundColor: '#3B82F6'
  },
  activeFemaleBtn: {
    backgroundColor: '#EC4899'
  },
  genderLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2
  },
  activeLabel: {
    color: '#FFFFFF'
  }
});
