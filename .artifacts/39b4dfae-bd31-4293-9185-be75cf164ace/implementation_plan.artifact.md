# Fix Gradle Sync Error: Non-existent 'C:\test-app' Directory

The project fails to sync because `.idea/gradle.xml` contains a stale reference to an external Gradle project at `C:\test-app`. Additionally, several `settings.gradle` files contain hardcoded absolute paths that should be converted to relative paths for better portability and to avoid similar issues.

## User Review Required

> [!IMPORTANT]
> I will be modifying `.idea/gradle.xml`, which is an IDE configuration file. This is necessary to remove the stale project reference that is causing the sync error.

## Proposed Changes

### IDE Configuration

#### [MODIFY] [.idea/gradle.xml](file:///C:/vibroxe_new/.idea/gradle.xml)
- Remove the `<GradleProjectSettings>` block that points to `$PROJECT_DIR$/../test-app/android`.

### Gradle Settings

#### [MODIFY] [android/settings.gradle](file:///C:/vibroxe_new/android/settings.gradle)
- Replace hardcoded absolute paths `C:/Users/hp/vibroxe/vibroxe_new/node_modules/...` with relative paths `../node_modules/...`.

#### [MODIFY] [vibroxe_new/android/settings.gradle](file:///C:/vibroxe_new/vibroxe_new/android/settings.gradle)
- Replace hardcoded absolute paths `C:/Users/hp/vibroxe/vibroxe_new/node_modules/...` with relative paths `../node_modules/...`.

## Verification Plan

### Automated Tests
- Run Gradle Sync in Android Studio to verify the error is resolved.

### Manual Verification
- Verify that `includeBuild` paths in `settings.gradle` correctly resolve to the `node_modules` folder.
