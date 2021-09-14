
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import {
    semanticColors,
    getSvgIconButton,
    getRoundedButton
} from './elements'
import { translate } from './lang';
import { isSimulator } from './device';

import { CameraType, Camera } from 'react-native-camera-kit';
import { FileSystem } from './filesystem';
import { trace } from './log';


export default function CameraOverlay(props) {
    const [captureInProgress, setCaptureInProgress] = useState(false);

   const takePicture = async () => {
        if (captureInProgress)
            return;

        try {
            setCaptureInProgress(true);
            let image;
            if (isSimulator()) {
                let tempFile = await FileSystem.main.getStaticPageTempFile(FileSystem.StaticPages.SimulatorMock);
                image = { uri: tempFile }
            } else {
                image = await camera.current.capture();
            }
            trace("Picture taken: ", JSON.stringify(image.uri));
            let okEvent = props.route.params.okEvent;

            props.navigation.goBack();
            if (image && okEvent) {
                okEvent(image.uri);
            }
        } finally {
            setCaptureInProgress(false);
        }
    }

    const cancel = () => {
        let cancelEvent = props.route.params.cancelEvent;
        props.navigation.goBack();
        if (cancelEvent) {
            cancelEvent();
        }
    }

    const camera = useRef()
    // relying on the changes offered here: https://github.com/teslamotors/react-native-camera-kit/issues/425
    return (
            <View style={{
                flex: 1, width: '100%',
                height: '100%'
            }}>
                <Camera
                    ref={camera}
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                    cameraType={CameraType.Back}
                    saveToCameraRoll={false}
                />

                <View style={{
                    position: 'absolute', alignItems: 'center',
                    top: '2%', width: '100%', backgroundColor: 'transparent'
                }}>
                    {getRoundedButton(cancel, 'cancel-red', translate("BtnCancel"), 30, 30, { width: 150, height: 40 })}
                </View>
                <View style={{
                    position: 'absolute', alignItems: 'center',
                    bottom: '2%', width: '100%', backgroundColor: 'transparent'
                }}>
                    {getSvgIconButton(takePicture, semanticColors.addButton, "camera-take-photo", 80
                    )}
                </View>
            </View>
)
}
