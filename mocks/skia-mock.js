import React from 'react';
import { View } from 'react-native';

export const Canvas = ({ children, style }) => <View style={style}>{children}</View>;
export const Image = () => null;
export const useImage = () => null;
export const Skia = {};
export const Shader = () => null;
export const rect = () => null;
export const useCanvasRef = () => ({ current: null });

export default {
  Canvas,
  Image,
  useImage,
  Skia,
  Shader,
  rect,
  useCanvasRef
};
