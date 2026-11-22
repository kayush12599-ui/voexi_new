import React, { useState, memo } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VOEXITheme } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

interface NeonInputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon?: keyof typeof Ionicons.prototype.name;
  multiline?: boolean;
  numberOfLines?: number;
  error?: boolean;
  textContentType?: 'none' | 'emailAddress' | 'password' | 'username' | 'telephoneNumber';
  containerStyle?: ViewStyle;
  editable?: boolean;
  maxLength?: number;
}

const NeonInputComponent = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  icon,
  multiline,
  numberOfLines,
  error,
  textContentType,
  containerStyle,
  editable = true,
  maxLength
}: NeonInputProps) => {
  const { isLight } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle, !editable && { opacity: 0.6 }]}>
      {label && <Text style={[styles.label, isLight && { color: '#888' }]}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputFocused,
        error && styles.inputError,
        isLight && { backgroundColor: '#F8F9FA', borderColor: '#E2E8F0' },
        multiline && { height: 100, alignItems: 'flex-start', paddingTop: 12 },
        !editable && { backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', borderColor: '#111' }
      ]}>
        {icon && <Ionicons
          name={icon as any}
          size={19}
          color={error ? VOEXITheme.colors.error : (isFocused ? '#00F2FE' : (isLight ? '#94A3B8' : '#64748B'))}
          style={styles.icon}
        />}
        <TextInput
          style={[
            styles.input,
            isLight && { color: '#0F172A' },
            multiline && { textAlignVertical: 'top' },
            !editable && { color: '#64748B' }
          ]}
          placeholder={placeholder}
          placeholderTextColor={isLight ? "#94A3B8" : "#475569"}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          textContentType={textContentType}
          onFocus={() => editable && setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          underlineColorAndroid="transparent"
          editable={editable}
          maxLength={maxLength}
        />
        {secureTextEntry && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowPassword(!showPassword)}
            style={[
              styles.eyeIconBox,
              showPassword && styles.eyeIconBoxActive,
              isLight && showPassword && styles.eyeIconBoxActiveLight
            ]}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={showPassword ? (isLight ? '#A855F7' : '#00F2FE') : (isLight ? '#94A3B8' : '#64748B')}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const NeonInput = memo(NeonInputComponent);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    color: VOEXITheme.colors.textDim,
    fontSize: 11,
    marginBottom: 6,
    marginLeft: 4,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VOEXITheme.colors.inputBg,
    borderRadius: VOEXITheme.roundness.md,
    borderWidth: 1,
    borderColor: '#1E1E2E',
    height: 52,
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: '#00F2FE',
    boxShadow: '0 0 10px rgba(0, 242, 254, 0.2)',
  },
  inputError: {
    borderColor: VOEXITheme.colors.error,
    borderWidth: 1.5,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    height: '100%',
  },
  eyeIconBox: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  eyeIconBoxActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  eyeIconBoxActiveLight: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  }
});
