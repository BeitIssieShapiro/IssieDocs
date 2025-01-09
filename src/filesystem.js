import * as RNFS from 'react-native-fs';
import { fTranslate, translate } from './lang';
import { Image, LogBox, Platform } from 'react-native';
import blankPage from './blank-page.png'
import mathPage from './math-page.png'
import linesPage from './lines-page.png'
import mockPage from './mock.jpg'
import { WorkSheet } from './work-sheet';
import { trace, assert } from './log'
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { unzip, zip } from 'react-native-zip-archive';
import { TemporaryDirectoryPath } from 'react-native-fs'
import { PromiseAllProgress } from './utils';
import uuid from 'react-native-uuid';

const THUMBNAIL_SUFFIX = ".thumbnail.jpg";

const ignore = () => { };

/**
 * Filesystem:
 * 
            <basePath>/<first-level>
 *                      /files 
 *                      /folders/<next-level>
 *                         /files
 *                         /folders/...
 * 
 */


function _lastUpdate(fi) {
    let mtime = fi.mtime instanceof Date ? fi.mtime.valueOf() : 0;
    let ctime = fi.ctime instanceof Date ? fi.ctime.valueOf() : 0;

    return Math.max(mtime, ctime);

}



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
    static FOLDERS_PATH = "folders";
    static ATACHMENT_PREFIX = ".attach.";

    static DEFAULT_FOLDER = { ID: 'Default', name: 'Default', path: 'Default', color: 'gray', icon: '', svgIcon: 'home', hideName: true };

    _folders = [];
    _listeners = [];
    constructor() {
        this._basePath = this._androidFileName(RNFS.DocumentDirectoryPath + '/folders/');
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

    async getRootFolders() {
        //trace("Load root folders")
        if (!this._loaded) {
            await this._loadRootFolders();
        }
        return this._folders;
    }


    async readFolder(fsFolder, parentFolder) {
        if (fsFolder.isDirectory()) {
            metadata = await this._readFolderMetaData(fsFolder.path)
            console.log("readFolder", fsFolder.name, " color :" + metadata.color, parentFolder ? "child" : "root")
            let fsf = new FileSystemFolder(fsFolder.name, parentFolder, this, metadata);
            this.pushFolder(fsf, parentFolder && parentFolder.ID);

            if (!parentFolder) {
                // Verify of has child folders:
                fsf.hasChildren = false;
                const childrenPath = fsFolder.path + "/" + FileSystem.FOLDERS_PATH
                trace("check children", childrenPath)
                if (RNFS.exists(childrenPath).then((exists) => {
                    if (exists) {
                        RNFS.readDir(childrenPath).then(items => {
                            if (items.length > 0) {
                                fsf.hasChildren = true;
                            }
                        })
                    }
                }));

            }
        }
    }

    async _loadRootFolders() {
        this._loaded = true
        this._folders = [];
        await RNFS.readDir(this._basePath).then(async (folders) => {

            for (let folder of folders) {
                trace("reading folder", folder.name)
                await this.readFolder(folder);
            }

            await _sortRootFolders(this._folders);
        });
        this._notify();
    }

    async _reloadFolder(ID) {
        let folder = this.findFolderByID(ID);
        if (folder) {
            await folder.reload();
        }
    }

    registerListener(callback) {
        const id = Math.floor(Math.random() * 100000);
        this._listeners.push({ id, callback });
        return id
    }

    unregisterListener(id) {
        this._listeners = this._listeners.filter(reg => reg.id != id)
    }

    _notify(folderName) {
        for (let i = 0; i < this._listeners.length; i++) {
            this._listeners[i].callback(folderName);
        }
    }

    async deleteFolder(ID) {
        trace("Delete folder: ", ID);

        const folder = this.findFolderByID(ID);
        if (folder) {
            let folderPath = this._basePath + folder.path;
            await RNFS.unlink(folderPath)
            if (folder.parent) {
                folder.parent._folders = folder.parent._folders.filter(f => f.ID !== folder.ID);
            } else {
                this._folders = this._folders.filter(f => f.name != folder.name);
            }
            this._notify();
        }
    }

    // only search pupolated folders
    findFolder(name, parentID) {
        const id = parentID ? parentID + "/" + name : name;
        return this.findFolderByID(id);
    }

    findFolderByID(ID) {
        if (!ID) return undefined;

        let parts = ID.split("/");

        let folders = this._folders;
        let folder
        for (let i = 0; i < parts.length; i++) {
            folder = folders?.find(f => f.name === parts[i])
            folders = folder?.folders;
        }
        return folder;
    }


    pushFolder(fsf, parentID, ignoreIfExists) {
        if (parentID) {
            const parentFolder = this.findFolderByID(parentID);
            if (parentFolder) {
                // Ensure the folder is not already added to parent
                if (parentFolder.folders.some(folder => folder.name === fsf.name)) {
                    if (ignoreIfExists) return;
                    parentFolder._folders = parentFolder.folders.filter(folder => folder.name !== fsf.name);
                    trace("dup1", fsf.name, parentFolder._folders.map(f => f.name))
                }
                parentFolder.folders.push(fsf);
            }
        } else {
            // add as root folder
            // Ensure the folder is not already added to root folders
            if (this._folders.some(folder => folder.name === fsf.name)) {
                if (ignoreIfExists) return;
                this._folders = this._folders.filter(folder => folder.name !== fsf.name)
                trace("dup2", fsf.name, this._folders.map(f => f.name))
            }
            this._folders.push(fsf);
        }
    }



    // return FileSystemFolder obj
    // todo verify works also for deep folder (e.g. in imporr with preserve folders)
    async addFolder(name, icon, color, strictChecks, skipCreateMetadata, rename, parentID) {
        trace("addFolder", arguments)
        const parent = this.findFolderByID(parentID);
        const parentPath = (parent ? parent.path + "/" + FileSystem.FOLDERS_PATH + "/" : "")
        console.log("add folder: " + name + ", color:" + color + ", icon=" + icon + ", in parent" + parentPath)
        if (!name || name.length == 0) {
            throw translate("MissingFolderName");
        }

        if (!this._validPathPart(name)) {
            throw translate("IllegalCharacterInFolderName");
        }

        let fsf;
        let folderPath = this._basePath + parentPath + name;
        let newFolder = true
        if (await RNFS.exists(folderPath)) {
            if (strictChecks) {
                //folder exists:
                throw translate("FolderAlreadyExists");
            }
            newFolder = false;
            fsf = this.findFolder(name, parentID);
            if (!fsf) {
                trace("unexpected not finding folder:", name, parentID)
            }
        } else {
            trace("Folder ", name, " is about to be created")
            await RNFS.mkdir(folderPath);
            trace("Folder ", folderPath, " has been created")
            fsf = new FileSystemFolder(name, parent, this, { color, icon });
            trace("FileSystemFolder created ", name, parentID)

            this.pushFolder(fsf, parentID, skipCreateMetadata)
        }

        if (!skipCreateMetadata) {

            const newMetadata = await this._writeFolderMetaData(folderPath, color, icon);

            if (!parent && name !== FileSystem.DEFAULT_FOLDER.name && !rename) {
                await pushFolderOrder(name)
                await _sortRootFolders(this._folders)
            }
            if (!newFolder) {
                //update existing color/icon
                fsf.metadata = newMetadata;
            }
        }
        trace("Folder ", name, " has been notified", parent ? " in " + parent.path : "")
        this._notify(name);
        return fsf;
    }

    async renameFolder(ID, newID, icon, color) {
        const newParts = newID.split("/");
        const parts = ID.split("/");
        const newName = newParts.pop();
        const name = parts.pop();

        let parentID = newParts.length && newParts.join("/");
        const folder = this.findFolder(ID);

        if (ID !== newID) {
            trace("rename folder", ID, newID)

            // Verify that target folder is not level 2
            const parts = newID.split("/")
            if (parts.length >= 3) {
                throw (translate("ErrMoveIntoTwoLevelFolder"));
            }

            // Verify target is not child of folderID


            if (parts.length > 1) {
                // Verify that the renamed folder does not contain a folder in it, to prevent 3 levels
                const checkPath = this._basePath + folder.path + "/" + FileSystem.FOLDERS_PATH
                let files = undefined;
                try {
                    files = await RNFS.readDir(checkPath);
                } catch (e) {
                    //intentioanlly ignored
                }

                if (files?.length > 0) {
                    throw (translate("ErrMoveFolderCOntainingFolders"));
                }
            }
        }


        await this.addFolder(newName, icon, color, ID !== newID, false, true, parentID);
        //move all files and delete old folder
        if (ID !== newID) {
            const newFolder = this.findFolder(newID);

            try {
                const files = await RNFS.readDir(this._basePath + folder.path);
                for (let f of files) {
                    trace("iterate files", f)
                    if (f.name !== ".metadata") {
                        // skip meta data as it was created already
                        trace("move files", f.name, newFolder.path + "/" + f.name)
                        await RNFS.moveFile(f.path, this._basePath + newFolder.path + "/" + f.name);
                    }
                }
            } catch (e) {
                trace("renameFolder", e)
            }

            await this.deleteFolder(ID);

            if (newParts.length == 1 && parts.length == 1) {
                await _renameFolderOrders(name, newName);
                await _sortRootFolders(this._folders);
            } else if (parts.length == 1) {
                await _renameFolderOrders(name);
            }
            await this._reloadFolder(newID);
        }
        this._notify();
    }

    loadFile(path) {
        return RNFS.readFile(this._androidFileName(path), 'utf8');
    }

    writeFile(path, content) {
        return RNFS.writeFile(this._androidFileName(path), content);
    }

    async renameOrDuplicateThumbnail(pagePath, targetPage, isDuplicate) {
        let pathObj = this._parsePath(pagePath);
        if (pathObj.folders.length < 1)
            return;

        const folder = this.findFolderByID(pathObj.folderID)

        const thumbnailContainingFolder = this._basePath + folder.path
        let pageName = pathObj.fileName;

        let items = await RNFS.readDir(thumbnailContainingFolder);

        let thumbnailFile = items.find(f => f.name.startsWith(pageName + ".") && f.name.endsWith(THUMBNAIL_SUFFIX));

        if (thumbnailFile) {
            // from name.<cache>.thumbnail.jpg remove name
            let pageNameSuffix = thumbnailFile.name.substring(pageName.length);


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
                trace("notify thumbnail change", pathObj.folderID)
                if (pathObj.folders.length >= 1) {
                    let folder = this.findFolderByID(pathObj.folderID);
                    if (folder) {
                        let pageName = pathObj.fileName;

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

        const folder = this.findFolderByID(pathObj.folderID)
        let thumbnailPath = this._basePath + folder.path + '/' + pathObj.fileName;

        let cacheBuster = Math.floor(Math.random() * 100000);
        //let thumbnailPathPattern = thumbnailPath + ".*" + THUMBNAIL_SUFFIX;
        thumbnailPath += "." + cacheBuster + THUMBNAIL_SUFFIX;

        // delete existing thumbnail
        try {
            if (page && page.thumbnail.endsWith(THUMBNAIL_SUFFIX)) {
                trace("delete prev. thumbnail", page.thumbnail)
                await RNFS.unlink(page.thumbnail);
            }
        } catch (e) { }

        if (!page) {
            console.log("copy thumbnail:", uri, thumbnailPath);
            return RNFS.copyFile(uri, thumbnailPath).then(() => {
                this._notify(pathObj.folderId);
            });
        }

        console.log("mv", uri, thumbnailPath);
        return RNFS.moveFile(uri, thumbnailPath).then(async () => {
            page.setThumbnail(thumbnailPath);
            let fi = await RNFS.stat(thumbnailPath);
            page.lastUpdate = Math.max(fi.mtime.valueOf(), fi.ctime.valueOf());
            this._notify(pathObj.folderID);
        });
    };

    async saveFile(uri, filePath, isCopy) {
        trace("saveFile", arguments)
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

        if (pathObj.isWorksheetInFolder && !this._validPathPart(pathObj.folders[pathObj.folders.length - 1])) {
            throw translate("IllegalCharacterInPageName");
        }
        // folders/Default/file.jpg folders+2
        // Default/fileFolder/file.jpg folders+3
        // Folder1/file.jpg
        // folder1/fileFolder/file.jpg
        // Folder1/folders/Folder2/file.jpg
        // Folder1/folders/Folder2/fileFolder.jpg

        let count = 0;
        trace("validatePath", pathObj)

        for (let i = 0; i < pathObj.folders.length; i++) {
            if (pathObj.folders[i] === FileSystem.FOLDERS_PATH) {
                count = 0
            } else {
                count++
            }
            if (count > 2) {
                throw translate("IllegalCharacterInPageName");
            }
        }

        await this._verifyFolderExists(filePath);

        let folder = this.findFolderByID(pathObj.folderID);
        if (!folder) {
            console.log("cant find folder " + pathObj.folderID)
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

                        RNFS.writeFile(this._androidFileName(filePath), base64Contents, 'base64').then(
                            //Success
                            async () => {
                                await folder.reload();
                                resolve();
                                this._notify(folder.ID);
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
                            if (parseObjFrom.folderID != parseObjTo.folderID) {
                                let srcFolder = this.findFolderByID(parseObjFrom.folderID);
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

    async movePage(sheet, newFolderID) {
        trace("move page", sheet.path, newFolderID);

        const isSourceNotFolder = sheet.path.endsWith(".jpg");
        // Constract target path:
        const targetFolder = this.findFolderByID(newFolderID);
        const targetPath = this._basePath + targetFolder.path;
        let targetFileName = targetPath + '/' + sheet.name;
        if (isSourceNotFolder) {
            targetFileName += ".jpg";
        }

        const srcPath = decodeURI(sheet.path);
        await FileSystem.main.saveFile(srcPath, targetFileName, false);
        if (isSourceNotFolder) {
            await FileSystem.main.saveFile(srcPath + ".json", targetFileName + ".json", false).catch(ignore);
            await this._iterateAttachments(srcPath, async (srcAttachmentPath, attachmentName) => {
                await FileSystem.main.saveFile(srcAttachmentPath, targetFileName + FileSystem.ATACHMENT_PREFIX + attachmentName, false);
            });
        }

        return FileSystem.main.renameOrDuplicateThumbnail(srcPath, targetFileName, false);
    }

    async addPageToSheet(sheet, newPagePath, addAtIndex) {
        trace("add page to sheet: ", sheet.path, " - ", newPagePath);
        //check if the path is already a folder:

        let pathInfo = await RNFS.stat(sheet.path);
        if (pathInfo.isDirectory()) {
            //add file by page's Index
            let lastPagePath = sheet.getPage(0)
            let basePathEnd = lastPagePath.lastIndexOf('/');

            let basePath = lastPagePath.substring(0, basePathEnd + 1);
            if (addAtIndex >= 0 && addAtIndex < sheet.count) {
                // push all pages to make room to this new page
                for (let i = sheet.count - 1; i >= addAtIndex; i--) {
                    const fileAtI = basePath + (i) + '.jpg';
                    const fileAtIPlus1 = basePath + (i + 1) + '.jpg';
                    await RNFS.moveFile(fileAtI, fileAtIPlus1);
                    await RNFS.moveFile(fileAtI + ".json", fileAtIPlus1 + ".json").catch(ignore);
                    await this._iterateAttachments(fileAtI, async (srcAttachmentPath, attachmentName) => {
                        await FileSystem.main.saveFile(srcAttachmentPath, fileAtIPlus1 + FileSystem.ATACHMENT_PREFIX + attachmentName);
                    });
                }
            }

            let newFileName = basePath + (!!addAtIndex ? addAtIndex : sheet.count) + '.jpg'

            console.log("add page: " + newFileName)
            await FileSystem.main.saveFile(newPagePath, newFileName, false);
            return await this._reloadBySheet(sheet);
        } else {
            //change to folder
            assert(sheet.path.endsWith(".jpg"), "change to folder");
            let basePath = sheet.path.substring(0, sheet.path.length - 4); //remove .jpg 

            await RNFS.mkdir(basePath);
            await RNFS.moveFile(sheet.path, basePath + '/0.jpg');
            await RNFS.moveFile(sheet.path + ".json", basePath + "/0.jpg.json").catch(ignore);
            await this._iterateAttachments(sheet.path, async (srcAttachmentPath, attachmentName) => {
                await FileSystem.main.saveFile(srcAttachmentPath, basePath + "/0.jpg" + FileSystem.ATACHMENT_PREFIX + attachmentName);
            });

            await FileSystem.main.saveFile(newPagePath, basePath + '/1.jpg', false);
            let pathObj = this._parsePath(basePath + '/1.jpg');
            return await this._reloadByFolderID(pathObj.folderID, sheet.name);
        }
    }

    //reload the folder of the sheet and notify and return new updated sheet
    async _reloadBySheet(sheet) {
        let pathObj = this._parsePath(sheet.path);
        trace("reload by sheet: ", sheet.path, JSON.stringify(pathObj))
        return await this._reloadByFolderID(pathObj.folderID, sheet.name)
    }

    async _reloadByFolderID(folderID, pageName) {
        let folder = this.findFolderByID(folderID);

        await folder.reload();
        this._notify(folderID);
        return await folder.getItem(pageName);

    }

    getAttachmentBase(sheet, pageIndex) {
        let pagePath = sheet.getPage(pageIndex);
        return pagePath + FileSystem.ATACHMENT_PREFIX;
    }

    async attachedFileToPage(origFile, sheet, pageIndex, ext) {
        let pagePath = sheet.getPage(pageIndex);
        const guid = uuid.v4();
        const targetPath = pagePath + FileSystem.ATACHMENT_PREFIX + guid + "." + ext;
        await RNFS.moveFile(origFile, targetPath);
        console.log("attachedFileToPage", pagePath);
        return guid + "." + ext;
    }

    async deleteAttachedFile(sheet, pageIndex, attachedFile) {
        let pagePath = sheet.getPage(pageIndex);
        const targetPath = pagePath + FileSystem.ATACHMENT_PREFIX + attachedFile;
        trace("deleteAttachedFile", targetPath);
        await RNFS.unlink(targetPath);
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
        await RNFS.unlink(pagePath + ".json").catch(ignore);
        await this._iterateAttachments(pagePath, async (srcAttachmentPath) => {
            await RNFS.unlink(srcAttachmentPath);
        });

        //fix file names
        // let basePathEnd = pagePath.lastIndexOf('/');
        // let basePath = pagePath.substring(0, basePathEnd+1);
        let basePath = sheet.path;
        for (let i = deleteIndex + 1; i < sheet.count; i++) {

            await RNFS.moveFile(basePath + '/' + i + ".jpg", basePath + '/' + (i - 1) + ".jpg")
            await RNFS.moveFile(basePath + '/' + i + ".jpg.json", basePath + '/' + (i - 1) + ".jpg.json").catch(ignore);
            await this._iterateAttachments(basePath + '/' + i + ".jpg", async (srcAttachmentPath, attachmentName) => {
                await RNFS.moveFile(srcAttachmentPath, basePath + '/' + (i - 1) + ".jpg" + FileSystem.ATACHMENT_PREFIX + attachmentName);
            });
        }

        return await this._reloadBySheet(sheet);
    }

    _parsePath(filePath) {
        let lastSlashPos = filePath.lastIndexOf('/');
        let fileName = filePath.substr(lastSlashPos + 1);
        let isWorksheetInFolder = true;
        if (fileName.endsWith(".jpg")) {
            isWorksheetInFolder = false;
            fileName = fileName.substr(0, fileName.length - 4);
        }

        //remove base path
        let foldersPath = filePath.substring(this._basePath.length, lastSlashPos)
        let folders = foldersPath.split('/');

        //examples:
        // f1
        // f1/ws1
        // f1/folders/f2
        // f1/folders/f2/ws2
        let realFolders = []
        for (let i = 0; i < folders.length; i += 2) {
            realFolders.push(folders[i]);
        }


        return { fileName, folders, folderID: realFolders.join("/"), isWorksheetInFolder };
    }

    async deleteFile(filePath) {
        trace("deleteFile", filePath)
        const { folderID } = this._parsePath(filePath);

        await RNFS.unlink(filePath)
        await RNFS.unlink(filePath + ".json").catch(ignore)
        await this._iterateAttachments(filePath, async (srcAttachmentPath) => {
            await RNFS.unlink(srcAttachmentPath);
        });

        await this._reloadFolder(folderID);
        this._notify(folderID);
    }

    async _iterateAttachments(filePrefix, callback) {
        const slashPos = filePrefix.lastIndexOf("/");
        const files = await RNFS.readDir(filePrefix.substring(0, slashPos));
        const filesToIterate = files.filter(file => file.path.startsWith(filePrefix));
        const donePromises = filesToIterate.map(file => {
            const name = file.path.substring(filePrefix.length + FileSystem.ATACHMENT_PREFIX.length);
            return callback(file.path, name);
        });
        return Promise.all(donePromises);

    }

    async _readFolderMetaData(folderPath) {
        try {
            //trace("read folder metadata", folderPath)
            let metaDataFilePath = folderPath + "/.metadata";
            let metadataString = await RNFS.readFile(metaDataFilePath, 'utf8');

            let metadata = JSON.parse(metadataString.toString('utf8'));

            return metadata;
        } catch (e) {
            trace("_readFolderMetaData failed", e)
            return FileSystem.DEFAULT_FOLDER_METADATA;
        }
    }

    _androidFileName(path) {
        if (Platform.OS === 'android' && !path.startsWith("file")) {
            return "file://" + path
        }
        return path
    }

    async _writeFolderMetaData(folderPath, color, icon) {
        trace("_writeFolderMetaData", arguments)
        let metaDataFilePath = folderPath + "/.metadata";

        let metadata = { color: color ? color : FileSystem.DEFAULT_FOLDER_METADATA.color, icon };



        return RNFS.writeFile(this._androidFileName(metaDataFilePath), JSON.stringify(metadata), 'utf8').then(
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

        trace("_verifyFolderExists", pathObj, currPath)
        for (let i = 0; i < pathObj.folders.length; i++) {
            currPath += pathObj.folders[i] + '/';
            if (!await RNFS.exists(currPath)) {
                // if (i % 2) { //real IssieDocs folder
                //     await this.addFolder(pathObj.folders[i], FileSystem.DEFAULT_FOLDER_METADATA.icon, FileSystem.DEFAULT_FOLDER_METADATA.color)
                // } else {
                //     // either a folder that stores a multi-page worksheet or "folders" folder
                await RNFS.mkdir(currPath);
                // }
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
        let fn = Math.random() + '-' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + ('0' + date.getDate()).slice(-2) + 'T' + ('0' + date.getHours()).slice(-2) + '-' + ('0' + date.getMinutes()).slice(-2) + '-' + ('0' + date.getSeconds()).slice(-2);

        return RNFS.TemporaryDirectoryPath + fn + "." + ext
    }

    static getFileNameFromPath(path, withoutExt) {
        let fileName = path.replace(/^.*[\\\/]/, '');
        if (withoutExt && fileName.endsWith('.jpg')) {
            fileName = fileName.substr(0, fileName.length - 4);
        }
        return fileName;
    }



    // size = {width, height}
    getStaticPageTempFile(pageType) {
        let tempFileName = FileSystem.getTempFileName("jpg");
        return this._getStaticPage(tempFileName, pageType).then(() => tempFileName);
    }

    async cloneToTemp(uri) {

        // find file extension:
        const ext = uri.split('.').pop();
        let tempFileName = FileSystem.getTempFileName(ext);
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

    static async fileExists(path) {
        try {
            await RNFS.stat(path);
            //file exists, :
            return true
        } catch (e) {
            return false;
        }
    }

    async exportWorksheet(sheet, folderObj) {
        let folder;
        let name;
        if (sheet) {
            const pathObj = this._parsePath(sheet.defaultSrc);
            folder = this.findFolderByID(pathObj.folderID);
            name = pathObj.folderID + "/" + sheet.name;
        } else {
            folder = folderObj;
            name = folder.ID;
        }
        name = name.replaceAll("/", "_");

        const folderMetaData = {
            name: folder.ID,
            color: folder.color,
            icon: folder.icon,
        };

        const files = [];
        const containingFolderInfoFileName = FileSystem.getTempFileName("metadata");

        files.push(containingFolderInfoFileName);

        if (sheet) {
            if (sheet.path.endsWith(".jpg")) {
                files.push(sheet.defaultSrc);
                const jsonFileName = sheet.defaultSrc + ".json";
                if (await RNFS.exists(jsonFileName)) {
                    files.push(jsonFileName);
                }
                await this._iterateAttachments(sheet.defaultSrc, (srcAttachmentPath) => files.push(srcAttachmentPath));

            } else {
                folderMetaData.subFolder = sheet.name;
                const items = await RNFS.readDir(sheet.path);
                for (let fi of items) {
                    files.push(fi.path);
                }
            }
        }

        // write metadata file
        const mdStr = JSON.stringify(folderMetaData);
        trace("add metadata file", mdStr)
        await FileSystem.main.writeFile(containingFolderInfoFileName, mdStr);
        return zip(files, (TemporaryDirectoryPath + name + ".zip"));
    }


    async exportAllWorksheets(folderIDs, progressCB) {
        const exportedSheetsAsync = [];
        folderIDs.forEach(folderID => {
            const folder = this.findFolderByID(folderID);
            if (folder) {
                trace("add items to backup for folder ", folder.ID)
                folder.items.forEach(sheet => exportedSheetsAsync.push(this.exportWorksheet(sheet)));
                if (!folder.items?.length > 0) {
                    // empty folder
                    exportedSheetsAsync.push(this.exportWorksheet(undefined, folder));
                }
            }
        });


        return PromiseAllProgress(exportedSheetsAsync, progressCB).then(allZipPaths => {
            const backupMetadataPath = TemporaryDirectoryPath + "backup.metadata";
            return FileSystem.main.writeFile(backupMetadataPath, "{\"backup\":true}").then(() => {
                allZipPaths.push(backupMetadataPath);

                const date = new Date()
                let fn = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + '-' + ('0' + date.getMinutes()).slice(-2) + '-' + ('0' + date.getSeconds()).slice(-2);

                return zip(allZipPaths, (TemporaryDirectoryPath + "IssieDocs Backup-" + fn + ".zip"));
            });
        })

    }

    async getFoldersDeep(folders) {
        trace("getFoldersDeep", folders.length)
        let foldersRes = folders.map(f => f.ID);
        const subFoldersAsync = folders.map(f => f.reloadedIfNeeded());

        return Promise.all(subFoldersAsync).then(subFoldersArray => {
            const innerPromise = subFoldersArray.map(sf => this.getFoldersDeep(sf.folders))

            return Promise.all(innerPromise).then((innerFolders) => {
                innerFolders.forEach(innerFolders => foldersRes = foldersRes.concat(innerFolders))
                return foldersRes;
            })
        });
    }


    async extractZipInfo(zipPath, unzipInPath) {
        const unzipTargetPath = unzipInPath || RNFS.TemporaryDirectoryPath + "imported";
        // verify no files from last import:
        try {
            await RNFS.unlink(unzipTargetPath);
        } catch (e) {
            trace("delete folder failed", e)
        }

        // extract zip name:
        const lastSlash = zipPath.lastIndexOf("/");
        const name = zipPath.substr(lastSlash + 1, zipPath.length - lastSlash - 5);


        return unzip(zipPath, unzipTargetPath).then(async (unzipPath) => {
            const items = await RNFS.readDir(unzipPath);
            const metaDataItems = items.filter(f => f.name.endsWith(".metadata"));
            if (metaDataItems?.length > 0) {
                trace("read metadata", metaDataItems[0].path)

                const metadataStr = await RNFS.readFile(metaDataItems[0].path);
                trace("metadata", metadataStr.toString('utf8'))
                return { metadata: JSON.parse(metadataStr.toString('utf8')), unzipPath: unzipTargetPath, name };
            }
            trace("missing metadata")
            return undefined;
        });
    }

    async RestoreFromBackup(zipInfo, monitorCB) {
        const unzipTargetPath = RNFS.TemporaryDirectoryPath + "imported";
        const items = await RNFS.readDir(zipInfo.unzipPath);

        const allWorkSheetImports = []
        const worksheetItems = items.filter(f => f.name.endsWith(".zip"));
        for (let i = 0; i < worksheetItems.length; i++) {
            let wsi = worksheetItems[i];
            trace("add zip: " + wsi.path)
            const targetUnzipForWorksheet = unzipTargetPath + "/" + i;
            allWorkSheetImports.push(this.importWorhsheet(wsi.path, targetUnzipForWorksheet));
        }
        return PromiseAllProgress(allWorkSheetImports, monitorCB).then(() => fTranslate("RestoreSuccessful", zipInfo.name));
    }

    async importWorhsheet(zipPath, unzipInPath) {
        return this.extractZipInfo(zipPath, unzipInPath).then(info => this.importWorhsheetWithInfo(info, true));
    }

    async importWorhsheetWithInfo(zipInfo, preserveFolder) {

        const items = await RNFS.readDir(zipInfo.unzipPath);
        let targetPath = this._basePath
        const folderID = preserveFolder ? zipInfo.metadata.name : FileSystem.DEFAULT_FOLDER.name;
        trace("Importing a worksheet", zipInfo, preserveFolder, "folderID", folderID)

        let folder = this.findFolderByID(folderID);
        if (!folder) {
            const parts = folderID.split("/");
            const folderName = parts.pop();
            let parentID = "";
            if (parts.length) {
                parentID = parts.join("/");
                // verify parent exists:
                const parentFolder = this.findFolderByID(parentID);
                if (!parentFolder) {
                    trace("importWorhsheetWithInfo - addFolder", parentID)
                    await this.addFolder(parentID, FileSystem.DEFAULT_FOLDER_METADATA.icon, FileSystem.DEFAULT_FOLDER_METADATA.color, false, true, true);
                }
            }

            const icon = preserveFolder ? zipInfo.metadata.icon : FileSystem.DEFAULT_FOLDER_METADATA.icon;
            const color = preserveFolder ? zipInfo.metadata.color : FileSystem.DEFAULT_FOLDER_METADATA.color;
            trace("importWorhsheetWithInfo2 - addFolder", folderName, parentID)
            folder = await this.addFolder(folderName, icon, color, false, false, false, parentID);
        }
        targetPath += folder.path + "/";

        if (zipInfo.metadata.subFolder) {
            targetPath += zipInfo.metadata.subFolder + "/";
            try {
                await RNFS.mkdir(targetPath);
            } catch (e) {
                // ignore if already exist
            }
        }

        // copy all other files
        const filesItems = items.filter(f => !f.name.endsWith(".metadata"));
        for (let fi of filesItems) {
            try {
                await RNFS.moveFile(fi.path, targetPath + fi.name);
            } catch (e) {
                trace("error copy file", e, fi.path, targetPath);
            }
        }
        await folder.reload()
        this._notify();

        return fTranslate("ImportSuccessful", zipInfo.name);
    }
}

export class FileSystemFolder {

    isParentOf(childID) {
        const IdWithSlash = this.ID + "/";
        return childID.startsWith(IdWithSlash);
    }

    constructor(name, parentFolder, fs, metadata) {
        this._metadata = metadata
        this._name = name;
        this._parent = parentFolder;
        this._path = parentFolder ? parentFolder.path + "/" + FileSystem.FOLDERS_PATH + "/" + name : name;
        this._fs = fs;
        this._folders = [];
        this._files = [];
        this._loaded = false;
        this._loading = false;
    }

    set metadata(md) {
        this._metadata = md
    }

    get parent() {
        return this._parent;
    }

    get folders() {
        return this._folders;
    }

    get name() {
        return this._name;
    }

    get ID() {
        return this._parent ? this._parent.ID + "/" + this._name : this._name;
    }

    get path() {
        return this._path;
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
        if (!this._loaded && !this._loading) {
            trace("triger reload from items")
            this.reload().then(() => this._fs._notify(this.ID));
        }
        return this._files;
    }

    async reloadedIfNeeded() {
        if (!this._loaded) {
            await this.reload();
        }
        return { files: this._files, folders: this._folders };
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
        if (this._loading) return;

        this._loading = true;
        console.log("reload folder: " + this._path);
        const items = await RNFS.readDir(this._fs.basePath + this._path);
        const filesItems = items.filter(f => !f.name.endsWith(".json") && !f.name.includes(FileSystem.ATACHMENT_PREFIX) && f.name !== ORDER_FILE_NAME &&
            f.name !== ".metadata" && !f.name.endsWith("thumbnail.jpg"));
        this._files = [];
        this._folders = [];
        for (let fi of filesItems) {
            if (fi.name === FileSystem.FOLDERS_PATH) {
                const foldersBasePath = this._path + "/" + FileSystem.FOLDERS_PATH
                //trace("read sub folders for ", this.name, " in ", foldersBasePath);
                const subFoldersItems = await RNFS.readDir(this._fs.basePath + foldersBasePath);
                trace("found: ", subFoldersItems.length)
                for (let sfi of subFoldersItems) {
                    await FileSystem.main.readFolder(sfi, this);
                }
            } else {
                const name = FileSystem.getFileNameFromPath(fi.name, true);
                let sheet = new WorkSheet(fi.path, name);

                let lastUpdate = _lastUpdate(fi);

                if (fi.isDirectory()) {
                    //read all pages
                    const pages = await RNFS.readDir(fi.path);

                    for (let i = 0; i < pages.length; i++) {
                        lastUpdate = Math.max(lastUpdate, _lastUpdate(pages[i]));

                        if (!pages[i].name.endsWith(".json") && !pages[i].name.includes(FileSystem.ATACHMENT_PREFIX)) {
                            sheet.addPage(pages[i].path);
                        }
                    }
                } else {
                    lastUpdate = Math.max(lastUpdate, _lastUpdate(fi));
                    trace("adding page", fi.path)
                    sheet.addPage(fi.path);
                    //finds the .json file if exists
                    let dotJsonFile = items.find(f => f.name === fi.name + ".json");
                    if (dotJsonFile) {
                        lastUpdate = Math.max(lastUpdate, _lastUpdate(dotJsonFile));
                    }
                }

                //find the newest thumbnail
                let thumbnails = items.filter(f => f.name.startsWith(name + ".") && f.name.endsWith(THUMBNAIL_SUFFIX));
                let newestFile;

                if (thumbnails.length > 1) {
                    let newestTS = -1;
                    for (let tnfi of thumbnails) {
                        if (tnfi.ctime.valueOf() > newestTS) {
                            trace("thumbnail", tnfi.name, tnfi.ctime.valueOf(), newestTS)
                            newestTS = tnfi.ctime.valueOf();
                            newestFile = tnfi;
                        }
                    }
                    // delete old thumbnails
                    thumbnails.filter(tn => tn.name !== newestFile.name).forEach(tn => {
                        trace("delete old thumbnail", tn.name);
                        RNFS.unlink(tn.path)
                    });

                    //console.log("found tn", thumbnail.path)
                } else if (thumbnails.length == 1) {
                    newestFile = thumbnails[0];
                }
                if (newestFile) {
                    //trace("selected thumbnail", newestFile.name)
                    sheet.setThumbnail(newestFile.path);
                }
                sheet.lastUpdate = lastUpdate;

                this._files.push(sheet);
            }
        }
        this._loading = false;
        this._loaded = true;
        this._fs._notify();
    }
}

//todo check with deep folders
//sort.js
const ORDER_FILE_NAME = "order.json"

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

        RNFS.writeFile(this._androidFileName(FileSystem.main.basePath + ORDER_FILE_NAME), JSON.stringify(order), 'utf8').then(
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
async function _sortRootFolders(folders) {
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
        for (let i = 0; i < order.length && nextPlace < folders.length; i++) {
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

    RNFS.writeFile(this._androidFileName(FileSystem.main.basePath + ORDER_FILE_NAME), JSON.stringify(order), 'utf8').then(
        //Success
        undefined,
        //on error 
        err => Promise.reject(err)
    )

}

// to remove set toFolder to undefined
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
        if (toFolder) {
            order[inx] = toFolder;
        } else {
            order = order.splice(inx, 1);
        }

        RNFS.writeFile(this._androidFileName(FileSystem.main.basePath + ORDER_FILE_NAME), JSON.stringify(order), 'utf8').then(
            //Success
            undefined,
            //on error 
            err => Promise.reject(err)
        )
    }

}


