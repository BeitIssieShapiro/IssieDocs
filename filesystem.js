import * as RNFS from 'react-native-fs';
import { translate } from './lang';
import { Image } from 'react-native';
import blankPage from './blank-page.jpg'
import mathPage from './math-page.jpg'
import linesPage from './lines-page.jpg'
import mockPage from './mock.jpg'


export class FileSystem {
    static SimulatorMockPage = mockPage;
    static main = new FileSystem();
    static StaticPages = {
        Blank: 1,
        Lines: 2,
        Math: 3,
        SimulatorMock: 4
    }
    static DEFAULT_FOLDER_METADATA = { icon: '', color: 'gray' };
    static DEFAULT_FOLDER = { name: 'Default', color: 'gray', icon: '' };

    _folders = [];
    _listeners = [];
    constructor() {
        this._basePath = RNFS.DocumentDirectoryPath + '/folders/';
        this._loaded = false;
        RNFS.mkdir(this._basePath).catch((e) => {
            console.log("FATAL: cannot find filesystem root " + e);
            throw (e);
        });
    }

    get basePath() {
        return this._basePath;
    }

    async getFolders() {
        if (!this._loaded) {
            await this.load();
        }
        return this._folders;
    }

    async load() {
        this._loaded = true
        this._folders = [];
        await RNFS.readDir(this._basePath).then(async (folders) => {

            for (let folder of folders) {
                if (folder.isDirectory()) {
                    metadata = await this._readFolderMetaData(folder.name)
                    console.log("folder color :"+metadata.color)
                    let fsf = new FileSystemFolder(folder.name, this, metadata);
                    this._folders.push(fsf);
                }
            }

            sortFolders(this._folders);
        });
        this._notify();
    }

    async _reloadFolder(name) {
        let folder = this._folders.find(f => f.name == name);
        if (folder) {
            await folder.reload();
        }
    }

    registerListener(callback) {
        this._listeners.push(callback);
    }

    _notify(folderName) {

        for (let i = 0; i < this._listeners.length; i++) {
            this._listeners[i](folderName);
        }
    }

    async deleteFolder(name) {
        let folderPath = this._basePath + name;
        await RNFS.unlink(folderPath)
        this._folders = this._folders.filter(f => f.name != name);
        this._notify();
    }

    async addFolder(name, icon, color, strictChecks) {
        console.log("add folder: "+name+", color:"+color+", icon="+icon)
        if (!name || name.length == 0) {
            throw translate("MissingFolderName");
        }

        if (!this._validPathPart(name)) {
            throw translate("IllegalCharacterInFolderName");
        }


        let folderPath = this._basePath + name;

        try {
            await RNFS.stat(folderPath);
            if (strictChecks) {
                //folder exists:
                throw translate("FolderAlreadyExists");
            }
        } catch (e) {
            await RNFS.mkdir(folderPath);
            let fsf = new FileSystemFolder(name, this, { color, icon });
            this._folders.push(fsf);

            await this._writeFolderMetaData(name, color, icon);
            if (name !== FileSystem.DEFAULT_FOLDER.name) {
                await pushFolderOrder(name)
                await sortFolders(this._folders)
            }
            this._notify(name);
        }

    }

    async renameFolder(name, newName, icon, color) {
        await this.addFolder(name, icon, color, true);

        //move all files and delete old folder
        await RNFS.readDir(this._basePath + name).then(async (files) => {
            for (let f of files) {
                await RNFS.moveFile(f.path, this._basePath + newName + "/" + f.name);
            }
        });
        await this.deleteFolder(name);
        await addFolder(originalFolderName, newFolderName);
        await this._reloadFolder(newFolderName);
        this._notify();
    }

    _getFolder(name) {
        return this._folders.find(f => f.name == name);
    }

