import * as RNFS from 'react-native-fs';



export function setNavParam(nav, name, val) {
    if (!nav) return;


    nav.setParams({ [name]: val });
}

export const DEFAULT_FOLDER_METADATA = { icon: '', color: 'gray' };

export async function readFolderMetaData(path) {
    try {

        let metadataString = await RNFS.readFile(path, 'utf8');

        let metadata = JSON.parse(metadataString.toString('utf8'));
        
        return metadata;
    } catch (e) {
        return DEFAULT_FOLDER_METADATA;
    }
}

export async function writeFolderMetaData(path, color, icon) {
    //Alert.alert("color: " + color + ", icon: " + icon);
    let metadata = { color:color?color:DEFAULT_FOLDER_METADATA.color, icon };
    RNFS.writeFile(path, JSON.stringify(metadata), 'utf8').then(
        //Success
        undefined,
        //on error 
        err => Promise.reject(err)
    )
}