let gIsSimulator = false;

export function setIsSimulator(val) {
    gIsSimulator = val;
}


export function isSimulator() {
    return gIsSimulator;
}