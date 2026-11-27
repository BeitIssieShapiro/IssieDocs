const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

// issie-shared is a file: dependency (a symlink in node_modules). Follow the link so this works
// from any checkout (including git worktrees), and resolve every package it imports from this
// app's node_modules: issie-shared has its own dev copy of react-native, and bundling a second
// react-native crashes the app at startup ("'PlatformConstants' could not be found").
const appModules = path.resolve(__dirname, 'node_modules');
const issieShared = fs.realpathSync(path.join(appModules, '@beitissieshapiro/issie-shared'));
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const config = {
  watchFolders: [issieShared],
  resolver: {
    nodeModulesPaths: [appModules],
    blockList: [new RegExp(`^${escapeRe(path.join(issieShared, 'node_modules'))}/.*$`)],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
