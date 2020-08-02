export function isSimulator() {
    return false;
}

export function setNavParam(nav, name, val) {
    if (!nav) return;
    
    
    nav.setParams({[name] : val});
}