    async saveFile(uri, filePath, isCopy) {
        //asserts that the filePath is in this filesystem:
        if (filePath.indexOf(this._basePath) != 0) {
            throw "Attempt to write to wrong path of the filesystem: " + filePath
        }

        let pathObj = this._parsePath(filePath);


        if (!pathObj.fileName || pathObj.fileName.length == 0) {
            throw translate("MissingPageName");
        }
        if (!this._validPathPart(pathObj.fileName)) {
            throw translate("IllegalCharacterInPageName");
        }

        await this._verifyFolderExists(filePath);

        let folder = this._getFolder(pathObj.folders[0]);
        if (!folder) {
            console.log("cant find folder " + pathObj.folders[0])
        }
        return new Promise((resolve, reject) => {
            if (uri.startsWith("rct-image-store")) {
                console.disableYellowBox = true;
                ImageStore.getBase64ForTag(
                    uri,
                    //success
                    (base64Contents) => {
                        //let contents = base64.decode(base64Contents);
                        //todo optimize code

                        RNFS.writeFile(filePath, base64Contents, 'base64').then(
                            //Success
                            async () => {
                                await folder.reload();
                                resolve();
                                this._notify(folder.name);
                            },
                            //on error 
                            err => this._handleSaveFileError('', err, reject)
                        ).catch(err => this._handleSaveFileError('', err, reject));
                    }, (err) => {
                        this._handleSaveFileError('', err, reject);
                    });
            } else {


                let ret
                if (isCopy) {
                    ret = this._copyDeep(uri, filePath);
                } else {
                    //touch is used to update the modified date
                    ret = RNFS.moveFile(uri, filePath).then(() => RNFS.touch(filePath, new Date));
                }

                ret.then(
                    //Success
                    async () => {
                        //check of the file was moved from another folder
                        if (!isCopy && uri.startsWith(this._basePath)) {
                            parseObjFrom = this._parsePath(uri);
                            parseObjTo = this._parsePath(filePath);
                            if (parseObjFrom.folders[0] != parseObjTo.folders[0] ) {
                                let srcFolder = this._getFolder(parseObjFrom.folders[0]);
                                await srcFolder.reload();
                            }
                        }

                        await folder.reload();
                        this._notify();
                        return resolve()
                    },
                    //on error 
                    err => this._handleSaveFileError(uri, err, reject)
                ).catch(err => this._handleSaveFileError(uri, err, reject));

            }
        });


    }

    _parsePath(filePath) {
        let lastSlashPos = filePath.lastIndexOf('/');
        let fileName = filePath.substr(lastSlashPos + 1);

        //remove base path
        let foldersPath = filePath.substring(this._basePath.length, lastSlashPos)
        let folders = foldersPath.split('/');

        return { fileName, folders };
    }

    async deleteFile(filePath) {
        let { folders } = this._parsePath(filePath);
        let folderName = folders[0];
        await RNFS.unlink(filePath).then(() => {
            RNFS.unlink(filePath + ".json").catch((e) => {/*do nothing*/ });
        });
        await this._reloadFolder(folderName);
        this._notify(folderName);
    }


    async _readFolderMetaData(folderName) {
        try {
            let metaDataFilePath = this._basePath + folderName+ "/.metadata";
            let metadataString = await RNFS.readFile(metaDataFilePath, 'utf8');

            let metadata = JSON.parse(metadataString.toString('utf8'));

            return metadata;
        } catch (e) {
            return FileSystem.DEFAULT_FOLDER_METADATA;
        }
    }

    async _writeFolderMetaData(folderName, color, icon) {
        let metaDataFilePath = this._basePath + folderName+ "/.metadata";

        let metadata = { color: color ? color : FileSystem.DEFAULT_FOLDER_METADATA.color, icon };
        RNFS.writeFile(metaDataFilePath, JSON.stringify(metadata), 'utf8').then(
            //Success
            undefined,
            //on error 
            err => Promise.reject(err)
        )
    }


    //verify folder exists, assumes prefix is basepath
    async _verifyFolderExists(filePath) {
        let pathObj = this._parsePath(filePath)
        let currPath = this._basePath;
        for (let i = 0; i < pathObj.folders.length; i++) {
            currPath += pathObj.folders[i] + '/';
            try {
                await RNFS.stat(currPath);
            } catch (e) {
                if (i == 0) { //root level folder
                    this.addFolder(pathObj.folders[i], FileSystem.DEFAULT_FOLDER_METADATA.icon,FileSystem.DEFAULT_FOLDER_METADATA.color)
                } else {
                    await RNFS.mkdir(currPath);
                }

            }
        }
    }



    //assumed folder is there already
    async _copyDeep(src, dst) {
        let stats = await RNFS.stat(src);
        if (stats.isDirectory()) {
            //in case of multi page, it is in fact folder
            await RNFS.mkdir(dst);

            let items = await RNFS.readDir(src);
            for (index in items) {
                const item = items[index];
                await RNFS.copyFile(item.path, dst + '/' + item.name).touch(dst + '/' + item.name, new Date);
            }
        } else {
            return RNFS.copyFile(src, dst).then(() => RNFS.touch(dst, new Date));
        }
    }

