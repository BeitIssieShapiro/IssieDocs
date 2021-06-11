import {
    Alert
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
export const SRC_CAMERA = 'camera';
export const SRC_GALLERY = 'gallery';
export const SRC_FILE = 'file';
export const SRC_RENAME = 'rename'
export const SRC_DUPLICATE = 'duplicate'

import { translate } from './lang';
import { isSimulator } from './device';
import { FileSystem } from './filesystem';



export async function getNewPage(src, okEvent, cancelEvent) {
    if (src == SRC_CAMERA) {
        if (isSimulator()) {
            let mockFileName = await FileSystem.main.getStaticPageTempFile(FileSystem.StaticPages.SimulatorMock);
            
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

        launchCamera({
            title: translate("CameraTitle"),
            mediaType: 'photo',
            noData: true,
            cancelButtonTitle: translate("BtnCancel"),
            takePhotoButtonTitle: "בחר",
            showsCameraControls: false
        }, (response) => {
            if (!response.didCancel && response.assets.length > 0) {
                okEvent(response.assets[0].uri);
            } else {
                cancelEvent();
            }
        });
    } else if (src == SRC_GALLERY) {
        launchImageLibrary({
            title: translate("MediaPickerTitle"),
            mediaType: 'photo',
            noData: true
        }, (response) => {
            if (!response.didCancel && response.assets.length > 0) {
                okEvent(response.assets[0].uri);
            } else {
                cancelEvent();
            }
        });
    }
}




