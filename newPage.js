import {
    ImageStore,
    Image,
    Alert
} from 'react-native';
import ImagePicker from 'react-native-image-picker';
import * as RNFS from 'react-native-fs';
export const SRC_CAMERA = 'camera';
export const SRC_GALLERY = 'gallery';
export const SRC_FILE = 'file';
export const SRC_RENAME = 'rename'
export const SRC_DUPLICATE = 'duplicate'

import mock from './mock.jpg'
import { translate } from './lang';
import { usesAutoTimeZone } from 'react-native-localize';
import { isSimulator } from './utils';
let mockFileName;


export async function getNewPage(src, okEvent, cancelEvent) {
    if (src == SRC_CAMERA) {
        if (isSimulator) {
            if (!mockFileName) {
                mockFileName = genTempFile("jpg")
                let mockImg = Image.resolveAssetSource(mock);
                //Alert.alert("Mock:" +JSON.stringify(mockImg))
                await RNFS.downloadFile({
                    fromUrl: mockImg.uri,
                    toFile: mockFileName
                })
            }
            Alert.alert("Emulator camera.", "Capture?",
                [
                    {
                        text: 'Yes', onPress: async () => {
                            okEvent(mockFileName)
                        }
                    },
                    { text: 'Cancel', onPress: cancelEvent }
                ]);
            return;
        }

        ImagePicker.launchCamera({
            title: translate("CameraTitle"),
            mediaType: 'photo',
            noData: true,
            cancelButtonTitle: translate("BtnCancel"),
            showsCameraControls: false
        }, (response) => {
            if (!response.didCancel) {
                okEvent(response.uri);
            } else {
                cancelEvent();
            }
        });
    } else if (src == SRC_GALLERY) {

        ImagePicker.launchImageLibrary({
            title: translate("MediaPickerTitle"),
            mediaType: 'photo',
            noData: true
        }, (response) => {
            if (!response.didCancel) {
                okEvent(response.uri);
            } else {
                cancelEvent();
            }
        });
    }
}

export async function saveFile(uri, filePath, isCopy) {

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
                        () => resolve(),
                        //on error 
                        err => handleSaveFileError('', err, reject)
                    ).catch(err => handleSaveFileError('', err, reject));
                }, (err) => {
                    handleSaveFileError('', err, reject);
                });
        } else {
            //Alert.alert("before save:"+ uri + ", to:"+ filePath)
            if (uri.endsWith(mockFileName)) {
                return RNFS.copyFile(uri, filePath).then(
                    //Success
                    () => {
                        return resolve()
                    },
                    //on error 
                    err => handleSaveFileError(uri, err, reject)
                ).catch(err => handleSaveFileError(uri, err, reject));
            }

            let ret
            if (isCopy) {
                ret = copyDeep(uri, filePath);
            } else {
                ret = RNFS.moveFile(uri, filePath)
            }

            ret.then(
                //Success
                () => {
                    return resolve()
                },
                //on error 
                err => handleSaveFileError(uri, err, reject)
            ).catch(err => handleSaveFileError(uri, err, reject));

        }
    });
}
//assumed folder is there already
async function copyDeep(src, dst) {
    let stats = await RNFS.stat(src);
    if (stats.isDirectory()) {
        //in case of multi page, it is in fact folder
        await RNFS.mkdir(dst);
        
        let items = await RNFS.readDir(src);
        for (index in items) {
            const item = items[index];
            await RNFS.copyFile(item.path, dst + '/' + item.name);
        }
    } else {
        return RNFS.copyFile(src, dst); 
    }
}

function handleSaveFileError(uri, err, reject) {
    let errorStr = ""
    for (let key in err) {
        errorStr += JSON.stringify(err[key]).substr(15) + "\n";
    }
    //Alert.alert("Error: " + errorStr);
    if (err.toString().includes("already exists")) {
        reject(translate("PageAlreadyExists"));
        return;
    }
    reject('Error saving file: ' + uri, 'err: ' + err);
}

export function genTempFile(ext) {
    const date = new Date()
    let fn = Math.random() + '-' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + '-' + ('0' + date.getMinutes()).slice(-2) + '-' + ('0' + date.getSeconds()).slice(-2);

    return RNFS.TemporaryDirectoryPath + fn + "." + ext
}

export async function cloneToTemp(uri) {
    let newUri = genTempFile('jpg')
    await RNFS.copyFile(uri, newUri);
    return newUri;
}