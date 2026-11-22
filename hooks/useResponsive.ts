import { useWindowDimensions, Platform, StyleProp, ViewStyle } from 'react-native';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTV: boolean;
  numColumns: number;
  videoWatchLayout: 'single' | 'two-column';
  maxContainerWidth: number;
  containerStyle: StyleProp<ViewStyle>;
  getItemWidth: (paddingHorizontal?: number, gap?: number) => number;
}

/**
 * Custom Hook for Adaptive Screen Layouts across Mobile, Tablet, PC, and TV.
 * Dynamically updates layout properties when window resizes on Web/PC/TV.
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 960;
  const isDesktop = width >= 960;
  const isTV = Platform.isTV || width >= 1440;

  // Grid column count based on screen width
  let numColumns = 1;
  if (width >= 1440) {
    numColumns = 4;
  } else if (width >= 1024) {
    numColumns = 3;
  } else if (width >= 600) {
    numColumns = 2;
  } else {
    numColumns = 1;
  }

  // YouTube Watch Page Layout (Desktop/TV gets 2-column view, Mobile gets 1-column)
  const videoWatchLayout: 'single' | 'two-column' = isDesktop ? 'two-column' : 'single';

  const maxContainerWidth = 1400;

  // Center container on wide screens (PC/TV)
  const containerStyle: ViewStyle = isDesktop
    ? {
        maxWidth: maxContainerWidth,
        width: '100%',
        alignSelf: 'center',
      }
    : {
        width: '100%',
      };

  // Utility to calculate item width in grid given screen padding and gap between items
  const getItemWidth = (paddingHorizontal: number = 16, gap: number = 16): number => {
    const effectiveWidth = Math.min(width, maxContainerWidth);
    const totalPadding = paddingHorizontal * 2 + gap * (numColumns - 1);
    const itemWidth = Math.floor((effectiveWidth - totalPadding) / numColumns);
    return Math.max(itemWidth, 160);
  };

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isTV,
    numColumns,
    videoWatchLayout,
    maxContainerWidth,
    containerStyle,
    getItemWidth,
  };
}

export default useResponsive;
