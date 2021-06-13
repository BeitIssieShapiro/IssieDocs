
// One Sheet includes multiples pages
export class WorkSheet {

    _pages = [];
    _name;
    _path;
    lastUpdated;

    constructor(path, name) {
        this._name = name;
        this._path = path;
    }

    get count() {
        return this._pages.length;
    }

    get name() {
        return this._name;
    }

    get path() {
        if (this._pages.length > 1) {
            return this._pages[0];
        } 
        
        return this._path;
    }

    get defaultSrc() {
        if (this._pages.length > 0)
            return this._pages[0];

        return "";
    }

    getPage(index) {
        if (index >= 0 && index < this._pages.length) {
            return this._pages[index];
        }
        return undefined;
    }

    addPage(path) {
        this._pages.push(path);

        //sort
        this._pages.sort((p1,p2)=>p1>p2);
    }
}