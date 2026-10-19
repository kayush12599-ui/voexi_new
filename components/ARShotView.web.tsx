import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Text } from 'react-native';

const ARShotView = forwardRef((props: any, ref) => {
  useImperativeHandle(ref, () => ({
    recordAsync: async () => {
      throw new Error("AR Camera recording is not supported on Web. Please use iOS or Android.");
    },
    stopRecording: async () => {},
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.text}>AR Camera View is available on Mobile devices (iOS/Android).</Text>
    </View>
  );
});

export default ARShotView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});
