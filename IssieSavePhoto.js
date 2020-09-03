
import React from 'react';
import {
  ImageBackground, TouchableOpacity, StyleSheet, View, Text,
  Alert, Dimensions, PanResponder
} from 'react-native';
import ImageEditor from "@react-native-community/image-editor";
import { FOLDERS_DIR } from './elements';
import * as RNFS from 'react-native-fs';
import Pdf from 'react-native-pdf';
import ViewShot from "react-native-view-shot";
import { StackActions } from '@react-navigation/native';
import { Icon } from 'react-native-elements'
import { translate } from './lang.js'
import { writeFolderMetaData, readFolderMetaData, DEFAULT_FOLDER_METADATA } from './utils'

import {
  getIconButton,
  getImageDimensions,
  globalStyles, DEFAULT_FOLDER,
  getPageNavigationButtons, getFileNameDialog, semanticColors, getFolderAndIcon,
  Spacer, getRoundedButton, dimensions, validPathPart
} from './elements'
import ImageRotate from 'react-native-image-rotate';
import { getNewPage, saveFile, cloneToTemp, SRC_RENAME, SRC_DUPLICATE } from './newPage'
import { pushFolderOrder } from './sort'
import ProgressCircle from 'react-native-progress-circle'
import { fTranslate } from './lang';
import Scroller from './scroller';

const OK_Cancel = 1;
const PickName = 2;
const PickFolder = 3;

const headerHeight = 60;
const panBroderDistance = 80;



export default class IssieSavePhoto extends React.Component {

