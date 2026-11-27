import { Alert } from 'react-native';
import { setJSExceptionHandler, setNativeExceptionHandler } from 'react-native-exception-handler';
import { addUserFeedback } from '@beitissieshapiro/issie-shared';

// The JS handler also receives every console.error call (react-native-exception-handler routes
// console.error to it, with the logged arguments). Only a thrown Error is a crash; anything else,
// e.g. console.error("Feedback submission error:", err), is a log line and gets no alert.
const errorHandler = (error: unknown, isFatal: boolean): void => {
    if (!(error instanceof Error)) return;
    const err = `Error: ${isFatal ? "Fatal" : ""} ${error.name} ${error.message}
    Stack Trace:
    ${error.stack}`;
    nativeErrorHandler(err);
};

const nativeErrorHandler = (exceptionMsg: string): void => {
    Alert.alert("Unexpected error occured", exceptionMsg, [{ text: "OK" }, {text:"Report to Dev Team", onPress:()=>{
        addUserFeedback("IssieDocs", "crash", exceptionMsg);
    }}])
}

export function InitCrashCatch() {
    setJSExceptionHandler(errorHandler as (error: Error, isFatal: boolean) => void, true);
    setNativeExceptionHandler(nativeErrorHandler, false, false);
}
