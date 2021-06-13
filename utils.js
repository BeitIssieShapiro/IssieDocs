


export function setNavParam(nav, name, val) {
    if (!nav) return;


    nav.setParams({ [name]: val });
}




