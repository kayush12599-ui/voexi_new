const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../node_modules/metro-config/src/loadConfig.js');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');

  // Patch for Windows absolute path bug (ERR_UNSUPPORTED_ESM_URL_SCHEME)
  const searchBlock = `      try {
        const configModule = await import(absolutePath);
        config = await configModule.default;
      } catch (error) {`;

  const replacementBlock = `      try {
        const { pathToFileURL } = require('url');
        const configModule = await import(pathToFileURL(absolutePath).href);
        config = configModule.default || configModule;
      } catch (error) {`;

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

// Patch for react-native-reanimated plugin worklets import
const reanimatedPlugin = path.resolve(__dirname, '../node_modules/react-native-reanimated/plugin/index.js');
if (fs.existsSync(reanimatedPlugin)) {
  let pluginContent = fs.readFileSync(reanimatedPlugin, 'utf8');
  if (pluginContent.includes("require('react-native-worklets/plugin')")) {
    pluginContent = pluginContent.replace("require('react-native-worklets/plugin')", "require('react-native-worklets-core/plugin')");
    fs.writeFileSync(reanimatedPlugin, pluginContent, 'utf8');
    console.log('✅ Successfully patched react-native-reanimated plugin worklets import.');
  }
}

// Patch react-dom version mismatch check for React 19.1.0 compatibility
const reactDomFiles = [
  path.resolve(__dirname, '../node_modules/react-dom/cjs/react-dom-client.development.js'),
  path.resolve(__dirname, '../node_modules/react-dom/cjs/react-dom-client.production.js'),
  path.resolve(__dirname, '../node_modules/react-dom/cjs/react-dom-server.browser.development.js'),
  path.resolve(__dirname, '../node_modules/react-dom/cjs/react-dom-server.browser.production.js'),
];

reactDomFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('if ("19.2.8" !== isomorphicReactPackageVersion)')) {
      content = content.replace('if ("19.2.8" !== isomorphicReactPackageVersion)', 'if (false && "19.2.8" !== isomorphicReactPackageVersion)');
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Successfully patched react-dom version check in ${path.basename(file)}`);
    }
  }
});

// Patch fontfaceobserver timeout error for Web Font loading
const fontObserverFiles = [
  path.resolve(__dirname, '../node_modules/fontfaceobserver/fontfaceobserver.standalone.js'),
  path.resolve(__dirname, '../node_modules/fontfaceobserver/fontfaceobserver.js'),
  path.resolve(__dirname, '../node_modules/fontfaceobserver/src/observer.js'),
];

fontObserverFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('ms timeout exceeded')) {
      content = content.replace(/L\(Error\(""\+q\+"ms timeout exceeded"\)\)/g, 'L()');
      content = content.replace(/reject\(new Error\('' \+ timeoutValue \+ 'ms timeout exceeded'\)\);/g, 'resolve();');
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Successfully patched fontfaceobserver timeout in ${path.basename(file)}`);
    }
  }
});
