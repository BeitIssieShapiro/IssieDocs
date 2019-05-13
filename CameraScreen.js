import ViewShot from "react-native-view-shot";   
import {CameraKitCamera, CameraKitCameraScreen} from 'react-native-camera-kit'
import React from 'react';
import {View, Button, Image} from 'react-native';
import DeviceInfo from 'react-native-device-info';


export default class CameraScreenLocal extends React.Component {
  static navigationOptions = {
    title: 'צלם דף חדש',
  };
  constructor() {
    super();
    onBottomButtonPressed = this.onBottomButtonPressed.bind(this);
  }

  async componentWillMount() {
    const isCameraAuthorized = await CameraKitCamera.checkDeviceCameraAuthorizationStatus();
    if (!isCameraAuthorized) {
      isUserAuthorizedCamera = await CameraKitCamera.requestDeviceCameraAuthorization();
    }
  }

  onBottomButtonPressed(photo) {
      this.props.navigation.navigate('SavePhoto', {
      uri: photo.uri
    });
  }

  render() {
    const mockPath = require('./mock.jpg');
    let camera;
    if (DeviceInfo.isEmulator() || true) {
      camera =  <View>
        <Button
          title="Mock Take Picture"
          onPress={() => {
            this.refs.viewShot.capture().then(uri => {
              this.props.navigation.navigate('SavePhoto', {
                uri: uri
              });
            });
          }}
        />
        <ViewShot ref="viewShot" options={{ format: "jpg", quality: 0.9 }}>
          <Image source={mockPath} />
        </ViewShot>
      </View>
    } else {
      camera = <View>
        <CameraKitCameraScreen
          actions={{ rightButtonText: 'Done', leftButtonText: 'Cancel' }}
          onBottomButtonPressed={(event) => this.onBottomButtonPressed(event)}
          captureButtonImage={require('./cameraButton.png')}
        />
      </View>
    }

    return camera;
  }
}