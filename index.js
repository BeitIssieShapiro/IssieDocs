/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

//import * as Sentry from "@sentry/react-native";

// Sentry.init({
//     dsn: "https://00d453107db040999591b45c49a0542a@o4504190127636480.ingest.sentry.io/4504190129668096",
//     // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
//     // We recommend adjusting this value in production.
//     tracesSampleRate: 1.0,
//   });

// const wApp = Sentry.wrap(App);

AppRegistry.registerComponent(appName, () => App);
