
import React from 'react';
import {
  ImageBackground, TouchableOpacity, StyleSheet, View, Text,
  Alert, Dimensions, PanResponder
} from 'react-native';
import ImageEditor from "@react-native-community/image-editor";
import Pdf from 'react-native-pdf';
import ViewShot from "react-native-view-shot";
import { StackActions } from '@react-navigation/native';
import { Icon } from 'react-native-elements'
import { translate } from './lang.js'

import {
  getIconButton,
  getImageDimensions,
  getPageNavigationButtons, FileNameDialog, semanticColors, getFolderAndIcon,
  Spacer, getRoundedButton, dimensions, validPathPart
} from './elements'
import ImageResizer from 'react-native-image-resizer';

import { getNewPage, SRC_RENAME, SRC_DUPLICATE, SRC_FILE } from './newPage'

import ProgressCircle from 'react-native-progress-circle'
import { fTranslate } from './lang';
import Scroller from './scroller';

import { FileSystem } from './filesystem';
import IssieCreateFolder from './create-folder.js';
import { assert, trace } from './log.js';

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

    let multiPage = false;
    let imageUri, pathToSave, pages = [];
    let pdf = false;
    if (this.isRename() || this.isDuplicate()) {
      imageUri = decodeURI(this.props.route.params.sheet.defaultSrc);
      pathToSave = decodeURI(this.props.route.params.sheet.path);
    } else {
      imageUri = decodeURI(this.props.route.params.uri);
      if (this.isFile() && imageUri.endsWith('.pdf')) {
        pdf = true;
      } else {
        pages.push(imageUri)
      }
      pathToSave = decodeURI(this.props.route.params.uri);
    }
    trace("Open SavePhoto with imageUri: ", imageUri)

    let folder = this.props.route.params.folder;
    if (!folder) {
      folder = FileSystem.DEFAULT_FOLDER;
    }
    let pageName = this.props.route.params.name;
    let addToExistingPage = this.props.route.params.addToExistingPage;
    let onConfirm = this.props.route.params.onConfirm;

    let folders = await FileSystem.main.getFolders();
    folders = folders.filter(f => f.name !== FileSystem.DEFAULT_FOLDER.name);

    this.setState({
      imageUri, pathToSave, pdf, pdfPage: 1,
      folders, folder, pageName, addToExistingPage, multiPage, pages, onConfirm
    }, () => {
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
  isFile = () => this.props.route.params.imageSource === SRC_FILE;
  isDuplicate = () => this.props.route.params.imageSource === SRC_DUPLICATE;

  updateImageDimension = async () => {
    setTimeout(async () => {
      let imgSize =
        (this.isDuplicate() || this.isRename()) ?
          { w: 0, h: 0 } :
          await getImageDimensions(this.state.imageUri);

      let windowSize = Dimensions.get("window");
      windowSize = {
        width: windowSize.width,
        height: windowSize.height - dimensions.topView - this.state.topView - 10
      };

      let dx = windowSize.width - imgSize.w;
      let dy = windowSize.height - imgSize.h;

      let scale = 1;
      if (dx < 0 || dy < 0) {
        let scaleW = windowSize.width / imgSize.w;
        let scaleH = windowSize.height / imgSize.h;
        scale = Math.min(scaleW, scaleH);
      }
      this.setState({ imgSize, scale, windowSize })
    }, 50);
  }

  onLayout = async () => {
    const measure = this.topView.measure.bind(this.topView);

    setTimeout(measure, 50, (fx, fy, width, height, px, py) => {
      this.setState({ topView: py, windowWidth: width }, this.updateImageDimension);
    });
  }

  isScreenNarrow = () => {
    this.state.windowWidth < 500;
  }

  OK = async () => {
    if (this.state.phase == OK_Cancel) {

      if (this.state.onConfirm) {
        this.state.onConfirm(this.state.imageUri);
        this.props.navigation.goBack();
        return
      }
      if (this.state.pdf) {
        if (this.state.pdfPageCount > 0) {
          let pages = [];
          for (let i = 0; i < this.state.pdfPageCount; i++) {
            this.setState({ pdfInProcess: i })
            let savedPdfPageUri = await this.exportPdfPage(i);

            pages.push(savedPdfPageUri);
            this.setState({ pdfInProcess: i + 1 })
          }

          this.setState({
            pdfInProcess: undefined,
            imageUri: pages[0], pages,
            pdf: false,
            multiPage: true
          });

        }
      }

      if (this.state.addToExistingPage) {
        //In a mode of adding another page to existing set-of-pages
        //Current assumptions: only one page added (no pdf, no add multi page)
        let page = this.state.addToExistingPage;
        await FileSystem.main.addPageToSheet(page, this.state.pathToSave);

        this.props.route.params.returnFolderCallback(this.state.folder.name);
        this.props.navigation.dispatch(StackActions.popToTop());
        return;
      }
      this.setState({ phase: PickName });
    } else if (this.state.phase == PickName) {
      if (!this.state.pageName || this.state.pageName.length == 0) {

        Alert.alert(translate("MissingPageName"));
        return;
      }

      this.save();
    }
  }

  save = async () => {
    if (this.saveInProgress)
      return;

    try {
      this.saveInProgress = true;
      let folder = this.state.folder;

      let folderName = folder.name;
      let fileName = this.state.pageName;

      if (!folderName || folderName === translate("DefaultFolder")) {
        folderName = FileSystem.DEFAULT_FOLDER.name;
      }
      try {
        await FileSystem.main.addFolder(folderName, folder.icon, folder.color);

        let targetFolder = FileSystem.main.basePath + folderName;
        let filePath = targetFolder + "/" + fileName;

        //add .jpg only if not rename or dup
        if (this.isDuplicate() || this.isRename()) {
          if (this.state.pathToSave.endsWith(".jpg")) {
            filePath += ".jpg";
          }
        } else if (!this.state.multiPage) {
          filePath += ".jpg";
        }
        trace("save: src - ", this.state.pathToSave, "target:", filePath)

        if (this.state.multiPage) {
          //create a folder with the name fo the file (happens implicitly)
          for (let i = 0; i < this.state.pages.length; i++) {
            let page = this.state.pages[i];
            await FileSystem.main.saveFile(page, filePath + "/" + i + ".jpg");
          }
        } else {
          //move/copy entire folder, or save single file
          await FileSystem.main.saveFile(this.state.pathToSave, filePath, this.isDuplicate());
        }

        if ((this.isRename() || this.isDuplicate()) && this.state.pathToSave.endsWith('.jpg')) {
          //single existing file
          try {
            await FileSystem.main.saveFile(this.state.pathToSave + ".json", filePath + ".json", this.isDuplicate());
            // todo move thumbnail too
          } catch (e) {
            //ignore, as maybe json is missing
          }

        }

        if (this.isRename() || this.isDuplicate()) {
          await FileSystem.main.renameOrDuplicateThumbnail(this.state.pathToSave, filePath, this.isDuplicate());
        }



        let returnFolderCallback = this.props.route.params.returnFolderCallback;
        if (returnFolderCallback && folderName) {
          trace("return to folder" + folderName)
          returnFolderCallback(folderName);
        }

        if (this.props.route.params.goHomeAndThenToEdit) {
          this.props.route.params.goHomeAndThenToEdit(filePath);
        } else {
          this.props.navigation.dispatch(StackActions.popToTop());
        }

      } catch (e) {
        Alert.alert(e)
      }
    } finally {
      this.saveInProgress = false;
    }
  }
  //zero based page number
  exportPdfPage = async (page) => {
    return new Promise((resolve, reject) => {
      this.setState({ pdfPage: page + 1 });
      setTimeout(
        () => {
          let viewShot = this.refs.viewShot;
          viewShot.capture().then(
            uri => FileSystem.main.cloneToTemp(uri).then(newUri => resolve(newUri)),
            err => {
              reject(err)
            }
          );
        }, 1000);
    }
    );
  }

  Cancel = () => {
    if (!this.state.multiPage || this.isFile() || !this.state.pages || this.state.pages.length < 2) {
      this.props.navigation.goBack();
    } else {
      let pages = this.state.pages;
      pages.pop();
      this.setState({ imageUri: pages[pages.length - 1], state: OK_Cancel, pages })
    }
  }

  AddPage = () => {
    let imageSource = this.props.route.params.imageSource;
    getNewPage(imageSource,
      (uri) => {
        assert(this.state.pages, "Add page")
        this.setState({
          imageUri: uri, state: OK_Cancel,
          pages: [...this.state.pages, uri], multiPage: true,
        }, this.updateImageDimension);
      },
      //cancel
      () => { },
      this.props.navigation);
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
    ImageEditor.cropImage(this.state.imageUri, cropData).then(
      //success: 
      (newImageUri) => {
        //assumes that only last page is cropped
        trace("crop", newImageUri)
        this.replaceLast(newImageUri);
      },
      //failure: 
      (error) => Alert.alert("Failed to crop:" + error)
    )
  }

  replaceLast = (uri) => {
    const pages = this.state.pages;
    let pathToSave = this.state.pathToSave;
    if (!this.state.multiPage) {
      pathToSave = uri;
    }
    pages.pop();
    pages.push(uri);
    //console.log("replaceLast", this.state.pathToSave, pathToSave, JSON.stringify(pages))

    this.setState({ pathToSave, imageUri: uri, pages, cropping: false }, this.updateImageDimension);

  }

  rotate = (deg) => {
    //width and height are echanged as we rotate by 90 deg
    ImageResizer.createResizedImage(this.state.imageUri, this.state.imgSize.h, this.state.imgSize.w, "JPEG", 100, deg, null).then(
      (response) => {
        this.replaceLast(response.path);
        // response.uri is the URI of the new image that can now be displayed, uploaded...
        // response.path is the path of the new image
        // response.name is the name of the new image with the extension
        // response.size is the size of the new image
      })
      .catch(err => {
        Alert.alert("Rotate failed: " + err)
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
      this.setState({ folder: newFolderObj, folders: [newFolderObj, ...this.state.folders] });
      return true;
    }
    return false
  }

  render() {
    this.state.imageUri;

    let editPicButtons = <View />;
    let actionButtons = <View />;
    let PageNameInput = <View />;
    let saveMoreThanOne = this.state.multiPage ? '-' + (this.state.pages.length) : ''
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
            getRoundedButton(this.Cancel, 'cancel-red', translate("BtnCancel"), 30, 30, { width: 150, height: 40 }, undefined, undefined, this.isScreenNarrow())
          }
          <Spacer width={10} />
          {  //Save
            getRoundedButton(this.OK, 'check-green', translate("BtnSave") + saveMoreThanOne, 30, 30, { width: 150, height: 40 }, undefined, undefined, this.isScreenNarrow())
          }

          { //Add page
            this.state.phase == OK_Cancel && !this.state.pdf && !this.state.addToExistingPage ?
              <Spacer width={10} /> : null}
          {this.state.phase == OK_Cancel && !this.state.onConfirm && !this.state.pdf && !this.state.addToExistingPage ?
            getRoundedButton(this.AddPage, 'add', translate("BtnAddPage"), 30, 30, { width: 150, height: 40 }, undefined, undefined, this.isScreenNarrow()) :
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

          <FileNameDialog
            name={this.state.pageName}
            folder={this.state.folder}
            folders={this.state.folders}
            onChangeName={(text) => this.setState({ pageName: text })}
            onChangeFolder={(folder) => this.setState({ folder: folder })}
            onSaveNewFolder={(name, color, icon) => this.saveNewFolder(name, color, icon)}
            navigation={this.props.navigation}
            isLandscape={this.state.windowSize.width > this.state.windowSize.height}
            onLayout={(e) => onLayoutHost.onLayout ? onLayoutHost.onLayout(e) : {}}
          />


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
                source={{ uri: this.state.imageUri }}
                page={this.state.pdfPage}
                style={{ flex: 1 }}
                onLoadComplete={(numberOfPages, filePath, dim) => {
                  if (!this.state.pdfWidthOnce) {
                    this.setState({ pdfWidthOnce: true, pdfPageCount: numberOfPages, pdfWidth: dim.width, pdfHeight: dim.height });
                  }
                }}

                onError={(error) => {
                  Alert.alert(translate("PDFLoadFailed: ") + error);
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
                source={{ uri: this.state.imageUri }}
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