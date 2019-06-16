
import React from 'react';
import {
  ImageBackground, TextInput, Picker, StyleSheet, View, Text,
  Alert, Dimensions, PanResponder, ImageEditor, ImageStore, TouchableHighlight
} from 'react-native';
import { Button } from 'react-native-elements'
import { FOLDERS_DIR } from './GaleryScreen';
import * as RNFS from 'react-native-fs';
import { getSquareButton, colors, getImageDimensions } from './elements'
import ImageRotate from 'react-native-image-rotate';
import ModalDropdown from 'react-native-modal-dropdown';
import { Icon } from 'react-native-elements'


const OK_Cancel = 1;
const PickName = 2;
const PickFolder = 3;

const headerHeight = 60;
const panBroderDistance = 80;

const newFolderName = 'ספריה חדשה';

export default class IssieSavePhoto extends React.Component {
  static navigationOptions = {
    title: 'שמור דף',
  };

  constructor() {
    super();
    this.state = {
      phase: OK_Cancel,
      cropping: false,
      topView: 0
    };
    this.OK.bind(this);

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => this.state.cropping,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => this.state.cropping,
      onMoveShouldSetPanResponder: (evt, gestureState) => this.state.cropping,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => this.state.cropping,
      onPanResponderMove: (evt, gestureState) => {
        if (this.state.cropping) {
          let panStartX = gestureState.x0, panStartY = gestureState.y0 - this.state.topView - headerHeight;

          let msg = ("x:" + panStartX + " d-" + gestureState.dx + ", y:" + panStartY + " d-" + gestureState.dy);
          let cd = this.state.cropData;
          if (this.state.panStartX != panStartX && this.state.panStartY != panStartY) {
            let panStartCD = {};
            Object.assign(panStartCD, cd);
            this.setState({
              panStartX: panStartX,
              panStartY: panStartY,
              panStartCropData: panStartCD,
              msg: 'startPan'
            })
            return;
          }
          let moved = false;
          let ocd = this.state.panStartCropData;
          let left = panStartX - ocd.x;
          let right = ocd.x + ocd.width - panStartX;
          let top = panStartY - ocd.y;
          let bottom = ocd.y + ocd.height - panStartY;

          if (left < panBroderDistance) {
            cd.x = ocd.x + gestureState.dx;
            cd.width = ocd.width - gestureState.dx;
            moved = true
          } else if (right < panBroderDistance) {
            cd.width = ocd.width + gestureState.dx;
            moved = true;
          }

          if (top < panBroderDistance) {
            cd.y = ocd.y + gestureState.dy;
            cd.height = ocd.height - gestureState.dy;
            moved = true
          } else if (bottom < panBroderDistance) {
            cd.height = ocd.height + gestureState.dy;
            moved = true;
          }

          if (!moved) {
            cd.x = ocd.x + gestureState.dx;
            cd.y = ocd.y + gestureState.dy;
          }
          this.setState({ msg: msg, cropData: cd });;
        }
      }
    });

  }

  componentDidMount = async () => {
    let uri = this.props.navigation.getParam('uri', '');
    this.setState({ uri: uri });
    this.initFolderList()
    this.updateImageDimension();
    this.onLayout();
  }

  updateImageDimension = async () => {
    setTimeout(async () => {
      let size = await getImageDimensions(this.state.uri);
      this.setState({ imgSize: size })
    }, 50);
  }

  onLayout = async () => {
    const measure = this.topView.measure.bind(this.topView);
    setTimeout(measure, 50, (fx, fy, width, height, px, py) => {
      this.setState({ topView: py })
    });
  }

  OK = () => {
    if (this.state.phase == OK_Cancel) {
      this.setState({ phase: PickName, folder: "" });
    } else if (this.state.phase == PickName) {
      if (!this.state.pageName || this.state.pageName.length == 0) {
        Alert.alert('חובה לבחור שם לדף');
        return;
      }
      if (this.state.folder === newFolderName) {
        this.setState({ phase: PickFolder });
        return;
      }
      this.save();
    } else if (this.state.phase == PickFolder) {
      this.save();
    }
  }

  save = () => {
    const uri = this.state.uri;
    let folderName = this.state.folder;
    let fileName = this.state.pageName;

    if (!fileName) {
      Alert.alert('חובה לבחור שם לדף');
      return;
    }
    if (!folderName) {
      folderName = "Default";
    } else if (folderName == newFolderName) {
      folderName = this.state.newFolderName;
    }

    let targetFolder = FOLDERS_DIR + folderName;
    let filePath = targetFolder + "/" + fileName + ".jpg";
    RNFS.mkdir(targetFolder).then(() => {
      if (uri.startsWith("rct-image-store")) {
        console.disableYellowBox = true;
        ImageStore.getBase64ForTag(
          uri,
          //success
          (base64Contents) => {
            //let contents = base64.decode(base64Contents);
            //todo optimize code
            RNFS.writeFile(filePath, base64Contents, 'base64').then(
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
          }, (error) => {
            Alert.alert(error);
            //todo
          });
      } else {
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
      }
    });
  }


  Cancel = () => this.props.navigation.goBack();

  rotateLeft = () => this.rotate(-90);
  rotateRight = () => this.rotate(90);
  crop = () => {
    let windowSize = Dimensions.get("window");
    this.setState({
      cropping: true,
      cropData: {
        x: 0,
        y: 0,
        width: windowSize.width,
        height: windowSize.height - headerHeight - this.state.topView,
        scaleX: windowSize.width / this.state.imgSize.w,
        scaleY: windowSize.height / this.state.imgSize.h
      },
      windowSize: windowSize
    });
  }
  cancelCrop = () => this.setState({ cropping: false });
  acceptCrop = () => {
    let cd = this.state.cropData;
    let cropData = {
      offset: { x: cd.x / cd.scaleX, y: cd.y / cd.scaleY },
      size: { width: cd.width / cd.scaleX, height: cd.height / cd.scaleY },
      displaySize: {
        width: this.state.imgSize.w,
        height: this.state.imgSize.h
      },
      resizeMode: 'stretch'
    };
    ImageEditor.cropImage(this.state.uri, cropData,
      //success: 
      (newUri) => {
        this.setState({ uri: newUri, cropping: false });
        this.updateImageDimension()
      },
      //failure: 
      (error) => { }
    );
  }

  rotate = (deg) => {
    ImageRotate.rotateImage(this.state.uri, deg,
      //success: 
      (newUri) => {
        this.setState({ uri: newUri });
        this.updateImageDimension()
      },
      //failure: 
      (error) => { });
  }

  initFolderList = async () => {
    if (this.state.folders) return this.state.folders;

    RNFS.readDir(FOLDERS_DIR).then(folders=> {
      this.setState({folders: folders.map(f=>f.name).filter(f=> f != 'Default')});
    });
  }

  getFolderPicker = () => {
    console.disableYellowBox = true;
    return <ModalDropdown
      style={[styles.pickerButton]}
      dropdownStyle={{width:'60%', height:'25%'}}
      onSelect={(itemIndex, itemValue) => this.setState({ folder: itemValue })}
      renderRow={this.pickerRenderRow.bind(this)}
      options={['ללא', ...this.state.folders, newFolderName]} >
        <View style= {{
          flexDirection:'row', justifyContent:'space-between',
          alignItems:'center'
        }}>
        <Icon name='arrow-drop-down' size={50} color="#4630EB" />
        <Text style={{ fontSize: 70, textAlign:'right' }}>{this.state.folder?this.state.folder:'ללא'}</Text>
        </View>
    </ModalDropdown>
  }

  pickerRenderRow = (rowData, rowID, highlighted) => {
    let evenRow = rowID % 2;
    return (
      <TouchableHighlight underlayColor='cornflowerblue'>
        <View style={[styles.textInput, {
           backgroundColor: evenRow ? 'lemonchiffon' : 'white',
           justifyContent:'flex-end'
          }]}>
          {/* <Icon name='gavel' size={30} color="#4630EB" /> */}

          <Text style={{ fontSize: 70 , textAlign:'right'}}>
            {`${rowData}`}
          </Text>
        </View>
      </TouchableHighlight>
    );
  }

  render() {
    let uri = this.state.uri;

    let header = <View />;
    let buttons = <View />;
    let PageNameInput = <View />;
    let SelectFolder = <View />;
    let NewFolderInput = <View />;
    if (!this.state.cropping &&
      (this.state.phase == OK_Cancel ||
        this.state.phase == PickName ||
        this.state.phase == PickFolder)) {
      buttons = <View style={styles.okCancelView}>
        {getSquareButton(this.Cancel, colors.red, undefined, "בטל", undefined, 30, undefined, { width: 200, height: 50 })}
        <Text>        </Text>
        {getSquareButton(this.OK, colors.green, undefined, "שמור", undefined, 30, undefined, { width: 200, height: 50 })}
      </View>;
    }

    if (this.state.phase == OK_Cancel) {
      header = <View style={{ flexDirection: 'row', height: headerHeight }}>
        {getSquareButton(this.crop, colors.blue, colors.blue, undefined, "crop", 45, this.state.cropping)}
        {this.state.cropping ? getSquareButton(this.cancelCrop, colors.blue, undefined, undefined, "cancel", 45, false) : <View />}
        {this.state.cropping ? getSquareButton(this.acceptCrop, colors.blue, undefined, undefined, "check", 45, false) : <View />}

        {this.state.cropping ? <View /> : getSquareButton(this.rotateLeft, colors.blue, undefined, undefined, "rotate-left", 45, false)}
        {this.state.cropping ? <View /> : getSquareButton(this.rotateRight, colors.blue, undefined, undefined, "rotate-right", 45, false)}
      </View>
    }

    //todo - dynamic folders
    if (this.state.phase == PickName) {
      SelectFolder =
        <View style={styles.pickerView}>
          <Text style={styles.titleText}>ספריה</Text>
          {this.getFolderPicker()}
          {/* <Picker
            style={styles.textInput}
            itemStyle={styles.textInput}
            selectedValue={this.state.folder}
            mode='dropdown'
            onValueChange={(itemValue, itemIndex) =>
              this.setState({ folder: itemValue })
            }>

            <Picker.Item label="ללא" value="" />
            <Picker.Item label={<Text style={{ alignItems: 'center', flexDirection: 'row' }}>
              <Thumbnail square style={{ width: 30, height: 20, marginTop: 5 }} source={require('../assets/+90.png')} 
              /> +90</Text>
            } value="+90"
            />


            <Picker.Item label="חשבון" value="חשבון" />
            <Picker.Item label="תורה" value="תורה" />
            <Picker.Item label="ספריה חדשה" value="new" />
          </Picker> */}
        </View>
    }

    if (this.state.phase == PickName) {
      PageNameInput = <View style={styles.textInputView}>
        <Text style={styles.titleText}>שם הדף</Text>
        <TextInput style={styles.textInput}
          onChangeText={(text) => this.setState({ pageName: text })}
        />
        <Text style={styles.titleText}>ספריה</Text>
        {this.getFolderPicker()}

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
    let cropFrame = <View />;
    if (this.state.cropping) {
      cropFrame = <View
        style={{
          position: 'absolute',
          width: this.state.cropData.width,
          height: this.state.cropData.height,
          top: this.state.cropData.y,
          left: this.state.cropData.x,

          borderColor: 'black',
          borderWidth: 5,
          borderStyle: 'dashed',
        }}
        {...this._panResponder.panHandlers}
      >
        <Text>{this.state.msg}</Text>

      </View>
    }

    return (
      <View style={styles.container}
        ref={v => this.topView = v}
        onLayout={this.onLayout}>

        {header}
        <ImageBackground
          style={styles.bgImage}
          blurRadius={this.state.phase == OK_Cancel ? 0 : 20}
          source={this.state.phase == OK_Cancel ? { uri } : undefined}
        >
          {cropFrame}
          {PageNameInput}
          {NewFolderInput}
          {buttons}
        </ImageBackground>
      </View>
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
  container: {
    flex: 1,
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: 'grey',
    opacity: 5
  },
  bgImage: {
    flex: 1,
    width: '100%',
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
  pickerButton: {
    flex: 1,
    height: 70,
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
  }
});