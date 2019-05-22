import ViewShot from "react-native-view-shot";   
import {CameraKitCamera, CameraKitCameraScreen} from 'react-native-camera-kit'
import React from 'react';
import {View, Button, Image, Alert} from 'react-native';
import {Icon} from 'react-native-elements';
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
    if (photo.captureImages.length > 0) {
      let uri = photo.captureImages[photo.captureImages.length-1].uri
      if (uri.startsWith("file://")) {
        uri = uri.substr(7);
      }
      this.props.navigation.navigate('SavePhoto', {
      uri: uri
    });
    }
  }

  render() {
    const mockPath = require('./mock.jpg');
    let camera;
    if (DeviceInfo.isEmulator()) {
      camera =  <View>
        
        <ViewShot ref="viewShot" options={{ format: "jpg", quality: 0.9 }}>
          <Image source={mockPath} />
        </ViewShot>
     
        <Icon size={100}
        name="camera-alt"
        onPress={() => {
          this.refs.viewShot.capture().then(uri => {
            this.props.navigation.navigate('SavePhoto', {
              uri: uri
            });
          });
        }}
      /> 
    </View>
    } else {
      camera = <View style={{flex:1}}>
        <CameraKitCameraScreen
          actions={{ rightButtonText: 'Done', leftButtonText: 'Cancel' }}
          onBottomButtonPressed={(event) => this.onBottomButtonPressed(event)}
          captureButtonImage={require('./cameraButton.png')}
          o
        />
      </View>
    }

    return camera;
  }
}