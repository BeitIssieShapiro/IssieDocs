/**
 * @format
 */

import { AppRegistry, View } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { semanticColors } from './src/elements';
import { trace } from './src/log';
import { GlobalContext } from './src/global-context.js';
import { MessageBoxProvider } from './src/message';

//import * as Sentry from "@sentry/react-native";

// Sentry.init({
//     dsn: "https://00d453107db040999591b45c49a0542a@o4504190127636480.ingest.sentry.io/4504190129668096",
//     // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
//     // We recommend adjusting this value in production.
//     tracesSampleRate: 1.0,
//   });

// const wApp = Sentry.wrap(App);



function SafeAppContainer(props) {
    console.log("props.url", props.url)
    return <GlobalContext.Provider value={{
        url: props.url
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
