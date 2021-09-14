
// One Sheet includes multiples pages
export class WorkSheet {

    _pages = [];
    _name;
    _path;
    _thumbnail;
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

    get thumbnail() {
        return this._thumbnail?this._thumbnail: this.defaultSrc;
    }

    get path() {
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

    setThumbnail(path) {
        this._thumbnail = path;
    }

    addPage(path) {
        this._pages.push(path);

        //sort
        this._pages.sort((a,b)=> {
            getNumber = (elem)=>{
                let ls = elem.lastIndexOf('/');
                ls = elem.substring(ls+1, elem.length - 4)
                console.log(ls)
                return parseInt(ls);
            }
            return getNumber(a) - getNumber(b);
        });
    }
}