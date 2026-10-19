# Fix Build Issues in VisionCamera and DateFormat

This plan addresses two build failures:
1. An "Unresolved reference 'day'" error in `DateFormat.kt` within the `expo-dev-launcher` module.
2. A linking error in `react-native-vision-camera` due to undefined symbols from `react-native-worklets-core`.

## User Review Required

> [!IMPORTANT]
> The `react-native-vision-camera` error is a linking issue between native libraries. I will attempt to fix it by ensuring proper linking in CMake and clearing build caches.

## Proposed Changes

### [expo-dev-launcher]

#### [MODIFY] [DateFormat.kt](file:///C:/vibroxe_new/node_modules/expo-dev-launcher/android/src/debug/java/expo/modules/devlauncher/compose/utils/DateFormat.kt)
Fix the unresolved reference for `dayOfMonth` by ensuring correct imports and potentially clarifying the call if there's any ambiguity. Also fix a missing trailing comma warning.

### [react-native-vision-camera]

#### [MODIFY] [CMakeLists.txt](file:///C:/vibroxe_new/node_modules/react-native-vision-camera/android/CMakeLists.txt)
Ensure that Frame Processors are correctly linked and that the `react-native-worklets-core` prefab is properly consumed.

## Verification Plan

### Automated Tests
- Run `./gradlew :expo-dev-launcher:assembleDebug` to verify the Kotlin fix.
- Run `./gradlew :react-native-vision-camera:assembleDebug` to verify the native linking fix.

### Manual Verification
- None required as these are build-time fixes.
