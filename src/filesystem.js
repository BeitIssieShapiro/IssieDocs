import * as RNFS from 'react-native-fs';
import { translate } from './lang';
import { Image, LogBox, Platform } from 'react-native';
import blankPage from './blank-page.png';
import mathPage from './math-page.png';
import linesPage from './lines-page.png';
import mockPage from './mock.jpg';
import { WorkSheet } from './work-sheet';
import { trace, assert } from './log';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { unzip, zip } from 'react-native-zip-archive';
import { stampPackage } from '@beitissieshapiro/issie-shared';
import { TemporaryDirectoryPath } from 'react-native-fs';
import { PromiseAllProgress } from './utils';
import uuid from 'react-native-uuid';
import { NativeModules } from 'react-native';
import { analyticEvent, LocalAnalyticEvent } from './common/firebase';
const { FileProviderModule } = NativeModules;

const THUMBNAIL_SUFFIX = '.thumbnail.jpg';

const ignore = () => { };

function joinPaths(...segments) {
  return segments.map(seg => seg.replace(/\/+$/, '')).join('/');
}

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

export function _androidFileName(path) {
  if (Platform.OS === 'android' && path && !path.startsWith('file')) {
    return 'file://' + path;
  }
  return path;
}

export class FileSystem {
  static SimulatorMockPage = mockPage;
  static main = new FileSystem();
  static StaticPages = {
    Blank: 1,
    Lines: 2,
    Math: 3,
    SimulatorMock: 4,
  };
  static DEFAULT_FOLDER_METADATA = { icon: '', color: 'gray' };
  static FOLDERS_PATH = 'folders';
  static ATACHMENT_PREFIX = '.attach.';

  static DEFAULT_FOLDER = {
    ID: 'Default',
    name: 'Default',
    path: 'Default',
    color: 'gray',
    icon: '',
    svgIcon: 'home',
    hideName: true,
  };

  _folders = [];
  _listeners = [];
  constructor() {
    this._basePath = _androidFileName(RNFS.DocumentDirectoryPath + '/folders/');
    console.log('base path: ' + this._basePath);
    this._loaded = false;
    RNFS.mkdir(this._basePath).catch(e => {
      console.log('FATAL: cannot find filesystem root ' + e);
      throw e;
    });
  }

  async resizeImage(uri, width, height) {
    return ImageResizer.createResizedImage(
      uri,
      height,
      width,
      'JPEG',
      100,
    ).then(response => {
      return response.path;
    });
  }

  async convertImageToBase64(uri) {
    return RNFS.readFile(_androidFileName(uri), 'base64').then(
      data => 'data:image/jpg;base64,' + data,
    );
  }

  get basePath() {
    return this._basePath;
  }

  async getRootFolders() {
    //trace("Load root folders")
    if (!this._loaded) {
      // share one load between concurrent callers, so folders are not added twice
      if (!this._loadingRoot) {
        this._loadingRoot = this._loadRootFolders().finally(() => (this._loadingRoot = undefined));
      }
      await this._loadingRoot;
    }
    return this._folders;
  }

  async readFolder(fsFolder, parentFolder) {
    if (fsFolder.isDirectory()) {
      const metadata = await this._readFolderMetaData(fsFolder.path);
      console.log(
        'readFolder',
        fsFolder.name,
        ' color :' + metadata.color,
        parentFolder ? 'child' : 'root',
      );
      let fsf = new FileSystemFolder(
        fsFolder.name,
        parentFolder,
        this,
        metadata,
      );
      this.pushFolder(fsf, parentFolder && parentFolder.ID);

      if (!parentFolder) {
        // Verify of has child folders:
        fsf.hasChildren = false;
        const childrenPath = _androidFileName(
          fsFolder.path + '/' + FileSystem.FOLDERS_PATH,
        );
        trace('check children', childrenPath);
        if (
          RNFS.exists(childrenPath).then(exists => {
            if (exists) {
              RNFS.readDir(childrenPath).then(items => {
                if (items.length > 0) {
                  fsf.hasChildren = true;
                }
              });
            }
          })
        );
      }
    }
  }

  async _loadRootFolders() {
    this._folders = [];
    try {
      const folders = await readDirAt('root', this._basePath);
      for (let folder of folders) {
        trace('reading folder', folder.name);
        await this.readFolder(folder);
      }

      await _sortRootFolders(this._folders);
      await this._migrateTemplatesIfNeeded();
      // only mark loaded on success, so the next getRootFolders() retries
      this._loaded = true;
    } catch (e) {
      trace('load root folders failed', e);
      reportFolderLoadFailed(e, 'root', false);
      return;
    }
    this._notify();
  }

  async _migrateTemplatesIfNeeded() {
    const markerPath = _androidFileName(this._basePath + 'filesystem.version.6.23');
    if (await RNFS.exists(markerPath)) return;

    trace('migrating templates to sentinel files');
    for (const folder of this._folders) {
      await this._migrateFolderTemplates(folder);
      if (folder.folders) {
        for (const sub of folder.folders) {
          await this._migrateFolderTemplates(sub);
        }
      }
    }

    await RNFS.writeFile(markerPath, '');
    trace('template migration complete');
  }

  async _migrateFolderTemplates(folder) {
    try {
      const items = await RNFS.readDir(this._basePath + folder.path);
      for (const fi of items) {
        if (fi.name.endsWith('.json') || fi.name.endsWith('.istemplate') ||
            fi.name.endsWith('thumbnail.jpg') || fi.name === ORDER_FILE_NAME ||
            fi.name === '.metadata' || fi.name === FileSystem.FOLDERS_PATH) continue;

        if (fi.isDirectory()) {
          // multi-page: check 0.jpg.json inside
          const jsonFile = _androidFileName(fi.path + '/0.jpg.json');
          if (await RNFS.exists(jsonFile)) {
            try {
              const data = JSON.parse(await RNFS.readFile(jsonFile, 'utf8'));
              if (data.isTemplate) {
                await RNFS.writeFile(_androidFileName(fi.path + '/istemplate'), '');
                delete data.isTemplate;
                await RNFS.writeFile(_androidFileName(jsonFile), JSON.stringify(data, undefined, ' '));
                trace('migrated template (multi-page):', fi.name);
              }
            } catch (e) { /* ignore */ }
          }
        } else if (fi.name.endsWith('.jpg')) {
          const jsonFile = _androidFileName(fi.path + '.json');
          if (await RNFS.exists(jsonFile)) {
            try {
              const data = JSON.parse(await RNFS.readFile(jsonFile, 'utf8'));
              if (data.isTemplate) {
                await RNFS.writeFile(_androidFileName(fi.path + '.istemplate'), '');
                delete data.isTemplate;
                await RNFS.writeFile(_androidFileName(jsonFile), JSON.stringify(data, undefined, ' '));
                trace('migrated template (single-page):', fi.name);
              }
            } catch (e) { /* ignore */ }
          }
        }
      }
    } catch (e) {
      trace('_migrateFolderTemplates error', folder.path, e);
    }
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
    return id;
  }

  unregisterListener(id) {
    this._listeners = this._listeners.filter(reg => reg.id != id);
  }

  _notify(folderName) {
    for (let i = 0; i < this._listeners.length; i++) {
      this._listeners[i].callback(folderName);
    }
  }

  async deleteFolder(ID) {
    trace('Delete folder: ', ID);

    const folder = this.findFolderByID(ID);
    if (folder) {
      let folderPath = this._basePath + folder.path;
      await RNFS.unlink(folderPath);
      if (folder.parent) {
        folder.parent._folders = folder.parent._folders.filter(
          f => f.ID !== folder.ID,
        );
      } else {
        this._folders = this._folders.filter(f => f.name != folder.name);
      }
      this._notify();
    }
  }

  // only search pupolated folders
  findFolder(name, parentID) {
    const id = parentID ? parentID + '/' + name : name;
    return this.findFolderByID(id);
  }

