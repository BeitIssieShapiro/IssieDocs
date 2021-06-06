import blankPage from './blank-page.jpg'
import mathPage from './math-page.jpg'
import linesPage from './lines-page.jpg'
import * as RNFS from 'react-native-fs';

import {
    Image
} from 'react-native';
import { FOLDERS_DIR } from "./elements.js"
import { translate } from './lang';
import {genTempFile} from './newPage';
export const NEW_PAGE_TYPE = {
    Blank: 1,
    Lines: 2,
    Math: 3
}

export async function getTempEmptyPage(pageType) {
    let tempFileName = genTempFile("jpg");
    let page = getPageRef(pageType);
    let pageResolved = Image.resolveAssetSource(page);
    const downloadInfo = await RNFS.downloadFile({
        fromUrl: pageResolved.uri,
        toFile: tempFileName
    })
    await downloadInfo.promise;
    // Download complete

    return tempFileName
}

export async function saveNewPage(targetFolder, pageType) {
    let newFileName = await getFileName(targetFolder);
    let basePath = FOLDERS_DIR + targetFolder.name

    console.log("saving: " + basePath + "/" + newFileName);
    let page = getPageRef(pageType);

    let pageResolved = Image.resolveAssetSource(page);
    const downloadInfo = await RNFS.downloadFile({
        fromUrl: pageResolved.uri,
        toFile: basePath + "/" + newFileName
    })
    await downloadInfo.promise;
    // Download complete

    return newFileName
}

function getPageRef(pageType) {
    let page = blankPage;
    if (pageType == NEW_PAGE_TYPE.Lines) {
        page = linesPage;
    } else if (pageType == NEW_PAGE_TYPE.Math) {
        page = mathPage;
    }
    return page
}

async function getFileName(targetFolder) {
    let basePath = FOLDERS_DIR + targetFolder.name;
    let baseFileName = translate("EmptyPageName");
    baseFileName = baseFileName.replace(".", "");
    //try a file name that is not taken:
    let fileName
    let index = ""
    while (true) {
        fileName = basePath + "/" + baseFileName + index + ".jpg";
        try {
            await RNFS.stat(fileName);
            //file exists, try increment index:
            index = index == "" ? " 1" : " " + (parseInt(index) + 1) ;
        } catch (e) {
            return baseFileName +  index + ".jpg";
        }
    }
}