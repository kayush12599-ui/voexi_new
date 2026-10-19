module.exports = {
  project: {
    android: {
      sourceDir: './android',
    },
    ios: {
      sourceDir: './ios',
    },
  },
  dependencies: {
    'react-native-nodemediaclient': {
      platforms: {
        android: {
          packageImportPath: 'import cn.nodemedia.react_native_nodemediaclient.RCTNodeMediaClientPackage;',
          packageInstance: 'new RCTNodeMediaClientPackage()',
        },
      },
    },
  },
};
