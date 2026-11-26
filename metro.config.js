const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // issie-shared is installed as a file: symlink. Metro must watch it
  // explicitly so it can compile modules inside it and resolve their
  // peer deps (react-native etc.) from this app's node_modules.
  watchFolders: [path.resolve(__dirname, '../../issie-shared')],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
