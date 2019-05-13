
import React from 'react';
import { Image,ImageBackground,TextInput, Picker, StyleSheet, View, Text,
Alert } from 'react-native';
import {Button} from 'react-native-elements'
import {FOLDERS_DIR, globalStyle} from './GaleryScreen';
import * as RNFS from 'react-native-fs';
import { black, green } from 'ansi-colors';


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
    }
  }

  save = () => { 
    const uri = this.props.navigation.getParam('uri', '');
    //Alert.alert("saving : "+ uri);
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
      RNFS.copyFile(uri, filePath).then(
        //Success
        () => this.props.navigation.navigate('Home'),
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
      buttons = <View style={styles.okCancelView}>
        <Button raised={true} title="OK" style={[styles.button, styles.buttonGreen]} onPress={this.OK}/>
        <Text>    </Text>
        <Button raised={true} title="Cancel" style={[styles.button, styles.buttonRed]} onPress={this.Cancel}/>
      </View>;
    }
   

    if (this.state.phase == PickFolder) {
      SelectFolder = 
      <View style={styles.pickerView}>
        <Text style={styles.titleText}>ספריה</Text>
        <Picker style={styles.textInput}
          selectedValue={this.state.folder}
          mode='dropdown'
          onValueChange={(itemValue, itemIndex) =>
            this.setState({folder: itemValue})
          }>
          <Picker.Item label= "" value="" />
          <Picker.Item label= "חשבון" value="חשבון" />
          <Picker.Item label= "תורה" value="תורה" />
          <Picker.Item label= "ספריה חדשה" value="ספריה חדשה" />
        </Picker>
      </View>
    }

    if (this.state.phase == PickName || this.state.phase == PickFolder) {
      PageNameInput = <View style={styles.textInputView}>
                        <Text style={styles.titleText}>שם הדף</Text>
                        <TextInput style={styles.textInput}
                        onChangeText={(text) => this.setState({pageName:text})}
                        />
                        {SelectFolder}

                      </View>
    }
    return (
        <ImageBackground
            style={styles.bgImage}
            source={{uri}}
            resizeMode={"cover"}
            
          >
          {PageNameInput}
          {buttons}
        </ImageBackground>

        
      );
  };
    
}
const styles = StyleSheet.create({
  bgImageView: {
    backgroundColor:'blue',
    flex: 1,
    position:'absolute',
    top:0,bottom:0,right:0, left:0,
    justifyContent: 'center',
    width:'100%',
    height:'100%',
  },
  bgImage: {
    flex:1,
    width:'100%',
    height:'100%',
  },
  
  okCancelView: {
    position: 'absolute',
    top:"80%",
    left:50, right:50, //middle
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: "center",
  },
  button: {
    borderColor:'black',
    fontWeight:"bold",
    width: 100,
  },
  buttonGreen: {
    backgroundColor:"green"
  },
  buttonRed: {
    backgroundColor:"red"
  },
  pickerView: {
    flex:1,
    width:"100%",
    flexDirection:"column",
    alignItems:"center",
    justifyContent:"flex-end",
  },
  textInputView: {
    position:'absolute',
    flex:1,
    flexDirection:"column",
    alignItems:"center",
    justifyContent:"flex-end",
    width:"60%",
    right:"20%",
    top:"30%",
  },
  textInput: {
    fontSize: 70,
    textAlign:"right",
    fontWeight: 'bold',
    color: 'black',
    width: "100%",
    backgroundColor:'white'
  },
  titleText: {
    fontSize: 70,
    textAlign:"right",
    width:"100%",
    fontWeight: 'bold',
    color: 'white',
  },
  folderPicker: {
    height: 50, 
    width: 250,
    backgroundColor: 'white'
  }
});