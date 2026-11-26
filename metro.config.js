const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

const issieShared = path.resolve(__dirname, '../../issie-shared');

const config = {
  watchFolders: [issieShared],
  resolver: {
    extraNodeModules: {
      // pin react/react-native to the app's copies to avoid duplicate-React crashes
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
