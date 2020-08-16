let gIsSimulator = false;

export function setIsSimulator(val) {
    gIsSimulator = val;
}


export function isSimulator() {
    return gIsSimulator;
}

export function setNavParam(nav, name, val) {
    if (!nav) return;
    
    
    nav.setParams({[name] : val});
}