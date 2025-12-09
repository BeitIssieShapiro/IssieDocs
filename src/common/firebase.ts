

import { ReactNativeFirebaseAppCheckProvider, initializeAppCheck } from '@react-native-firebase/app-check';
import { getApp } from '@react-native-firebase/app';
import { debugToken } from './debug-token.ts';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { logEvent, logAppOpen, logScreenView, getAnalytics } from '@react-native-firebase/analytics';
import app from '../../app.json';

const appName = app.name;
let appCheck: any = undefined;
let analytics: any = undefined


export function firebaseInit() {
    // Enable debug mode for react-native-firebase:
    if (__DEV__) (globalThis as any).RNFBDebug = true;

    analytics = getAnalytics();

    const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
    rnfbProvider.configure({
        android: {
            provider: __DEV__ ? 'debug' : 'playIntegrity',
            debugToken,
        },
        apple: {
            provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
            debugToken,
        }
    });

    initializeAppCheck(getApp(), {
        provider: rnfbProvider,
        isTokenAutoRefreshEnabled: true,
    }).then(ac => {
        appCheck = ac
        console.log("Firebase init complete", debugToken)
        analyticEvent(AnalyticEvent.ApplicationStart);
    });
}

export async function addUserFeedback(txt: string) {
    const app = getApp()
    const functions = getFunctions(app, "europe-west1");
    const addUserFeedbackFunc = httpsCallable(functions, "addUserFeedback");

    return addUserFeedbackFunc({
        appName: "IssieDocs",
        feedbackText: txt
    });
}

//export type AnalyticEvent = "ApplicationStart" | "SettingsOpen" | "ChangeLanguage" | string;
export enum AnalyticEvent {
    ApplicationStart = "ApplicationStart",
    SettingsOpen = "SettingsOpen",
    SettingsClose = "SettingsClose",
    ChangeLanguage = "ChangeLanguage",
}


export async function analyticEvent(eventName: AnalyticEvent | string) {
    if (!analytics) return;

    if (eventName == AnalyticEvent.ApplicationStart) {
        return logAppOpen(analytics);
    } else if (eventName == AnalyticEvent.SettingsOpen) {
        //return logScreenView(analytics, { screen_name: "settings" });
        return logEvent(analytics, "SettingsOpen")
    }

    return logEvent(analytics, eventName)
}