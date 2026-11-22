import React from 'react';
import { StyleSheet, View } from 'react-native';
import VXIdentityCard from '../VXIdentityCard';

interface UserProfile3DSwipeCardProps {
  profile: any;
  isDirty: boolean;
  dirtLevel: number;
}

export default function UserProfile3DSwipeCard({ profile, isDirty, dirtLevel }: UserProfile3DSwipeCardProps) {
  return (
    <View style={styles.container}>
      <VXIdentityCard profile={profile} themeId={profile?.card_theme} isDirty={isDirty} dirtLevel={dirtLevel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 5,
  },
});
