const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../node_modules/metro-config/src/loadConfig.js');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');

  // Patch for Windows absolute path bug (ERR_UNSUPPORTED_ESM_URL_SCHEME)
  // This uses pathToFileURL to make dynamic import() work on Windows.
  const searchBlock = `      try {
        const configModule = await import(absolutePath);
        config = await configModule.default;
      } catch (error) {`;

  const replacementBlock = `      try {
        const { pathToFileURL } = require('url');
        const configModule = await import(pathToFileURL(absolutePath).href);
        config = configModule.default || configModule;
      } catch (error) {`;

  // Check if it was already patched with my previous (bad) require patch
  const previousBadPatch = `      try {
        const configModule = require(absolutePath);
        config = configModule.default || configModule;
      } catch (error) {`;

  if (content.includes(searchBlock)) {
    content = content.replace(searchBlock, replacementBlock);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ Successfully patched metro-config with pathToFileURL fix.');
  } else if (content.includes(previousBadPatch)) {
    content = content.replace(previousBadPatch, replacementBlock);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ Updated previous patch with standard pathToFileURL fix.');
  } else if (content.includes(replacementBlock)) {
    console.log('ℹ️ metro-config is already patched correctly.');
  } else {
    console.log('⚠️ Could not find the target code block in metro-config. Structure might have changed.');
  }
} else {
  console.log('❌ Could not find node_modules/metro-config/src/loadConfig.js');
}

// Patch for react-native-nodemediaclient android namespace
const nodeMediaBuildGradle = path.resolve(__dirname, '../node_modules/react-native-nodemediaclient/android/build.gradle');
if (fs.existsSync(nodeMediaBuildGradle)) {
  let gradleContent = fs.readFileSync(nodeMediaBuildGradle, 'utf8');
  if (gradleContent.includes('namespace "cn.nodemediaclient"')) {
    gradleContent = gradleContent.replace('namespace "cn.nodemediaclient"', 'namespace "cn.nodemedia.react_native_nodemediaclient"');
    fs.writeFileSync(nodeMediaBuildGradle, gradleContent, 'utf8');
    console.log('✅ Successfully patched react-native-nodemediaclient build.gradle namespace.');
  }
}
