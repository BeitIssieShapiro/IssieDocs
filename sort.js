
import * as RNFS from 'react-native-fs';
import { Alert } from 'react-native'
import { FOLDERS_DIR, DEFAULT_FOLDER_NAME } from './elements';
const ORDER_FILE_NAME = 'order.json'
export async function saveFolderOrder(folders) {
    return new Promise((resolve) => {
        let order = []
        if (folders) {
            for (let i = 0; i < folders.length; i++) {
                if (folders[i].name !== DEFAULT_FOLDER_NAME) {
                    order.push(folders[i].name);
                }
            }
        }

        RNFS.writeFile(FOLDERS_DIR + ORDER_FILE_NAME, JSON.stringify(order), 'utf8').then(
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
    let defIndex = folders.findIndex(f => f.name == DEFAULT_FOLDER_NAME);
    if (defIndex < 0) {
        //Add a default empty - todo
    } else {
        //swap
        folders = swapFolders(folders, defIndex, nextPlace);
        nextPlace++;
    }
    try {
        let orderStr = await RNFS.readFile(FOLDERS_DIR + ORDER_FILE_NAME, 'utf8');
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
                    Alert.alert(msg)
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

export async function pushFolderOrder(folderName) {
    let orderStr = '[]';
    try {
        orderStr = await RNFS.readFile(FOLDERS_DIR + ORDER_FILE_NAME, 'utf8');
    } catch (e) {
        //intentionally ignored, as sort.json is missing
    }
    // /Alert.alert(orderStr.toString('utf-8'))
    let order = JSON.parse(orderStr.toString('utf8'));

    //verify this folderName is not in the array:
    order = order.filter(f => f !== folderName)

    order.unshift(folderName);
    //Alert.alert(order)

    RNFS.writeFile(FOLDERS_DIR + ORDER_FILE_NAME, JSON.stringify(order), 'utf8').then(
        //Success
        undefined,
        //on error 
        err => Promise.reject(err)
    )

}

export async function renameFolder(fromFolder, toFolder) {
    let orderStr = '[]';
    try {
        orderStr = await RNFS.readFile(FOLDERS_DIR + ORDER_FILE_NAME, 'utf8');
    } catch (e) {
        //intentionally ignored, as sort.json is missing
    }
    // /Alert.alert(orderStr.toString('utf-8'))
    let order = JSON.parse(orderStr.toString('utf8'));

    //verify this folderName is not in the array:
    let inx = order.findIndex(f => f === fromFolder)
    if (inx != -1) {
        order[inx] = toFolder;

        RNFS.writeFile(FOLDERS_DIR + ORDER_FILE_NAME, JSON.stringify(order), 'utf8').then(
            //Success
            undefined,
            //on error 
            err => Promise.reject(err)
        )
    }

}