  findFolderByID(ID) {
    if (!ID) return undefined;

    let parts = ID.split('/');

    let folders = this._folders;
    let folder;
    for (let i = 0; i < parts.length; i++) {
      folder = folders?.find(f => f.name === parts[i]);
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
          parentFolder._folders = parentFolder.folders.filter(
            folder => folder.name !== fsf.name,
          );
          trace(
            'dup1',
            fsf.name,
            parentFolder._folders.map(f => f.name),
          );
        }
        parentFolder.folders.push(fsf);
      }
    } else {
      // add as root folder
      // Ensure the folder is not already added to root folders
      if (this._folders.some(folder => folder.name === fsf.name)) {
        if (ignoreIfExists) return;
        this._folders = this._folders.filter(
          folder => folder.name !== fsf.name,
        );
        trace(
          'dup2',
          fsf.name,
          this._folders.map(f => f.name),
        );
      }
      this._folders.push(fsf);
    }
  }

  // return FileSystemFolder obj
  // todo verify works also for deep folder (e.g. in imporr with preserve folders)
  async addFolder(
    name,
    icon,
    color,
    strictChecks,
    skipCreateMetadata,
    rename,
    parentID,
  ) {
    trace('addFolder', arguments);
    const parent = this.findFolderByID(parentID);
    if (parentID && !parent) throw new Error('Parent folder not found');
    const parentPath = parent
      ? parent.path + '/' + FileSystem.FOLDERS_PATH + '/'
      : '';
    console.log(
      'add folder: ' +
      name +
      ', color:' +
      color +
      ', icon=' +
      icon +
      ', in parent' +
      parentPath,
    );
    if (!name || name.length == 0) {
      throw translate('MissingFolderName');
    }

    if (!this._validPathPart(name)) {
      throw translate('IllegalCharacterInFolderName');
    }

    let fsf;
    let folderPath = this._basePath + parentPath + name;
    let newFolder = true;
    if (await RNFS.exists(folderPath)) {
      if (strictChecks) {
        //folder exists:
        throw translate('FolderAlreadyExists');
      }
      newFolder = false;
      fsf = this.findFolder(name, parentID);
      if (!fsf) {
        fsf = new FileSystemFolder(name, parent, this, await this._readFolderMetaData(folderPath));
        this.pushFolder(fsf, parentID);
      }
    } else {
      trace('Folder ', name, ' is about to be created');
      await RNFS.mkdir(folderPath);
      trace('Folder ', folderPath, ' has been created');
      fsf = new FileSystemFolder(name, parent, this, { color, icon });
      trace('FileSystemFolder created ', name, parentID);

      this.pushFolder(fsf, parentID, skipCreateMetadata);
    }

    if (!skipCreateMetadata) {
      const newMetadata = await this._writeFolderMetaData(
        folderPath,
        color,
        icon,
      );

      if (!parent && name !== FileSystem.DEFAULT_FOLDER.name && !rename) {
        await pushFolderOrder(name);
        await _sortRootFolders(this._folders);
      }
      if (!newFolder) {
        //update existing color/icon
        fsf.metadata = newMetadata;
      }
    }
    trace(
      'Folder ',
      name,
      ' has been notified',
      parent ? ' in ' + parent.path : '',
    );
    this._notify(name);
    return fsf;
  }

  renameFolder(ID, newID, icon, color) {
    // Serialize moves so two drops cannot change the same folder tree concurrently.
    this._folderMove = (this._folderMove || Promise.resolve())
      .catch(ignore)
      .then(() => this._renameFolder(ID, newID, icon, color));
    return this._folderMove;
  }

  async _renameFolder(ID, newID, icon, color) {
    await this.getRootFolders();
    const newParts = newID.split('/');
    const newName = newParts.pop();
    const parentID = newParts.join('/');
    if (!newName) throw translate('MissingFolderName');
    if (!this._validPathPart(newName)) throw translate('IllegalCharacterInFolderName');
    if (newParts.length >= 2) throw translate('ErrMoveIntoTwoLevelFolder');

    const parent = this.findFolderByID(parentID);
    if (parentID && !parent) throw new Error(translate('ErrorMoveFolder'));
    await parent?.reloadedIfNeeded();
    const folder = this.findFolderByID(ID);
    if (!folder) throw new Error(translate('ErrorMoveFolder'));
    if (parentID === ID || folder.isParentOf(parentID)) {
      throw translate('ErrMoveFolderCOntainingFolders');
    }
    await this.getFoldersDeep([folder]);
    if (parent && folder.folders.length > 0) {
      throw translate('ErrMoveFolderCOntainingFolders');
    }

    const sourcePath = this._basePath + folder.path;
    const targetParentPath = parent
      ? this._basePath + parent.path + '/' + FileSystem.FOLDERS_PATH
      : this._basePath;
    const targetPath = joinPaths(targetParentPath, newName);
    if (ID !== newID && await RNFS.exists(targetPath)) {
      throw translate('FolderAlreadyExists');
    }

    // Metadata failures must surface before moving any worksheet data.
    folder.metadata = await this._writeFolderMetaData(sourcePath, color, icon);
    if (ID !== newID) {
      await RNFS.mkdir(targetParentPath);
      // Both paths are in the app's documents directory. Move the complete tree
      // in one filesystem operation, preserving the source if that operation fails.
      await RNFS.moveFile(sourcePath, targetPath);

      const oldParent = folder.parent;
      if (oldParent !== parent) {
        const siblings = oldParent ? oldParent.folders : this._folders;
        const index = siblings.indexOf(folder);
        if (index >= 0) siblings.splice(index, 1);
      }
      folder._relocate(newName, parent);
      if (oldParent !== parent) this.pushFolder(folder, parentID);
      if (oldParent) oldParent.hasChildren = oldParent.folders.length > 0;
      if (parent) parent.hasChildren = true;
    }
    // Keep the UI consistent with the successful directory move even if saving
    // the display order fails afterwards.
    try {
      await saveFolderOrder(this._folders);
    } finally {
      this._notify();
    }
  }

  loadFile(path) {
    return RNFS.readFile(_androidFileName(path), 'utf8');
  }

  writeFile(path, content) {
    return RNFS.writeFile(_androidFileName(path), content);
  }

  async renameOrDuplicateThumbnail(pagePath, targetPage, isDuplicate) {
    let pathObj = this._parsePath(pagePath);
    if (pathObj.folders.length < 1) return;

    const folder = this.findFolderByID(pathObj.folderID);

    const thumbnailContainingFolder = this._basePath + folder.path;
    let pageName = pathObj.fileName;

    let items = await RNFS.readDir(thumbnailContainingFolder);

    let thumbnailFile = items.find(
      f =>
        f.name && f.name.startsWith(pageName + '.') && f.name.endsWith(THUMBNAIL_SUFFIX),
    );

    if (thumbnailFile) {
      // from name.<cache>.thumbnail.jpg remove name
      let pageNameSuffix = thumbnailFile.name.substring(pageName.length);

      trace('start moveOrDuplicateThumbnail', pagePath, targetPage);
      const targetThumbnailPath =
        (targetPage.endsWith('.jpg')
          ? targetPage.substring(0, targetPage.length - 4)
          : targetPage) + pageNameSuffix;

      trace(
        'moveOrDuplicateThumbnail',
        'from',
        thumbnailFile.path,
        'to',
        targetThumbnailPath,
      );
      try {
        if (isDuplicate) {
          await RNFS.copyFile(
            _androidFileName(thumbnailFile.path),
            targetThumbnailPath,
          );
        } else {
          await RNFS.moveFile(
            _androidFileName(thumbnailFile.path),
            targetThumbnailPath,
          );
        }

        // update page's thumbnail
        let pathObj = this._parsePath(targetPage);
        trace('notify thumbnail change', pathObj.folderID);
        if (pathObj.folders.length >= 1) {
          let folder = this.findFolderByID(pathObj.folderID);
          if (folder) {
            let pageName = pathObj.fileName;

            const item = await folder.getItem(pageName);
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
    let pathObj = page
      ? this._parsePath(page.count > 1 ? page.path : page.defaultSrc)
      : this._parsePath(uri);

    if (pathObj.folders.length < 1) return;

    const folder = this.findFolderByID(pathObj.folderID);
    let thumbnailPath = this._basePath + folder.path + '/' + pathObj.fileName;
    trace('saveThumbnail', thumbnailPath);
    let cacheBuster = Math.floor(Math.random() * 100000);
    //let thumbnailPathPattern = thumbnailPath + ".*" + THUMBNAIL_SUFFIX;
    thumbnailPath += '.' + cacheBuster + THUMBNAIL_SUFFIX;

    if (!page) {
      // coming from the save screen and not from action on the edit photo
      console.log('copy thumbnail:', uri, thumbnailPath);
      // uri can be a folder
      if (!uri.endsWith('.jpg')) {
        uri += '/0.jpg';
      }

      await RNFS.copyFile(
        _androidFileName(uri),
        _androidFileName(thumbnailPath),
      );

      await folder.reload();
      this._notify(pathObj.folderID);
      return;
    }

    // delete existing thumbnail
    try {
      if (page && page.thumbnail.endsWith(THUMBNAIL_SUFFIX)) {
        //trace("delete prev. thumbnail", page.thumbnail)
        await RNFS.unlink(_androidFileName(page.thumbnail));
      }
    } catch (e) { }

    //console.log("mv", uri, thumbnailPath);
    return RNFS.moveFile(_androidFileName(uri), thumbnailPath).then(
      async () => {
        page.setThumbnail(thumbnailPath);
        let fi = await RNFS.stat(thumbnailPath);
        page.lastUpdate = _lastUpdate(fi);
        this._notify(pathObj.folderID);
      },
    );
  }

  static async exists(fullPath) {
    return RNFS.exists(fullPath);
  }

  static templateSentinelPath(sheet) {
    // Single-page: basepath/image1.jpg -> basepath/image1.jpg.istemplate
    // Multi-page:  basepath/fileFolder  -> basepath/fileFolder/istemplate
    if (sheet.path.endsWith('.jpg')) {
      return sheet.path + '.istemplate';
    }
    return sheet.path + '/istemplate';
  }

  async setTemplate(sheet, isTemplate) {
    const sentinelPath = FileSystem.templateSentinelPath(sheet);
    try {
      if (isTemplate) {
        await RNFS.writeFile(_androidFileName(sentinelPath), '');
      } else {
        await RNFS.unlink(_androidFileName(sentinelPath)).catch(ignore);
      }
      sheet.setTemplate(isTemplate);
    } catch (e) {
      trace('setTemplate error', e);
    }
    this._notify();
  }

  // skipReload: for batch saves (e.g. PDF import) - the caller reloads the folder once when done
  async saveFile(uri, filePath, isCopy, skipReload) {
    trace('saveFile', arguments);
    //asserts that the filePath is in this filesystem:
    if (filePath.indexOf(this._basePath) != 0) {
      throw 'Attempt to write to wrong path of the filesystem: ' + filePath;
    }

    let pathObj = this._parsePath(filePath);
    if (pathObj.folders.some(part => !this._validPathPart(part))) {
      throw translate('IllegalCharacterInPageName');
    }
    if (!pathObj.fileName || pathObj.fileName.length == 0) {
      throw translate('MissingPageName');
    }
    if (!this._validPathPart(pathObj.fileName)) {
      throw translate('IllegalCharacterInPageName');
    }

    if (
      pathObj.isWorksheetInFolder &&
      !this._validPathPart(pathObj.folders[pathObj.folders.length - 1])
    ) {
      throw translate('IllegalCharacterInPageName');
    }
    // folders/Default/file.jpg folders+2
    // Default/fileFolder/file.jpg folders+3
    // Folder1/file.jpg
    // folder1/fileFolder/file.jpg
    // Folder1/folders/Folder2/file.jpg
    // Folder1/folders/Folder2/fileFolder.jpg

    let count = 0;
    trace('validatePath', pathObj);

    for (let i = 0; i < pathObj.folders.length; i++) {
      if (pathObj.folders[i] === FileSystem.FOLDERS_PATH) {
        count = 0;
      } else {
        count++;
      }
      if (count > 2) {
        throw translate('IllegalCharacterInPageName');
      }
    }

    await this._verifyFolderExists(filePath);
    if (await RNFS.exists(filePath)) {
      throw translate('PageAlreadyExists');
    }

    let folder = this.findFolderByID(pathObj.folderID);
    if (!folder) {
      console.log('cant find folder ' + pathObj.folderID);
    }
    return new Promise((resolve, reject) => {
      if (uri.startsWith('rct-image-store')) {
        LogBox.ignoreAllLogs();
        ImageStore.getBase64ForTag(
          uri,
          //success
          base64Contents => {
            //let contents = base64.decode(base64Contents);
            //todo optimize code

            RNFS.writeFile(_androidFileName(filePath), base64Contents, 'base64')
              .then(
                //Success
                async () => {
                  if (!skipReload) {
                    await folder.reload();
                  }
                  resolve();
                  if (!skipReload) this._notify(folder.ID);
                },
                //on error
                err => this._handleSaveFileError('', err, reject),
              )
              .catch(err => this._handleSaveFileError('', err, reject));
          },
          err => {
            this._handleSaveFileError('', err, reject);
          },
        );
      } else {
        let ret;
        if (isCopy) {
          trace('copy: ', uri, ' to: ', filePath);
          ret = this._copyDeep(uri, filePath);
        } else {
          trace('rename: ', uri, ' to: ', filePath);
          //touch is used to update the modified date
          ret = RNFS.moveFile(_androidFileName(uri), filePath).then(() =>
            RNFS.touch(filePath, new Date()),
          );
        }

        ret
          .then(
            //Success
            async () => {
              if (skipReload) return resolve();
              //check of the file was moved from another folder
              if (!isCopy && uri.startsWith(this._basePath)) {
                const parseObjFrom = this._parsePath(uri);
                const parseObjTo = this._parsePath(filePath);
                if (parseObjFrom.folderID != parseObjTo.folderID) {
                  let srcFolder = this.findFolderByID(parseObjFrom.folderID);
                  await srcFolder.reload();
                }
              }

              await folder.reload();
              this._notify();
              return resolve();
            },
            //on error
            err => this._handleSaveFileError(uri, err, reject),
          )
          .catch(err => this._handleSaveFileError(uri, err, reject));
      }
    });
  }

  async movePage(sheet, newFolderID) {
    trace('move page', sheet.path, newFolderID);

    const isSourceNotFolder = sheet.path.endsWith('.jpg');
    // Constract target path:
    const targetFolder = this.findFolderByID(newFolderID);
    const targetPath = this._basePath + targetFolder.path;
    let targetFileName = targetPath + '/' + sheet.name;
    if (isSourceNotFolder) {
      targetFileName += '.jpg';
    }

    const srcPath = decodeURI(sheet.path);
    await FileSystem.main.saveFile(
      _androidFileName(srcPath),
      targetFileName,
      false,
    );
    if (isSourceNotFolder) {
      await FileSystem.main
        .saveFile(
          _androidFileName(srcPath + '.json'),
          targetFileName + '.json',
          false,
        )
        .catch(ignore);
      await FileSystem.main
        .saveFile(
          _androidFileName(srcPath + '.istemplate'),
          targetFileName + '.istemplate',
          false,
        )
        .catch(ignore);
      await this._iterateAttachments(
        _androidFileName(srcPath),
        async (srcAttachmentPath, attachmentName) => {
          await FileSystem.main.saveFile(
            srcAttachmentPath,
            targetFileName + FileSystem.ATACHMENT_PREFIX + attachmentName,
            false,
          );
        },
      );
    }

    return FileSystem.main.renameOrDuplicateThumbnail(
      srcPath,
      targetFileName,
      false,
    );
  }

  async addPageToSheet(sheet, newPagePath, addAtIndex, metadataContents) {
    trace('add page to sheet: ', sheet.path, ' - ', newPagePath);
    //check if the path is already a folder:

    let pathInfo = await RNFS.stat(_androidFileName(sheet.path));
    if (pathInfo.isDirectory()) {
      //add file by page's Index
      let lastPagePath = _androidFileName(sheet.getPage(0));
      if (!lastPagePath) {
        throw new Error('addPageToSheet: sheet directory is empty, cannot determine base path');
      }
      let basePathEnd = lastPagePath.lastIndexOf('/');

      let basePath = lastPagePath.substring(0, basePathEnd + 1);
      if (addAtIndex >= 0 && addAtIndex < sheet.count) {
        // push all pages to make room to this new page
        for (let i = sheet.count - 1; i >= addAtIndex; i--) {
          const fileAtI = basePath + i + '.jpg';
          const fileAtIPlus1 = basePath + (i + 1) + '.jpg';
          await RNFS.moveFile(fileAtI, fileAtIPlus1);
          await RNFS.moveFile(fileAtI + '.json', fileAtIPlus1 + '.json').catch(
            ignore,
          );
          await this._iterateAttachments(
            fileAtI,
            async (srcAttachmentPath, attachmentName) => {
              await RNFS.moveFile(
                srcAttachmentPath,
                fileAtIPlus1 + FileSystem.ATACHMENT_PREFIX + attachmentName,
              );
            },
          );
        }
      }

      let newFileName =
        basePath + (addAtIndex >= 0 ? addAtIndex : sheet.count) + '.jpg';

      console.log('add page: ' + newFileName);
      await FileSystem.main.saveFile(newPagePath, newFileName, false);
      if (metadataContents) {
        await FileSystem.main.writeFile(
          newFileName + '.json',
          metadataContents,
        );
      }
      return await this._reloadBySheet(sheet);
    } else {
      //change to folder
      assert(sheet.path.endsWith('.jpg'), 'change to folder');
      const basePath = sheet.path.substring(0, sheet.path.length - 4); //remove .jpg
      await RNFS.mkdir(basePath);
      await RNFS.moveFile(sheet.path, basePath + '/0.jpg');
      await RNFS.moveFile(sheet.path + '.json', basePath + '/0.jpg.json').catch(
        ignore,
      );
      await this._iterateAttachments(
        sheet.path,
        async (srcAttachmentPath, attachmentName) => {
          await FileSystem.main.saveFile(
            srcAttachmentPath,
            basePath + '/0.jpg' + FileSystem.ATACHMENT_PREFIX + attachmentName,
          );
        },
      );

      await FileSystem.main.saveFile(newPagePath, basePath + '/1.jpg', false);
      if (metadataContents) {
        await FileSystem.main.writeFile(
          basePath + '/1.jpg.json',
          metadataContents,
        );
      }

      let pathObj = this._parsePath(basePath + '/1.jpg');
      return await this._reloadByFolderID(pathObj.folderID, sheet.name);
    }
  }

  //reload the folder of the sheet and notify and return new updated sheet
  async _reloadBySheet(sheet) {
    let pathObj = this._parsePath(sheet.path);
    trace('reload by sheet: ', sheet.path, JSON.stringify(pathObj));
    return await this._reloadByFolderID(pathObj.folderID, sheet.name);
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
    const targetPath =
      pagePath + FileSystem.ATACHMENT_PREFIX + guid + '.' + ext;
    await RNFS.moveFile(origFile, targetPath);
    console.log('attachedFileToPage', pagePath);
    return guid + '.' + ext;
  }

  async deleteAttachedFile(sheet, pageIndex, attachedFile) {
    let pagePath = sheet.getPage(pageIndex);
    const targetPath = pagePath + FileSystem.ATACHMENT_PREFIX + attachedFile;
    trace('deleteAttachedFile', targetPath);
    await RNFS.unlink(targetPath).catch(ignore); // an attachment may be deleted more than once, for example if an image was resized
  }

  //return an updated sheet
  async deletePageInSheet(sheet, deleteIndex) {
    if (sheet.count < 2) {
      console.warn('cannot delete last page of sheet');
      return sheet;
    }
    let pagePath = sheet.getPage(deleteIndex);
    trace(
      'Delete page in Sheet: ',
      sheet.name,
      '[',
      deleteIndex,
      '] ',
      pagePath,
    );

    //delete file
    await RNFS.unlink(pagePath);
    await RNFS.unlink(pagePath + '.json').catch(ignore);
    await this._iterateAttachments(pagePath, async srcAttachmentPath => {
      await RNFS.unlink(srcAttachmentPath);
    });

    //fix file names
    // let basePathEnd = pagePath.lastIndexOf('/');
    // let basePath = pagePath.substring(0, basePathEnd+1);
    const basePath = sheet.path;
    for (let i = deleteIndex + 1; i < sheet.count; i++) {
      await RNFS.moveFile(
        basePath + '/' + i + '.jpg',
        basePath + '/' + (i - 1) + '.jpg',
      );
      await RNFS.moveFile(
        basePath + '/' + i + '.jpg.json',
        basePath + '/' + (i - 1) + '.jpg.json',
      ).catch(ignore);
      await this._iterateAttachments(
        basePath + '/' + i + '.jpg',
        async (srcAttachmentPath, attachmentName) => {
          await RNFS.moveFile(
            srcAttachmentPath,
            basePath +
            '/' +
            (i - 1) +
            '.jpg' +
            FileSystem.ATACHMENT_PREFIX +
            attachmentName,
          );
        },
      );
    }

    return await this._reloadBySheet(sheet);
  }
  _parsePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      trace('unexpected empty or invalid filePath:', filePath);
      return { fileName: '', folders: [], folderID: '', isWorksheetInFolder: false };
    }
    let lastSlashPos = filePath.lastIndexOf('/');
    let fileName = filePath.substr(lastSlashPos + 1);
    let isWorksheetInFolder = true;
    if (fileName.endsWith('.jpg')) {
      isWorksheetInFolder = false;
      fileName = fileName.substr(0, fileName.length - 4);
    }

    //remove base path
    const ommitFilePath =
      Platform.OS == 'android' && typeof filePath === 'string' && !filePath.startsWith('file://');
    let foldersPath = filePath.substring(
      this._basePath.length + (ommitFilePath ? -7 : 0),
      lastSlashPos,
    );
    let folders = foldersPath.split('/');

    //examples:
    // f1
    // f1/ws1
    // f1/folders/f2
    // f1/folders/f2/ws2
    let realFolders = [];
    for (let i = 0; i < folders.length; i += 2) {
      realFolders.push(folders[i]);
    }

    return {
      fileName,
      folders,
      folderID: realFolders.join('/'),
      isWorksheetInFolder,
    };
  }

  async deleteFile(filePath) {
    trace('deleteFile', filePath);
    const { folderID } = this._parsePath(filePath);

    await RNFS.unlink(_androidFileName(filePath));
    await RNFS.unlink(_androidFileName(filePath + '.json')).catch(ignore);
    await RNFS.unlink(_androidFileName(filePath + '.istemplate')).catch(ignore);
    await this._iterateAttachments(filePath, async srcAttachmentPath => {
      await RNFS.unlink(srcAttachmentPath);
    });

    await this._reloadFolder(folderID);
    this._notify(folderID);
  }

  async _iterateAttachments(filePrefix, callback) {
    if (!filePrefix) {
      console.log('_iterateAttachments called with empty filePrefix');
      return [];
    }
    const slashPos = filePrefix.lastIndexOf('/');
    if (slashPos < 0) {
      console.log(
        '_iterateAttachments: invalid filePrefix (no slash)',
        filePrefix,
      );
      return [];
    }
    const files = await RNFS.readDir(filePrefix.substring(0, slashPos));
    const attachPrefix = filePrefix + FileSystem.ATACHMENT_PREFIX;
    const filesToIterate = files.filter(
      file => file.path && typeof file.path === 'string' && file.path.startsWith(attachPrefix),
    );
    const donePromises = filesToIterate.map(file => {
      const name = file.path.substring(
        filePrefix.length + FileSystem.ATACHMENT_PREFIX.length,
      );
      return callback(_androidFileName(file.path), name);
    });
    return Promise.all(donePromises);
  }

  async _readFolderMetaData(folderPath) {
    try {
      //trace("read folder metadata", folderPath)
      let metaDataFilePath = folderPath + '/.metadata';
      let metadataString = await RNFS.readFile(
        _androidFileName(metaDataFilePath),
        'utf8',
      );

      let metadata = JSON.parse(metadataString.toString('utf8'));

      return metadata;
    } catch (e) {
      trace('_readFolderMetaData failed', e);
      return FileSystem.DEFAULT_FOLDER_METADATA;
    }
  }

  async _writeFolderMetaData(folderPath, color, icon) {
    trace('_writeFolderMetaData', arguments);
    let metaDataFilePath = folderPath + '/.metadata';

    let metadata = {
      color: color ? color : FileSystem.DEFAULT_FOLDER_METADATA.color,
      icon,
    };

    return RNFS.writeFile(
      _androidFileName(metaDataFilePath),
      JSON.stringify(metadata),
      'utf8',
    ).then(
      //Success
      () => {
        return metadata;
      },
      //on error
      err => {
        trace('fail writing metadata', err);
        throw err;
      },
    );
  }

  //verify folder exists, assumes prefix is basepath
  async _verifyFolderExists(filePath) {
    let pathObj = this._parsePath(filePath);
    let currPath = this._basePath;

    trace('_verifyFolderExists', pathObj, currPath);
    for (let i = 0; i < pathObj.folders.length; i++) {
      currPath += pathObj.folders[i] + '/';
      if (!(await RNFS.exists(currPath))) {
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
    let stats = await RNFS.stat(_androidFileName(src));
    if (stats.isDirectory()) {
      //in case of multi page, it is in fact folder
      await RNFS.mkdir(dst);

      let items = await RNFS.readDir(_androidFileName(src));
      for (const item of items) {
        trace('xx', dst);
        await RNFS.copyFile(
          _androidFileName(item.path),
          dst + '/' + item.name,
        ).then(() => RNFS.touch(dst + '/' + item.name, new Date()));
      }
    } else {
      return RNFS.copyFile(_androidFileName(src), dst).then(() =>
        RNFS.touch(dst, new Date()),
      );
    }
  }

  _handleSaveFileError(uri, err, reject) {
    let errorStr = '';
    if (err) {
      for (let key in err) {
        errorStr += JSON.stringify(err[key]).substr(15) + '\n';
      }

      function isFileExistsError(error) {
        if (!error) return false;

        const code = String(error.code || '');
        const message = String(error.message || '');

        // --- iOS Cocoa ---
        if (code.includes('516')) return true; // NSFileWriteFileExistsError
        if (code === '17') return true; // POSIX EEXIST

        // --- Android typical ---
        if (code.toLowerCase() === 'eexist') return true;
        if (code.toLowerCase() === 'exists') return true;

        // Sometimes message indicates it
        if (message.toLowerCase().includes('exist')) return true;

        // Some RNFS Android builds use errno numbers:
        if (code === '-17') return true; // Android EEXIST as negative errno

        return false;
      }

      if (isFileExistsError(err)) {
        reject(translate('PageAlreadyExists'));
        return;
      }
    }
    reject(
      'Error saving file: ' +
      (uri.length > 15 ? uri.substr(uri.length - 15) : uri) +
      ', err: ' +
      err,
    );
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
    if (!PathPart || PathPart.length == 0 || PathPart === '.' || PathPart === '..') {
      return false;
    }
    if (PathPart.includes('/')) {
      return false;
    }
    if (PathPart.includes('\\')) {
      return false;
    }
    return true;
  }

  static getTempFileName(ext) {
    const date = new Date();
    let fn =
      Math.random() +
      '-' +
      date.getFullYear() +
      '-' +
      (date.getMonth() + 1) +
      '-' +
      ('0' + date.getDate()).slice(-2) +
      'T' +
      ('0' + date.getHours()).slice(-2) +
      '-' +
      ('0' + date.getMinutes()).slice(-2) +
      '-' +
      ('0' + date.getSeconds()).slice(-2);

    return _androidFileName(
      joinPaths(RNFS.TemporaryDirectoryPath, fn + '.' + ext),
    );
  }

  static getFileNameFromPath(path, withoutExt) {
    let fileName = path.replace(/^.*[\\\/]/, '');
    if (withoutExt && fileName.endsWith('.jpg')) {
      fileName = fileName.substr(0, fileName.length - 4);
    }
    return fileName;
  }

  static async contentUriToFilePath(contentUri) {
    if (Platform.OS == 'android') {
      return FileProviderModule.getFilePathFromUri(contentUri, false);
    }
    return contentUri;
  }

  static async filePathToContentUri(contentUri) {
    if (Platform.OS == 'android') {
      return FileProviderModule.getUriForFile(contentUri);
    }
    return contentUri;
  }

  // size = {width, height}
  getStaticPageTempFile(pageType) {
    let tempFileName = FileSystem.getTempFileName('jpg');
    return this._getStaticPage(tempFileName, FileSystem.StaticPages.Blank).then(
      () => tempFileName,
    );
  }

  async cloneToTemp(uri) {
    // find file extension:
    const ext = uri.split('.').pop();
    let tempFileName = FileSystem.getTempFileName(ext);
    await RNFS.copyFile(uri, tempFileName);
    return tempFileName;
  }

  async _getStaticPage(filePath, pageType) {
    if (Platform.OS === 'android') {
      const pageName =
        pageType === FileSystem.StaticPages.Lines
          ? 'lines-page.png'
          : pageType === FileSystem.StaticPages.Math
            ? 'math-page.png'
            : 'blank-page.png';

      // Copy the asset file to filePath.
      await RNFS.copyFileAssets(pageName, filePath);
    } else {
      let page = FileSystem._getStaticPageRef(pageType);
      let pageResolved = Image.resolveAssetSource(page);

      let downloadInfo = await RNFS.downloadFile({
        fromUrl: pageResolved.uri,
        toFile: filePath,
      });
      await downloadInfo.promise;
    }
  }

  async exportWorksheet(sheet, folderObj, archiveName) {
    let folder;
    let name;
    if (sheet) {
      // Check for valid defaultSrc before parsing
      if (!sheet.defaultSrc) {
        console.log('Skipping sheet with no pages:', sheet.name);
        return undefined;
      }
      const pathObj = this._parsePath(sheet.defaultSrc);
      if (!pathObj || !pathObj.folderID) {
        console.log('Unexpected sheet in export', sheet);
        return undefined;
      }
      folder = this.findFolderByID(pathObj.folderID);
      if (!folder) {
        console.log('Cannot find folder for sheet:', sheet.name, pathObj.folderID);
        return undefined;
      }
      // Encode folder path in the filename to prevent conflicts
      name = folder.ID + '_' + (sheet.name || 'Worksheet');
    } else {
      folder = folderObj;
      name = folder?.ID;
      if (!name) {
        console.log('Invalid folder object in export');
        return undefined;
      }
    }
    name = name.replaceAll('/', '_');

    const folderMetaData = {
      name: folder.ID,
      color: folder.color,
      icon: folder.icon,
    };

    const files = [];
    const containingFolderInfoFileName = FileSystem.getTempFileName('metadata');

    files.push(containingFolderInfoFileName);
    if (sheet) {
      if (sheet.path.endsWith('.jpg')) {
        if (sheet.defaultSrc) {
          files.push(sheet.defaultSrc);
          const jsonFileName = sheet.defaultSrc + '.json';
          if (await RNFS.exists(jsonFileName)) {
            files.push(jsonFileName);
          }
          const templateFileName = FileSystem.templateSentinelPath(sheet);
          if (await RNFS.exists(templateFileName)) {
            files.push(templateFileName);
          }
          await this._iterateAttachments(sheet.defaultSrc, srcAttachmentPath =>
            files.push(srcAttachmentPath),
          );
        }
      } else {
        folderMetaData.subFolder = sheet.name;
        const items = await RNFS.readDir(sheet._path).catch(e =>
          console.log('readdir err', e),
        );
        for (let fi of items) {
          if (fi.path) {
            files.push(fi.path);
          }
        }
      }
      if (sheet.thumbnail) {
        files.push(sheet.thumbnail);
      }
    }

    // write metadata file
    const mdStr = JSON.stringify(folderMetaData);
    await FileSystem.main.writeFile(containingFolderInfoFileName, mdStr);
    const targetFile = _androidFileName(
      joinPaths(TemporaryDirectoryPath, (archiveName || name) + '.zip'),
    );
    // delete if exists before
    await RNFS.unlink(targetFile).catch(ignore);

    return zip([...new Set(files)], targetFile).then(path => {
      return _androidFileName(path);
    });
  }

  // file functions with a position want a plain path, without file://
  static plainPath(p) {
    return p.startsWith('file://') ? p.substring(7) : p;
  }

  // lets other Issie apps tell this is an IssieDocs file; the export works without it
  static async stampAsIssieDocs(zipPath, kind) {
    await stampPackage(RNFS, FileSystem.plainPath(zipPath), { app: 'issiedocs', kind })
      .catch(e => trace('stamp package failed', zipPath, e));
    return zipPath;
  }

  // a single worksheet to share; inner archives of folders and backups are not stamped
  async exportWorksheetForShare(sheet) {
    const path = await this.exportWorksheet(sheet);
    return path && FileSystem.stampAsIssieDocs(path, 'worksheet');
  }

  async exportFolder(folder) {
    if (!folder) return;
    await folder.reloadedIfNeeded();
    if (!folder._loaded) throw new Error('Unable to read folder for export');

    const exportedSheetsAsync = [];

    // Export all items in the folder
    if (folder.items && folder.items.length > 0) {
      folder.items.forEach(sheet =>
        exportedSheetsAsync.push(this.exportWorksheet(sheet)),
      );
    }

    // Export all subfolders recursively
    if (folder.folders && folder.folders.length > 0) {
      folder.folders.forEach(subFolder =>
        exportedSheetsAsync.push(this.exportFolder(subFolder)),
      );
    }

    // If folder is empty, still create a metadata file
    if (exportedSheetsAsync.length === 0) {
      exportedSheetsAsync.push(this.exportWorksheet(undefined, folder));
    }

    trace('wait for all folder items to export');

    return Promise.all(exportedSheetsAsync).then(async allZipPaths => {
      // Filter out undefined results
      allZipPaths = allZipPaths.filter(path => path !== undefined);

      if (allZipPaths.length === 0) {
        throw new Error('No items to export in folder');
      }

      // Create metadata file for folder export
      const folderMetadata = {
        folderExport: true,
        folderName: folder.name,
        folderID: folder.ID,
        folderColor: folder.color,
        folderIcon: folder.icon,
      };
      const metadataPath = FileSystem.getTempFileName('metadata');
      await FileSystem.main.writeFile(
        metadataPath,
        JSON.stringify(folderMetadata),
      );
      allZipPaths.push(metadataPath);

      const folderName = folder.name.replaceAll('/', '_');
      const date = new Date();
      let timestamp =
        date.getFullYear() +
        '-' +
        (date.getMonth() + 1) +
        '-' +
        ('0' + date.getDate()).slice(-2) +
        ' ' +
        ('0' + date.getHours()).slice(-2) +
        '-' +
        ('0' + date.getMinutes()).slice(-2);

      const targetPath = _androidFileName(
        joinPaths(
          TemporaryDirectoryPath,
          folderName + '-' + timestamp + '.zip',
        ),
      );
      await RNFS.unlink(targetPath).catch(ignore);

      return zip(allZipPaths, targetPath)
        .then(path => FileSystem.stampAsIssieDocs(_androidFileName(path), 'folder'));
    });
  }

  async exportAllWorksheets(folderIDs, progressCB) {
    await this.getRootFolders();
    const exportedSheetsAsync = [];
    const archivePrefix = FileSystem.getFileNameFromPath(FileSystem.getTempFileName('backup'));
    const folders = folderIDs.map(folderID => this.findFolderByID(folderID)).filter(Boolean);
    for (const folder of folders) {
      await folder.reloadedIfNeeded();
      if (!folder._loaded) throw new Error('Unable to read folder for backup');
    }
    for (const folder of folders) {
      trace('add items to backup for folder ', folder.ID);
      for (const sheet of folder.items) {
        const archiveName = archivePrefix + '-worksheet-' + exportedSheetsAsync.length;
        exportedSheetsAsync.push(this.exportWorksheet(sheet, undefined, archiveName));
      }
      if (folder.items.length === 0) {
        const archiveName = archivePrefix + '-folder-' + exportedSheetsAsync.length;
        exportedSheetsAsync.push(this.exportWorksheet(undefined, folder, archiveName));
      }
    }
    trace('wait for all zips');

    return PromiseAllProgress(exportedSheetsAsync, progressCB).then(
      async allZipPaths => {
        //trace("all zips ready", allZipPaths)
        const backupMetadataPath = joinPaths(
          TemporaryDirectoryPath,
          'backup.metadata',
        );
        await FileSystem.main.writeFile(backupMetadataPath, '{"backup":true}');

        allZipPaths.push(backupMetadataPath);

        const date = new Date();
        let fn =
          date.getFullYear() +
          '-' +
          (date.getMonth() + 1) +
          '-' +
          ('0' + date.getDate()).slice(-2) +
          ' ' +
          ('0' + date.getHours()).slice(-2) +
          '-' +
          ('0' + date.getMinutes()).slice(-2) +
          '-' +
          ('0' + date.getSeconds()).slice(-2);
        // trace("about to zip", allZipPaths)
        const targetPath = _androidFileName(
          joinPaths(TemporaryDirectoryPath, 'IssieDocs Backup-' + fn + '.zip'),
        );
        await RNFS.unlink(targetPath).catch(ignore);
        const fileList = allZipPaths.filter(f => f != undefined);
        return zip(fileList, targetPath).then(path =>
          FileSystem.stampAsIssieDocs(_androidFileName(path), 'backup'),
        );
      },
    );
  }

  async getFoldersDeep(folders) {
    trace('getFoldersDeep', folders.length);
    let foldersRes = folders.map(f => f.ID);
    const subFoldersAsync = folders.map(f => f.reloadedIfNeeded());

    return Promise.all(subFoldersAsync).then(subFoldersArray => {
      const innerPromise = subFoldersArray.map(sf =>
        this.getFoldersDeep(sf.folders),
      );

      return Promise.all(innerPromise).then(innerFolders => {
        innerFolders.forEach(
          innerFolders => (foldersRes = foldersRes.concat(innerFolders)),
        );
        return foldersRes;
      });
    });
  }

  async extractZipInfo(zipPath, unzipInPath) {
    const unzipTargetPath = _androidFileName(
      unzipInPath || joinPaths(RNFS.TemporaryDirectoryPath, 'imported'),
    );
    // verify no files from last import:
    await RNFS.unlink(unzipTargetPath).catch(ignore);

    // extract zip name:
    const lastSlash = zipPath.lastIndexOf('/');
    const name = zipPath.substr(lastSlash + 1, zipPath.length - lastSlash - 5);

    return unzip(zipPath, unzipTargetPath).then(async unzipPath => {
      const items = await RNFS.readDir(_androidFileName(unzipPath));
      console.log(
        'extractZipInfo - files in zip:',
        items.map(i => i.name),
      );
      const metaDataItems = items.filter(f => f.name.endsWith('.metadata'));
      console.log(
        'extractZipInfo - metadata files found:',
        metaDataItems.map(i => i.name),
      );
      if (metaDataItems?.length > 0) {
        trace('read metadata', metaDataItems[0].path);

        const metadataStr = await RNFS.readFile(
          _androidFileName(metaDataItems[0].path),
        );
        trace('metadata', metadataStr.toString('utf8'));
        return {
          metadata: JSON.parse(metadataStr.toString('utf8')),
          unzipPath: unzipTargetPath,
          name,
        };
      }
      trace('missing metadata');
      return undefined;
    });
  }

  // What an import did, shown to the user when it finishes.
  // imported/skipped: [{ folder: folderID, name: worksheetName }], failed: [{ name, error }]
  static newImportReport(zipInfo) {
    const md = zipInfo?.metadata;
    const kind = md?.folderExport ? 'folder' : md?.backup ? 'backup' : 'worksheet';
    const name = (kind === 'folder' && md.folderName) || zipInfo?.name;
    return { kind, name, imported: [], skipped: [], failed: [] };
  }

  async RestoreFromBackup(zipInfo, monitorCB, report = FileSystem.newImportReport(zipInfo)) {
    await this.getRootFolders();
    const items = await RNFS.readDir(_androidFileName(zipInfo.unzipPath));
    const worksheetItems = items.filter(f => f.name.endsWith('.zip'));
    monitorCB(0);
    for (let i = 0; i < worksheetItems.length; i++) {
      const targetPath = joinPaths(zipInfo.unzipPath, 'worksheet-' + i);
      // Imports create shared folders and update their metadata. Complete each
      // import before starting the next one, including on a fresh installation.
      // One broken worksheet must not stop the rest: report it and continue.
      try {
        await this.importWorhsheet(worksheetItems[i].path, targetPath, report);
      } catch (e) {
        trace('restore worksheet failed', worksheetItems[i].name, e);
        report.failed.push({
          name: worksheetItems[i].name.replace(/\.zip$/, ''),
          error: String(e?.message || e),
        });
      }
      monitorCB(((i + 1) * 100) / worksheetItems.length);
    }
    if (worksheetItems.length === 0) monitorCB(100);
    return report;
  }

  async importWorhsheet(zipPath, unzipInPath, report) {
    const info = await this.extractZipInfo(zipPath, unzipInPath);
    if (!info) throw new Error(translate('InvalidZipFile'));
    if (info.metadata?.folderExport || info.metadata?.backup) {
      return this.RestoreFromBackup(info, () => {}, report);
    }
    return this.importWorhsheetWithInfo(info, true, report);
  }

  async importWorhsheetWithInfo(zipInfo, preserveFolder, report = FileSystem.newImportReport(zipInfo)) {
    const metadata = zipInfo?.metadata;
    if (!metadata || typeof metadata.name !== 'string' ||
        !metadata.name.split('/').every(part => this._validPathPart(part)) ||
        (metadata.subFolder && !this._validPathPart(metadata.subFolder))) {
      throw new Error(translate('InvalidZipFile'));
    }
    await this.getRootFolders();
    const items = await RNFS.readDir(_androidFileName(zipInfo.unzipPath));
    let targetPath = this._basePath;
    const folderID = preserveFolder
      ? zipInfo.metadata.name
      : FileSystem.DEFAULT_FOLDER.name;
    const containingFolderID = folderID.split('/').slice(0, -1).join('/');
    await this.findFolderByID(containingFolderID)?.reloadedIfNeeded();
    trace(
      'Importing a worksheet',
      zipInfo,
      preserveFolder,
      'folderID',
      folderID,
    );

    let folder = this.findFolderByID(folderID);
    // Parents created while restoring a child have no metadata until their own
    // archive is restored. This also works when retrying after an app restart.
    if (folder && preserveFolder && !await RNFS.exists(this._basePath + folder.path + '/.metadata')) {
      folder.metadata = await this._writeFolderMetaData(this._basePath + folder.path, zipInfo.metadata.color, zipInfo.metadata.icon);
    }
    if (!folder) {
      const parts = folderID.split('/');
      const folderName = parts.pop();
      let parentID = '';
      if (parts.length) {
        parentID = parts.join('/');
        // verify parent exists:
        const parentFolder = this.findFolderByID(parentID);
        if (!parentFolder) {
          trace('importWorhsheetWithInfo - addFolder', parentID);
          await this.addFolder(
            parentID,
            FileSystem.DEFAULT_FOLDER_METADATA.icon,
            FileSystem.DEFAULT_FOLDER_METADATA.color,
            false,
            true,
            true,
          );
        }
      }

      const icon = preserveFolder
        ? zipInfo.metadata.icon
        : FileSystem.DEFAULT_FOLDER_METADATA.icon;
      const color = preserveFolder
        ? zipInfo.metadata.color
        : FileSystem.DEFAULT_FOLDER_METADATA.color;
      trace('importWorhsheetWithInfo2 - addFolder', folderName, parentID);
      folder = await this.addFolder(
        folderName,
        icon,
        color,
        false,
        false,
        false,
        parentID,
      );
    }
    targetPath += folder.path + '/';
    let targetPath2 = targetPath;
    if (zipInfo.metadata.subFolder) {
      targetPath2 += zipInfo.metadata.subFolder + '/';
      await RNFS.mkdir(targetPath2).catch(ignore);
    }

    // copy all other files
    const filesItems = items.filter(f => !f.name.endsWith('.metadata'));
    // a folder's archive without worksheets (an empty folder) has no name
    const sheetName = zipInfo.metadata.subFolder || filesItems
      .map(f => f.name)
      .find(n => n.endsWith('.jpg') && !n.endsWith('thumbnail.jpg'))
      ?.slice(0, -4);
    let moved = 0;
    try {
      for (let fi of filesItems) {
        const isThumbnail = fi.name.endsWith('thumbnail.jpg');
        const destination = (isThumbnail ? targetPath : targetPath2) + fi.name;
        // Keep existing worksheets when restoring again after a partial import.
        if (await RNFS.exists(destination)) continue;
        await RNFS.moveFile(fi.path, destination);
        if (!isThumbnail) moved++;
      }
    } finally {
      await folder.reload();
      this._notify();
    }

    if (sheetName) {
      (moved > 0 ? report.imported : report.skipped).push({ folder: folder.ID, name: sheetName });
    }
    return report;
  }
}

export class FileSystemFolder {
  isParentOf(childID) {
    if (!childID || typeof childID !== 'string') return false;
    const IdWithSlash = this.ID + '/';
    return childID.startsWith(IdWithSlash);
  }

  constructor(name, parentFolder, fs, metadata) {
    this._metadata = metadata;
    this._name = name;
    this._parent = parentFolder;
    this._path = parentFolder
      ? parentFolder.path + '/' + FileSystem.FOLDERS_PATH + '/' + name
      : name;
    this._fs = fs;
    this._folders = [];
    this._files = [];
    this._loaded = false;
    this._loading = false;
  }

  set metadata(md) {
    this._metadata = md;
  }

  _relocate(name, parent) {
    const oldPath = this._fs.basePath + this._path;
    this._name = name;
    this._parent = parent;
    this._path = parent
      ? parent.path + '/' + FileSystem.FOLDERS_PATH + '/' + name
      : name;
    const newPath = this._fs.basePath + this._path;
    for (const sheet of this._files) {
      sheet.relocate(oldPath, newPath);
    }
    for (const child of this._folders) {
      child._relocate(child.name, this);
    }
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
    return this._parent ? this._parent.ID + '/' + this._name : this._name;
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
      trace('triger reload from items');
      this.reload();
    }
    return this._files;
  }

  async reloadedIfNeeded() {
    if (!this._loaded || this._loading) {
      await this.reload();
    }
    return { files: this._files, folders: this._folders };
  }

  async getItem(name) {
    name = FileSystem.getFileNameFromPath(name, true);
    await this.reloadedIfNeeded();
    console.log('get.item: ' + name + 'files count: ' + this._files.length);
    return this._files.find(f => f.name == name);
  }

  reload() {
    if (!this._reloadPromise) {
      this._reloadPromise = this._performReload().finally(() => {
        this._reloadPromise = undefined;
      });
    }
    return this._reloadPromise;
  }

  async _performReload() {
    this._loading = true;
    console.log('reload folder: ' + this._path, this._name);
    // A failed read must not leave _loading set: reload() would then never run again and
    // the folder would stay empty until the app restarts.
    try {
      await this._reload();
      this._loaded = true;
    } catch (e) {
      // no notify: it would re-render, and the items getter would retry in a loop.
      // the next render retries instead.
      trace('reload folder failed', this._path, e);
      reportFolderLoadFailed(e, 'folder', this._name === FileSystem.DEFAULT_FOLDER.name);
      return;
    } finally {
      this._loading = false;
    }
    this._fs._notify();
  }

  async _reload() {
    const items = await RNFS.readDir(this._fs.basePath + this._path);
    const filesItems = items.filter(
      f =>
        !f.name.endsWith('.json') &&
        !f.name.includes(FileSystem.ATACHMENT_PREFIX) &&
        f.name !== ORDER_FILE_NAME &&
        f.name !== '.metadata' &&
        !f.name.endsWith('thumbnail.jpg') &&
        !f.name.endsWith('.istemplate'),
    );
    // fill a new list and swap it in at the end, so a failure keeps the current content
    const files = [];
    this._folders = [];
    for (let fi of filesItems) {
      if (fi.name === FileSystem.FOLDERS_PATH) {
        const foldersBasePath = this._path + '/' + FileSystem.FOLDERS_PATH;
        //trace("read sub folders for ", this.name, " in ", foldersBasePath);
        const subFoldersItems = await readDirAt('subfolders',
          this._fs.basePath + foldersBasePath,
        );
        trace('found: ', subFoldersItems.length);
        for (let sfi of subFoldersItems) {
          await FileSystem.main.readFolder(sfi, this);
        }
      } else {
        const name = FileSystem.getFileNameFromPath(fi.name, true);
        let sheet = new WorkSheet(_androidFileName(fi.path), name);

        let lastUpdate = _lastUpdate(fi);
        let pages;

        if (fi.isDirectory()) {
          //read all pages
          pages = await readDirAt('worksheet', _androidFileName(fi.path));

          for (let i = 0; i < pages.length; i++) {
            lastUpdate = Math.max(lastUpdate, _lastUpdate(pages[i]));

            if (
              !pages[i].name.endsWith('.json') &&
              !pages[i].name.includes(FileSystem.ATACHMENT_PREFIX) &&
              pages[i].name !== 'istemplate'
            ) {
              sheet.addPage(_androidFileName(pages[i].path));
            }
          }
        } else {
          lastUpdate = Math.max(lastUpdate, _lastUpdate(fi));
          trace('adding page', fi.path);
          sheet.addPage(_androidFileName(fi.path));

          //finds the .json file if exists
          let dotJsonFile = items.find(f => f.name === fi.name + '.json');
          if (dotJsonFile) {
            lastUpdate = Math.max(lastUpdate, _lastUpdate(dotJsonFile));
          }
        }

        //find the newest thumbnail
        let thumbnails = items.filter(
          f =>
            f.name && f.name.startsWith(name + '.') && f.name.endsWith(THUMBNAIL_SUFFIX),
        );
        let newestFile;
        if (name == 'T3') trace(thumbnails);
        if (thumbnails.length > 1) {
          let newestTS = -1;

          for (let tnfi of thumbnails) {
            const ct = tnfi.ctime instanceof Date ? fi.ctime.valueOf() : 0;
            if (ct > newestTS) {
              //trace("thumbnail", tnfi.name, tnfi.ctime.valueOf(), newestTS)
              newestTS = ct;
              newestFile = tnfi;
            }
          }
          // delete old thumbnails
          thumbnails
            .filter(tn => tn.name !== newestFile.name)
            .forEach(tn => {
              //trace("delete old thumbnail", tn.name);
              RNFS.unlink(_androidFileName(tn.path));
            });

          //console.log("found tn", thumbnail.path)
        } else if (thumbnails.length == 1) {
          newestFile = thumbnails[0];
        }
        if (newestFile) {
          trace('selected thumbnail', newestFile.name);
          sheet.setThumbnail(_androidFileName(newestFile.path));
        }
        sheet.lastUpdate = lastUpdate;

        // Detect template via sentinel file (zero extra I/O — data already in directory listing)
        if (fi.isDirectory()) {
          if (pages.some(p => p.name === 'istemplate')) {
            sheet.setTemplate(true);
          }
        } else {
          if (items.some(f => f.name === fi.name + '.istemplate')) {
            sheet.setTemplate(true);
          }
        }

        if (fi.isDirectory() && sheet.count === 0) {
          trace('skipping empty worksheet directory', fi.path);
          continue;
        }

        files.push(sheet);
      }
    }
    this._files = files;
  }
}

// tags a failed read with the step it belongs to, for the folder_load_failed event
async function readDirAt(stage, path) {
  try {
    return await RNFS.readDir(path);
  } catch (e) {
    if (e && typeof e === 'object') e.stage = stage;
    throw e;
  }
}

function reportFolderLoadFailed(e, stage, isDefault) {
  // no path or message: they contain folder and worksheet names
  analyticEvent(LocalAnalyticEvent.folder_load_failed, {
    stage: e?.stage || stage,
    is_default: isDefault ? 'yes' : 'no',
    error: String(e?.code || 'unknown').substring(0, 100),
  }).catch(() => { });
}

//todo check with deep folders
//sort.js
const ORDER_FILE_NAME = 'order.json';

export async function saveFolderOrder(folders) {
  return new Promise((resolve, reject) => {
    let order = [];
    if (folders) {
      for (let i = 0; i < folders.length; i++) {
        if (folders[i].name !== FileSystem.DEFAULT_FOLDER.name) {
          order.push(folders[i].name);
        }
      }
    }

    RNFS.writeFile(
      _androidFileName(FileSystem.main.basePath + ORDER_FILE_NAME),
      JSON.stringify(order),
      'utf8',
    ).then(
      //Success
      () => resolve(),
      //on error
      err => reject(err),
    );
  });
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
  let defIndex = folders.findIndex(
    f => f.name == FileSystem.DEFAULT_FOLDER.name,
  );
  if (defIndex < 0) {
    //Add a default empty - todo
  } else {
    //swap
    folders = swapFolders(folders, defIndex, nextPlace);
    nextPlace++;
  }
  try {
    let orderStr = await RNFS.readFile(
      FileSystem.main.basePath + ORDER_FILE_NAME,
      'utf8',
    );
    // /Alert.alert(orderStr.toString('utf-8'))
    let order = JSON.parse(orderStr.toString('utf8'));
    //Alert.alert(order)
    let msg = '';
    for (let i = 0; i < order.length && nextPlace < folders.length; i++) {
      let foundFolderIndex = folders.findIndex(f => f.name === order[i]);
      if (foundFolderIndex >= 0) {
        let len = folders.length;
        folders = swapFolders(folders, foundFolderIndex, nextPlace);
        nextPlace++;
        msg += order[i] + ': ' + foundFolderIndex + '->' + nextPlace;
        if (len !== folders.length) console.log(msg);
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
    orderStr = await RNFS.readFile(
      FileSystem.main.basePath + ORDER_FILE_NAME,
      'utf8',
    );
  } catch (e) {
    //intentionally ignored, as sort.json is missing
  }
  // /Alert.alert(orderStr.toString('utf-8'))
  let order = JSON.parse(orderStr.toString('utf8'));

  //verify this folderName is not in the array:
  order = order.filter(f => f !== folderName);

  order.unshift(folderName);
  //Alert.alert(order)

  return RNFS.writeFile(
    _androidFileName(FileSystem.main.basePath + ORDER_FILE_NAME),
    JSON.stringify(order),
    'utf8',
  ).then(
    //Success
    undefined,
    //on error
    err => Promise.reject(err),
  );
}
