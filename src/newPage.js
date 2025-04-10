import { launchImageLibrary } from 'react-native-image-picker';
import { FileSystem } from './filesystem';
export const SRC_CAMERA = 'camera';
export const SRC_GALLERY = 'gallery';
export const SRC_FILE = 'file';
export const SRC_RENAME = 'rename'
export const SRC_DUPLICATE = 'duplicate'

import { translate } from './lang';
import { trace } from './log';


export async function getNewPage(src, okEvent, cancelEvent, onError, navigation, options, onProgress) {
    if (src == SRC_CAMERA) {

        navigation.navigate('OpenCamera',
            {
                okEvent,
                cancelEvent,
                ...options
            });

    } else if (src == SRC_GALLERY) {
        let imageOptions = {
            title: translate("MediaPickerTitle"),
            mediaType: 'photo',
            //selectionLimit: 1,
            //quality: 0 to 1 
            quality: 1,
            ...options,
            noData: true
        }
        try {
            launchImageLibrary(imageOptions, (response) => {
                if (response.didFinishPicking) {
                    onProgress && onProgress();
                }
                if (!response.didCancel && response.assets.length > 0) {
                    if (options?.includeBase64) {
                        okEvent("data:image/jpg;base64," + response.assets[0].base64);
                    } else {
                        trace("load image", response.assets[0].uri)
                        okEvent(response.assets[0].uri);
                    }
                } else {
                    cancelEvent();
                }
            });
        } catch (err) {
            onError(err);
        }
    }
}




