# Fix Internal Compiler Error during Gradle Sync

The project is experiencing an "Internal compiler error" in the `:expo-gradle-plugin:expo-autolinking-plugin-shared:compileKotlin` task. This is likely caused by inconsistent and redundant Kotlin Gradle Plugin versions across the project, including a suspicious `2.3.10` version that may have compatibility issues or typos.

## User Review Required

> [!IMPORTANT]
> I am unifying the Kotlin version to `2.1.0` across the project to match the version expected by the Expo autolinking plugin. This involves removing redundant classpath entries in both root and android-specific build files.

## Proposed Changes

### Root Project
#### [MODIFY] [build.gradle](file:///C:/Users/hp/vibroxe/vibroxe_new/build.gradle)
- Set `kotlin_version` to `2.1.0`.
- Remove redundant `kotlin-gradle-plugin:2.3.0` classpath entry.
- Clean up dependencies.

### Android Subproject
#### [MODIFY] [android/build.gradle](file:///C:/Users/hp/vibroxe/vibroxe_new/android/build.gradle)
- Set `kotlin_version` to `2.1.0`.
- Remove redundant `kotlin-gradle-plugin:2.0.21` classpath entry.

#### [MODIFY] [android/gradle.properties](file:///C:/Users/hp/vibroxe/vibroxe_new/android/gradle.properties)
- Update `android.kotlinVersion` to `2.1.0` for consistency.

## Verification Plan

### Automated Tests
- Run Gradle sync to ensure the "Internal compiler error" is resolved.
- Run `./gradlew :expo-gradle-plugin:expo-autolinking-plugin-shared:compileKotlin` to verify the specific failing task passes.

### Manual Verification
- Verify that the app still builds and runs correctly.
