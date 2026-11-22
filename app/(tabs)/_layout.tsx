import React, { useState } from 'react';
import { Tabs, useRouter, usePathname, useNavigation } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { View, StyleSheet, Text, Platform, TouchableOpacity, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { NotificationService } from '../../lib/notificationService';
import CreateMenuHoloOrbit from '../../components/CreateMenuHoloOrbit';
import * as Haptics from 'expo-haptics';

/**
 * Custom Tab Bar Component with Active Tab Yellow Outline
 * Structure: HOME -> FEED -> [FLOATING +] -> MESSAGE -> PROFILE
 */
function CustomTabBar({ state, descriptors, navigation, isLight, onOpenCreateMenu }: any) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const safeBottom = Platform.OS === 'web' ? 0 : (insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 12 : 0));

  return (
    <View
      style={[
        styles.tabBarContainer,
        isLight && styles.lightTabBarContainer,
        {
          paddingBottom: safeBottom + 4,
          height: 52 + safeBottom,
        }
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        if (options.href === null || route.name === 'subscribe' || route.name === 'menu') {
          return null;
        }

        const isFocused = state.index === index;
        const isTabActive = isFocused || (
          route.name === 'index' ? (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index') :
          route.name === 'chat' ? (pathname.includes('chat') || pathname.includes('message')) :
          route.name === 'profile' ? (pathname.includes('profile')) :
          route.name === 'video-feed' ? pathname.includes('video-feed') : false
        );

        const onPress = () => {
          if (route.name === 'upload') {
            onOpenCreateMenu();
            return;
          }

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented) {
            if (route.name === 'profile') {
              router.navigate('/(tabs)/profile');
            } else if (route.name === 'chat') {
              router.navigate('/(tabs)/chat');
            } else if (route.name === 'video-feed') {
              router.navigate('/(tabs)/video-feed');
            } else if (route.name === 'index') {
              router.navigate('/(tabs)');
            } else {
              navigation.navigate(route.name);
            }
          }
        };

        // FLOATING CENTER "+" ACTION BUTTON
        if (route.name === 'upload') {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.centerTabItem}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[VOEXITheme.colors.primary, '#4c1d95']}
                style={styles.centerPlusButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          );
        }

        let iconName = '';
        let IconComponent: any = Ionicons;
        let label = '';

        if (route.name === 'index') {
          iconName = isTabActive ? 'home' : 'home-outline';
          label = 'Home';
        } else if (route.name === 'video-feed') {
          iconName = isTabActive ? 'play-box-multiple' : 'play-box-multiple-outline';
          IconComponent = MaterialCommunityIcons;
          label = 'Feed';
        } else if (route.name === 'chat') {
          iconName = isTabActive ? 'chatbubbles' : 'chatbubbles-outline';
          label = 'Message';
        } else if (route.name === 'profile') {
          iconName = isTabActive ? 'person' : 'person-outline';
          label = 'Profile';
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconBox,
                isTabActive && styles.activeYellowOutline,
              ]}
            >
              <IconComponent
                name={iconName}
                size={20}
                color={isTabActive ? '#FFD700' : (isLight ? '#555555' : '#888888')}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isTabActive ? '#FFD700' : (isLight ? '#555555' : '#888888') },
                isTabActive && styles.activeTabLabel,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const { isLight: globalIsLight } = useTheme();

  // --- BACKGROUND TAB PROFILE & PUSH NOTIFICATIONS SYNC ---
  React.useEffect(() => {
    const verifyTabAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if account is erased/deleted
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_deleted')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile?.is_deleted) {
        await supabase.auth.signOut().catch(() => {});
        await AsyncStorage.removeItem('sb-iafmgtldihnhcvrfveev-auth-token').catch(() => {});
        router.replace('/(auth)/login');
        return;
      }

      // Register Push Notifications for valid session
      await NotificationService.registerForPushNotifications(session.user.id).catch(() => {});
    };

    verifyTabAccess();
  }, [pathname]);

  const isLight = globalIsLight && !pathname.includes('video-feed');

  const handleCreateMenuSelect = (id: string) => {
    setShowCreateMenu(false);
    switch(id) {
      case 'photo':
        router.push('/upload?initialType=Photo');
        break;
      case 'reels':
        router.push('/studio/reels-editor');
        break;
      case 'sound':
        router.push('/upload?initialType=Sound');
        break;
      case 'video':
        router.push('/studio/video-editor');
        break;
      case 'live':
        router.push('/studio/live-setup');
        break;
      case 'neural':
        router.push('/upload?initialType=Neural Writing');
        break;
      case 'story':
        router.push('/studio/story-editor');
        break;
    }
  };

  const tabRoutes = ['menu', 'index', 'video-feed', 'upload', 'chat', 'profile', 'avatar'];

  const getCurrentTabIndex = () => {
    if (showCreateMenu) return 3; // When + Upload Create Menu is active
    if (pathname.includes('/(tabs)/menu') || pathname.endsWith('/menu')) return 0;
    if (pathname.includes('video-feed')) return 2;
    if (pathname.includes('chat') || pathname.includes('message')) return 4;
    if (pathname.includes('profile/avatar') || pathname.includes('/profile/avatar')) return 6;
    if (pathname.includes('profile')) return 5;
    return 1; // Default Home
  };

  const handleSwipeNext = () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex < tabRoutes.length - 1) {
      const nextRoute = tabRoutes[currentIndex + 1];
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}

      if (nextRoute === 'upload') {
        setShowCreateMenu(true);
      } else {
        setShowCreateMenu(false);
        if (nextRoute === 'chat') {
          router.navigate('/(tabs)/chat');
        } else if (nextRoute === 'avatar') {
          router.push('/profile/avatar');
        } else if (nextRoute === 'menu') {
          router.push('/(tabs)/menu');
        } else {
          router.navigate(`/(tabs)/${nextRoute}` as any);
        }
      }
    }
  };

  const handleSwipePrev = () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex > 0) {
      const prevRoute = tabRoutes[currentIndex - 1];
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}

      if (prevRoute === 'upload') {
        setShowCreateMenu(true);
      } else {
        setShowCreateMenu(false);
        if (prevRoute === 'menu') {
          router.push('/(tabs)/menu');
        } else if (prevRoute === 'index') {
          router.navigate('/(tabs)/index' as any);
        } else if (prevRoute === 'chat') {
          router.navigate('/(tabs)/chat');
        } else if (prevRoute === 'profile') {
          router.navigate('/(tabs)/profile' as any);
        } else {
          router.navigate(`/(tabs)/${prevRoute}` as any);
        }
      }
    }
  };

  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);
  const swipedInGesture = React.useRef(false);
  const isMouseDown = React.useRef(false);

  const handleStart = (clientX: number, clientY: number) => {
    touchStartX.current = clientX;
    touchStartY.current = clientY;
    swipedInGesture.current = false;
    isMouseDown.current = true;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (swipedInGesture.current) return;
    if (Platform.OS === 'web' && !isMouseDown.current) return;

    const deltaX = clientX - touchStartX.current;
    const deltaY = clientY - touchStartY.current;

    // Minimum horizontal distance threshold for intentional swipe (50px)
    const minDistance = Platform.OS === 'web' ? 50 : 60;

    // Ensure horizontal gesture dominates over vertical scroll
    if (Math.abs(deltaX) > minDistance && Math.abs(deltaY) < Math.abs(deltaX) * 0.8) {
      swipedInGesture.current = true;
      if (deltaX < -minDistance) {
        // Swipe Left -> Move Next (Home -> Feed -> + -> Message -> Profile)
        handleSwipeNext();
      } else if (deltaX > minDistance) {
        // Swipe Right -> Move Prev (Profile -> Message -> + -> Feed -> Home)
        handleSwipePrev();
      }
    }
  };

  const handleEnd = () => {
    swipedInGesture.current = false;
    isMouseDown.current = false;
  };

  const handleTouchStart = (e: any) => {
    try {
      const touch = (e.touches && e.touches[0]) ? e.touches[0] : (e.nativeEvent || e);
      handleStart(touch.pageX || touch.clientX || 0, touch.pageY || touch.clientY || 0);
    } catch (err) {}
  };

  const handleTouchMove = (e: any) => {
    try {
      const touch = (e.touches && e.touches[0]) ? e.touches[0] : (e.nativeEvent || e);
      handleMove(touch.pageX || touch.clientX || 0, touch.pageY || touch.clientY || 0);
    } catch (err) {}
  };

  const handleMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    try {
      handleStart(e.clientX || e.pageX || 0, e.clientY || e.pageY || 0);
    } catch (err) {}
  };

  const handleMouseMove = (e: any) => {
    if (Platform.OS !== 'web') return;
    try {
      handleMove(e.clientX || e.pageX || 0, e.clientY || e.pageY || 0);
    } catch (err) {}
  };

  return (
    <View style={styles.outerWebWrapper}>
      <View
        style={[
          styles.innerAppContainer,
          { backgroundColor: isLight ? '#FFFFFF' : '#000000' }
        ]}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
        {...(Platform.OS === 'web' ? {
          onMouseDown: handleMouseDown,
          onMouseMove: handleMouseMove,
          onMouseUp: handleEnd,
          onMouseLeave: handleEnd,
        } as any : {})}
      >
        <Tabs
          tabBar={(props) => (
            <CustomTabBar
              {...props}
              isLight={isLight}
              onOpenCreateMenu={() => setShowCreateMenu(true)}
            />
          )}
          screenOptions={{
            headerShown: false,
            detachInactiveScreens: false,
            lazy: false,
            animation: 'fade',
            contentStyle: { backgroundColor: isLight ? '#FFFFFF' : '#000000' },
          }}
        >
          <Tabs.Screen name="index" options={{ title: t('tabs.home') || 'Home' }} />
          <Tabs.Screen name="video-feed" options={{ title: t('tabs.feed') || 'Feed' }} />
          <Tabs.Screen name="upload" options={{ title: '' }} />
          <Tabs.Screen name="chat" options={{ title: 'Message' }} />
          <Tabs.Screen name="profile" options={{ title: t('tabs.profile') || 'Profile' }} />
          <Tabs.Screen name="menu" options={{ href: null }} />
          <Tabs.Screen name="subscribe" options={{ href: null }} />
        </Tabs>

        <CreateMenuHoloOrbit
          visible={showCreateMenu}
          onClose={() => setShowCreateMenu(false)}
          onSelect={handleCreateMenuSelect}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWebWrapper: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#06060E' : 'transparent',
    width: '100%',
    height: '100%',
  },
  innerAppContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 680 : '100%',
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: Platform.OS === 'web' ? '0px 0px 50px rgba(0, 242, 254, 0.15)' : undefined,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: Platform.OS === 'web' ? '50%' : 0,
    right: Platform.OS === 'web' ? 'auto' : 0,
    transform: Platform.OS === 'web' ? [{ translateX: '-50%' }] : [],
    maxWidth: Platform.OS === 'web' ? 680 : '100%',
    width: '100%',
    height: Platform.OS === 'android' ? 52 : 68,
    backgroundColor: '#000000',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'android' ? 4 : 16,
    paddingTop: 4,
    elevation: 20,
    zIndex: 999999,
  },
  lightTabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
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
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeYellowOutline: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: 0.1,
  },
  activeTabLabel: {
    fontWeight: '900',
    color: '#FFD700',
  },
  // FLOATING CENTER "+" ACTION BUTTON STYLE (INSTAGRAM COMPACT MATCH)
  centerPlusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -10,
    elevation: 10,
    shadowColor: VOEXITheme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    borderWidth: 1.5,
    borderColor: '#000',
  },
});
