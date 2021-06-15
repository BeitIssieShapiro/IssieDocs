

export function trace(a,...optionalParams) {
    if (__DEV__) {
        console.log(a, ...optionalParams);
    }
}

export function assert(cond, description) {
    if (!cond) {
        console.error("Assertion Failed: " + description);
    }
}