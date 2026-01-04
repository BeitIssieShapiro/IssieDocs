/**
 * @format
 */

import { AppRegistry, View } from 'react-native';
import { initLang, LANGUAGE_SETTINGS, loadLanguage, updateUISettings } from '@beitissieshapiro/issie-shared'
import App from './src/App';
import { name as appName } from './app.json';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { semanticColors } from './src/elements';
import { GlobalContext } from './src/global-context.js';
import { MessageBoxProvider } from './src/message';

import TextEncoder from 'react-native-fast-encoder';
import { firebaseLocalInit } from './src/common/firebase';
import { languageMap } from './src/lang.js';
import { Settings } from "./src/new-settings"
import { TEXT_BUTTON } from './src/settings.js';

// @ts-ignore
window.TextEncoder = TextEncoder;
// @ts-ignore
window.TextDecoder = TextEncoder;


//import * as Sentry from "@sentry/react-native";

// Sentry.init({
//     dsn: "https://00d453107db040999591b45c49a0542a@o4504190127636480.ingest.sentry.io/4504190129668096",
//     // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
//     // We recommend adjusting this value in production.
//     tracesSampleRate: 1.0,
//   });

// const wApp = Sentry.wrap(App);

firebaseLocalInit()

initLang(languageMap, { languageTag: "he", isRTL: true });
loadLanguage(Settings.get(LANGUAGE_SETTINGS.name));
updateUISettings((Settings.get(TEXT_BUTTON.name) || TEXT_BUTTON.yes) == TEXT_BUTTON.yes);

function SafeAppContainer(props) {
    console.log("props.url", props.url)
    const now = new Date();
    return <GlobalContext.Provider value={{
        url: props.url,
        nativeStartTime: props.nativeStartTime ?? now.getMilliseconds(),
    }}>
        <SafeAreaProvider>
            <SafeApp />
        </SafeAreaProvider>
    </GlobalContext.Provider>;
}




function SafeApp(props) {
    const insets = useSafeAreaInsets();
    return <View style={{
        width: "100%",
        height: "100%",
        direction: "ltr",

        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: semanticColors.header
    }}>
        <MessageBoxProvider>
            <App insets={insets} />
        </MessageBoxProvider>

    </View>

}

AppRegistry.registerComponent(appName, () => SafeAppContainer);
