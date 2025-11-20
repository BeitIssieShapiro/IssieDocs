
import React from 'react';
import {
  ImageBackground, TouchableOpacity, StyleSheet, View, Text,
  Alert, Dimensions, PanResponder,
  Image
} from 'react-native';
import ImageEditor from "@react-native-community/image-editor";
import PdfThumbnail from "react-native-pdf-thumbnail";
import { StackActions } from '@react-navigation/native';
import { OrientationPicker } from "./elements"
import { getRowDirections, translate } from './lang.js'

import {
  getIconButton,
  getImageDimensions,
  getPageNavigationButtons, FileNameDialog, semanticColors, getFolderAndIcon,
  Spacer, getRoundedButton, dimensions, validPathPart
} from './elements'
import ImageResizer from '@bam.tech/react-native-image-resizer';

import { getNewPage, SRC_RENAME, SRC_DUPLICATE, SRC_FILE } from './newPage'

import Scroller from './scroller';

import { FileSystem } from './filesystem';
import { assert, trace } from './log.js';
import { normalizeFoAndroid } from './canvas/utils';
import { MyIcon } from './common/icons';

const OK_Cancel = 1;
const PickName = 2;
const PickFolder = 3;

const headerHeight = 60;
const panBroderDistance = 80;



export default class IssieSavePhoto extends React.Component {

