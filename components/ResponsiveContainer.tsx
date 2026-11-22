import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

interface ResponsiveContainerProps extends ViewProps {
  maxWidth?: number;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Responsive Container Component for PC, TV, Tablet & Mobile.
 * Centers content and clamps maximum width on large displays to match YouTube UI standards.
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  maxWidth = 1400,
  children,
  style,
  ...props
}) => {
  const { isDesktop } = useResponsive();

  const containerStyle: ViewStyle = isDesktop
    ? {
        maxWidth,
        width: '100%',
        alignSelf: 'center',
      }
    : {
        width: '100%',
      };

  return (
    <View style={[styles.base, containerStyle, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});

export default ResponsiveContainer;
