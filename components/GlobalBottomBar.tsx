import React from 'react';
import { View, StyleSheet, Text, Platform, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import { VOEXITheme } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import * as Haptics from 'expo-haptics';

interface GlobalBottomBarProps {
  activeTab?: 'home' | 'feed' | 'upload' | 'message' | 'profile';
  onOpenCreateMenu?: () => void;
}

/**
 * Global Bottom Navigation Bar (CustomTabBar) with Active Tab Yellow Glowing Outline
 * Structure: HOME -> FEED -> [FLOATING CENTER +] -> MESSAGE -> PROFILE
 */
export const GlobalBottomBar: React.FC<GlobalBottomBarProps> = ({
  activeTab,
  onOpenCreateMenu,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isLight: globalIsLight } = useTheme();

  // Hide on video-feed
  if (pathname.includes('video-feed')) {
    return null;
  }

  const isLight = globalIsLight;

  let currentActive = activeTab;
  if (!currentActive) {
    if (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index') {
      currentActive = 'home';
    } else if (pathname.includes('video-feed')) {
      currentActive = 'feed';
    } else if (pathname.includes('chat') || pathname.includes('message')) {
      currentActive = 'message';
    } else if (pathname.includes('profile') || pathname.includes('user/')) {
      currentActive = 'profile';
    } else {
      currentActive = 'home';
    }
  }

  const tabs = [
    { key: 'home', label: 'Home', icon: 'home', iconOutline: 'home-outline', lib: Ionicons, route: '/(tabs)' },
    { key: 'feed', label: 'Feed', icon: 'play-box-multiple', iconOutline: 'play-box-multiple-outline', lib: MaterialCommunityIcons, route: '/(tabs)/video-feed' },
    { key: 'upload', label: '', isCenter: true },
    { key: 'message', label: 'Message', icon: 'chatbubbles', iconOutline: 'chatbubbles-outline', lib: Ionicons, route: '/menu/chat' },
    { key: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline', lib: Ionicons, route: '/(tabs)/profile' },
  ];

  const handleTabPress = (tab: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tab.route) {
      if (pathname === tab.route || (pathname === '/' && tab.key === 'home')) return;
      if (tab.key === 'message') {
        router.push(tab.route as any);
      } else {
        router.replace(tab.route as any);
      }
    }
  };

  return (
    <View style={[styles.tabBarContainer, isLight && styles.lightTabBarContainer]}>
      {tabs.map((tab) => {
        const isActive = currentActive === tab.key;

        // CENTER FLOATING "+" ACTION BUTTON (48x48 circular button with purple gradient, elevated -20px)
        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key="center_plus"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (onOpenCreateMenu) {
                  onOpenCreateMenu();
                } else {
                  router.push('/upload');
                }
              }}
              style={styles.centerTabItem}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#A855F7', '#4C1D95']}
                style={styles.centerPlusButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          );
        }

        const IconComp = tab.lib as any;
        const iconName = isActive ? tab.icon : tab.iconOutline;

        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => handleTabPress(tab)}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, isActive && styles.activeYellowOutline]}>
              <IconComp
                name={iconName as any}
                size={20}
                color={isActive ? '#FFD700' : (isLight ? '#555555' : '#888888')}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? '#FFD700' : (isLight ? '#555555' : '#888888') },
                isActive && styles.activeTabLabel,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Export CustomTabBar as alias for GlobalBottomBar
export const CustomTabBar = GlobalBottomBar;

export default GlobalBottomBar;

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'android' ? 68 : 84,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'android' ? 8 : 22,
    paddingTop: 6,
    elevation: 30,
    zIndex: 999999,
  },
  lightTabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EEEEEE',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  /* ACTIVE TAB HIGHLIGHT: Glowing yellow outline box (#FFD700, rgba(255, 215, 0, 0.18)) */
  activeYellowOutline: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 5,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    fontWeight: '900',
    color: '#FFD700',
  },

  /* CENTER FLOATING "+" ACTION BUTTON: 48x48 circular button, elevated -20px */
  centerPlusButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    elevation: 15,
    shadowColor: VOEXITheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: '#000000',
  },
});
