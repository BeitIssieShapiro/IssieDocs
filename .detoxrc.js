/** @type {Detox.DetoxConfig} */
// e2e tests on iPad, iPhone and Android. Device names can be overridden:
//   DETOX_IPAD="iPad Air 11-inch (M4)"  DETOX_IPHONE="iPhone 17"  DETOX_AVD="IssieTest"
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
      build: 'xcodebuild -workspace ios/IssieDocs.xcworkspace -scheme IssieDocs.e2e -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build | (command -v xcpretty >/dev/null && xcpretty || cat)',
      reversedUnhappyFlows: true,
      launchArgs: { RCT_jsLocation: 'localhost:8084', IS_DETOX_TEST: true },
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      testBinaryPath: 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
      reversePorts: [8081],
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: process.env.DETOX_IPAD_ID ? { id: process.env.DETOX_IPAD_ID } : { type: process.env.DETOX_IPAD || 'iPad (A16)' },
    },
    iphone: {
      type: 'ios.simulator',
      device: { type: process.env.DETOX_IPHONE || 'iPhone 17' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: process.env.DETOX_AVD || 'IssieTest' },
    },
    // a phone or tablet connected over USB (adb devices)
    attached: {
      type: 'android.attached',
      device: { adbName: process.env.DETOX_ADB_NAME || '.*' },
    },
  },
  configurations: {
    // iPad (the original configuration name, kept for existing scripts)
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
      behavior: { init: { reinstallApp: false } },
    },
    'ios.iphone.debug': {
      device: 'iphone',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug',
    },
  },
};