    _handleSaveFileError(uri, err, reject) {
        let errorStr = ""
        for (let key in err) {
            errorStr += JSON.stringify(err[key]).substr(15) + "\n";
        }
        //Alert.alert("Error: " + errorStr);
        if (err.toString().includes("already exists")) {
            reject(translate("PageAlreadyExists"));
            return;
        }
        reject('Error saving file: ' + (uri.length > 15 ? uri.substr(uri.length - 15) : uri) + ', err: ' + err);
    }

    static _getStaticPageRef(pageType) {
        let page = blankPage;
        if (pageType == FileSystem.StaticPages.Lines) {
            page = linesPage;
        } else if (pageType == FileSystem.StaticPages.Math) {
            page = mathPage;
        } else if (pageType == FileSystem.StaticPages.SimulatorMock) {
            return mockPage;
        }
        return page;
    }

    _validPathPart(PathPart) {
        if (!PathPart || PathPart.length == 0) {
            return false;
        }
        if (PathPart.includes('/')) {
            return false
        }
        if (PathPart.includes("\\")) {
            return false
        }
        return true;
    }

    static getTempFileName(ext) {
        const date = new Date()
        let fn = Math.random() + '-' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + '-' + ('0' + date.getMinutes()).slice(-2) + '-' + ('0' + date.getSeconds()).slice(-2);

        return RNFS.TemporaryDirectoryPath + fn + "." + ext
    }

    async getStaticPage(intoFolderName, pageType) {
        let newFileName = await this._getEmptyFileName(intoFolderName);
        await this._getStaticPage(this._basePath + intoFolderName + '/' + newFileName, pageType);
        await this._reloadFolder(intoFolderName);
        this._notify(intoFolderName);
        return newFileName;
    }

    async getStaticPageTempFile(pageType) {
        let tempFileName = FileSystem.getTempFileName("jpg");
        await this._getStaticPage(tempFileName, pageType);
        return tempFileName;
    }

    async cloneToTemp(uri) {
        let tempFileName = FileSystem.getTempFileName("jpg");
        await RNFS.copyFile(uri, tempFileName);
        return tempFileName;
    }

    async _getStaticPage(filePath, pageType) {
        let page = FileSystem._getStaticPageRef(pageType);

        let pageResolved = Image.resolveAssetSource(page);

        let downloadInfo = await RNFS.downloadFile({
            fromUrl: pageResolved.uri,
            toFile: filePath
        });
        await downloadInfo.promise;
    }

    async _getEmptyFileName(intoFolderName) {
        let basePath = this._basePath + intoFolderName + "/";
        await RNFS.mkdir(basePath);
        let baseFileName = translate("EmptyPageName");

        //only relevant for Simulator
        baseFileName = baseFileName.replace(".", "");

        //try a file name that is not taken:
        let fileName
        let index = ""
        while (true) {
            fileName = basePath + baseFileName + index + ".jpg";
            try {
                await RNFS.stat(fileName);
                //file exists, try increment index:
                index = index == "" ? " 1" : " " + (parseInt(index) + 1);
            } catch (e) {
                return baseFileName + index + ".jpg";
            }
        }
    }

}

export class FileSystemFolder {
    _files = undefined;
    _loading = true;

    constructor(name, fs, metadata) {
        this._metadata = metadata
        this._name = name;
        this._fs = fs;
    }

    get name() {
        return this._name;
    }

    get icon() {
        return this._metadata.icon;
    }
    get color() {
        return this._metadata.color;
    }

    get loading() {
        return this._loading;
    }

    get items() {
        if (!this._files) {
            this._loading = true;
            this._files = [];
            this.reload().then(() => this._fs._notify(this._name));
        }
        return this._files;
    }

    async getItem(name) {
        if (!this._files) {
            console.log("get.item: reloading...");
            await this.reload();
        }
        console.log("get.item: " + name + "files count: " + this._files.length);
        return this._files.find(f => f.name == name);
    }

