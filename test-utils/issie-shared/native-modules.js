/**
 * Stubs for native modules the Issie apps share, so a module that imports them
 * can be loaded under Jest. Each export is a factory for jest.mock():
 *
 *   jest.mock('react-native-share', () => require('<path>/testing/jest/native-modules').share());
 *   jest.mock('react-native-zip-archive', () => require('<path>/testing/jest/native-modules').zipArchive());
 *
 * Or call `mockCommonNativeModules(jest)` once from a setup file (see setup.js).
 */
const fn = (impl) => jest.fn(impl);

const share = () => {
    const Share = { open: fn(async () => ({ success: true })), shareSingle: fn(async () => ({ success: true })) };
    return { __esModule: true, default: Share, ...Share };
};

const zipArchive = () => ({
    __esModule: true,
    zip: fn(async (_src, target) => target),
    unzip: fn(async (_src, target) => target),
    unzipWithPassword: fn(async (_src, target) => target),
    subscribe: fn(() => ({ remove: () => { } })),
});

const tts = () => {
    const listeners = {};
    const Tts = {
        speak: fn(), stop: fn(async () => true), pause: fn(), resume: fn(),
        setDefaultLanguage: fn(async () => 'success'), setDefaultVoice: fn(async () => 'success'),
        setDefaultRate: fn(async () => 'success'), setDefaultPitch: fn(async () => 'success'),
        setDucking: fn(async () => 'success'), setIgnoreSilentSwitch: fn(async () => true),
        voices: fn(async () => []), engines: fn(async () => []), getInitStatus: fn(async () => 'success'),
        addEventListener: fn((ev, cb) => { (listeners[ev] = listeners[ev] || []).push(cb); return { remove: () => { } }; }),
        removeEventListener: fn(), removeAllListeners: fn(),
        /** fire a TTS event from a test, e.g. __emit('tts-finish', { utteranceId: 1 }) */
        __emit: (ev, payload) => (listeners[ev] || []).forEach(cb => cb(payload)),
    };
    return { __esModule: true, default: Tts, ...Tts };
};

const nitroSound = () => {
    const player = {
        startPlayer: fn(async () => 'ok'), stopPlayer: fn(async () => 'ok'), pausePlayer: fn(async () => 'ok'),
        resumePlayer: fn(async () => 'ok'), startRecorder: fn(async () => '/tmp/rec.m4a'), stopRecorder: fn(async () => '/tmp/rec.m4a'),
        addPlayBackListener: fn(), removePlayBackListener: fn(), addRecordBackListener: fn(), removeRecordBackListener: fn(),
        setVolume: fn(async () => 'ok'), seekToPlayer: fn(async () => 'ok'),
    };
    return { __esModule: true, default: player, createSound: () => player, ...player };
};

const splashScreen = () => ({ __esModule: true, default: { hide: fn(), show: fn() } });

const firebase = () => {
    const analytics = () => ({ logEvent: fn(async () => { }), logScreenView: fn(async () => { }), setAnalyticsCollectionEnabled: fn(async () => { }) });
    return { __esModule: true, default: analytics, getAnalytics: analytics, logEvent: fn(async () => { }) };
};

/**
 * @react-native-firebase/* (app, analytics, app-check, functions) as no-ops, as used
 * by issie-shared's firebase.ts. Call before requiring app code: mockFirebase(jest).
 */
function mockFirebase(j = jest) {
    const noop = () => jest.fn(async () => undefined);
    const anyFn = () => new Proxy(function () { }, { get: (t, p) => p === 'then' ? undefined : (t[p] = t[p] || anyFn()), apply: () => anyFn() });
    j.doMock('@react-native-firebase/app', () => ({ __esModule: true, getApp: anyFn(), default: anyFn() }), { virtual: true });
    j.doMock('@react-native-firebase/analytics', () => ({
        __esModule: true, default: anyFn(), getAnalytics: anyFn(), logEvent: noop(), logAppOpen: noop(), logScreenView: noop(),
        setAnalyticsCollectionEnabled: noop(),
    }), { virtual: true });
    j.doMock('@react-native-firebase/app-check', () => ({ __esModule: true, default: anyFn(), initializeAppCheck: noop() }), { virtual: true });
    j.doMock('@react-native-firebase/functions', () => ({
        __esModule: true, default: anyFn(), getFunctions: anyFn(), httpsCallable: () => jest.fn(async () => ({ data: {} })),
    }), { virtual: true });
}

/** Mocks every module above that the app has installed. */
function mockCommonNativeModules(j = jest) {
    const has = (m) => { try { require.resolve(m); return true; } catch { return false; } };
    const self = __filename;
    const table = {
        'react-native-share': 'share',
        'react-native-zip-archive': 'zipArchive',
        'react-native-tts': 'tts',
        'react-native-nitro-sound': 'nitroSound',
        'react-native-splash-screen': 'splashScreen',
    };
    for (const [mod, factory] of Object.entries(table)) {
        if (has(mod)) j.doMock(mod, () => require(self)[factory]());
    }
    if (has('react-native-localize')) j.doMock('react-native-localize', () => require('react-native-localize/mock'));
}

module.exports = { share, zipArchive, tts, nitroSound, splashScreen, firebase, mockFirebase, mockCommonNativeModules };
