

import { ReactNativeFirebaseAppCheckProvider, initializeAppCheck } from '@react-native-firebase/app-check';
import { getApp } from '@react-native-firebase/app';
import { debugToken } from './debug-token.ts';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

let appCheck: any = undefined;


export function firebaseInit() {
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