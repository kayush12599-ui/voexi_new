const fs = require('fs');
const path = require('path');

let configPlugins = {};
try {
  configPlugins = require('expo/config-plugins');
} catch (e1) {
  try {
    configPlugins = require('@expo/config-plugins');
  } catch (e2) {
    configPlugins = {};
  }
}

const withAndroidManifest = configPlugins.withAndroidManifest || ((config) => config);
const withAppBuildGradle = configPlugins.withAppBuildGradle || ((config) => config);
const withProjectBuildGradle = configPlugins.withProjectBuildGradle || ((config) => config);
const withDangerousMod = configPlugins.withDangerousMod || ((config) => config);

/**
 * Custom Expo Config Plugin for DeepAR integration.
 */
function withDeepAR(config) {
  // 1. Android: Add android:largeHeap="true" to AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    if (cfg.modResults && cfg.modResults.manifest && cfg.modResults.manifest.application) {
      const mainApplication = cfg.modResults.manifest.application[0];
      if (mainApplication && mainApplication.$) {
        mainApplication.$['android:largeHeap'] = 'true';
      }
    }
    return cfg;
  });

  // 2. Android: Add lintOptions and fix .aar dependency issue
  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults && cfg.modResults.contents && !cfg.modResults.contents.includes('lintOptions')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        'android {',
        'android {\n    lintOptions {\n        checkReleaseBuilds false\n        abortOnError false\n    }'
      );
    }
    return cfg;
  });

  // 3. Android Project: Add flatDir repository for DeepAR .aar
  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults && cfg.modResults.contents && !cfg.modResults.contents.includes('flatDir')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        'allprojects {\n    repositories {\n        flatDir {\n            dirs "$rootDir/../node_modules/react-native-deepar/android/libs"\n        }'
      );
    }
    return cfg;
  });

  // 4. Dangerous Mod: Patch the library's build.gradle directly
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      if (cfg.modRequest && cfg.modRequest.projectRoot) {
        const libraryBuildGradlePath = path.join(
          cfg.modRequest.projectRoot,
          'node_modules/react-native-deepar/android/build.gradle'
        );
        if (fs.existsSync(libraryBuildGradlePath)) {
          let content = fs.readFileSync(libraryBuildGradlePath, 'utf8');
          content = content.replace(
            'implementation fileTree(dir: "libs", include: ["*.aar"])',
            'implementation(name: "deepar-5.2.0", ext: "aar")'
          );
          fs.writeFileSync(libraryBuildGradlePath, content);
        }
      }
      return cfg;
    },
  ]);

  return config;
}

module.exports = withDeepAR;
