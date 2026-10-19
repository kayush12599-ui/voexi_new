import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

/**
 * VOEXI ADS - Web Placeholder
 * Google Mobile Ads are not supported on Web.
 */
export default function NativeAdItem() {
  return (
    <View style={styles.container}>
      <View style={styles.adContent}>
        <Text style={{color: '#444', textAlign: 'center', fontWeight: 'bold'}}>
          [AdMob Native Ad]
        </Text>
        <Text style={{color: '#222', textAlign: 'center', fontSize: 10, marginTop: 5}}>
          Ads are not supported on Web platform.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width - 20,
    alignSelf: 'center',
    backgroundColor: '#12121A',
    borderRadius: 20,
    marginVertical: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1A1A24',
    minHeight: 100,
    justifyContent: 'center'
  },
  adContent: {
    padding: 15,
  },
});
