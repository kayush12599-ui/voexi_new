import React from 'react';
import { View, StyleSheet } from 'react-native';
import ChatScreen from '../menu/chat';
import { useTheme } from '../../hooks/useTheme';

export default function ChatTabScreen() {
  const { isLight } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: isLight ? '#FFFFFF' : '#000000' }]}>
      <ChatScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
