import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export interface InstagramHeaderLogoProps {
  isLight?: boolean;
}

export type VoexiHeaderLogoProps = InstagramHeaderLogoProps;

/**
 * Authentic Voexi Cursive Script Calligraphy Logo for VOEXI.
 * Compact & Mobile-Responsive (Fits all screen widths without overflowing).
 */
export const InstagramHeaderLogo: React.FC<InstagramHeaderLogoProps> = ({ isLight }) => {
  return (
    <View style={styles.container}>
      <Svg height="30" width="82" viewBox="0 0 82 30">
        <Defs>
          <SvgGradient id="voexiInstagramGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#00F2FE" />
            <Stop offset="45%" stopColor="#A855F7" />
            <Stop offset="100%" stopColor="#FF0080" />
          </SvgGradient>
        </Defs>

        <SvgText
          fill={isLight ? '#000000' : 'url(#voexiInstagramGrad)'}
          fontSize="25"
          fontWeight="900"
          fontFamily={Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive'}
          x="1"
          y="24"
          letterSpacing="0.2"
        >
          Voexi
        </SvgText>
      </Svg>

      <Ionicons
        name="chevron-down"
        size={12}
        color={isLight ? '#333333' : '#A855F7'}
        style={styles.chevron}
      />
    </View>
  );
};

export const voexiHeaderLogo = InstagramHeaderLogo;
export const VoexiHeaderLogo = InstagramHeaderLogo;

export default InstagramHeaderLogo;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 1,
    marginTop: 2,
  },
});
