
import React from 'react';
import { Image,ImageBackground,TextInput, Picker, StyleSheet, View, Button,TouchableOpacity, Text,
Alert } from 'react-native';
import {FOLDERS_DIR, globalStyle} from './GaleryScreen';
import * as RNFS from 'react-native-fs';


const pictureSize = 150;


const OK_Cancel = 1;
const PickName = 2;
const PickFolder = 3;


export default class IssieSavePhoto extends React.Component {
  static navigationOptions = {
    title: 'שמור דף',
  };

  constructor () {
    super();
    this.state = {phase: OK_Cancel};
    this.OK.bind(this);
  }
  OK = () => {
    if (this.state.phase == OK_Cancel) {
      this.setState({phase: PickName});
    } else if (this.state.phase == PickName) {
      this.setState({phase: PickFolder, folder:""});
    } else if (this.state.phase == PickFolder) {
      this.save();
      this.props.navigation.navigate('Home');
    }
  }

  save = () => { 
    const uri = this.props.navigation.getParam('uri', '');
    Alert.alert("saving : "+ uri);
    let folderName = this.state.folder;
    let fileName = this.state.pageName;
    
    if (!fileName) {
      Alert.alert('Missing file name');
      return;
    }
    if (!folderName) {
      folderName = "Default";
    }

    let targetFolder = FOLDERS_DIR + folderName;
    let filePath = targetFolder + "/" + fileName +  ".jpg";
    RNFS.mkdir(targetFolder).then(() => {
      RNFS.copyFile(uri, filePath).then(undefined,
        //on error 
        err => Alert.alert('error saving file: ' + uri + ' to ' + filePath + ', err: '+err)
      ).catch(err => Alert.alert('Catch saving file: ' + uri + ' to ' + filePath + ', err: '+err));  
    });
  }
  
  Cancel = () => this.props.navigation.goBack();
  

  render() {
    const { navigation } = this.props;
    const uri = navigation.getParam('uri', '');
    let buttons = <View/>;
    let PageNameInput = <View/>;
    let SelectFolder = <View/>;
    if (this.state.phase == OK_Cancel || this.state.phase == PickName ||
        this.state.phase == PickFolder) {
      buttons = <View style={styles.bottom}>
        <Button title="OK" style={styles.buttons} onPress={this.OK}/>
        <Button title="Cancel" style={styles.buttons} onPress={this.Cancel}/>
      </View>;
    }
    if (this.state.phase == PickName) {
      PageNameInput = <View style={styles.bottom}>
                        <TextInput style={styles.textInput}
                        onChangeText={(text) => this.setState({pageName:text})}
                        />
                      </View>
    }

    if (this.state.phase == PickFolder) {
      SelectFolder = 
      <View style={styles.bottom} zIndex={1000}>
        <Picker
          selectedValue={this.state.folder}
          style={styles.folderPicker}
          mode='dropdown'
          onValueChange={(itemValue, itemIndex) =>
            this.setState({folder: itemValue})
          }>
          <Picker.Item label= "" value="" />
          <Picker.Item label= "חשבון" value="חשבון" />
          <Picker.Item  label= "תורה" value="תורה" />
          <Picker.Item  label= "ספריה חדשה" value="ספריה חדשה" />
        </Picker>
      </View>
    }
    return (
        <View style={styles.bgImage}>
          <ImageBackground
            resizeMode="contain"
            style={styles.bgImage}
            source={{uri}}
          />
          {PageNameInput}
          {SelectFolder}
          {buttons}

        </View>
        
      );
  };
    
}
const styles = StyleSheet.create({
  
    bgImage: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'stretch',
      resizeMode: 'stretch',
    },
  
  button: {
    position: 'absolute',
    bottom:0
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 36
  },
  textInput: {
    height: 40, 
    borderColor: 
    'black', 
    borderWidth: 1,
    backgroundColor: 'white'

  },
  folderPicker: {
    height: 50, 
    width: 250,
    backgroundColor: 'white'
  },
  pictureWrapper: {
    width: pictureSize,
    height: pictureSize,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
  },
  facesContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
  },
  face: {
    borderWidth: 2,
    borderRadius: 2,
    position: 'absolute',
    borderColor: '#FFD700',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  faceText: {
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 2,
    fontSize: 10,
    backgroundColor: 'transparent',
  }
});