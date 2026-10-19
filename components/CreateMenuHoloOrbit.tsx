import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Modal,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- CONFIGURATION ---
const CORE_SIZE = 64;
const ICON_SIZE = 54;
const MAX_RADIUS = 145;
const RINGS = [75, 110, 145];
const ORBIT_COLORS = ['#A855F7', '#6366F1', '#00F2FE'];

interface CreateMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
}

const MENU_ITEMS = [
  { id: 'photo', label: 'Photo', icon: 'camera-outline', orbit: 0, angle: -140, color: '#A855F7' },
  { id: 'reels', label: 'Reels', icon: 'play-circle-outline', orbit: 0, angle: -40, color: '#A855F7' },
  { id: 'sound', label: 'Sound', icon: 'musical-notes-outline', orbit: 1, angle: -160, color: '#6366F1' },
  { id: 'video', label: 'Video', icon: 'videocam-outline', orbit: 1, angle: -20, color: '#6366F1' },
  { id: 'story', label: 'Story', icon: 'flash-outline', orbit: 1, angle: -90, color: '#6366F1' },
  { id: 'cluster', label: 'Cluster', icon: 'people-outline', orbit: 2, angle: -140, color: '#FF0080' },
  { id: 'neural', label: 'Neural', icon: 'brain', orbit: 2, angle: -90, color: '#00F2FE', isMCI: true },
  { id: 'live', label: 'Live', icon: 'radio-outline', orbit: 2, angle: -40, color: '#00F2FE' },
];

export default function CreateMenuHoloOrbit({ visible, onClose, onSelect }: CreateMenuProps) {
  const [modalVisible, setModalVisible] = useState(visible);
  const openAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.spring(openAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      Animated.timing(openAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setModalVisible(false));
    }
  }, [visible]);

  if (!modalVisible) return null;

  const overlayOpacity = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const coreScale = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Full-screen dark blur background layer */}
        <Animated.View style={[styles.fullScreenOverlay, { opacity: overlayOpacity }]}>
          <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity
            activeOpacity={1}
            style={styles.dismissArea}
            onPress={onClose}
          />
        </Animated.View>

        <View style={styles.contentContainer} pointerEvents="box-none">
          {/* Orbit Items */}
          <View style={styles.centerPivot} pointerEvents="box-none">
            {MENU_ITEMS.map((item) => {
              const radius = RINGS[item.orbit];
              const rad = (item.angle * Math.PI) / 180;
              const targetX = radius * Math.cos(rad);
              const targetY = radius * Math.sin(rad);

              const translateX = openAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, targetX],
              });

              const translateY = openAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, targetY],
              });

              const scale = openAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.5, 1],
              });

              const opacity = openAnim.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 0.8, 1],
              });

              return (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.orbitItemWrapper,
                    {
                      transform: [
                        { translateX },
                        { translateY },
                        { scale },
                      ],
                      opacity,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      onSelect(item.id);
                    }}
                    style={styles.orbitTouch}
                  >
                    <LinearGradient
                      colors={[item.color + 'DD', item.color + '88', '#0A0A12']}
                      style={styles.itemGradientBox}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {item.isMCI ? (
                        <MaterialCommunityIcons name={item.icon as any} size={22} color="#FFFFFF" />
                      ) : (
                        <Ionicons name={item.icon as any} size={22} color="#FFFFFF" />
                      )}
                    </LinearGradient>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}

            {/* Glowing Core Plus Button */}
            <Animated.View
              style={[
                styles.coreButtonContainer,
                {
                  transform: [{ scale: coreScale }],
                },
              ]}
            >
              <TouchableOpacity activeOpacity={0.9} onPress={onClose}>
                <LinearGradient
                  colors={['#A855F7', '#6366F1']}
                  style={styles.coreGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="close" size={32} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dismissArea: {
    flex: 1,
  },
  contentContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 20 : 35,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPivot: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreButtonContainer: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    elevation: 20,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  coreGradient: {
    width: '100%',
    height: '100%',
    borderRadius: CORE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitItemWrapper: {
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitTouch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemGradientBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  itemLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
