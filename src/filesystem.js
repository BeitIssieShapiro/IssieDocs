import * as RNFS from 'react-native-fs';
import { translate } from './lang';
import { Image, LogBox } from 'react-native';
import blankPage from './blank-page.png'
import mathPage from './math-page.png'
import linesPage from './lines-page.png'
import mockPage from './mock.jpg'
import { WorkSheet } from './work-sheet';
import { trace, assert } from './log'
import ImageResizer from 'react-native-image-resizer';

const THUMBNAIL_SUFFIX = ".thumbnail.jpg";

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
        console.log("base path: " + this._basePath);
        this._loaded = false;
        RNFS.mkdir(this._basePath).catch((e) => {
            console.log("FATAL: cannot find filesystem root " + e);
            throw (e);
        });
    }

    async resizeImage(uri, width, height) {
        return ImageResizer.createResizedImage(uri, height, width, "JPEG", 100).then(
            (response) => {
                return response.path;
            })
    }

    async convertImageToBase64(uri) {
        return RNFS.readFile(uri, 'base64').then(data => "data:image/jpg;base64," + data);
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
                    console.log("folder color :" + metadata.color)
                    let fsf = new FileSystemFolder(folder.name, this, metadata);
                    this._folders.push(fsf);
                }
            }

            await _sortFolders(this._folders);
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
        trace("Delete folder: ", name);
        let folderPath = this._basePath + name;
        await RNFS.unlink(folderPath)
        this._folders = this._folders.filter(f => f.name != name);
        this._notify();
    }

    async addFolder(name, icon, color, strictChecks, skipCreateMetadata, rename) {
        console.log("add folder: " + name + ", color:" + color + ", icon=" + icon)
        if (!name || name.length == 0) {
            throw translate("MissingFolderName");
        }

        if (!this._validPathPart(name)) {
            throw translate("IllegalCharacterInFolderName");
        }


        let folderPath = this._basePath + name;
        let newFolder = true
        if (await this._fileExists(folderPath)) {
            if (strictChecks) {
                //folder exists:
                throw translate("FolderAlreadyExists");
            }
            newFolder = false;
        } else {
            trace("Folder ", name, " is about to be created")
            await RNFS.mkdir(folderPath);
            trace("Folder ", folderPath, " has been created")
            let fsf = new FileSystemFolder(name, this, { color, icon });
            this._folders.push(fsf);
        }
        if (!skipCreateMetadata) {
            const newMetadata = await this._writeFolderMetaData(name, color, icon);

            if (name !== FileSystem.DEFAULT_FOLDER.name && !rename) {
                await pushFolderOrder(name)
                await _sortFolders(this._folders)
            }

            if (!newFolder) {
                //update existing color/icon
                const folder = this._getFolder(name)
                folder.metadata = newMetadata;
            }
        }
        trace("Folder ", name, " has been notified")
        this._notify(name);

    }

    async renameFolder(name, newName, icon, color) {
        await this.addFolder(newName, icon, color, name !== newName, false, true);
        //move all files and delete old folder
        if (name !== newName) {
            await RNFS.readDir(this._basePath + name).then(async (files) => {
                for (let f of files) {
                    trace("iterate files", f)
                    if (f.name !== ".metadata") {
                        // skip meta data as it was created already
                        await RNFS.moveFile(f.path, this._basePath + newName + "/" + f.name);
                    }
                }
            });
            await this.deleteFolder(name);
            await _renameFolderOrders(name, newName);
            await _sortFolders(this._folders);
            await this._reloadFolder(newName);
        }
        this._notify();
    }

    _getFolder(name) {
        return this._folders?.find(f => f.name == name);
    }

    loadFile(path) {
        return RNFS.readFile(path, 'utf8');
    }

    writeFile(path, content) {
        return RNFS.writeFile(path, content);
    }

    async renameOrDuplicateThumbnail(pagePath, targetPage, isDuplicate) {
        let pathObj = this._parsePath(pagePath);
        if (pathObj.folders.length < 1)
            return;

        const thumbnailContainingFolder = this._basePath + pathObj.folders[0];
        let pageName = pathObj.folders.length > 1 ? pathObj.folders[1] : pathObj.fileName;

        if (pageName.endsWith(".jpg")) {
            pageName = pageName.substring(0, pageName.length - 4);
        }
        let items = await RNFS.readDir(thumbnailContainingFolder);

        let thumbnailFile = items.find(f => f.name.startsWith(pageName + ".") && f.name.endsWith(THUMBNAIL_SUFFIX));

        if (thumbnailFile) {
            // from name.<cache>.thumbnail.jpg remove name
            let pageNameSuffix = thumbnailFile.name.substr(pageName.length);


            trace("start moveOrDuplicateThumbnail", pagePath, targetPage)
            const targetThumbnailPath = (targetPage.endsWith(".jpg") ?
                targetPage.substring(0, targetPage.length - 4) : targetPage) + pageNameSuffix;


            trace("moveOrDuplicateThumbnail", "from", thumbnailFile.path, "to", targetThumbnailPath)
            try {
                if (isDuplicate) {
                    await RNFS.copyFile(thumbnailFile.path, targetThumbnailPath);
                } else {
                    await RNFS.moveFile(thumbnailFile.path, targetThumbnailPath);
                }

                // update page's thumbnail
                let pathObj = this._parsePath(targetPage);
                trace("notify thumbnail change", pathObj.folders[0])
                if (pathObj.folders.length >= 1) {
                    let folder = this._getFolder(pathObj.folders[0]);
                    if (folder) {
                        let pageName = pathObj.folders.length > 2 ? pathObj.folders[1] : pathObj.fileName;
                        trace("notify thumbnail change 1", pageName)
                        if (pageName.endsWith(".jpg")) {
                            pageName = pageName.substring(0, pageName.length - 4);
                        }

                        const item = await folder.getItem(pageName)
                        item.setThumbnail(targetThumbnailPath);
                        this._notify(pathObj[0]);
                    }
                }

            } catch (e) {
                //ignore, as maybe thumbnail is missing
            }
        }
    }

    async saveThumbnail(uri, page) {
        let pathObj = page ?
            this._parsePath(page.defaultSrc) :
            this._parsePath(uri);

        if (pathObj.folders.length < 1)
            return;

        let thumbnailPath = this._basePath + pathObj.folders[0] + '/' +
            (pathObj.folders.length == 2 ? pathObj.folders[1] : pathObj.fileName);

        if (thumbnailPath.endsWith(".jpg")) {
            thumbnailPath = thumbnailPath.substring(0, thumbnailPath.length - 4);
        }
        let cacheBuster = Math.floor(Math.random() * 100000);
        //let thumbnailPathPattern = thumbnailPath + ".*" + THUMBNAIL_SUFFIX;
        thumbnailPath += "." + cacheBuster + THUMBNAIL_SUFFIX;

        // delete existing thumbnail
        try {
            if (page && page.thumbnail.endsWith(THUMBNAIL_SUFFIX))
                await RNFS.unlink(page.thumbnail);
        } catch (e) { }

        if (!page) {
            console.log("cp", uri, thumbnailPath);
            return RNFS.copyFile(uri, thumbnailPath).then(() => {
                this._notify(pathObj.folders[0]);
            });
        }

        console.log("mv", uri, thumbnailPath);
        return RNFS.moveFile(uri, thumbnailPath).then(async () => {
            page.setThumbnail(thumbnailPath);
            let fi = await RNFS.stat(thumbnailPath);
            page.lastUpdate = Math.max(fi.mtime.valueOf(), fi.ctime.valueOf());
            this._notify(pathObj.folders[0]);
        });
    };

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

        if (pathObj.folders.length > 1 && !this._validPathPart(pathObj.folders[1])) {
            throw translate("IllegalCharacterInPageName");
        }

        if (pathObj.folders.length > 2) {
            throw translate("IllegalCharacterInPageName");
        }

        await this._verifyFolderExists(filePath);

        let folder = this._getFolder(pathObj.folders[0]);
        if (!folder) {
            console.log("cant find folder " + pathObj.folders[0])
        }
        return new Promise((resolve, reject) => {
            if (uri.startsWith("rct-image-store")) {
                LogBox.ignoreAllLogs();
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
                    trace("copy: ", uri, " to: ", filePath);
                    ret = this._copyDeep(uri, filePath);
                } else {
                    trace("rename: ", uri, " to: ", filePath);
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
                            if (parseObjFrom.folders[0] != parseObjTo.folders[0]) {
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
    async movePage(sheet, newFolder) {
        trace("move page", sheet.path, newFolder);

        const isSourceIsFolder = sheet.path.endsWith(".jpg");
        // Constract target path:
        const targetPath = this._basePath + newFolder;
        let targetFileName = targetPath + '/' + sheet.name;
        if (isSourceIsFolder) {
            targetFileName += ".jpg";
        }

        const srcPath = decodeURI(sheet.path);
        await FileSystem.main.saveFile(srcPath, targetFileName, false);
        if (isSourceIsFolder)
            try {
                await FileSystem.main.saveFile(srcPath + ".json", targetFileName + ".json", false);
            } catch (e) {
                //ignore, as maybe json is missing
            }

        return FileSystem.main.renameOrDuplicateThumbnail(srcPath, targetFileName, false);
    }

    async addPageToSheet(sheet, newPagePath) {
        trace("add page to sheet: ", sheet.path, " - ", newPagePath);
        //check if the path is already a folder:

        try {
            let pathInfo = await RNFS.stat(sheet.path);
            if (pathInfo.isDirectory()) {
                //add file by page's Index
                let lastPagePath = sheet.getPage(sheet.count - 1)
                let basePathEnd = lastPagePath.lastIndexOf('/');
                let fileNameEnd = lastPagePath.lastIndexOf('.');
                let basePath = lastPagePath.substring(0, basePathEnd + 1);
                let lastFileName = lastPagePath.substring(basePathEnd + 1, fileNameEnd);
                let newFileName = basePath + (parseInt(lastFileName) + 1) + '.jpg'
                console.log("add page: " + newFileName)
                await FileSystem.main.saveFile(newPagePath, newFileName, false);

            } else {
                //change to folder
                assert(sheet.path.endsWith(".jpg"), "change to folder");
                let basePath = sheet.path.substring(0, sheet.path.length - 4); //remove .jpg 

                await RNFS.mkdir(basePath);
                await RNFS.moveFile(sheet.path, basePath + '/0.jpg');
                try {
                    await RNFS.moveFile(sheet.path + ".json", basePath + '/0.jpg.json');

                } catch {
                    //ignore missing json
                }

                FileSystem.main.saveFile(newPagePath, basePath + '/1.jpg', false);

            }

            return await this._reloadBySheet(sheet);

        } catch (e) {
            console.log("error adding page to sheet: " + e);
        }
    }

    //reload the folder of the sheet and notify and return new updated sheet
    async _reloadBySheet(sheet) {
        let pathObj = this._parsePath(sheet.path);
        trace("reload by sheet: ", sheet.path, JSON.stringify(pathObj))
        let folder = this._getFolder(pathObj.folders[0]);
        await folder.reload();
        this._notify(pathObj.folders[0]);
        return await folder.getItem(sheet.name);
    }

    //return an updated sheet
    async deletePageInSheet(sheet, deleteIndex) {
        if (sheet.count < 2) {
            console.warn("cannot delete last page of sheet");
            return;
        }
        let pagePath = sheet.getPage(deleteIndex);
        trace("Delete page in Sheet: ", sheet.name, "[", deleteIndex, "] ", pagePath)

        //delete file
        await RNFS.unlink(pagePath)
        try {
            await RNFS.unlink(pagePath + ".json");
        } catch {
            //ignore as maybe no json file
        }

        //fix file names
        // let basePathEnd = pagePath.lastIndexOf('/');
        // let basePath = pagePath.substring(0, basePathEnd+1);
        let basePath = sheet.path;
        for (let i = deleteIndex + 1; i < sheet.count; i++) {

            await RNFS.moveFile(basePath + '/' + i + ".jpg", basePath + '/' + (i - 1) + ".jpg")
            try {
                await RNFS.moveFile(basePath + '/' + i + ".jpg.json", basePath + '/' + (i - 1) + ".jpg.json")
            } catch {
                //ignore as json may be missing
            }
        }

        return await this._reloadBySheet(sheet);
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
            let metaDataFilePath = this._basePath + folderName + "/.metadata";
            let metadataString = await RNFS.readFile(metaDataFilePath, 'utf8');

            let metadata = JSON.parse(metadataString.toString('utf8'));

            return metadata;
        } catch (e) {
            return FileSystem.DEFAULT_FOLDER_METADATA;
        }
    }

    async _writeFolderMetaData(folderName, color, icon) {
        let metaDataFilePath = this._basePath + folderName + "/.metadata";

        let metadata = { color: color ? color : FileSystem.DEFAULT_FOLDER_METADATA.color, icon };
        return RNFS.writeFile(metaDataFilePath, JSON.stringify(metadata), 'utf8').then(
            //Success
            () => {
                return metadata
            },
            //on error 
            err => {
                trace("fail writing metadata", err);
                Promise.reject(err)
            }
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
                    await this.addFolder(pathObj.folders[i], FileSystem.DEFAULT_FOLDER_METADATA.icon, FileSystem.DEFAULT_FOLDER_METADATA.color)
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
                await RNFS.copyFile(item.path, dst + '/' + item.name).then(() => RNFS.touch(dst + '/' + item.name, new Date));
            }
        } else {
            return RNFS.copyFile(src, dst).then(() => RNFS.touch(dst, new Date));
        }
    }

    _handleSaveFileError(uri, err, reject) {
        let errorStr = ""
        if (err) {
            for (let key in err) {
                errorStr += JSON.stringify(err[key]).substr(15) + "\n";
            }
            //Alert.alert("Error: " + errorStr);
            if (err && err.toString().includes("already exists")) {
                reject(translate("PageAlreadyExists"));
                return;
            }
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

    static getFileNameFromPath(path, withoutExt) {
        let fileName = path.replace(/^.*[\\\/]/, '');
        if (withoutExt && fileName.endsWith('.jpg')) {
            fileName = fileName.substr(0, fileName.length - 4);
        }
        return fileName;
    }

    // async getStaticPage(intoFolderName, pageType) {
    //     await this._verifyFolderExists(intoFolderName)
    //     let newFileName = await this._getEmptyFileName(intoFolderName);
    //     await this._getStaticPage(this._basePath + intoFolderName + '/' + newFileName, pageType);
    //     await this._reloadFolder(intoFolderName);
    //     this._notify(intoFolderName);
    //     trace("getStaticPage", intoFolderName)
    //     return newFileName;
    // }

    // size = {width, height}
    getStaticPageTempFile(pageType) {
        let tempFileName = FileSystem.getTempFileName("jpg");
        return this._getStaticPage(tempFileName, pageType).then(()=>tempFileName);
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

    async _fileExists(path) {
        try {
            await RNFS.stat(path);
            //file exists, try increment index:
            return true
        } catch (e) {
            return false;
        }
    }

    async _getEmptyFileName(intoFolderName) {
        let basePath = this._basePath + intoFolderName + "/";
        let baseFileName = translate("EmptyPageName");

        //only relevant for Simulator
        baseFileName = baseFileName.replace(".", "");

        //try a file name that is not taken:
        let fileName
        let index = ""
        while (true) {
            fileName = basePath + baseFileName + index;
            if (await this._fileExists(fileName) || await this._fileExists(fileName + ".jpg"))
                index = index == "" ? " 1" : " " + (parseInt(index) + 1);
            else
                return baseFileName + index + ".jpg";
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

    set metadata(md) {
        this._metadata = md
    }

    get name() {
        return this._name;
    }

    get icon() {
        return this?._metadata?.icon || '';
    }
    get color() {
        return this?._metadata?.color || FileSystem.DEFAULT_FOLDER_METADATA.color;
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
        name = FileSystem.getFileNameFromPath(name, true);
        if (!this._files) {
            console.log("get.item: reloading...");
            await this.reload();
        }
        console.log("get.item: " + name + "files count: " + this._files.length);
        return this._files.find(f => f.name == name);
    }

    async reload() {
        console.log("reload folder: " + this._name);
        const items = await RNFS.readDir(this._fs.basePath + this._name);
        const filesItems = items.filter(f => !f.name.endsWith(".json") && f.name !== ORDER_FILE_NAME &&
            f.name !== ".metadata" && !f.name.endsWith("thumbnail.jpg"));

        this._loading = true;
        this._files = [];
        for (let fi of filesItems) {
            trace("read file", fi.name)
            const name = FileSystem.getFileNameFromPath(fi.name, true);
            let sheet = new WorkSheet(fi.path, name);
            let lastUpdate = Math.max(fi.mtime.valueOf(), fi.ctime.valueOf());

            if (fi.isDirectory()) {
                //read all pages
                const pages = await RNFS.readDir(fi.path);

                for (let i = 0; i < pages.length; i++) {
                    lastUpdate = Math.max(lastUpdate, pages[i].mtime.valueOf(), pages[i].ctime.valueOf());

                    if (!pages[i].name.endsWith(".json")) {

                        sheet.addPage(pages[i].path);
                    }
                }
            } else {
                lastUpdate = Math.max(lastUpdate, fi.mtime.valueOf(), fi.ctime.valueOf());
                sheet.addPage(fi.path);
                //finds the .json file if exists
                let dotJsonFile = items.find(f => f.name === fi.name + ".json");
                if (dotJsonFile) {
                    lastUpdate = Math.max(lastUpdate, dotJsonFile.mtime.valueOf(), dotJsonFile.ctime.valueOf());
                }
            }

            //find thumbnail
            let thumbnail = items.find(f => f.name.startsWith(name + ".") && f.name.endsWith(THUMBNAIL_SUFFIX));

            if (thumbnail) {
                sheet.setThumbnail(thumbnail.path);
                //console.log("found tn", thumbnail.path)
            }
            sheet.lastUpdate = lastUpdate;

            this._files.push(sheet);
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
async function _sortFolders(folders) {
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

async function _renameFolderOrders(fromFolder, toFolder) {
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


