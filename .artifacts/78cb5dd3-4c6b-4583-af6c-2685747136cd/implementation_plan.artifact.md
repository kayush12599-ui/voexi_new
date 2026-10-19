# Fix java.lang.IllegalArgumentException: 25.0.2 during Gradle Sync

The project is running on Java 25.0.2 (JetBrains Runtime). The Kotlin compiler (versions 2.1.0, 2.0.21, etc.) fails to parse this Java version because its internal IntelliJ-based parser does not recognize "25" as a valid major version.

This plan will:
1.  Unify the Kotlin version to `2.4.10` across the project, which is the latest stable version in this environment and should support newer Java versions.
2.  Enable Java Toolchains in the `expo-gradle-plugin` and other Gradle plugins to decouple the compilation JVM from the Gradle runner JVM (Java 25).

## User Review Required

> [!IMPORTANT]
> The project is currently using Java 25.0.2 to run Gradle. If you experience further issues, consider setting the Gradle JDK to 17 or 21 in Android Studio Settings.

## Proposed Changes

### Main Project Configuration

#### [MODIFY] [gradle.properties](file:///C:/Users/hp/vibroxe/vibroxe_new/gradle.properties)
- Update `android.kotlinVersion` to `2.4.10`.

### Expo Gradle Plugin (Included Build)

#### [MODIFY] [expo-autolinking-plugin-shared/build.gradle.kts](file:///C:/Users/hp/vibroxe/vibroxe_new/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin-shared/build.gradle.kts)
- Add `kotlin { jvmToolchain(17) }` to ensure the plugin is compiled with a stable JDK.

#### [MODIFY] [expo-autolinking-settings-plugin/build.gradle.kts](file:///C:/Users/hp/vibroxe/vibroxe_new/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/build.gradle.kts)
- Add `kotlin { jvmToolchain(17) }`.

#### [MODIFY] [expo-autolinking-plugin/build.gradle.kts](file:///C:/Users/hp/vibroxe/vibroxe_new/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/build.gradle.kts)
- Add `kotlin { jvmToolchain(17) }`.

### React Native Gradle Plugin (Included Build)

#### [MODIFY] [build.gradle.kts](file:///C:/Users/hp/vibroxe/vibroxe_new/node_modules/@react-native/gradle-plugin/build.gradle.kts)
- Update `jvmToolchain(8)` to `jvmToolchain(17)`.

## Verification Plan

### Automated Tests
- Run Gradle sync to verify the `IllegalArgumentException` is resolved.
- `./gradlew :expo-gradle-plugin:expo-autolinking-plugin-shared:compileKotlin`

### Manual Verification
- Verify that the IDE successfully syncs the project without version parsing errors.
