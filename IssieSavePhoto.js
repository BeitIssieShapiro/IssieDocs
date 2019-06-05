
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
      this.setState({phase: PickName, folder:""});
    } else if (this.state.phase == PickName) {
      if (!this.state.pageName || this.state.pageName.length == 0) {
        Alert.alert('חובה לבחור שם לדף');
        return;
      }
      if (this.state.folder === "new") {
        this.setState({phase : PickFolder});
        return;
      }
      this.save();
    } else if (this.state.phase == PickFolder  ) {
      this.save();
    }
  }

  save = () => { 
    const uri = this.props.navigation.getParam('uri', '');
    //Alert.alert("saving : "+ uri);
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
    let filePath = targetFolder + "/" + fileName +  ".jpg";
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
          Alert.alert('Error saving file: ' + uri + ' to ' + filePath + ', err: '+err)
        }
      ).catch(err => Alert.alert('Error saving file: ' + uri + ' to ' + filePath + ', err: '+err));  
    });
  }
  
  Cancel = () => this.props.navigation.goBack();
  

  render() {
    const { navigation } = this.props;
    const uri = navigation.getParam('uri', '');
    let buttons = <View/>;
    let PageNameInput = <View/>;
    let SelectFolder = <View/>;
    let NewFolderInput = <View/>;
    if (this.state.phase == OK_Cancel || this.state.phase == PickName ||
        this.state.phase == PickFolder) {
      buttons = <View style={styles.okCancelView}>
        <Button raised={true} title="OK" style={[styles.button, styles.buttonGreen]} onPress={this.OK}/>
        <Text>    </Text>
        <Button raised={true} title="Cancel" style={[styles.button, styles.buttonRed]} onPress={this.Cancel}/>
      </View>;
    }
   

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
            this.setState({folder: itemValue})
          }>
          <Picker.Item label= "ללא" value="" />
          <Picker.Item label= "חשבון" value="חשבון" />
          <Picker.Item label= "תורה" value="תורה" />
          <Picker.Item label= "ספריה חדשה" value="new" />
        </Picker>
      </View>
    }

    if (this.state.phase == PickName) {
      PageNameInput = <View style={styles.textInputView}>
                        <Text style={styles.titleText}>שם הדף</Text>
                        <TextInput style={styles.textInput}
                        onChangeText={(text) => this.setState({pageName:text})}
                        />
                        {SelectFolder}

                      </View>
    }

    if (this.state.phase == PickFolder) {
      NewFolderInput = <View style={styles.textInputView}>
                        <Text style={styles.titleText}>שם הספרייה החדשה</Text>
                        <TextInput style={styles.textInput}
                        onChangeText={(text) => this.setState({newFolderName:text})}
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
          {PageNameInput}
          {NewFolderInput}
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
    backgroundColor: 'grey',
    opacity:5
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
    top:"15%",
    backgroundColor:'transparent'
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
    backgroundColor: 'transparent'
  },
  folderPicker: {
    height: 50, 
    width: 250,
    backgroundColor: 'white'
  }
});