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
      {label && <Text style={[styles.label, isLight && { color: '#999' }]}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputFocused,
        error && styles.inputError,
        isLight && { backgroundColor: '#F5F5F5', borderColor: '#EEE' },
        multiline && { height: 100, alignItems: 'flex-start', paddingTop: 12 },
        !editable && { backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', borderColor: '#111' }
      ]}>
        {icon && <Ionicons
          name={icon as any}
          size={20}
          color={error ? VOEXITheme.colors.error : (isFocused ? VOEXITheme.colors.secondary : (isLight ? '#BBB' : '#555'))}
          style={styles.icon}
        />}
        <TextInput
          style={[styles.input, isLight && { color: '#000' }, multiline && { textAlignVertical: 'top' }, !editable && { color: '#888' }]}
          placeholder={placeholder}
          placeholderTextColor={isLight ? "#CCC" : "#444"}
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
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={isLight ? '#BBB' : '#555'} />
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
    fontSize: 12,
    marginBottom: 6,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VOEXITheme.colors.inputBg,
    borderRadius: VOEXITheme.roundness.md,
    borderWidth: 1,
    borderColor: '#222',
    height: 55,
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: VOEXITheme.colors.secondary,
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
    fontSize: 16,
    height: '100%',
  },
  eyeIcon: {
    padding: 5,
  }
});
