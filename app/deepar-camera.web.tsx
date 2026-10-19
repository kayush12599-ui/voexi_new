import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';

export default function DeepARCameraWeb() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Options
        options={{
          headerShown: false,
          headerTransparent: true
        }}
      />

      <View style={styles.content}>
        <Text style={styles.title}>VOEXI AR STUDIO</Text>
        <View style={styles.placeholder}>
          <Text style={styles.text}>AR Preview is only available on Mobile Devices</Text>
          <Text style={styles.subtext}>Please open the Voexi app on Android or iOS to use DeepAR filters.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  placeholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtext: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
});