  constructor() {
    super();

    this.viewShotRef = null;

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
      pdfWidth: "100%",
      pdfHeight: "100%",
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
        const pdfPages = await PdfThumbnail.generateAllPages("file://" + imageUri)

        pages = pdfPages.map(p => {
          if (p.uri.startsWith("file://")) return decodeURI(p.uri.slice(7));
          return decodeURI(p.uri);
        });

        imageUri = pages[0];
        multiPage = pages.length > 1;
        pathToSave = pages[0];

      } else {
        pages.push(imageUri)
        pathToSave = decodeURI(this.props.route.params.uri);
      }
    }
    // trace("Open SavePhoto with imageUri: ", imageUri, "pdf?", pdf, this.props.route.params.sheet)
    // if (this.props.route.params.sheet?._pages?.length > 1) {
    //   multiPage = true;
    // }


    let folder = this.props.route.params.folder;
    let pageName = this.props.route.params.name;
    let addToExistingPage = this.props.route.params.addToExistingPage;
    let onConfirm = this.props.route.params.onConfirm;
    const skipConfirm = this.props.route.params.skipConfirm;
    let folders = await FileSystem.main.getRootFolders();
    folders = folders.filter(f => f.name !== FileSystem.DEFAULT_FOLDER.name);

    this.setState({
      imageUri, pathToSave, pdf, currentPage: 0,
      folders, folder, pageName, addToExistingPage, multiPage, pages, onConfirm, phase: skipConfirm ? PickName : OK_Cancel,
    }, () => {
      if (!pdf) {
        this.updateImageDimension();
      }
    });
    if (this.isRename() || this.isDuplicate()) {
      setTimeout(() => this.setState({ phase: PickName }), 50);
    }
    this.onLayout(pdf);
  }

  isRename = () => this.props.route.params.imageSource === SRC_RENAME;
  isFile = () => this.props.route.params.imageSource === SRC_FILE;
  isDuplicate = () => this.props.route.params.imageSource === SRC_DUPLICATE;
  isBlankPage = () => this.props.route.params.isBlank === true;


  updateImageDimension = async () => {
    trace("updateImageDimension", this.state.imageUri)
    //setTimeout(async () => {
    try {
      let imgSize =
        (this.isDuplicate() || this.isRename()) ?
          { w: 0, h: 0 } :
          await getImageDimensions(this.state.imageUri);

      const fullWindowSize = Dimensions.get("window");
      const windowSize = {
        width: fullWindowSize.width,
        height: fullWindowSize.height - dimensions.topView - this.state.topView - 10
      };

      const orientationLandscape = windowSize.width > windowSize.height;

      let dx = windowSize.width - imgSize.w;
      let dy = windowSize.height - imgSize.h;

      let scale = 1;
      if (dx < 0 || dy < 0) {
        let scaleW = windowSize.width / imgSize.w;
        let scaleH = windowSize.height / imgSize.h;
        scale = Math.min(scaleW, scaleH);
      }
      trace("updateImageDimension", { imgSize, scale, windowSize })
      this.setState({ imgSize, scale, windowSize, fullWindowSize, orientationLandscape })
    } catch (err) {
      Alert.alert("Error measuring file" + err.toString())
      trace("Error measuring file", JSON.stringify(err))
    }
    //}, 50);
  }

  onLayout = async (pdf) => {
    const measure = this.topView.measure.bind(this.topView);

    setTimeout(measure, 50, (fx, fy, width, height, px, py) => {
      this.setState({ topView: py, windowWidth: width }, () => {
        if (!pdf) this.updateImageDimension();
      });
    });
  }

  isScreenNarrow = () => {
    return this.state.windowWidth < 500;
  }

  OK = async () => {
    if (this.state.phase == OK_Cancel) {

      if (this.state.onConfirm) {
        this.state.onConfirm(this.state.imageUri);
        this.props.navigation.goBack();
        return
      }
      if (this.state.pdf) {
        trace("PDF: OK", this.state.pdfPageCount)
        if (this.state.pdfPageCount > 0) {
          let pages = [];
          for (let i = 0; i < this.state.pdfPageCount; i++) {
            this.setState({ pdfInProcess: i })
            let savedPdfPageUri = await this.exportPdfPage(i);
            trace("PDF: export", i, savedPdfPageUri)
            pages.push(savedPdfPageUri);
            this.setState({ pdfInProcess: i + 1 })
          }

          this.setState({
            pdfInProcess: undefined,
            imageUri: pages[0], pages,
            pathToSave: pages[0],
            pdf: false,
            multiPage: pages.length > 1
          });

        }
      }

      if (this.state.addToExistingPage) {
        trace("add to existing")
        //In a mode of adding another page to existing set-of-pages
        //Current assumptions: only one page added (no pdf, no add multi page)
        let page = this.state.addToExistingPage;
        const newPathToAdd = await this.AdjustToOrientation(this.state.pathToSave);
        FileSystem.main.addPageToSheet(page, newPathToAdd).then(() => {
          trace("page added successfully")
          if (this.props.route.params.goHomeAndThenToEdit) {
            trace("go to edit")
            this.props.route.params.goHomeAndThenToEdit(page.path, this.props.route.params.pageIndex);
          } else {
            trace("go back to folder")
            this.props.route.params.returnFolderCallback(this.state.folder?.ID || FileSystem.DEFAULT_FOLDER.name);
            this.props.navigation.dispatch(StackActions.popToTop());
          }
          return;
        }).catch(e => {
          Alert.alert(e);
          return
        });
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

  AdjustToOrientation = async (uri) => {
    if (!this.isBlankPage()) {
      // do nothing
      return uri;
    }
    const w = this.state.fullWindowSize.width;
    const h = this.state.fullWindowSize.height;
    const width = this.state.orientationLandscape ? Math.max(w, h) : Math.min(w, h);
    const height = this.state.orientationLandscape ? Math.min(w, h) : Math.max(w, h);

    let cropData = {
      offset: { x: 0, y: 0 },
      size: { width, height },
    };

    if (!uri.startsWith("file")) {
      uri = "file://" + uri;
    }

    return ImageEditor.cropImage(uri, cropData).then(cropRes => {
      trace("crop", cropRes);
      return cropRes.path
    });
    //return cropImage(uri, 0, 0, width, height);
  }



  save = async () => {
    if (this.saveInProgress)
      return;

    const newPathToSave = await this.AdjustToOrientation(this.state.pathToSave);

    try {
      this.saveInProgress = true;
      let folder = this.state.folder;
      if (!folder) {
        folder = FileSystem.main.findFolderByID(FileSystem.DEFAULT_FOLDER.ID);
      }
      if (!folder) {
        // add Default folder
        await FileSystem.main.addFolder(FileSystem.DEFAULT_FOLDER.name, FileSystem.DEFAULT_FOLDER.icon, FileSystem.DEFAULT_FOLDER.color, false, false, false);
        folder = FileSystem.main.findFolderByID(FileSystem.DEFAULT_FOLDER.ID);
      }

      let folderID = folder.ID;
      trace("save to folder", folder.ID, folder.path)
      let fileName = this.state.pageName;

      try {
        await FileSystem.main.addFolder(folder.name, folder.icon, folder.color, false, false, false, folder?.parent?.ID);
        let targetFolder = FileSystem.main.basePath + folder.path;
        let filePath = targetFolder + "/" + fileName;

        //add .jpg only if not rename or dup
        if (this.isDuplicate() || this.isRename()) {
          if (newPathToSave.endsWith(".jpg")) {
            filePath += ".jpg";
          }
        } else if (!this.state.multiPage) {
          filePath += ".jpg";
        }
        trace("save: src - ", newPathToSave, "target:", filePath)

        let thumbnailSrc = undefined
        if (this.state.multiPage) {
          //create a folder with the name of the file (happens implicitly)
          for (let i = 0; i < this.state.pages.length; i++) {
            let page = this.state.pages[i];
            await FileSystem.main.saveFile(page, filePath + "/" + i + ".jpg");
          }
          thumbnailSrc = filePath + "/0" + ".jpg";
        } else {
          //move/copy entire folder, or save single file
          await FileSystem.main.saveFile(newPathToSave, filePath, this.isDuplicate());
          thumbnailSrc = filePath
        }

        if (!this.isRename() && !this.isDuplicate()) {
          await FileSystem.main.saveThumbnail(thumbnailSrc);
        }


        if ((this.isRename() || this.isDuplicate()) && newPathToSave.endsWith('.jpg')) {
          //single existing file
          try {
            await FileSystem.main.saveFile(newPathToSave + ".json", filePath + ".json", this.isDuplicate());
          } catch (e) {
            //ignore, as maybe json is missing
          }

          // rename/move attachments
          await FileSystem.main._iterateAttachments(newPathToSave, async (srcAttachmentPath, attachmentName) => {
            await FileSystem.main.saveFile(srcAttachmentPath, filePath + FileSystem.ATACHMENT_PREFIX + attachmentName, this.isDuplicate());
          })
        }

        if (this.isRename() || this.isDuplicate()) {
          await FileSystem.main.renameOrDuplicateThumbnail(newPathToSave, filePath, this.isDuplicate());
        }

        let returnFolderCallback = this.props.route.params.returnFolderCallback;
        if (returnFolderCallback && folderID) {
          trace("return to folder" + folderID)
          returnFolderCallback(folderID);
        }

        if (this.props.route.params.goHomeAndThenToEdit) {
          this.props.route.params.goHomeAndThenToEdit(filePath, this.props.route.params.pageIndex);
        } else {
          this.props.navigation.dispatch(StackActions.popToTop());
        }

      } catch (e) {
        trace("error save file", e)
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
          if (this.viewShotRef) {
            this.viewShotRef.capture().then(
              uri => FileSystem.main.cloneToTemp(uri).then(newUri => resolve(newUri)),
              err => {
                reject(err)
              }
            );
          }
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
      (err) => Alert.alert("Error", err.description),
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

    let uri = this.state.imageUri;
    if (!uri.startsWith("file")) {
      uri = "file://" + uri;
    }

    ImageEditor.cropImage(uri, cropData).then(
      //success: 
      (cropRes) => {
        //assumes that only last page is cropped
        trace("crop", cropRes.path)
        this.replaceLast(cropRes.path);
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
    this.setState({ currentPage: this.state.currentPage + inc });
  }

  saveNewFolder = async (newFolder, color, icon, parentID) => {
    let saveNewFolder = this.props.route.params.saveNewFolder;
    if (!saveNewFolder) {
      return false;
    }
    if (await saveNewFolder(newFolder, color, icon, parentID)) {
      const newFolderID = (parentID ? parentID + "/" : "") + newFolder
      const folder = FileSystem.main.findFolderByID(newFolderID);
      const folders = await FileSystem.main.getRootFolders();
      trace("new folder created".folder?.ID)
      this.setState({ folder, folders });
      return true;
    }
    return false
  }

  verifyFilePrefix = (url) => {

    if (url && url.startsWith("/")) {
      return "file://" + url;
    }

    return url;
  };


  render() {
    const { row, flexStart, rtl } = getRowDirections();
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
          flexDirection: row,
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
          {this.state.phase == OK_Cancel && !this.state.onConfirm && !this.state.pdf && !this.state.addToExistingPage && !this.isFile() ?
            getRoundedButton(this.AddPage, 'add', translate("BtnAddPage"), 30, 30, { width: 150, height: 40 }, undefined, undefined, this.isScreenNarrow(), undefined, undefined, "MI") :
            null
          }

        </View>;
    }

    let editPhoto = this.state.phase == OK_Cancel && !this.state.pdf && !this.isBlankPage();

    editPicButtons =
      <View style={{
        position: 'absolute',
        height: '100%',
        left: 10,
        flexDirection: row,
        alignItems: 'center'
      }}>
        {editPhoto ? <View style={{ flexDirection: row, alignItems: 'center' }}>
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
        <Scroller
          height={this.state.windowSize.height}
          rtl={rtl}
          layoutHost={onLayoutHost}>

          <FileNameDialog
            name={this.state.pageName}
            folder={this.state.folder}
            folders={this.state.folders}
            orientationLandscape={this.state.orientationLandscape}
            includeOrientation={this.isBlankPage()}
            onChangeOrientation={(isLandscape) => this.setState({ orientationLandscape: isLandscape })}
            onChangeName={(text) => this.setState({ pageName: text })}
            onChangeFolder={(folder) => this.setState({ folder: folder })}
            onSaveNewFolder={(name, color, icon, parentID) => this.saveNewFolder(name, color, icon, parentID)}
            navigation={this.props.navigation}
            isLandscape={this.state.windowSize.width > this.state.windowSize.height}
            isMobile={this.isScreenNarrow()}
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
          <MyIcon info={{ type: "MI", name: "border-style", size: 45 }} />

        </View>
        <View style={{ position: 'absolute', transform: [{ rotate: 90 + 'deg' }], right: 5, top: 5 }}>
          <MyIcon info={{ type: "MI", name: "border-style", size: 45 }} />
        </View>
        <View style={{ position: 'absolute', transform: [{ rotate: 180 + 'deg' }], right: 5, bottom: 5 }}>
          <MyIcon info={{ type: "MI", name: "border-style", size: 45 }} />
        </View>
        <View style={{ position: 'absolute', transform: [{ rotate: 270 + 'deg' }], left: 5, bottom: 5 }}>
          <MyIcon info={{ type: "MI", name: "border-style", size: 45 }} />
        </View>
      </View>
    }


    trace("SAVE: phase", this.state.phase)
    trace("PDF: size", this.state.pdfWidth, this.state.pdfHeight)
    trace("save img", this.state.imageUri)
    return (
      <View style={styles.container}
        ref={v => this.topView = v}
        onLayout={this.onLayout}>

        {/* Toolbar */}
        <View style={{
          flex: 1, zIndex: 5, position: 'absolute', top: 0, width: '100%',
          height: dimensions.toolbarHeight, backgroundColor: semanticColors.subTitle,
          flexDirection: row
        }} >
          {editPicButtons}
          {actionButtons}
        </View>


        <View style={[{
          justifyContent: flexStart,
          alignItems: 'center',
          top: dimensions.toolbarHeight,
        },
        this.state.phase == OK_Cancel ?

          {
            width: '100%',
            height: (this.state.imgSize.h * this.state.scale)
          } :
          {
            width: '100%',
            height: '100%',
          }
        ]}>
          {this.isBlankPage() && this.state.addToExistingPage && <OrientationPicker
            orientationLandscape={this.state.orientationLandscape}
            onChangeOrientation={(orientationLandscape) => this.setState({ orientationLandscape })}
          />}
          {this.state.phase == OK_Cancel &&
            <ImageBackground
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: "white",
              }}

              imageStyle={{ resizeMode: 'contain' }}
              blurRadius={this.state.phase == OK_Cancel ? 0 : 20}
              source={this.state?.pages && normalizeFoAndroid({ uri: this.state.pages[this.state.currentPage] })}
            />}

          {cropFrame}
          {PageNameInput}
        </View>

        {
          !this.state.PickName && this.state.pages?.length > 1 &&
          getPageNavigationButtons(0, '100%',
            this.state.currentPage == 0, //isFirst
            this.state.pages.length - 1 == this.state.currentPage, //isLast
            (inc) => this.movePage(inc))
        }
      </View >
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
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }

});