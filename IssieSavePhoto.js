
import React from 'react';
import {
  ImageBackground, TextInput, Picker, StyleSheet, View, Text,
  Alert, Dimensions, PanResponder, ImageEditor, ImageStore, TouchableHighlight
} from 'react-native';
import { FOLDERS_DIR } from './GaleryScreen';
import * as RNFS from 'react-native-fs';
import Pdf from 'react-native-pdf';
import ViewShot from "react-native-view-shot";

import { getSquareButton, colors, getImageDimensions } from './elements'
import ImageRotate from 'react-native-image-rotate';
import ModalDropdown from 'react-native-modal-dropdown';
import { Icon } from 'react-native-elements'
import { getNewPage, saveFile, cloneToTemp } from './newPage'
import { reject } from 'rsvp';


const OK_Cancel = 1;
const PickName = 2;
const PickFolder = 3;

const headerHeight = 60;
const panBroderDistance = 80;

const newFolderName = 'תיקיה חדשה';

export default class IssieSavePhoto extends React.Component {
  static navigationOptions = {
    title: 'שמור דף',
  };

  constructor() {
    super();
    this.state = {
      phase: OK_Cancel,
      cropping: false,
      topView: 0,
      multiPageState: { pages: [] }
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
    let folder = this.props.navigation.getParam('folder', '')

    let pdf = false;
    if (uri.endsWith('.pdf')) {
      pdf = true;
      //      Alert.alert(FOLDERS_DIR);
    }
    this.setState({ uri, pdf , pdfPage:1, folder:folder});
    this.initFolderList()
    if (!pdf) {
      this.updateImageDimension();
    }
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

  OK = async () => {
    if (this.state.phase == OK_Cancel) {

      if (this.state.pdf) {
        let pages = [];
        let currentPage = this.state.pdfPage;
        if (this.state.pdfPageCount > 1) {
          for (let i = 1; i < this.state.pdfPageCount; i++) {
            let savedPdfPageUri = await this.exportPdfPage(i, currentPage);

            let page = { uri: savedPdfPageUri, index: i - 1 }
            //push at the begining
            pages.push(page);
          }
          if (pages.length > 0) {
            multiPageState = { pages: pages }
          }

        }

        let uri = await this.exportPdfPage(this.state.pdfPageCount);
    
        this.setState({
          uri: uri, multiPageState: pages.length > 0 ?
            { pages: pages } :
            this.state.multiPageState,
          pdf: false
        });

      }

      this.setState({ phase: PickName });
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

  save = async () => {
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
    await RNFS.mkdir(targetFolder)



    if (this.state.multiPageState.pages.length > 0) {
      //create a folder with the name fo the file
      targetFolder = targetFolder + "/" + fileName;
      //todo check existing
      await RNFS.mkdir(targetFolder);
      let i = 0;
      for (; i < this.state.multiPageState.pages.length; i++) {
        let page = this.state.multiPageState.pages[i];
        await saveFile(page.uri, targetFolder + "/" + i + ".jpg");
      }
      filePath = targetFolder + "/" + i + ".jpg";
    }

    saveFile(this.state.uri, filePath).then(
      () => this.props.navigation.navigate('Home', 
      this.state.folder == 'Default'? {}: {folder:this.state.folder}),
      (err) => Alert.alert("Error at end:" + err)
    );
  }

  exportPdfPage = async (page, currPage) => {
    return new Promise((resolve, reject) => {
      if (currPage !== page) {
        this.setState({ pdfPage: page })
        setTimeout(() => {
          let viewShot = this.refs.viewShot;
          viewShot.capture().then(
            uri => cloneToTemp(uri).then(newUri => resolve(newUri)),
            err => {
              reject(err)
            }
          );
         }, 100);
      } else {
        this.refs.viewShot.capture().then(
          uri => cloneToTemp(uri).then(newUri => resolve(newUri)),
          err => {
            reject(err)
          }
        );
    }
    });
  }

  Cancel = () => {
    let multiPageState = this.state.multiPageState;
    if (multiPageState.pages.length == 0) {
      this.props.navigation.goBack();
    } else {
      let lastPage = multiPageState.pages.pop();
      this.setState({ uri: lastPage.uri, state: OK_Cancel, multiPageState: multiPageState })
    }
  }

  AddPage = () => {
    let imageSource = this.props.navigation.getParam('imageSource');
    getNewPage(imageSource,
      (uri) => {
        let multiPageState = this.state.multiPageState;
        let page = { uri: this.state.uri, index: multiPageState.pages.length }
        multiPageState.pages.push(page);

        this.setState({ uri: uri, state: OK_Cancel, multiPageState: multiPageState })
      },
      //cancel
      () => { });
  }

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

    RNFS.readDir(FOLDERS_DIR).then(folders => {
      this.setState({ folders: folders.map(f => f.name).filter(f => f != 'Default') });
    });
  }

  getFolderPicker = () => {
    console.disableYellowBox = true;
    return <ModalDropdown
      style={[styles.pickerButton]}
      dropdownStyle={{ width: '60%', height: '25%' }}
      onSelect={(itemIndex, itemValue) => this.setState({ folder: itemValue })}
      renderRow={this.pickerRenderRow.bind(this)}
      options={['ללא', ...this.state.folders, newFolderName]} >
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', alignContent: 'center'
      }}>
        <Icon name='arrow-drop-down' size={50} color="#4630EB" />
        <Text style={styles.textInputPicker}>{this.state.folder ? this.state.folder : 'ללא'}</Text>
      </View>
    </ModalDropdown>
  }

  pickerRenderRow = (rowData, rowID, highlighted) => {
    let evenRow = rowID % 2;
    return (
      <TouchableHighlight underlayColor='cornflowerblue'>
        <View style={[styles.textInput, {
          backgroundColor: evenRow ? 'lemonchiffon' : 'white',
          justifyContent: 'flex-end'
        }]}>
          {/* <Icon name='gavel' size={30} color="#4630EB" /> */}

          <Text style={{ fontSize: 70, textAlign: 'right' }}>
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
    let saveMoreThanOne = this.state.multiPageState.pages.length > 0 ? '(' + (this.state.multiPageState.pages.length + 1) + ')' : ''
    if (!this.state.cropping &&
      (this.state.phase == OK_Cancel ||
        this.state.phase == PickName ||
        this.state.phase == PickFolder)) {
      buttons = <View style={styles.okCancelView}>
        {getSquareButton(this.Cancel, colors.red, undefined, "בטל", undefined, 30, undefined, { width: 200, height: 50 })}
        <Text>     </Text>
        {getSquareButton(this.OK, colors.green, undefined, this.state.pdf ? "שמור כל הדפים" : "שמור" + saveMoreThanOne, "check", 30, undefined, { width: 200, height: 50 }, 45, true)}
        {this.state.phase == OK_Cancel && !this.state.pdf ?
          <Text>     </Text> : null}
        {this.state.phase == OK_Cancel && !this.state.pdf ?
          getSquareButton(this.AddPage, colors.green, undefined, "הוסף", "add", 30, undefined, { width: 200, height: 50 }, 45, true) :
          null
        }

      </View>;
    }

    if (this.state.phase == OK_Cancel && !this.state.pdf) {
      header = <View style={{ flexDirection: 'row', height: headerHeight }}>
        {getSquareButton(this.crop, colors.blue, colors.blue, undefined, "crop", 45, this.state.cropping)}
        {this.state.cropping ? getSquareButton(this.cancelCrop, colors.blue, undefined, undefined, "cancel", 45, false) : <View />}
        {this.state.cropping ? getSquareButton(this.acceptCrop, colors.blue, undefined, undefined, "check", 45, false) : <View />}

        {this.state.cropping ? <View /> : getSquareButton(this.rotateLeft, colors.blue, undefined, undefined, "rotate-left", 45, false)}
        {this.state.cropping ? <View /> : getSquareButton(this.rotateRight, colors.blue, undefined, undefined, "rotate-right", 45, false)}
      </View>
    }

    if (this.state.phase == PickName) {
      SelectFolder =
        <View style={styles.pickerView}>
          <Text style={styles.titleText}>תיקיה</Text>
          {this.getFolderPicker()}
        </View>
    }

    if (this.state.phase == PickName) {
      PageNameInput = <View style={styles.textInputView}>
        <Text style={styles.titleText}>שם הדף</Text>
        <TextInput style={styles.textInput}
          onChangeText={(text) => this.setState({ pageName: text })}
        />
        <Text style={styles.titleText}>תיקיה</Text>
        {this.getFolderPicker()}

      </View>
    }

    if (this.state.phase == PickFolder) {
      NewFolderInput = <View style={styles.textInputView}>
        <Text style={styles.titleText}>שם התיקיה החדשה</Text>
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
        {this.state.pdf ?
          <View style={{
            flex: 1
          }}>
            <ViewShot ref="viewShot" options={{ format: "jpg", quality: 0.9 }}
              style={{
                flex: 1
              }}>
              <Pdf
                source={{ uri: this.state.uri }}
                page={this.state.pdfPage}
                style={{ flex: 1, width: '100%' }}
                onLoadComplete={(numberOfPages, filePath) => {
                  this.setState({ pdfPageCount: numberOfPages });
                }}

                onError={(error) => {
                  //Alert.alert(error);
                }}
              >

              </Pdf>
            </ViewShot>
            {PageNameInput}
            {NewFolderInput}
            {buttons}
          </View> :
          <ImageBackground
            style={styles.bgImage}
            blurRadius={this.state.phase == OK_Cancel ? 0 : 20}
            source={this.state.phase == OK_Cancel ? { uri } : undefined}
          >
            {cropFrame}
            {PageNameInput}
            {NewFolderInput}
            {buttons}
          </ImageBackground>}
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
    top: "5%",
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
  titleText: {
    fontSize: 70,
    textAlign: "right",
    width: "100%",
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'transparent'
  },
  textInput: {
    fontSize: 70,
    textAlign: "right",
    fontWeight: 'bold',
    color: 'black',
    width: '100%',
    backgroundColor: 'white'
  },
  textInputPicker: {
    fontSize: 70,
    textAlign: "right",
    fontWeight: 'bold',
    color: 'black',
    backgroundColor: 'white'
  },
  pickerButton: {
    flex: 1,
    height: 80,
    fontSize: 70,
    fontWeight: 'bold',
    color: 'black',
    width: "100%",
    backgroundColor: 'white'
  }
});