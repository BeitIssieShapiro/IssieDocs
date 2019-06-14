
import React from 'react';
import {
  ImageBackground, TextInput, Picker, StyleSheet, View, Text,
  Alert
} from 'react-native';
import { Button } from 'react-native-elements'
import { FOLDERS_DIR } from './GaleryScreen';
import * as RNFS from 'react-native-fs';
import {getSquareButton, colors} from './elements'
import ImageRotate from 'react-native-image-rotate';

const OK_Cancel = 1;
const PickName = 2;
const PickFolder = 3;


export default class IssieSavePhoto extends React.Component {
  static navigationOptions = {
    title: 'שמור דף',
  };

  constructor() {
    super();
    this.state = { phase: OK_Cancel, cropping: false };
    this.OK.bind(this);
  }

 componentDidMount = async () => {
    let uri = this.props.navigation.getParam('uri', '');
    this.setState({uri:uri});
  }  

  OK = () => {
    if (this.state.phase == OK_Cancel) {
      this.setState({ phase: PickName, folder: "" });
    } else if (this.state.phase == PickName) {
      if (!this.state.pageName || this.state.pageName.length == 0) {
        Alert.alert('חובה לבחור שם לדף');
        return;
      }
      if (this.state.folder === "new") {
        this.setState({ phase: PickFolder });
        return;
      }
      this.save();
    } else if (this.state.phase == PickFolder) {
      this.save();
    }
  }

  save = () => {
    const uri = this.props.navigation.getParam('uri', '');
    let folderName = this.state.folder;
    let fileName = this.state.pageName;

    if (!fileName) {
      Alert.alert('חובה לבחור שם לדף');
      return;
    }
    if (!folderName) {
      folderName = "Default";
    } else if (folderName == "new") {
      folderName = this.state.newFolderName;
    }

    let targetFolder = FOLDERS_DIR + folderName;
    let filePath = targetFolder + "/" + fileName + ".jpg";
    RNFS.mkdir(targetFolder).then(() => {
      RNFS.copyFile(uri, filePath).then(
        //Success
        () => this.props.navigation.navigate('Home'),
        //on error 
        err => {
          if (err.toString().includes("already exists")) {
            Alert.alert("קובץ בשם זה כבר קיים");
            return;
          }
          Alert.alert('Error saving file: ' + uri + ' to ' + filePath + ', err: ' + err)
        }
      ).catch(err => Alert.alert('Error saving file: ' + uri + ' to ' + filePath + ', err: ' + err));
    });
  }

  Cancel = () => this.props.navigation.goBack();

  rotateLeft = () => this.rotate(-90);
  rotateRight = () => this.rotate(90);
  crop = () => this.setState({cropping:true});
  cancelCrop = () => this.setState({cropping:false});

  rotate = (deg) => {
    ImageRotate.rotateImage(this.state.uri, deg,
    //success: 
    (newUri) => {
      this.setState({uri:newUri});
    },
    //failure: 
    (error) => {});
  }

  render() {
    let uri = this.state.uri;
    
    let header = <View/>;
    let buttons = <View />;
    let PageNameInput = <View />;
    let SelectFolder = <View />;
    let NewFolderInput = <View />;
    if (!this.state.cropping && 
      (this.state.phase == OK_Cancel ||
      this.state.phase == PickName ||
      this.state.phase == PickFolder)) {
      buttons = <View style={styles.okCancelView}>
        {getSquareButton(this.Cancel, colors.red, undefined, "בטל", undefined, 30, undefined, {width:200, height:50})}
        <Text>        </Text>
        {getSquareButton(this.OK, colors.green, undefined, "שמור", undefined, 30, undefined, {width:200, height:50})}
      </View>;
    }

    if (this.state.phase == OK_Cancel) {
      header = <View style={{position:'absolute', top:20, flexDirection:'row'}}>
        {getSquareButton(this.crop, colors.blue, colors.blue, undefined, "crop", 45, this.state.cropping)}
        {this.state.cropping?getSquareButton(this.cancelCrop, colors.blue, undefined, undefined, "cancel", 45, false):<View/>}
        {this.state.cropping?getSquareButton(this.acceptCrop, colors.blue, undefined, undefined, "check", 45, false):<View/>}

        {this.state.cropping?<View/>:getSquareButton(this.rotateLeft, colors.blue, undefined, undefined, "rotate-left", 45, false)}
        {this.state.cropping?<View/>:getSquareButton(this.rotateRight, colors.blue, undefined, undefined, "rotate-right", 45, false)}
      </View>
    }

    //todo - dynamic folders
    if (this.state.phase == PickName) {
      SelectFolder =
        <View style={styles.pickerView}>
          <Text style={styles.titleText}>ספריה</Text>
          <Picker
            style={styles.textInput}
            itemStyle={styles.textInput}
            selectedValue={this.state.folder}
            mode='dropdown'
            onValueChange={(itemValue, itemIndex) =>
              this.setState({ folder: itemValue })
            }>

            <Picker.Item label="ללא" value="" />
            <Picker.Item label="חשבון" value="חשבון" />
            <Picker.Item label="תורה" value="תורה" />
            <Picker.Item label="ספריה חדשה" value="new" />
          </Picker>
        </View>
    }

    if (this.state.phase == PickName) {
      PageNameInput = <View style={styles.textInputView}>
        <Text style={styles.titleText}>שם הדף</Text>
        <TextInput style={styles.textInput}
          onChangeText={(text) => this.setState({ pageName: text })}
        />
        {SelectFolder}

      </View>
    }

    if (this.state.phase == PickFolder) {
      NewFolderInput = <View style={styles.textInputView}>
        <Text style={styles.titleText}>שם הספרייה החדשה</Text>
        <TextInput style={styles.textInput}
          onChangeText={(text) => this.setState({ newFolderName: text })}
        />
      </View>
    }
    
    return (
      <ImageBackground
          style={styles.bgImage}
          blurRadius={this.state.phase == OK_Cancel?0: 20}
          source={this.state.phase == OK_Cancel?{uri}:undefined}
          resizeMode={"cover"}

        >
        {header}
        {PageNameInput}
        {NewFolderInput}
        {buttons}
      </ImageBackground>
    );
  };

}
const styles = StyleSheet.create({
  bgImageView: {
    backgroundColor: 'blue',
    flex: 1,
    position: 'absolute',
    top: 0, bottom: 0, right: 0, left: 0,
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'grey',
    opacity: 5
  },

  okCancelView: {
    position: 'absolute',
    top: "80%",
    left: 50, right: 50, //middle
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: "center",
  },
  button: {
    borderColor: 'black',
    fontWeight: "bold",
    width: 100,
  },
  buttonGreen: {
    backgroundColor: "green"
  },
  buttonRed: {
    backgroundColor: "red"
  },
  pickerView: {
    flex: 1,
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  textInputView: {
    position: 'absolute',
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    width: "60%",
    right: "20%",
    top: "15%",
    backgroundColor: 'transparent'
  },
  textInput: {
    fontSize: 70,
    textAlign: "right",
    fontWeight: 'bold',
    color: 'black',
    width: "100%",
    backgroundColor: 'white'
  },
  titleText: {
    fontSize: 70,
    textAlign: "right",
    width: "100%",
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'transparent'
  },
  folderPicker: {
    height: 50,
    width: 250,
    backgroundColor: 'white'
  }
});