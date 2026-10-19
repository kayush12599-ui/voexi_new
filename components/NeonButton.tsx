import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VOEXITheme } from '../constants/theme';

interface NeonButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
}

export const NeonButton = ({ title, onPress, loading, disabled, style, textStyle, colors }: NeonButtonProps) => {
  const isButtonDisabled = loading || disabled;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isButtonDisabled}
      style={[styles.button, style, isButtonDisabled && { opacity: 0.5 }]}
    >
      <LinearGradient
        colors={colors || [VOEXITheme.colors.primary, VOEXITheme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.text, textStyle]}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: VOEXITheme.roundness.lg,
    overflow: 'hidden',
    shadowColor: VOEXITheme.colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
