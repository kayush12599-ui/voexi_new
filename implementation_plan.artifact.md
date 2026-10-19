# Fix React Native Gradle Plugin Resolution Issue

The root project `vibroxe_new` is missing a `settings.gradle` file, which is required for Gradle to find and include the React Native and Expo Gradle plugins located in the `node_modules` directory. This is why the `build.gradle` file in the root is failing to resolve `com.facebook.react:react-native-gradle-plugin:0.81.5`.

## Proposed Changes

### Root Project

#### [NEW] [settings.gradle](file:///C:/Users/hp/vibroxe/vibroxe_new/settings.gradle)
Create a new `settings.gradle` file in the root directory to manage plugin resolution and include the `android` subproject.

#### [MODIFY] [build.gradle](file:///C:/Users/hp/vibroxe/vibroxe_new/build.gradle)
Update the root `build.gradle` to ensure it is consistent with the `android/build.gradle` and uses the proper plugin application.

## Verification Plan

### Automated Tests
- Run Gradle sync in Android Studio.
- Run `./gradlew tasks` from the root directory to verify plugin resolution.

### Manual Verification
- Verify that the error "Could not find com.facebook.react:react-native-gradle-plugin:0.81.5" is resolved.
