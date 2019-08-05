import {
    ImageStore,
    Image,
    Alert
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import ImagePicker from 'react-native-image-picker';
import * as RNFS from 'react-native-fs';
export const SRC_CAMERA = 'camera';
export const SRC_GALLERY = 'gallery';
export const SRC_FILE = 'file';

import mock from './mock.jpg'
let mockFileName;


export async function getNewPage(src, okEvent, cancelEvent) {
    if (src == SRC_CAMERA) {
        if (DeviceInfo.isEmulator()) {
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
            title: 'צילום דף עבודה',
            mediaType: 'photo',
            noData: true,
            cancelButtonTitle: 'ביטול',
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
            title: 'בחירת תמונה',
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

export async function saveFile(uri, filePath) {

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
                        err => handleSaveFileError(err, reject)
                    ).catch(err => handleSaveFileError(err, reject));
                }, (err) => {
                    handleSaveFileError(err, reject);
                });
        } else {
            RNFS.copyFile(uri, filePath).then(
                //Success
                () => {
                    //Alert.alert("save ok. uri:" + uri + " to " + filePath)
                    return resolve()
                },
                //on error 
                err => handleSaveFileError(err, reject)
            ).catch(err => handleSaveFileError(err, reject));
        }
    });
}

function handleSaveFileError(err, reject) {
    let errorStr = ""
    for (let key in err) {
        errorStr += JSON.stringify(err[key]).substr(15)+"\n";
    }
    //Alert.alert("Error: " + errorStr);
    if (err.toString().includes("already exists")) {
        reject("קובץ בשם זה כבר קיים");
        return;
    }
    reject('Error saving file: ' + uri + ' to ' + filePath + ', err: ' + err);
}

export function genTempFile(ext) {
    const date = new Date()
    let fn =  Math.random()+ '-' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + '-' + ('0' + date.getMinutes()).slice(-2) + '-' + ('0' + date.getSeconds()).slice(-2);

    return RNFS.TemporaryDirectoryPath  + fn + "." + ext
}

export async function cloneToTemp(uri) {
    let newUri = genTempFile('jpg')
    await RNFS.copyFile(uri, newUri);
    return newUri;
}