/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 180000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/IssieDocs.app',
      build: 'xcodebuild -workspace ios/IssieDocs.xcworkspace -scheme IssieDocs.e2e -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build | xcpretty',
      reversedUnhappyFlows: true,
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPad (A16)',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
      behavior: {
        init: {
          reinstallApp: false,
        },
      },
    },
  },
};
