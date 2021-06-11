
export function getFileNameFromPath(path, withoutExt) {
    let fileName = path.replace(/^.*[\\\/]/, '');
    if (withoutExt && fileName.endsWith('.jpg')) {
        fileName = fileName.substr(0, fileName.length - 4);
    }
    return fileName;
}

export function setNavParam(nav, name, val) {
    if (!nav) return;


    nav.setParams({ [name]: val });
}