    async reload() {
        console.log("read files of folder: " + this._name);
        const items = await RNFS.readDir(this._fs.basePath + this._name);
        const filesItems = items.filter(f => !f.name.endsWith(".json") && f.name !== ORDER_FILE_NAME && f.name !== ".metadata");
        this._loading = true;
        this._files = [];
        for (let fi of filesItems) {

            let lastUpdate = Math.max(fi.mtime.valueOf(), fi.ctime.valueOf());
            //finds the .json file if exists
            let dotJsonFile = items.find(f => f.name === fi.name + ".json");
            if (dotJsonFile) {
                lastUpdate = Math.max(dotJsonFile.mtime.valueOf(), dotJsonFile.ctime.valueOf(), lastUpdate);
            }

            let pages = []
            if (fi.isDirectory()) {
                //read all pages
                const innerPages = await RNFS.readDir(fi.path);

                pages = innerPages.filter(f => !f.name.endsWith(".json")).map(p => p.path);
            }
            this._files.push({ name: fi.name, lastUpdate, path: fi.path, isFolder: fi.isDirectory(), pages: pages });

        }
        this._loading = false;
        this._fs._notify();
    }
}


//sort.js
const ORDER_FILE_NAME = 'order.json'

export async function saveFolderOrder(folders) {
    return new Promise((resolve) => {
        let order = []
        if (folders) {
            for (let i = 0; i < folders.length; i++) {
                if (folders[i].name !== FileSystem.DEFAULT_FOLDER.name) {
                    order.push(folders[i].name);
                }
            }
        }

        RNFS.writeFile(FileSystem.main.basePath + ORDER_FILE_NAME, JSON.stringify(order), 'utf8').then(
            //Success
            () => resolve(),
            //on error 
            err => reject(err)
        )
    })
}
/**
 * 
 * @param {*} folders 
 * @return array of folders in the correct order
 */
export async function sortFolders(folders) {
    if (!folders) {
        return folders;
    }
    let nextPlace = 0;
    let defIndex = folders.findIndex(f => f.name == FileSystem.DEFAULT_FOLDER.name);
    if (defIndex < 0) {
        //Add a default empty - todo
    } else {
        //swap
        folders = swapFolders(folders, defIndex, nextPlace);
        nextPlace++;
    }
    try {
        let orderStr = await RNFS.readFile(FileSystem.main.basePath + ORDER_FILE_NAME, 'utf8');
        // /Alert.alert(orderStr.toString('utf-8'))
        let order = JSON.parse(orderStr.toString('utf8'));
        //Alert.alert(order)
        let msg = ""
        for (let i = 0; i < order.length; i++) {
            let foundFolderIndex = folders.findIndex(f => f.name === order[i]);
            if (foundFolderIndex >= 0) {
                let len = folders.length;
                folders = swapFolders(folders, foundFolderIndex, nextPlace);
                nextPlace++;
                msg += order[i] + ": " + foundFolderIndex + "->" + nextPlace
                if (len !== folders.length)
                    console.log(msg)
            }
        }

    } catch (e) {

        //left blank intentionally
    }

    //todo sort the rest by modified time
    // alert.alert(JSON.stringify(folders))
    return folders;
}

export function swapFolders(folders, from, to) {

    let temp = folders[to];
    folders[to] = folders[from];
    folders[from] = temp;
    return folders;
}

async function pushFolderOrder(folderName) {
    let orderStr = '[]';
    try {
        orderStr = await RNFS.readFile(FileSystem.main.basePath + ORDER_FILE_NAME, 'utf8');
    } catch (e) {
        //intentionally ignored, as sort.json is missing
    }
    // /Alert.alert(orderStr.toString('utf-8'))
    let order = JSON.parse(orderStr.toString('utf8'));

    //verify this folderName is not in the array:
    order = order.filter(f => f !== folderName)

    order.unshift(folderName);
    //Alert.alert(order)

    RNFS.writeFile(FileSystem.main.basePath + ORDER_FILE_NAME, JSON.stringify(order), 'utf8').then(
        //Success
        undefined,
        //on error 
        err => Promise.reject(err)
    )

}

export async function renameFolder(fromFolder, toFolder) {
    let orderStr = '[]';
    try {
        orderStr = await RNFS.readFile(FileSystem.main.basePath + ORDER_FILE_NAME, 'utf8');
    } catch (e) {
        //intentionally ignored, as sort.json is missing
    }
    // /Alert.alert(orderStr.toString('utf-8'))
    let order = JSON.parse(orderStr.toString('utf8'));

    //verify this folderName is not in the array:
    let inx = order.findIndex(f => f === fromFolder)
    if (inx != -1) {
        order[inx] = toFolder;

        RNFS.writeFile(FileSystem.main.basePath + ORDER_FILE_NAME, JSON.stringify(order), 'utf8').then(
            //Success
            undefined,
            //on error 
            err => Promise.reject(err)
        )
    }

}


