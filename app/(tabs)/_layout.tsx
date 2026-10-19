import React, { useState } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VOEXITheme } from '../../constants/theme';
import { View, StyleSheet, Text, Platform, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { NotificationService } from '../../lib/notificationService';
import CreateMenuHoloOrbit from '../../components/CreateMenuHoloOrbit';

/**
 * Custom Tab Bar Component with Active Tab Yellow Outline
 * Structure: HOME -> FEED -> [FLOATING +] -> MESSAGE -> PROFILE
 */
function CustomTabBar({ state, descriptors, navigation, isLight, onOpenCreateMenu }: any) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={[styles.tabBarContainer, isLight && styles.lightTabBarContainer]}>
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

          if (route.name === 'chat') {
            router.push('/menu/chat');
            return;
          }

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented) {
            navigation.navigate(route.name);
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

  // --- HIGH SECURITY VERIFICATION SHIELD ON TABS ---
  React.useEffect(() => {
    const verifyTabAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // 🛡️ BINA LOGIN USER KO LOGIN PAR REDIRECT KARO
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

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

  return (
    <View style={{ flex: 1, backgroundColor: isLight ? '#FFFFFF' : '#000000' }}>
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
          detachInactiveScreens: true,
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
  );
}

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
  // FLOATING CENTER "+" ACTION BUTTON STYLE
  centerPlusButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20, // FLOATS PROMINENTLY ABOVE THE NAVIGATION CONTAINER
    elevation: 15,
    shadowColor: VOEXITheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
});
