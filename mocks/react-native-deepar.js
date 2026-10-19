import React from 'react';
import { View, Text } from 'react-native';

const DeepARView = (props) => (
  <View style={props.style || { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff' }}>AR Filters only work on Mobile Devices</Text>
  </View>
);

export default DeepARView;
export const Camera = DeepARView;
export const CameraPositions = { FRONT: 'front', BACK: 'back' };
export const ErrorTypes = {};
export const TextureSourceTypes = {};
