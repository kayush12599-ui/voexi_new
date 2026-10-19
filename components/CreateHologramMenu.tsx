import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Pressable, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Line, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const RADIUS = 135;
const CENTER_X = width / 2;
const CENTER_Y = height / 2;

const MENU_ITEMS = [
  { id: 'story', label: 'Story', icon: 'add-circle-outline', type: 'ion' },
  { id: 'photo', label: 'Photo', icon: 'camera-outline', type: 'ion' },
  { id: 'reels', label: 'Reels', icon: 'movie-outline', type: 'mci' },
  { id: 'sound', label: 'Sound', icon: 'musical-notes-outline', type: 'ion' },
  { id: 'video', label: 'Video', icon: 'videocam-outline', type: 'ion' },
  { id: 'live', label: 'Live', icon: 'broadcast-outline', type: 'mci' },
  { id: 'neural', label: 'Neural Writing', icon: 'brain', type: 'mci' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CreateHologramMenu({ visible, onClose }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = withSpring(1, { damping: 15, stiffness: 100 });
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.9, 1]) }]
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [-45, 0])}deg` }],
    opacity: progress.value
  }));

  if (!visible && progress.value === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Background Blur Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Holographic Ring & Spokes */}
      <Animated.View style={[styles.container, ringStyle]} pointerEvents="box-none">
        <Svg height={height} width={width} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#A855F7" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#00F2FE" stopOpacity="0.6" />
            </SvgGradient>
          </Defs>

          {/* Main Glowing Circle */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={RADIUS}
            stroke="url(#grad)"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="5, 5"
          />

          {/* Radiating Spokes */}
          {MENU_ITEMS.map((_, i) => {
            const angle = (i * (360 / MENU_ITEMS.length) - 90) * (Math.PI / 180);
            const x2 = CENTER_X + RADIUS * Math.cos(angle);
            const y2 = CENTER_Y + RADIUS * Math.sin(angle);
            return (
              <Spoke key={i} x2={x2} y2={y2} progress={progress} index={i} />
            );
          })}
        </Svg>

        {/* Menu Items (Glass Spheres) */}
        {MENU_ITEMS.map((item, i) => (
          <MenuItem
            key={item.id}
            item={item}
            index={i}
            total={MENU_ITEMS.length}
            progress={progress}
            onPress={() => {
                console.log("Navigating to:", item.id);
                onClose();
            }}
          />
        ))}

        {/* Center Close Button */}
        <View style={styles.centerButtonContainer}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
            <LinearGradient
              colors={['#A855F7', '#6366F1']}
              style={styles.centerCircle}
            >
              <View style={styles.centerInner}>
                <Ionicons name="close" size={32} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.brandTitle}>VOEXI</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function Spoke({ x2, y2, progress, index }: any) {
  const animatedProps = useAnimatedStyle(() => {
    const p = interpolate(progress.value, [0, 1], [0, 1], Extrapolate.CLAMP);
    return {
      opacity: withDelay(index * 50, withTiming(p * 0.3, { duration: 300 }))
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedProps]} pointerEvents="none">
        <Svg height={height} width={width}>
            <Line
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={x2}
                y2={y2}
                stroke="#A855F7"
                strokeWidth="0.5"
            />
        </Svg>
    </Animated.View>
  );
}

function MenuItem({ item, index, total, progress, onPress }: any) {
  const angle = (index * (360 / total) - 90) * (Math.PI / 180);
  const tx = RADIUS * Math.cos(angle);
  const ty = RADIUS * Math.sin(angle);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const s = interpolate(p, [0, 0.5, 1], [0, 0, 1]);
    const moveX = interpolate(p, [0, 1], [0, tx]);
    const moveY = interpolate(p, [0, 1], [0, ty]);

    return {
      opacity: p,
      transform: [
        { translateX: moveX },
        { translateY: moveY },
        { scale: s }
      ],
    };
  });

  return (
    <Animated.View style={[styles.menuItemWrap, animatedStyle]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.glassSphere}>
        <BlurView intensity={30} tint="light" style={styles.blurBg} />
        <LinearGradient
          colors={['rgba(255,255,255,0.15)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        {item.type === 'ion' ? (
          <Ionicons name={item.icon} size={22} color="#fff" style={styles.shadowIcon} />
        ) : (
          <MaterialCommunityIcons name={item.icon} size={22} color="#fff" style={styles.shadowIcon} />
        )}
      </TouchableOpacity>
      <Animated.Text style={styles.itemLabel}>{item.label}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  centerButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  centerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A855F7',
    shadowRadius: 15,
    shadowOpacity: 0.8,
    elevation: 10,
  },
  centerInner: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  brandTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 15,
    opacity: 0.6,
  },
  menuItemWrap: {
    position: 'absolute',
    alignItems: 'center',
    width: 80,
  },
  glassSphere: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#00F2FE',
    shadowRadius: 10,
    shadowOpacity: 0.3,
  },
  blurBg: {
    ...StyleSheet.absoluteFillObject,
  },
  shadowIcon: {
    textShadowColor: 'rgba(0, 242, 254, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  itemLabel: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  }
});
