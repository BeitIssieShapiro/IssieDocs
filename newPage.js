import { launchImageLibrary } from 'react-native-image-picker';
export const SRC_CAMERA = 'camera';
export const SRC_GALLERY = 'gallery';
export const SRC_FILE = 'file';
export const SRC_RENAME = 'rename'
export const SRC_DUPLICATE = 'duplicate'

import { translate } from './lang';


export async function getNewPage(src, okEvent, cancelEvent, navigation, options) {
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
            ...options,
            noData: true
        }

        launchImageLibrary(imageOptions, (response) => {
            if (!response.didCancel && response.assets.length > 0) {
                if (options?.includeBase64) {
                    okEvent("data:image/jpg;base64," + response.assets[0].base64);
                } else {
                    okEvent(response.assets[0].uri);
                }
            } else {
                cancelEvent();
            }
        });
    }
}