  constructor() {
    super();

    this._panResponderMove = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (evt, gestureState) => {
        let yOffsetBegin = this.state.yOffsetBegin;
        if (!yOffsetBegin) {
          yOffsetBegin = this.state.yOffset;
        }
        let newYOffset = yOffsetBegin + gestureState.dy;
        if (newYOffset > 0) {
          newYOffset = 0;
        }

        this.setState({
          yOffsetBegin, yOffset: newYOffset
        });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx == 0 && gestureState.dy == 0) {
          return
        }
        this.setState({
          yOffsetBegin: undefined
        });
      }
    });

    this.state = {
      phase: OK_Cancel,
      cropping: false,
      topView: 0,
      multiPageState: { pages: [] },
      pdfWidth: '100%',
      pdfHeight: '100%',
      pdfPageCount: 0,
      yOffset: 0,
      windowSize: { width: 0, height: 0 },
      imgSize: { w: 100, h: 100 },
      scale: 1
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
              msg
            })
            return;
          }
          let moved = false;
          let ocd = this.state.panStartCropData;
          let left = panStartX - ocd.x;
          let right = ocd.x + ocd.width - panStartX;
          let top = panStartY - ocd.y;
          let bottom = ocd.y + ocd.height - panStartY;

          if (left - this.state.cropXOffset < panBroderDistance) {
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
          this.setState({ cropData: cd });;
        }
      }
    });

  }

  componentDidMount = async () => {
    let uri = this.props.route.params.uri;
    uri = decodeURI(uri);
    //alert(uri);
    let folder = this.props.route.params.folder;
    if (!folder) {
      folder = DEFAULT_FOLDER;
    }
    let pageName = this.props.route.params.name;
    let pdf = false;
    if (uri.endsWith('.pdf')) {
      pdf = true;
    }
    await this.initFolderList()
    this.setState({ uri, pdf, pdfPage: 1, folder, pageName }, () => {
      if (!pdf) {
        this.updateImageDimension();
      }
    });
    if (this.isRename() || this.isDuplicate()) {
      setTimeout(() => this.setState({ phase: PickName }), 50);
    }
    this.onLayout();
  }

  isRename = () => this.props.route.params.imageSource === SRC_RENAME;
  isDuplicate = () => this.props.route.params.imageSource === SRC_DUPLICATE;

  updateImageDimension = async () => {
    setTimeout(async () => {
      let imgSize =
        (this.isDuplicate() || this.isRename()) ?
          { w: 0, h: 0 } :
          await getImageDimensions(this.state.uri);

      let windowSize = Dimensions.get("window");
      windowSize = {
        width: windowSize.width,
        height: windowSize.height - dimensions.topView - this.state.topView - 10
      };

      let dx = windowSize.width - imgSize.w;
      let dy = windowSize.height - imgSize.h;

      let scale = 1;
      if (dx < 0 || dy < 0) {
        scaleW = windowSize.width / imgSize.w;
        scaleH = windowSize.height / imgSize.h;
        scale = Math.min(scaleW, scaleH);
      }
      this.setState({ imgSize, scale, windowSize })
    }, 50);
  }

  onLayout = async () => {
    const measure = this.topView.measure.bind(this.topView);

    setTimeout(measure, 50, (fx, fy, width, height, px, py) => {
      this.setState({ topView: py }, this.updateImageDimension);
    });
  }

  OK = async () => {
    if (this.state.phase == OK_Cancel) {

      if (this.state.pdf) {
        let pages = [];
        if (this.state.pdfPageCount > 1) {
          for (let i = 1; i < this.state.pdfPageCount; i++) {
            this.setState({ pdfInProcess: i })
            let savedPdfPageUri = await this.exportPdfPage(i);

            let page = { uri: savedPdfPageUri, index: i - 1 }
            //push at the beginning
            pages.push(page);
          }
          if (pages.length > 0) {
            multiPageState = { pages: pages }
          }

        }
        this.setState({ pdfInProcess: this.state.pdfPageCount })

        let uri = await this.exportPdfPage(this.state.pdfPageCount);

        this.setState({
          pdfInProcess: undefined,
          uri: uri, multiPageState: pages.length > 0 ?
            { pages: pages } :
            this.state.multiPageState,
          pdf: false
        });

      }

      this.setState({ phase: PickName });
    } else if (this.state.phase == PickName) {
      if (!this.state.pageName || this.state.pageName.length == 0) {

        Alert.alert(translate("MissingPageName"));
        return;
      }
      // if (this.state.folder.name === NEW_FOLDER_NAME) {

      //   if (!this.state.newFolderName || this.state.newFolderName.length == 0) {
      //     Alert.alert(translate("MissingFolderName"));
      //     return;
      //   }
      //   else if (fAndI.name === "" && fAndI.icon !== "") {
      //     Alert.alert(title, translate("SaveFolderWithEmptyNameQuestion"),
      //       [
      //         {
      //           text: translate("BtnContinue"), onPress: () => {
      //             this.save();
      //           },
      //           style: 'default'
      //         },
      //         {
      //           text: translate("BtnCancel"), onPress: () => {
      //             //do nothing
      //           },
      //           style: 'cancel'
      //         }
      //       ]
      //     );
      //     return;
      //   }
      // }
      this.save();
    }
  }

  save = async () => {
    let folder = this.state.folder;
    if (!folder) {
      folder = DEFAULT_FOLDER
    }
    let folderName = folder.name;
    let fileName = this.state.pageName;

    if (!fileName || fileName.length == 0) {
      Alert.alert(translate("MissingPageName"));
      return;
    }

    if (!validPathPart(fileName)) {
      Alert.alert(translate("IllegalCharacterInPageName"));
      return;
    }
    if (!folderName || folderName === translate("DefaultFolder")) {
      folderName = DEFAULT_FOLDER.name;
    }

    let targetFolder = FOLDERS_DIR + folderName;
    let filePath = targetFolder + "/" + fileName;

    //add .jpg only if not rename or dup
    if (this.isDuplicate() || this.isRename()) {
      if (this.state.uri.endsWith(".jpg")) {
        filePath += ".jpg";
      }
    } else {
      filePath += ".jpg";
    }

    //Alert.alert(filePath);
    //first check if folder exists - if not create it and make it first in order
    try {
      let stat = await RNFS.stat(targetFolder);
    } catch (e) {
      await RNFS.mkdir(targetFolder);
      await writeFolderMetaData(targetFolder + "/" + ".metadata", folder.color, folder.icon);
      if (folderName !== DEFAULT_FOLDER.name) {
        await pushFolderOrder(folderName)
      }
    }


    if (this.state.multiPageState.pages.length > 0 && !this.isRename()) {
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



    saveFile(this.state.uri, filePath, this.isDuplicate()).then(
      async () => {
        //        Alert.alert("Save to file: " + filePath)
        if ((this.isRename() || this.isDuplicate()) && this.state.uri.endsWith('.jpg')) {
          try {
            await saveFile(this.state.uri + ".json", filePath + ".json", this.isDuplicate());
          } catch (e) {
            //ignore, as maybe json is missing
          }
        }

        
        let returnFolderCallback = this.props.route.params.returnFolderCallback;
        if (returnFolderCallback && this.state.folder) {
          returnFolderCallback(this.state.folder.name);
        }
        this.props.navigation.dispatch(StackActions.popToTop());
        // if (folderName !== DEFAULT_FOLDER_NAME) {
        //   this.props.navigation.push('Home', { folder: folderName });
        // } else {
        //   this.props.navigation.pop();
        // }
      },
      (err) => Alert.alert(err)
    ).catch(err => {
      Alert.alert(err)
    });
  }

  exportPdfPage = async (page) => {
    return new Promise((resolve, reject) => {
      this.setState({ pdfPage: page });
      setTimeout(
        () => {
          let viewShot = this.refs.viewShot;
          viewShot.capture().then(
            uri => cloneToTemp(uri).then(newUri => resolve(newUri)),
            err => {
              reject(err)
            }
          );
        }, 1000);
    }
    );
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
    let imageSource = this.props.route.params.imageSource;
    getNewPage(imageSource,
      (uri) => {
        //Alert.alert("add page: " + uri)
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
    let winSize = this.state.windowSize;
    let imgSize = this.state.imgSize;
    let cropXOffset = (winSize.width - imgSize.w * this.state.scale) / 2;
    this.setState({
      cropping: true,
      cropXOffset,
      cropData: {
        x: 0,
        y: 0,
        width: imgSize.w * this.state.scale,
        height: imgSize.h * this.state.scale
      }
    });
  }
  cancelCrop = () => this.setState({ cropping: false });
  acceptCrop = () => {
    let cd = this.state.cropData;
    let windowSize = this.state.windowSize;
    let targetSizeScale = 1;
    if (cd.width < windowSize.width || cd.height < windowSize.height) {
      targetSizeScale = Math.min(
        windowSize.width / cd.width,
        windowSize.height / cd.height
      );
    }

    let cropData = {
      offset: { x: cd.x / this.state.scale, y: cd.y / this.state.scale },
      size: { width: cd.width / this.state.scale, height: cd.height / this.state.scale },
      displaySize: {
        width: cd.width * targetSizeScale,
        height: cd.height * targetSizeScale
      },
      resizeMode: 'stretch'
    };
    ImageEditor.cropImage(this.state.uri, cropData).then(
      //success: 
      (newUri) => {
        this.setState({ uri: newUri, cropping: false });
        this.updateImageDimension()
      },
      //failure: 
      (error) => { Alert.alert("Failed to crop:" + error) }
    )
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

    RNFS.readDir(FOLDERS_DIR).then(async (folders) => {
      this.setState({
        folders:  await Promise.all(folders.filter(f => f.isDirectory() && f.name !== DEFAULT_FOLDER.name).map(async (f) => {
          let metadata = DEFAULT_FOLDER_METADATA;
          try {
            metadata = await readFolderMetaData(f.path + "/" + ".metadata")
          } catch (e) {
            //ignore if missing
          }
          return { name: f.name, ...metadata }
        }))
      });
    });
  }

  movePage = (inc) => {
    this.setState({ pdfPage: this.state.pdfPage + inc });
  }

  saveNewFolder = async (newFolder, color, icon) => {
    let saveNewFolder = this.props.route.params.saveNewFolder;
    if (!saveNewFolder) {
      return false;
    }
    if (await saveNewFolder(newFolder, color, icon)) {
      let newFolderObj = { name: newFolder, color, icon }
      this.setState({ folders: [newFolderObj, ...this.state.folders], folder: newFolderObj });
      return true;
    }
    return false
  }

  render() {
    let uri = this.state.uri;
    //if (uri && uri.length > 0) Alert.alert(uri)
    let editPicButtons = <View />;
    let actionButtons = <View />;
    let PageNameInput = <View />;
    let saveMoreThanOne = this.state.multiPageState.pages.length > 0 ? '-' + (this.state.multiPageState.pages.length + 1) : ''
    if (!this.state.cropping &&
      (this.state.phase == OK_Cancel ||
        this.state.phase == PickName ||
        this.state.phase == PickFolder)) {
      actionButtons =
        <View style={{
          position: 'absolute',
          height: '100%',
          right: 10,
          flexDirection: 'row',
          alignItems: 'center'
        }}>



          {  //Cancel
            getRoundedButton(this.Cancel, 'cancel-red', translate("BtnCancel"), 30, 30, { width: 150, height: 40 })
          }
          <Spacer width={10} />
          {  //Save
            getRoundedButton(this.OK, 'check-green', translate("BtnSave") + saveMoreThanOne, 30, 30, { width: 150, height: 40 })
          }

          { //Add page
            this.state.phase == OK_Cancel && !this.state.pdf ?
              <Spacer width={10} /> : null}
          {this.state.phase == OK_Cancel && !this.state.pdf ?
            getRoundedButton(this.AddPage, 'add', translate("BtnAddPage"), 30, 30, { width: 150, height: 40 }) :
            null
          }

        </View>;
    }

    let editPhoto = this.state.phase == OK_Cancel && !this.state.pdf;

    editPicButtons =
      <View style={{
        position: 'absolute',
        height: '100%',
        left: 10,
        flexDirection: 'row',
        alignItems: 'center'
      }}>
        {editPhoto ? <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {
            getIconButton(this.crop, semanticColors.addButton, "crop", 45)
          }
          <Spacer width={10} />
          {this.state.cropping ? getIconButton(this.cancelCrop, semanticColors.addButton, 'close', 45) : <View />}
          {this.state.cropping ? <Spacer width={10} /> : null}
          {this.state.cropping ? getIconButton(this.acceptCrop, semanticColors.addButton, "check", 45) : <View />}
          {this.state.cropping ? <View /> : getIconButton(this.rotateLeft, semanticColors.addButton, "rotate-left", 45)}
          <Spacer width={10} />
          {this.state.cropping ? <View /> : getIconButton(this.rotateRight, semanticColors.addButton, "rotate-right", 45)}
        </View> : null}
      </View>
    // let transformY = { translateY: this.state.yOffset }

    // if (this.state.yOffset != 0) {
    //   // if (!isNumber(this.state.yOffset)) {
    //   //   Alert.alert("not number")
    //   // }
    //   //Alert.alert("trans:"+JSON.stringify(transformY))
    // }
    const onLayoutHost = {}
    if (this.state.phase == PickName) {
      PageNameInput =
        <Scroller height={this.state.windowSize.height}
          onLayout={onLayoutHost}>

          {getFileNameDialog(
            this.state.pageName,
            this.state.folder,
            this.state.folders,
            (text) => this.setState({ pageName: text }),
            (folder) => this.setState({ folder: folder }),
            (name, color, icon) => this.saveNewFolder(name, color, icon),
            this.props.navigation,
            this.state.windowSize.width > this.state.windowSize.height, //isLandscape,
            (e) => onLayoutHost.onLayout ? onLayoutHost.onLayout(e) : {}
          )}


        </Scroller>
    }

    let cropFrame = <View />;
    if (this.state.cropping) {
      cropFrame = <View
        style={{
          position: 'absolute',
          width: this.state.cropData.width,
          height: this.state.cropData.height,
          top: this.state.cropData.y,
          left: this.state.cropData.x + this.state.cropXOffset,

          borderColor: 'black',
          borderWidth: 5,
          borderStyle: 'dashed',
        }}
        {...this._panResponder.panHandlers}
      >
        {/* <Text>{JSON.stringify(this.state.cropData)}</Text> */}

        <View style={{ position: 'absolute', left: 5, top: 5 }}>
          <Icon name={'border-style'} size={45} />
        </View>
        <View style={{ position: 'absolute', transform: [{ rotate: 90 + 'deg' }], right: 5, top: 5 }}>
          <Icon name={'border-style'} size={45} />
        </View>
        <View style={{ position: 'absolute', transform: [{ rotate: 180 + 'deg' }], right: 5, bottom: 5 }}>
          <Icon name={'border-style'} size={45} />
        </View>
        <View style={{ position: 'absolute', transform: [{ rotate: 270 + 'deg' }], left: 5, bottom: 5 }}>
          <Icon name={'border-style'} size={45} />
        </View>
      </View>
    }

    return (
      <View style={styles.container}
        ref={v => this.topView = v}
        onLayout={this.onLayout}>

        {/* Toolbar */}
        <View style={{
          flex: 1, zIndex: 5, position: 'absolute', top: 0, width: '100%',
          height: dimensions.toolbarHeight, backgroundColor: semanticColors.subTitle
        }} >
          {editPicButtons}
          {actionButtons}
        </View>

        {this.state.pdf ?
          <View style={styles.bgImage}>
            {this.state.pdfInProcess ?
              <View style={{ position: 'absolute', top: '25%', left: 0, width: '100%', zIndex: 1000, alignItems: 'center' }}>
                <ProgressCircle
                  radius={150}
                  color="#3399FF"
                  shadowColor="#999"
                  bgColor="white"
                  percent={this.state.pdfInProcess * 100 / this.state.pdfPageCount}
                  borderWidth={5} >
                  <Text style={{ zIndex: 100, fontSize: 25 }}>{fTranslate("ImportProgress", this.state.pdfInProcess, this.state.pdfPageCount)}</Text>
                </ProgressCircle>
              </View> : null}
            <ViewShot ref="viewShot" options={{ format: "jpg", quality: 0.9 }}
              style={{
                flex: 1, position: 'absolute', width: this.state.pdfWidth, height: this.state.pdfHeight
              }}>
              <Pdf
                source={{ uri: this.state.uri }}
                page={this.state.pdfPage}
                style={{ flex: 1 }}
                onLoadComplete={(numberOfPages, filePath, dim) => {
                  if (!this.state.pdfWidthOnce) {
                    this.setState({ pdfWidthOnce: true, pdfPageCount: numberOfPages, pdfWidth: dim.width, pdfHeight: dim.height });
                  }
                }}

                onError={(error) => {
                  Alert.alert(translate("PDFLoadFailed"));
                }}
              >

              </Pdf>
            </ViewShot>
            {PageNameInput}
          </View> :
          <View style={[{
            justifyContent: 'flex-start',
            alignItems: 'center',
            top: dimensions.toolbarHeight
          },
          this.state.phase == OK_Cancel ?

            {
              width: '100%',
              height: (this.state.imgSize.h * this.state.scale)
            } :
            {
              width: this.state.windowSize.width,
              height: this.state.windowSize.height,
            }
          ]}>
            {this.state.phase == OK_Cancel ?
              <ImageBackground
                style={{
                  width: '100%',
                  height: '100%'
                }}

                imageStyle={{ resizeMode: 'contain' }}
                blurRadius={this.state.phase == OK_Cancel ? 0 : 20}
                source={{ uri }}
              /> : null}


            {cropFrame}
            {PageNameInput}
          </View>}
        {this.state.PickName || this.state.pdf && this.state.pdfPageCount < 2 || !this.state.pdf ?
          null :
          getPageNavigationButtons(0, '100%',
            this.state.pdfPage == 1, //isFirst
            this.state.pdfPage == this.state.pdfPageCount, //isLast
            (inc) => this.movePage(inc))}
      </View>
    );
  };

}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: semanticColors.mainAreaBG,
    opacity: 5
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    top: dimensions.toolbarHeight + dimensions.toolbarMargin,
    alignItems: 'center'
  }

});