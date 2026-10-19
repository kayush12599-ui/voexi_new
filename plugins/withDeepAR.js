const { withAndroidManifest, withAppBuildGradle, withProjectBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom Expo Config Plugin for DeepAR integration.
 */
function withDeepAR(config) {
  // 1. Android: Add android:largeHeap="true" to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    mainApplication.$['android:largeHeap'] = 'true';
    return config;
  });

  // 2. Android: Add lintOptions and fix .aar dependency issue
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('lintOptions')) {
      config.modResults.contents = config.modResults.contents.replace(
        'android {',
        'android {\n    lintOptions {\n        checkReleaseBuilds false\n        abortOnError false\n    }'
      );
    }
    return config;
  });

  // 3. Android Project: Add flatDir repository for DeepAR .aar
  config = withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('flatDir')) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        'allprojects {\n    repositories {\n        flatDir {\n            dirs "$rootDir/../node_modules/react-native-deepar/android/libs"\n        }'
      );
    }
    return config;
  });

  // 4. Dangerous Mod: Patch the library's build.gradle directly
  // This is needed because the library uses fileTree which AGP 7+ hates for AARs
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const libraryBuildGradlePath = path.join(
        config.modRequest.projectRoot,
        'node_modules/react-native-deepar/android/build.gradle'
      );
      if (fs.existsSync(libraryBuildGradlePath)) {
        let content = fs.readFileSync(libraryBuildGradlePath, 'utf8');
        // Replace fileTree with named dependency
        content = content.replace(
          'implementation fileTree(dir: "libs", include: ["*.aar"])',
          'implementation(name: "deepar-5.2.0", ext: "aar")'
        );
        fs.writeFileSync(libraryBuildGradlePath, content);
      }
      return config;
    },
  ]);

  return config;
}

module.exports = withDeepAR;
