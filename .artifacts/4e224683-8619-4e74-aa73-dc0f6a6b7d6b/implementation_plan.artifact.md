# Fix Unresolved reference 'AgeRestrictedTreatment'

The error `Unresolved reference 'AgeRestrictedTreatment'` occurs because the project is forcing an older version of the Google Mobile Ads SDK (`23.6.0`) in the root `build.gradle`, while the `react-native-google-mobile-ads` library (v16.5.0) requires a newer version (v25.4.0) that includes this class.

## Proposed Changes

### Root Project

#### [MODIFY] [build.gradle](file:///C:/vibroxe_new/build.gradle)
Update the forced version of `com.google.android.gms:play-services-ads` from `23.6.0` to `25.4.0` in the `resolutionStrategy`.

## Verification Plan

### Automated Tests
- Run `./gradlew :react-native-google-mobile-ads:compileDebugKotlin` to verify that the compilation error is resolved.
- Run `./gradlew :app:assembleDebug` to ensure the entire project builds successfully.

### Manual Verification
- Verify that ads are still loading correctly in the app (if a device is available for testing).
