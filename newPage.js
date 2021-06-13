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



export async function getNewPage(src, okEvent, cancelEvent, navigation) {
    if (src == SRC_CAMERA) {
       
        navigation.navigate('OpenCamera',
                                {
                                    okEvent,
                                    cancelEvent
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




