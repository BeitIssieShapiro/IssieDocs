
import React from 'react';
import {
  AppRegistry, ScrollView, StyleSheet, TextInput, View,
  TouchableOpacity, Text, Alert, PanResponder, Keyboard, PixelRatio
} from 'react-native';

import { Icon } from 'react-native-elements'
import RNSketchCanvas from './modified_canvas/index';
import LinearGradient from 'react-native-linear-gradient';
import Share from 'react-native-share';
import DoQueue from './do-queue';
import FadeInView from './FadeInView'

import {
  Spacer, getRoundedButton, getEraserIcon,
  renderMenuOption, IDMenuOptionsStyle, getSvgIconButton
} from './elements'
import { getNewPage, SRC_GALLERY, SRC_RENAME } from './newPage';
const USE_NATIVE_DRIVER = true;
//import {ProgressView} from '@react-native-community/progress-view';
import ProgressCircle from 'react-native-progress-circle'
import { fTranslate } from './lang.js'

import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu';

import {
  colors, APP_FONT, getImageDimensions,
  AppText,
  semanticColors, getIconButton, dimensions, availableBrushSize, availableColorPicker
} from './elements'
import { translate } from './lang';
import { getSvgIcon } from './svg-icons';
import { setNavParam } from './utils';
import { FileSystem } from './filesystem';
import { trace } from './log';
import { pinchEnd, processPinch, processResize } from './pinch';
import { MyColorPicker, TextSizePicker } from './pickers';

const shareTimeMs = 2000;

const TOP = 0, RIGHT = 1, BOTTOM = 2, LEFT = 3;
const DEFAULT_STROKE_WIDTH = 5;
const MAX_STROKE_WIDTH = 12;
const DRAG_ICON_SIZE = 45;
const initialImageSize = 200
const Modes = {
  IMAGE: 1,
  TEXT: 2,
  BRUSH: 3,
  ERASER: 4,
}

export default class IssieEditPhoto extends React.Component {

  constructor() {
    super();

    this.Load = this.Load.bind(this);

    this._panResponderElementMove = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => this._shouldDragText(evt, gestureState) && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onStartShouldSetPanResponderCapture: (evt, gestureState) => this._shouldDragText(evt, gestureState) && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onMoveShouldSetPanResponder: (evt, gestureState) => this._shouldDragText(evt, gestureState) && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => false && this._shouldDragText(evt, gestureState) && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onPanResponderMove: (evt, gestureState) => {

        const {viewPortX, viewPortY} = this.getViewPortCoordinations(gestureState);

        let yOffset = this.state.yOffset;

        if (viewPortY > this.state.keyboardTop) {
          yOffset -= viewPortY - this.state.keyboardTop;
        }

        if (this.isImageMode()) {
          this.moveCurrentImage(xText, yText);
        }

        trace("_panResponderElementMove", "viewPortX", viewPortX, "viewPortY", viewPortY)
        this.setState({
          viewPortX, viewPortY, yOffset
        });
      },

      onPanResponderRelease: (evt, gestureState) => {
        trace("drag element finished")
        if (this.isTextMode()) {
          this.SaveText(false, true);
        } else if (this.isImageMode()) {
          this.SaveImageAfterMove();
        }
      }
    });


    this._panResponderElementResize = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => this.state.currentImageElem,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => this.state.currentImageElem,
      onMoveShouldSetPanResponder: (evt, gestureState) => this.state.currentImageElem,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => false,
      onPanResponderMove: (evt, gestureState) => {

        if (this.isImageMode()) {
          const newSize = processResize(this, gestureState.dx, gestureState.dy);
          this.resizeCurrentImage(newSize);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        trace("resize image finished")
        const newSize = processResize(this, gestureState.dx, gestureState.dy);
        pinchEnd(this);
        if (this.isImageMode()) {
          this.SaveImageAfterResize(newSize);
        }
      }
    });


    getViewPortCoordinations = (gestureState) => {
      const scrX = gestureState.moveX;
      const scrY = gestureState.moveY;

      let viewPortX = this.Screen2ViewPortX(scrX);
      let viewPortY = this.Screen2ViewPortY(scrY);

      // X boundaries
      if (viewPortX < this.state.viewPort.x + 25) {
        viewPortX = this.state.viewPort.x + 25;
      }

      if (viewPortX > this.state.viewPort.x + this.state.viewPort.width) {
        viewPortX = this.state.viewPort.x + this.state.viewPort.width;
      }

      // Y Boundaries
      if (viewPortY < this.state.viewPort.y) {
        viewPortY = this.state.viewPort.y
      }

      if (viewPortY > this.state.viewPort.y + this.state.viewPort.height) {
        trace("reached bottom - stop")
        viewPortY = this.state.viewPort.y + this.state.viewPort.height;
      }
      return {viewPortX, viewPortY};
    }

    this._panResponderMove = PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt, gestureState) => this._shouldMove(evt, gestureState),
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => this._shouldMove(evt, gestureState),

      onStartShouldSetPanResponder: (evt, gestureState) => this._shouldMove(evt, gestureState),
      onMoveShouldSetPanResponder: (evt, gestureState) => this._shouldMove(evt, gestureState),

      onPanResponderGrant: (evt, gestureState) => trace("pan granted (", evt.nativeEvent.touches.length, ")"),
      onShouldBlockNativeResponder: () => true,
      onPanResponderTerminationRequest: (evt, gestureState) => !this._shouldMove(evt, gestureState),
      onPanResponderMove: (evt, gestureState) => {
        trace("pan move (", evt.nativeEvent.touches.length, ")")

        let touches = evt.nativeEvent.touches;
        if (touches.length == 2) {
          this._pinch = true;
          processPinch(this,
            touches[0].pageX - this.state.sideMargin, touches[0].pageY - this.topLayer(),
            touches[1].pageX - this.state.sideMargin, touches[1].pageY - this.topLayer());
          return
        }


        // let yOffsetBegin = this.state.yOffsetBegin;
        // if (!yOffsetBegin) {
        //   yOffsetBegin = this.state.yOffset;
        // }
        // let newYOffset = yOffsetBegin + gestureState.dy;
        // if (newYOffset > 0) {
        //   newYOffset = 0;
        // }
        // if (newYOffset < -(this.state.keyboardHeight - 5)) {
        //   newYOffset = -(this.state.keyboardHeight - 5);
        // }
        // this.setState({
        //   yOffsetBegin, yOffset: newYOffset
        // });
      },
      onPanResponderRelease: (evt, gestureState) => {
        trace("onPanResponderRelease")
        if (this._pinch) {
          this._pinch = false;
          trace("pinch finished: ")
          pinchEnd(this)
          return
        }

        if (Math.abs(gestureState.dx) < 3 && Math.abs(gestureState.dy) < 3) {
          //no move - click
          trace("Canvas clicked")
          this.canvasClick(evt)
        }
        this.setState({
          yOffsetBegin: undefined
        });
      }
    });

    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);

    this.state = {
      color: colors.black,
      fontSize: 25,
      mode: Modes.TEXT,
      eraseMode: false,
      showTextInput: false,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      queue: new DoQueue(),
      sideMargin: 0,
      windowW: 1000,
      canvasW: 1000,
      canvasH: 1000,
      inputTextHeight: 40,
      inputTextWidth: 0,
      canvasTexts: [],
      topView: 120,
      zoom: 1.0,
      minZoom: 1,
      maxZoom: 3,
      isZooming: false,
      scaleRatio: 1.0,
      xOffset: 0,
      yOffset: 0,
      xText: 0,
      yText: 0,

      viewPortX: 0,
      viewPortY: 0,

      keyboardHeight: 0,
      needCanvasUpdate: false,
      needCanavaDataSave: false,
      needCanvasUpdateTextOnly: false,
      sharing: false
    }

  }

  isTextMode = () => this.state.mode === Modes.TEXT;
  isBrushMode = () => this.state.mode === Modes.BRUSH;
  isImageMode = () => this.state.mode === Modes.IMAGE;
  isEraserMode = () => this.state.mode === Modes.ERASER;

  _shouldDragText = (evt, gestureState) => {
    trace("should drag?");
    return this.isTextMode() && this.state.showTextInput || this.isImageMode() && this.state.currentImageElem;
  }

  _shouldMove = (evt, gestureState) => {
    trace("should pinch?");
    if (evt.nativeEvent.touches.length >= 2) {
      trace("would pinch");
      return true;
    }
    if (this.isTextMode() || this.isImageMode()) {
      trace("would move");
      return true
    }

    trace("would NOT pinch/move!");
    return false;
  }

  _keyboardDidShow = (e) => {
    // let kbTop = this.state.windowH - e.endCoordinates.height;

    // //ignore the part of keyboard that is below the canvas
    // let kbHeight = e.endCoordinates.height - (this.state.windowH - this.topLayer() - this.state.canvasH);

    // Y of the screen of top of keyboard
    const keyboardTop = e.endCoordinates.screenY;
    const keyboardHeight = e.endCoordinates.height;
    trace("_keyboardDidShow", "top", keyboardTop, "kbHeight", keyboardHeight)

    this.setState({
      keyboardHeight, keyboardTop,
    }, this._handleInputTextLocationMovingPage);

  }

  _handleInputTextLocationMovingPage = () => {
    const kbHeight = this.state.keyboardHeight;
    const kbTop = this.state.keyboardTop;

    if (!kbHeight || !kbTop)
      return;

    if (this.state.showTextInput) {
      let diff = this.state.viewPortY + this.Screen2ViewPortY(kbTop);
      if (diff > 0) {
        trace(" textInput under keyboard, moving up", "viewPortY", this.state.viewPortY, diff)
        this.setState({
          yOffset: this.state.yOffset - diff,
        });
      }
    }
  }

  _keyboardDidHide = (e) => {
    trace("keyboard did hide")
    this.SaveText()
    this.setState({ keyboardHeight: 0, showTextInput: false, yOffset: this.state.zoom === 1 ? 0 : this.state.yOffset });
  }

  componentDidMount = async () => {
    this._mounted = true;
    const page = this.props.route.params.page;
    const currentFile = page.defaultSrc;
    console.log("EditPhoto CurrentFile: " + currentFile);
    if (page.count > 0) {
      setNavParam(this.props.navigation, 'pageTitleAddition', this.pageTitleAddition(page.count, 0));
    }
    setNavParam(this.props.navigation, 'onMoreMenu', () => this.menu.open())

    const metaDataUri = currentFile + ".json";
    const betaFeatures = this.props.route.params.betaFeatures;
    this.setState({ page: page, currentFile: currentFile, currentIndex: 0, metaDataUri: metaDataUri, betaFeatures },
      this.Load);
  }

  componentWillUnmount = () => {
    this._mounted = false;
    if (this.state.showTextInput) {
      this.SaveText(true, false);
    }
  }

  pageTitleAddition = (count, index) => count > 1 ? " - " + (index + 1) + "/" + count : ""


  Load = async () => {
    if (this.state.metaDataUri && this.state.metaDataUri.length > 0)
      this.loadFile(this.state.metaDataUri);

    if (this.props.route.params && this.props.route.params['share']) {
      //iterates over all files and exports them
      this.setState({ sharing: true, shareProgress: 0, shareProgressPage: 1 });
      let dataUrls = [];

      let interval = this.state.page.count * shareTimeMs / 11;

      let intervalObj = setInterval(() => this.setState({ shareProgress: this.state.shareProgress + 10 }), interval);

      let data = await this.exportToBase64();
      dataUrls.push(data);
      for (let i = 1; i < this.state.page.count; i++) {
        this.setState({ shareProgressPage: i + 1 });

        const currentFile = this.state.page.getPage(i);
        const currentIndex = i;
        const metaDataUri = currentFile + ".json";
        this.setState({ currentFile, currentIndex, metaDataUri })
        this.loadFile(metaDataUri);
        dataUrls.push(await this.exportToBase64());
      }

      clearInterval(intervalObj);
      this.setState({ sharing: false });
      //avoid reshare again
      setNavParam(this.props.navigation, 'share', false);

      const shareOptions = {
        title: translate("ShareWithTitle"),
        subject: translate("ShareEmailSubject"),
        urls: dataUrls
      };
      //Alert.alert(JSON.stringify(dataUrls))
      Share.open(shareOptions).then(() => {
        Alert.alert(translate("ShareSuccessful"));
      }).catch(err => {
        //Alert.alert(translate("ActionCancelled"));
      });

    }
  }

  exportToBase64 = async () => {
    return new Promise((resolve, reject) => {
      this.setState({ needExport: { resolve, reject } })
    });
  }

  doExport = (canvas, resolve, reject) => {
    if (canvas == null) return;
    canvas.getBase64(
      'jpg',
      false, //transparent
      true, //includeImage
      true, //includeText
      false, //cropToImageSize
      (err, data) => {
        if (err) {
          reject(err.toString());
          return;
        }
        resolve('data:image/jpg;base64,' + data);
      }
    )
  }


  loadFile = (metaDataUri) => {
    this.state.queue.clear();
    FileSystem.main.loadFile(metaDataUri).then((value) => {
      let sketchState = JSON.parse(value);
      //Alert.alert("Load: "+sketchState.length)
      for (let i = 0; i < sketchState.length; i++) {
        this.state.queue.add(sketchState[i])
      }

    },
      (err) => {/*no json file yet*/ }
    ).catch((e) => {/*no json file yet*/ })
      .finally(() => {
        //this.UpdateCanvas(true)
        this.setState({ needCanvasUpdate: true, needCanavaDataSave: false });
      });
  }

  Save = () => {
    let sketchState = this.state.queue.getAll();
    const content = JSON.stringify(sketchState);
    FileSystem.main.writeFile(
      this.state.metaDataUri,
      content).then(
        //success
        () => {
          // Save thumbnail
          if (this.canvas && this.state.page.count === 1 || this.state.currentIndex === 0) {
            let filePath = FileSystem.getTempFileName("jpg");
            //let fileName = FileSystem.getFileNameFromPath(filePath, true);
            let lastSlashPos = filePath.lastIndexOf('/');
            let folder = filePath.substring(0, lastSlashPos);
            console.log("save thumbnail to folder", folder)
            this.canvas.export("jpg", { width: 80, height: 120 }, (err, path) => {
              console.log("save thumbnail", path)
              FileSystem.main.saveThumbnail(path, this.props.route.params.page);
            });
            //.then(res=>{

            //});
          }
          // if (this.viewShot && this.state.page.count === 1 || this.state.currentIndex === 0) {
          //   this.viewShot.capture().then(url=>{
          //     FileSystem.main.saveThumbnail(url, this.props.route.params.page);
          //   })
          // }
        },
        //fail
        (e) => Alert.alert("File Save Failed" + e));

  }

  SketchEnd = (p) => {
    if (!this._pinch) {
      this.state.queue.pushPath(p);
      this.Save()
    } else {
      this.setState({
        needCanvasUpdate: true
      })
    }
  }

  //a = absolute, s=screen, c=canvas
  s2aW = (w) => (w - this.state.sideMargin) / this.state.zoom - this.state.xOffset;
  //s2aH = (h) => (h - this.state.topView) / this.state.zoom - this.state.yOffset - (this.state.showExtMenu ? dimensions.toolbarHeight : 0);
  s2aH = (h) => (h - this.topLayer() - this.state.topView - this.state.yOffset);
  a2cW = (w) => (w + this.state.xOffset) * this.state.zoom + this.state.sideMargin;
  //a2cH = (h) => (h + this.state.yOffset) * this.state.zoom + this.topLayer();
  a2cH = (h) => (h + this.state.topView + this.topLayer() + this.state.yOffset);
  Screen2ViewPortX = (x) => x - this.state.viewPort.x;
  Screen2ViewPortY = (y) => y - this.state.topView - this.topLayer();

  findColor = (fc) => {
    let color = availableColorPicker.find(c => c == fc)

    if (color) {
      return color;
    }
    return this.state.color;
  }

  canvasClick = (ev) => {
    trace("canvasClick click. x: ", ev.nativeEvent.pageX, ",y: ", ev.nativeEvent.pageY, "topLayer", this.topLayer())

    //check that the click is in the canvas area:
    if (ev.nativeEvent.pageX < this.state.sideMargin ||
      ev.nativeEvent.pageX > this.state.sideMargin + this.state.canvasW ||
      ev.nativeEvent.pageY < this.topLayer() ||
      ev.nativeEvent.pageY > this.state.canvasH + this.topLayer()) {
      trace("canvasClicked out of bound")
      return;
    }

    let x = this.s2aW(ev.nativeEvent.pageX);
    let y = this.s2aH(ev.nativeEvent.pageY);

    trace("canvas click", "y", y)

    if (this.isTextMode()) {
      trace("textMode clicked ", x, y)

      y -= this.state.fontSize / 2;
      let needCanvasUpdate = false;

      if (this.state.showTextInput) {
        //a text box is visible and a click was pressed - save the text box contents first:
        needCanvasUpdate = this.SaveText();
      }

      //Alert.alert("x:"+x+", xOffset:"+this.state.xOffset+",zoom:"+ this.state.zoom)

      let textElemIndex = this.findElementByLocation({ x: x, y: y });

      //in erase mode, only act on found texts
      if (textElemIndex < 0 && this.state.eraseMode) return;

      let initialText = '';
      let fontSize = this.state.fontSize;
      let fontColor = this.state.color;
      let inputTextWidth = 0;
      let inputTextHeight = 0;
      let textElem = undefined;
      if (textElemIndex >= 0) {
        textElem = this.state.canvasTexts[textElemIndex];

        //convert to rtl text:
        if (!textElem.rtl) {
          textElem.rtl = true;
          textElem.normPosition = { x: textElem.normPosition.x + textElem.width, y: textElem.normPosition.y };
        }

        initialText = textElem.text;
        fontSize = textElem.fontSize;
        fontColor = this.findColor(textElem.fontColor);
        inputTextWidth = textElem.width;
        inputTextHeight = textElem.height;
        x = Math.round(textElem.normPosition.x * this.state.scaleRatio);
        y = Math.round(textElem.normPosition.y * this.state.scaleRatio);
        trace("text x,y:", x, y)
      }

      trace("text width:", inputTextWidth)
      needCanvasUpdate = needCanvasUpdate || this.state.currentTextElem !== undefined || textElem !== undefined;
      this.setState({
        needCanvasUpdate: needCanvasUpdate,
        needCanvasUpdateTextOnly: needCanvasUpdate,
        showTextInput: !this.state.eraseMode,
        inputTextValue: this.state.eraseMode ? '' : initialText,
        fontSize,
        inputTextWidth,
        inputTextHeight,
        color: fontColor,
        currentTextElem: textElem,
        xText: x,
        yText: y,
      }, () => {
        if (this.state.eraseMode) {
          this.SaveText();
        }
      });
    } else if (this.isImageMode()) {
      let imgElem = undefined;
      let imageElemIndex = this.findElementByLocation({ x, y });

      if (imageElemIndex >= 0) {
        imgElem = this.state.canvasImages[imageElemIndex];

        // In Erase mode, remove the img
        if (this.state.eraseMode) {
          this.state.queue.pushDeleteImage({ id: imgElem.id })
          this.setState({
            currentImageElem: undefined,
            needCanvasUpdate: true,
            needCanavaDataSave: true,
          });
          return;
        }



        x = Math.round(imgElem.position.x) + imgElem.width;
        y = Math.round(imgElem.position.y);
      }
      trace("image mode click:", imgElem?.id, x, y, imgElem?.width, this.state.scaleRatio)
      this.setState({
        currentImageElem: imgElem,
        xText: x,
        yText: y,
      });
    }
  }

  SaveText = (beforeExit, afterDrag) => {
    let text = this.state.inputTextValue;
    let origElem = this.state.currentTextElem;
    if (afterDrag && !this.state.currentTextElem) return false;
    trace("SaveText: ", this.state.inputTextValue, " elem: ", (this.state.currentTextElem ? "exist" : "none"))
    if ((!text || text.length == 0) && origElem === undefined) return false;

    let txtWidth = this.state.inputTextWidth / this.state.zoom;
    let txtHeight = this.state.inputTextHeight;
    let newElem = this.getTextElement(text, txtWidth, txtHeight);
    if (origElem) {
      if (origElem.text == newElem.text &&
        Math.abs(origElem.normPosition.x - newElem.normPosition.x) <= 5 &&
        Math.abs(origElem.normPosition.y - newElem.normPosition.y) <= 5 &&
        origElem.fontSize == newElem.fontSize &&
        origElem.fontColor == newElem.fontColor &&
        origElem.width == newElem.width) {
        //need to set the current text back to canvas
        this.setState({
          needCanvasUpdate: true,
          needCanvasUpdateTextOnly: true
        });
        return false;
      }
    }
    //trace("text coordinates updated", origElem.normPosition.x - newElem.normPosition.x);
    this.state.queue.pushText(newElem);
    if (beforeExit) {
      this.Save();
      return false;
    }
    this.setState({
      needCanvasUpdate: true, needCanavaDataSave: true,
      needCanvasUpdateTextOnly: true
    });
    return true;
  }






  findElementByLocation = (coordinates) => {
    let q = this.isImageMode() ? this.state.canvasImages : this.state.canvasTexts;
    for (let i = q.length - 1; i >= 0; i--) {
      trace("find", JSON.stringify(q[i]))
      let foundY = q[i].position.y < coordinates.y + 15 &&
        q[i].position.y + q[i].height > coordinates.y - 15;

      if (q[i].rtl) {
        //todo
        if (q[i].position.x > coordinates.x - 15 &&
          q[i].position.x - q[i].width < coordinates.x + 15
          && foundY) {
          return i;
        }
      } else {
        if (q[i].position.x < coordinates.x + 15 &&
          q[i].position.x + q[i].width > coordinates.x - 15
          && foundY) {
          return i;
        }
      }
    }

    return -1;
  }

  getTextElement = (newText, width, height) => {
    newTextElem = { text: newText, width: width, height: height }
    if (this.state.currentTextElem) {
      newTextElem.id = this.state.currentTextElem.id;
    } else {
      newTextElem.id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    }

    newTextElem.anchor = { x: 0, y: 0 };
    newTextElem.normPosition = {
      x: this.state.xText / this.state.scaleRatio,
      y: this.state.yText / this.state.scaleRatio, // + this.getYOffsetFactor(height),
    };
    trace("getTextElement:", width, this.state.xText, this.state.yText, "offset:", this.state.xOffset, ",", this.state.yOffset)
    newTextElem.position = { x: 0, y: 0 };
    newTextElem.alignment = 'Right';
    newTextElem.rtl = true;
    newTextElem.fontColor = this.state.color;
    console.log("getTextElem, fontSize", this.state.fontSize);
    newTextElem.fontSize = this.state.fontSize;
    newTextElem.width = this.state.inputTextWidth + 5;
    newTextElem.font = APP_FONT;
    return newTextElem;
  }


  getImageElement = (imageData, ratio) => {
    let newImageElem = {
      id: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
    };

    const initialImageSizeScaled = initialImageSize / this.state.scaleRatio;
    //newImageElem.anchor = { x: 0, y: 0 };
    newImageElem.normPosition = {
      x: (this.state.canvasW / 2 / this.state.scaleRatio - initialImageSizeScaled / 2 - this.state.xOffset) / this.state.zoom,
      y: (this.state.canvasH / 2 / this.state.scaleRatio - initialImageSizeScaled / 2 - this.state.yOffset) / this.state.zoom, // + this.getYOffsetFactor(height),
    };
    newImageElem.imageData = imageData
    newImageElem.width = Math.round(initialImageSizeScaled * ratio);
    newImageElem.height = initialImageSizeScaled;
    return newImageElem;
  }

  moveCurrentImage = (x, y) => {
    let imgElem = this.state.currentImageElem;
    if (!imgElem)
      return;

    const scalePos = {
      id: imgElem.id,
      width: imgElem.width,
      height: imgElem.height,
      position: { x: (x - imgElem.width), y: y },
    }

    if (this.state.currentImageElem) {
      this.canvas.setCanvasImagePosition(scalePos)
    }

    this.setState({
      currentImageElem: {
        ...imgElem,
        position: scalePos.position
      }
    });

  }

  SaveImageAfterMove = () => {
    let imgElem = this.state.currentImageElem;
    if (!imgElem)
      return;

    const scalePos = {
      id: imgElem.id,
      width: imgElem.width,
      height: imgElem.height,
      position: imgElem.position,
    }

    this.state.queue.pushImagePosition(this.imageScale2Norm(scalePos));

    this.setState({
      needCanvasUpdate: true,
      needCanavaDataSave: true,
      needCanvasUpdateImageSizeOnly: true,
    });

  }

  resizeCurrentImage = ({ width, height, x, y }) => {
    trace("resize", width, height)
    let imgElem = this.state.currentImageElem;
    if (!imgElem)
      return;

    const scalePos = {
      id: imgElem.id,
      width,
      height,
      position: imgElem.position,
    }
    this.canvas.setCanvasImagePosition(scalePos);

    this.setState({
      currentImageElem: {
        ...this.state.currentImageElem,
        width,
        height,
      }
    })
  }

  SaveImageAfterResize = ({ width, height }) => {
    let imgElem = this.state.currentImageElem;
    if (!imgElem)
      return;

    const scalePos = {
      id: imgElem.id,
      width,
      height,
      position: imgElem.position,
    }

    this.state.queue.pushImagePosition(this.imageScale2Norm(scalePos))

    //need to set the current text back to canvas
    this.setState({
      needCanvasUpdate: true,
      needCanavaDataSave: true,
    });
    return true;

  }
  // getXOffsetFactor = (width) => 0;//width < 100 ? 0 :
  // // width < 300 ? -Math.floor(width / 120) : -Math.floor(width / 130);
  // getYOffsetFactor = (height) => 0;//Math.floor(height/20);

  UpdateCanvas = (canvas) => {
    if (!canvas) return;
    if (!this._mounted)
      return;

    trace("Updating canvas")

    if (!this.state.needCanvasUpdateTextOnly) {
      canvas.clear();
    }

    if (!this.state.needCanvasUpdateImageSizeOnly) {
      canvas.clearImages();
    }
    let q = this.state.queue.getAll();
    //Alert.alert("before\n"+JSON.stringify(q))
    let canvasTexts = [];
    let canvasImages = [];
    for (let i = 0; i < q.length; i++) {
      if (q[i].type === 'text') {
        //clone and align to canvas size:
        let txtElem = q[i].elem;
        txtElem.position = {
          x: (txtElem.normPosition.x) * this.state.scaleRatio,// - txtElem.width, // - 15,
          y: txtElem.normPosition.y * this.state.scaleRatio // + 6
        };

        //first try to find same ID and replace, or add it
        let found = false;

        for (let j = 0; j < canvasTexts.length; j++) {
          if (canvasTexts[j].id === txtElem.id) {
            canvasTexts[j] = txtElem
            found = true;
            break;
          }
        }
        if (!found &&
          (!this.isTextMode() ||
            this.state.currentTextElem == undefined ||
            this.state.currentTextElem.id != txtElem.id ||
            !this.state.showTextInput)) {
          //avoid showing the current edited text
          canvasTexts.push(txtElem);
        }
      } else if (q[i].type === 'path' && !this.state.needCanvasUpdateTextOnly) {
        canvas.addPath(q[i].elem);
      } else if (q[i].type === 'image') {
        canvasImages.push(this.imageNorm2Scale(q[i].elem));
      } else if (q[i].type === 'imagePosition') {
        const elemIndex = canvasImages.findIndex(ci => ci.id === q[i].elem.id);
        if (elemIndex >= 0) {
          const updatedImage = { ...canvasImages[elemIndex], ...q[i].elem }
          canvasImages[elemIndex] = this.imageNorm2Scale(updatedImage)
        }

      } else if (q[i].type === 'imageDelete') {
        const elemIndex = canvasImages.findIndex(ci => ci.id === q[i].elem.id);
        if (elemIndex >= 0) {
          canvasImages.splice(elemIndex, 1);
        }
      }
    }

    //draw all images
    if (this.state.needCanvasUpdateImageSizeOnly) {
      canvasImages.map(({ imageData, normPosition, ...imgPos }) => imgPos).forEach(ci => {
        //trace("setpos", ci)
        canvas.setCanvasImagePosition(ci)
      });
    } else {
      canvasImages.forEach(ci => canvas.addOrSetCanvasImage(ci));
    }

    if (this.state.needCanavaDataSave) {
      setTimeout(() => this.Save(), 100);
    }

    this.setState({
      canvasTexts, canvasImages, needCanvasUpdate: false,
      needCanavaDataSave: false, needCanvasUpdateTextOnly: false,
      needCanvasUpdateImageSizeOnly: false
    });

  }

  imageNorm2Scale = (imgElem, newRatio) => {
    const ratio = newRatio || this.state.scaleRatio;
    //return imgElem;
    return {
      ...imgElem,
      position: {
        x: imgElem.normPosition.x * ratio,
        y: imgElem.normPosition.y * ratio
      },
      width: imgElem.width * ratio,
      height: imgElem.height * ratio,
    };
  }

  imageScale2Norm = ({ position, ...imgElem }) => {
    trace("imageScale2Norm", JSON.stringify(imgElem))
    if (!position) {
      return imgElem;
    }
    //return imgElem;
    return {
      ...imgElem,
      normPosition: {
        x: position.x / this.state.scaleRatio,
        y: position.y / this.state.scaleRatio
      },
      width: imgElem.width / this.state.scaleRatio,
      height: imgElem.height / this.state.scaleRatio,
    };
  }


  onTextButtonPicker = () => {
    console.log("Text clicked. text Mode before: " + (this.isTextMode() ? 'y' : 'n'))
    if (!this.isTextMode()) {
      this.setState({
        showTextInput: false,
        mode: Modes.TEXT,
        showTextSizePicker: this.state.showBrushSizePicker,
        eraseMode: false
      });
      this.onEraserChange(true);
      return;
    }
    this.setState({
      showTextSizePicker: !this.state.showTextSizePicker,
      showColorPicker: false,
      showBrushSizePicker: false,
      showZoomPicker: false,
      eraseMode: false

    });
    this.onEraserChange(true);
  }

  onTextSize = (size) => {
    this.setState({
      fontSize: size, showTextSizePicker: false, eraseMode: false
    });
    this.updateInputText();
    this.onEraserChange(true);
  }

  onEraserButton = () => {
    if (!this.state.eraseMode && this.isTextMode()) {
      this.onBrushButtonPicker();
    }
    this.onEraserChange();
  }

  onImagePicker = () => {
    if (this.isImageMode()) {
      trace("onAddImage")
      getNewPage(SRC_GALLERY,
        (uri) => {
          //trace("image in base64", uri.length)
          // this.setState({ icon: uri})
          getImageDimensions(uri).then((imgSize) => {
            const ratio = imgSize.w / imgSize.h;
            FileSystem.main.resizeImage(uri, Math.round(this.state.canvasW / 8 * ratio), this.state.canvasH / 8)
              .then(uri2 => FileSystem.main.convertImageToBase64(uri2))
              .then(imgBase64 => {
                trace("image added", imgBase64.length)
                const img = this.getImageElement(imgBase64, ratio)
                this.state.queue.pushImage(img)
                const scaleImg = this.imageNorm2Scale(img)
                this.setState({
                  needCanvasUpdate: true, needCanavaDataSave: true,
                  currentImageElem: scaleImg,
                  //xText: Math.round(scaleImg.position.x), yText: Math.round(scaleImg.position.yText)
                });
              })
          });
        },
        //cancel
        () => { },
        this.props.navigation,
        { selectionLimit: 1, quality: 0.4 });
    } else {
      if (this.isTextMode()) {
        this.SaveText()
      }
      this.setState({
        mode: Modes.IMAGE, showTextInput: false,
        showTextSizePicker: false, showBrushSizePicker: false
      })
    }
  }


  onEraserChange = (isOff) => {
    let eraserOn = isOff ? false : !this.state.eraseMode;
    let newColor = eraserOn ? '#00000000' : this.state.color;
    let newStrokeWidth = eraserOn ?
      (this.state.strokeWidth * 3 < 15 ? 15 : this.state.strokeWidth * 3)
      : this.state.strokeWidth;

    this.setState({ eraseMode: eraserOn });
    this.updateBrush(newStrokeWidth, newColor);
  }

  onBrushButtonPicker = () => {
    if (this.isTextMode()) {
      this.SaveText();
    }
    this.setState({
      showTextInput: false,
      yOffset: this.state.zoom == 1 ? 0 : this.state.yOffset,
      mode: Modes.BRUSH,
      showBrushSizePicker: this.isBrushMode() ? !this.state.showBrushSizePicker : this.state.showTextSizePicker,
      showColorPicker: false,
      showTextSizePicker: false,
      showZoomPicker: false
    })
    this.onEraserChange(true);
  }

  onBrushSize = (size) => {

    let newStrokeWidth = size; //this.canvas.state.strokeWidth + inc;
    if (newStrokeWidth < 1) {
      newStrokeWidth = 1;
    }
    if (newStrokeWidth > MAX_STROKE_WIDTH) {
      newStrokeWidth = MAX_STROKE_WIDTH;
    }

    this.setState({
      strokeWidth: newStrokeWidth, showBrushSizePicker: false
    })
    this.updateBrush(newStrokeWidth, this.state.color);
  }

  updateBrush = (strokeWidth, color) => {
    this.canvas.setState({ strokeWidth, color });
  }

  rename = async (isRename) => {
    const page = this.state.page;
    console.log("rename: " + page.path);
    this.props.navigation.navigate('SavePhoto', {
      sheet: page,
      imageSource: SRC_RENAME,
      folder: this.props.route.params['folder'],

      name: page.name,
      returnFolderCallback: this.props.route.params.returnFolderCallback,
      saveNewFolder: this.props.route.params.saveNewFolder,
      title: isRename ? translate("RenameFormTitle") : translate("MovePageFormTitle"),
      goHomeAndThenToEdit: this.props.route.params.goHomeAndThenToEdit
    });

  }

  deletePage = async () => {
    let updatedPage = await FileSystem.main.deletePageInSheet(this.state.page, this.state.currentIndex);
    let index = this.state.currentIndex;
    if (index > 0) {
      index--;
    }
    this.setState({ page: updatedPage });
    this.forceUpdate();
    this.movePage(-1);
  }

  movePage = (inc) => {

    if (this.state.showTextInput) {
      this.SaveText(true, false)
    }

    let currentIndex = -1;
    for (let i = 0; i < this.state.page.count; i++) {
      if (this.state.page.getPage(i) == this.state.currentFile) {
        currentIndex = i;
        break;
      }
    }
    currentIndex += inc;
    if (currentIndex < 0)
      currentIndex = 0;

    if (currentIndex >= this.state.page.count) return;


    setNavParam(this.props.navigation, 'pageTitleAddition', this.pageTitleAddition(this.state.page.count, currentIndex));

    const currentFile = this.state.page.getPage(currentIndex);
    const metaDataUri = currentFile + ".json";
    this.setState({
      currentFile, currentIndex, metaDataUri: metaDataUri,
      zoom: 1, xOffset: 0, yOffset: 0, showTextInput: false, inputTextValue: '', currentImageElem: undefined
    });
    this.CalcImageSize(currentFile, this.state.origWindowW, this.state.windowH);
    setTimeout(() => {
      this.Load();
    }, 200)
  }
  isScreenNarrow = () => this.state.windowSize && this.state.windowSize.width < 500;
  isLandscape = () => this.state.windowSize && this.state.windowSize.width > this.state.windowSize.height;

  topLayer = () => (this.isScreenNarrow() || this.state.showExtMenu ?
    dimensions.toolbarHeight * 2 : dimensions.toolbarHeight) + dimensions.toolbarMargin;

  toggleExtMenu = () => {
    trace("toggle extMenu", this.state.windowSize)
    this.setState({
      showExtMenu: !this.state.showExtMenu
    }, () => this.reflectWindowSize(this.state.windowSize))
  }

  onLayout = async (e) => {
    if (!this._mounted)
      return;

    if (!this.state.topViewMeasured && this.topView && this._mounted) {
      this.topView.measure((fx, fy, width, height, px, py) => {
        //trace("topView", py)
        this.setState({ topView: py, topViewMeasured: true })
      });
    }
    // const measure = this.topView.measure.bind(this.topView);
    // setTimeout(measure, 50, (fx, fy, width, height, px, py) => {
    //   if (this._mounted)
    //     trace("measure", py, windowSize, "zoom", this.state.zoom)
    //   this.setState({ topView: py, windowSize })
    // });

    let windowSize = e.nativeEvent.layout;

    // if (this.state.showTextInput) {
    //   trace("Saving text due to Layout event")
    //   this.SaveText()
    //   this.setState({
    //     showTextInput: false,
    //     currentTextElem: undefined,
    //     inputTextValue: ""
    //   });
    // }

    // if (this.state.currentImageElem) {
    //   this.setState({ currentImageElem: undefined });
    // }
    this.setState({ windowSize, zoom: 1, yOffset: 0, xOffset: 0 },
      this.reflectWindowSize(windowSize, true));
  }

  reflectWindowSize = (windowSize) => {
    // trace("reflectWindowSize", windowSize.width, windowSize.height)
    // const measure = this.topView.measure.bind(this.topView);
    // setTimeout(measure, 50, (fx, fy, width, height, px, py) => {
    //   if (this._mounted)
    //     trace("measure", py, windowSize, "zoom", this.state.zoom)
    //   this.setState({ topView: py, windowSize })
    // });

    //let sideMargin = Math.floor(windowSize.width * .05)

    windowW = windowSize.width * .9;
    windowH = windowSize.height - this.topLayer() - dimensions.toolbarMargin;

    this.CalcImageSize(this.state.currentFile, windowW, windowH);
  }


  CalcImageSize = (currentFile, windowW, windowH) => {
    //trace("CalcImageSize", currentFile, windowW, windowH)
    getImageDimensions(currentFile).then(imageSize => {
      let sideMargin = Math.floor(windowW / .9 * .05)

      let imageWidth = imageSize.w;
      let imageHeight = imageSize.h;
      wDiff = imageWidth - windowW;
      hDiff = imageHeight - windowH;
      let ratio = 1.0;

      if (wDiff <= 0 && hDiff <= 0) {
        //image fit w/o scale
        if (wDiff < 0 && hDiff < 0) {
          if (wDiff < hDiff) {
            ratio = windowH / imageHeight
          } else {
            ratio = windowW / imageWidth
          }
        }
      } else if (wDiff > hDiff) {
        //scale to fit width
        ratio = windowW / imageWidth;
      } else {
        //scale to fit height
        ratio = windowH / imageHeight;
      }

      let xOffset = this.state.xOffset;
      let yOffset = this.state.yOffset;
      if (ratio != this.state.scaleRatio) {
        xOffset = xOffset / this.state.scaleRatio * ratio;
        yOffset = yOffset / this.state.scaleRatio * ratio;
      }

      let origWindowW = windowW;
      let canvasH = imageHeight * ratio;
      let canvasW = imageWidth * ratio;
      windowW += 2 * sideMargin;


      // translate locations that bound to scaleRatio:
      let xText = this.state.xText;
      let yText = this.state.yText;
      let imgElem = this.state.currentImageElem;
      if (this.state.scaleRatio) {
        if (imgElem) {
          const normElem = this.imageScale2Norm(imgElem);
          imgElem = this.imageNorm2Scale(normElem, ratio);
        }
        xText = (xText / this.state.scaleRatio) * ratio;
        yText = (yText / this.state.scaleRatio) * ratio;

      } else {
        imgElem = undefined
      }

      //trace("CalcImageSize-result:", windowW, windowH, ratio, canvasW, canvasH)
      this.setState({
        origWindowW, windowW, windowH,
        xOffset, yOffset,
        sideMargin: (windowW - imageWidth * ratio) / 2,
        canvasW, canvasH,
        viewPort: {
          x: sideMargin,
          y: this.topLayer() + this.state.topView,
          width: canvasW,
          height: canvasH,
        },
        scaleRatio: ratio,
        needCanvasUpdate: true, needCanavaDataSave: false,
        xText, yText, currentImageElem: imgElem,
        showExtMenu: windowW < windowH && this.state.showExtMenu
      });

    }).catch(err => {
      Alert.alert("Error measuring dimension:" + err.message)
    })
  }

  doZoom = (delta) => {
    let newZoom = this.state.zoom + delta;
    if (newZoom > 3) {
      newZoom = 3
    }

    if (newZoom < 1) {
      newZoom = 1
    }

    const newState = { zoom: newZoom } //, canvasW: (this.state.canvasW/this.state.zoom*newZoom) }

    if (newZoom === 1) {
      newState.xOffset = 0;
      if (this.state.keyboardHeight === 0) {
        newState.yOffset = 0;
      }
    }

    this.setState(newState)

  }

  render() {
    let drawingAreaStyle = {
      flex: 1,
      position: 'absolute',
      top: this.topLayer(),
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 5,
    };
    let toolbarSideMargin = this.state.sideMargin > 70 ? 70 : this.state.sideMargin;
    let toolbarHeight = this.isScreenNarrow() || this.state.showExtMenu ? 2 * dimensions.toolbarHeight : dimensions.toolbarHeight;
    if (this.state.windowSize && this.state.windowSize.width - 2 * toolbarSideMargin < 300) {
      toolbarSideMargin = 100;
    }

    let spaceBetweenButtons = <Spacer width={23} />
    const availablePickerWidth = this.state.windowW - 2 * toolbarSideMargin;
    let colorButtonSize = (this.state.windowW - 2 * toolbarSideMargin) / (availableColorPicker.length * 1.4);
    let backToFolderWidth = 45;


    const zoomButton = getIconButton(() => this.setState({
      showZoomPicker: !this.state.showZoomPicker,
      showColorPicker: false,
      showTextSizePicker: false,
      showBrushSizePicker: false
    }),
      semanticColors.editPhotoButton, "zoom-in", 55, false, 45, undefined, undefined, undefined, "3");

    const extMenu = [
      getIconButton(() => this.onImagePicker()
        , semanticColors.editPhotoButton, "image", 55, undefined, 40, this.isImageMode(), undefined, undefined, "1"),
      <Spacer width={23} key="2" />,
      zoomButton,
      <Spacer width={23} key="4" />,
      // this.state.page && this.state.page.count > 1 &&
      // getIconButton(() => this.deletePage(), semanticColors.editPhotoButton, 'delete-forever', 55, undefined, undefined, undefined, "5"),
      // < Spacer width={23} key="6" />,

    ];



    return (
      <View style={styles.mainContainer}
        onLayout={this.onLayout}>
        {/* page menu 3 dots */}
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          {this.getMoreMenu(toolbarHeight + dimensions.toolbarMargin)}
        </View>

        <TouchableOpacity
          //onPress={this.TextModeClick}
          activeOpacity={1}
          style={drawingAreaStyle}
        >
          <View style={{ flex: 1 }}
            ref={v => this.topView = v}
            {...this._panResponderMove.panHandlers}

          >
            <ScrollView

              minimumZoomScale={this.state.minZoom}
              maximumZoomScale={this.state.maxZoom}
              zoomScale={this.state.zoom}
              style={{ position: 'absolute', top: 0, height: this.state.canvasH, left: this.state.sideMargin, width: this.state.canvasW }}
              contentContainerStyle={{ flex: 1 }}
              scrollEnabled={this.isTextMode()}
            >
              {this.state.sharing ?
                <View style={{ position: 'absolute', top: '25%', left: 0, width: this.state.canvasW, zIndex: 1000, backgroundColor: 'white', alignItems: 'center' }}>

                  <ProgressCircle
                    radius={150}
                    color="#3399FF"
                    shadowColor="#999"
                    bgColor="white"
                    percent={this.state.shareProgress}
                    borderWidth={5} >
                    <Text style={{ zIndex: 100, fontSize: 25 }}>{fTranslate("ExportProgress", this.state.shareProgressPage, (this.state.page.count > 0 ? this.state.page.count : 1))}</Text>
                  </ProgressCircle>
                </View> : null}
              {this.getCanvas()}
            </ScrollView>
          </View>
        </TouchableOpacity>

        {/* Toolbar */}
        <View style={{
          position: 'absolute', top: 0, width: '100%',
          height: toolbarHeight, backgroundColor: semanticColors.subTitle,
          zIndex: 30
        }} >

          {/** Left side toolbar */}
          <View style={{
            position: 'absolute',
            height: dimensions.toolbarHeight,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center'

          }}>
            {
              getIconButton(() => {
                this.props.navigation.goBack();
              }, semanticColors.editPhotoButton, "folder", backToFolderWidth)
            }
            <Spacer width={45} />
            {
              getIconButton(() => {
                this.state.queue.undo();
                this.setState({ needCanvasUpdate: true, needCanavaDataSave: true, currentImageElem: undefined });
              }, semanticColors.editPhotoButton, "undo", 55)
            }
            {spaceBetweenButtons}
            {
              getIconButton(() => {
                this.state.queue.redo();
                this.setState({ needCanvasUpdate: true, needCanavaDataSave: true });
              }, this.state.queue.canRedo() ? semanticColors.editPhotoButton : semanticColors.InactiveModeButton, "redo", 55)
            }
            {spaceBetweenButtons}
            {
              getEraserIcon(() => this.onEraserButton(), 55, this.state.eraseMode ? 'black' : semanticColors.editPhotoButton, this.state.eraseMode)
            }


            { /* text size preview */}
            <View style={{
              position: 'absolute',
              top: 0,
              right: this.isScreenNarrow() ? 0 : this.state.windowW / 2 - 50,

              width: 100,
              height: dimensions.toolbarHeight,
              backgroundColor: 'transparent',//'#eef4fa',
              borderRadius: 24.5,
              justifyContent: 'center',
              alignItems: 'center',
              alignContent: 'center',
            }}>
              {this.isTextMode() ?
                <AppText style={{
                  fontSize: this.state.fontSize,
                  lineHeight: this.state.fontSize + 8,
                  color: this.state.color,
                  textAlignVertical: 'center'
                }}>{translate("A B C")}</AppText> :
                this.isImageMode() ?
                  <Icon name={"image"} size={55} color={semanticColors.editPhotoButton} /> :
                  getSvgIcon('doodle', 55, this.state.color, this.state.strokeWidth * .8)
              }
            </View>


            {/** right side top toolbar */}
            <View style={[{
              position: 'absolute',
              height: dimensions.toolbarHeight,
              flexDirection: 'row-reverse', alignItems: 'center'
            }, this.isScreenNarrow() ?
              { top: dimensions.toolbarHeight, left: this.state.sideMargin } :
              { top: 0, right: 50 }
            ]} >

              {
                getIconButton(() => this.onTextButtonPicker(),
                  this.isTextMode() ? this.state.color : semanticColors.editPhotoButton, translate("A"), 55, true, 45, this.isTextMode())
              }
              {spaceBetweenButtons}
              {
                getIconButton(() => this.onBrushButtonPicker(),
                  this.isBrushMode() ? this.state.color : semanticColors.editPhotoButton, "edit", 55, false, 45, this.isBrushMode()) //(20 + this.state.strokeWidth * 3))
              }
              {spaceBetweenButtons}

              {getIconButton(() => this.setState({
                showColorPicker: !this.state.showColorPicker,
                showTextSizePicker: false,
                showBrushSizePicker: false,
                showZoomPicker: false
              }), semanticColors.editPhotoButton, "color-lens", 55)
              }
              {spaceBetweenButtons}

              {this.isLandscape() && this.state.betaFeatures && extMenu}
              {(!this.isLandscape() && this.state.betaFeatures) && getIconButton(() => this.toggleExtMenu(),
                semanticColors.editPhotoButton, this.state.showExtMenu ? "expand-less" : "expand-more", 55, false, 45)}
              {!this.state.betaFeatures && zoomButton}
            </View>
            {/** bottom toolbar */}
            {this.state.showExtMenu && this.state.betaFeatures && <View style={{
              position: 'absolute',
              height: dimensions.toolbarHeight,
              flexDirection: 'row', alignItems: 'center',
              top: dimensions.toolbarHeight, left: this.state.sideMargin + 30
            }} >
              {extMenu}
            </View>}



          </View>
        </View>
        {/*debug msg * /}
        <View style={{position:'absolute', top:0, height:40, left:0, width:200,zIndex:100}}>
          <Text size={20}>{this.state.msg}</Text>
        </View>
        {/** */}
        {/*View for selecting color*/}
        {/*<FadeInView height={this.state.showColorPicker ? 70 : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>
           <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
            {availableColorPicker.map((color, i) => getColorButton(() => {
              this.setState({ color: color, showColorPicker: false, eraseMode: false })
              this.updateBrush(this.state.strokeWidth, color);
              this.updateInputText();
            }, color, colorButtonSize, color == this.state.color && !this.state.eraseMode, i))
            }
          </View> 
        </FadeInView>*/}
        <MyColorPicker
          open={this.state.showColorPicker}
          betaFeatures={this.state.betaFeatures}
          top={toolbarHeight}
          width={availablePickerWidth}
          color={this.state.eraseMode ? undefined : this.state.color}
          isScreenNarrow={this.isScreenNarrow()}
          onSelect={(color) => {
            trace("set-color", color)
            this.setState({ color, showColorPicker: false, eraseMode: false })
            this.updateBrush(this.state.strokeWidth, color);
            this.updateInputText();
          }} />

        {/*View for selecting text size*/}
        {/* <FadeInView height={this.state.showTextSizePicker && this.isTextMode() ? 70 : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>
          <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-evenly', alignContent: 'center', alignItems: 'center' }}>
            {availableTextSize.map((size, i) => this.getTextSizePicker(this.state.color, colorButtonSize, size, i))}
          </View>
        </FadeInView> */}
        <TextSizePicker
          open={this.state.showTextSizePicker && this.isTextMode()}
          betaFeatures={this.state.betaFeatures}
          top={toolbarHeight}
          width={availablePickerWidth}
          size={this.state.fontSize}
          color={this.state.color}
          isScreenNarrow={this.isScreenNarrow()}
          onSelect={(size) => this.onTextSize(size)}
        />


        {/*View for selecting brush size*/}
        <FadeInView height={this.state.showBrushSizePicker && !this.isTextMode() ? 70 : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>
          <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
            {availableBrushSize.map((size, i) => this.getBrushSizePicker(this.state.color, colorButtonSize, size, i))}

          </View>
        </FadeInView>

        {/*View for zoom*/}
        <FadeInView height={this.state.showZoomPicker ? 70 : 0} style={[styles.pickerView, { top: toolbarHeight, left: '35%', right: '35%' }]}>
          <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>

            {
              getIconButton(() => this.doZoom(-.5),
                semanticColors.editPhotoButton, "zoom-out", 55, false, 45)
            }
            {
              getIconButton(() => this.doZoom(+.5),
                semanticColors.editPhotoButton, "zoom-in", 55, false, 45)
            }
          </View>
        </FadeInView>

        {
          this.state.showTextInput &&
          this.getTextInput()
        }

        {
          this.state.currentImageElem && this.isImageMode() &&
          this.getImageRect(this.a2cW(this.state.currentImageElem.position.x), this.a2cH(this.state.currentImageElem.position.y),
            this.state.currentImageElem.width, this.state.currentImageElem.height)
        }


        {this.getArrow(LEFT, () => this.setState({ xOffset: this.state.xOffset + 50 }))}
        {this.getArrow(TOP, () => this.setState({ yOffset: this.state.yOffset + 50 }))}
        {this.getArrow(RIGHT, () => this.setState({ xOffset: this.state.xOffset - 50 }))}
        {this.getArrow(BOTTOM, () => this.setState({ yOffset: this.state.yOffset - 50 }))}

        {/** previous page button */}
        {
          this.state.page && this.state.page.count > 0 && this.state.currentFile !== this.state.page.getPage(0) ?
            <View style={{ position: 'absolute', bottom: 50, left: 10, width: 155, height: 40, zIndex: 100 }}>
              {getRoundedButton(() => this.movePage(-1), 'chevron-left', translate("BtnPreviousPage"), 30, 30, { width: 125, height: 40 }, 'row-reverse', true)}
            </View> :
            null
        }
        {/** next page button */}
        {
          this.state.page && this.state.page.count > 1 &&
            this.state.currentFile !== this.state.page.getPage(this.state.page.count - 1) ?
            <View style={{ position: 'absolute', bottom: 50, right: 10, height: 40, zIndex: 100 }}>
              {getRoundedButton(() => this.movePage(1), 'chevron-right', translate("BtnNextPage"), 30, 30, { width: 125, height: 40 }, 'row', true)}
            </View> :
            null
        }
      </View >


    );
  }


  getMoreMenu = (toolbarHeight) => {
    return <Menu ref={(ref) => this.menu = ref} >


      <MenuTrigger >
        {/* {getIconButton(() => {
          //   
          this.menu.open()

        }, semanticColors.editPhotoButton, 'more-vert', 55)} */}
      </MenuTrigger>
      <MenuOptions {...IDMenuOptionsStyle({ top: toolbarHeight, width: 300 })}      >
        <MenuOption onSelect={() => this.rename(true)} >
          {renderMenuOption(translate("BtnChangeName"),
            "edit")}
        </MenuOption>
        <Spacer width={5} />
        {this.state.page && this.state.page.count > 1 ?
          <MenuOption onSelect={() => this.deletePage()} >
            {renderMenuOption(fTranslate("BeforeDeleteSubPageQuestion", this.state.currentIndex + 1, this.state.page.count),
              "delete-forever")}
          </MenuOption>
          : null}
        {this.state.page && this.state.page.count > 1 ? <Spacer /> : null}
        <View style={{ flex: 1, width: '100%', flexDirection: 'column', alignItems: 'center' }}>
          {getRoundedButton(() => this.menu.close(), 'cancel-red', translate("BtnCancel"), 30, 30, { width: 150, height: 40 })}
        </View>
        <Spacer width={5} />
      </MenuOptions>

    </Menu>

  }

  getArrow = (location, func) => {
    let style = { flex: 1, position: 'absolute', zIndex: 10000 }
    let deg = 0;
    if (location == TOP && this.state.zoom > 1 && this.state.yOffset < 0) {
      style.top = this.topLayer(), style.left = 100, deg = -90;
      style.left = this.state.sideMargin + this.state.canvasW / 2
    } else if (location == RIGHT && this.state.zoom > 1) {
      style.top = this.topLayer() + this.state.canvasH / 2;
      style.right = 5, deg = 0;
    } else if (location == BOTTOM && this.state.zoom > 1) {
      style.top = this.topLayer() + this.state.canvasH - 60 - this.state.keyboardHeight, deg = 90;
      style.left = this.state.sideMargin + this.state.canvasW / 2
    } else if (location == LEFT && this.state.xOffset < 0) {
      style.top = this.topLayer() + this.state.canvasH / 2;
      style.left = 5, deg = 180;
    } else {
      return;
    }
    style.transform = [{ rotate: deg + 'deg' }]

    return <View style={style}>
      <Icon
        onPress={func}
        name='play-arrow'
        size={70}
        color={semanticColors.moveInZoomButton}
      />
    </View>
  }


  getCanvas = () => {
    // let w = this.state.windowW;
    // let h = this.state.windowW;
    return (
      <RNSketchCanvas
        ref={component => {
          this.canvas = component;
          if (this.state.needCanvasUpdate) {
            setTimeout(() => {
              if (component) {
                this.UpdateCanvas(component);
              }
            }, 100);
          } else if (this.state.needExport) {
            let promise = this.state.needExport;
            this.setState({ needExport: undefined })
            setTimeout(() => {
              this.doExport(component, promise.resolve, promise.reject);
            }, shareTimeMs);
          }
        }
        }
        scale={this.state.zoom}
        touchEnabled={!this.isTextMode()}
        text={this.state.canvasTexts}
        containerStyle={styles.container}
        canvasStyle={[styles.canvas, { transform: [{ translateX: this.state.xOffset }, { translateY: this.state.yOffset }] }]}
        localSourceImage={{ filename: this.state.currentFile, mode: 'AspectFit' }}
        onStrokeEnd={this.SketchEnd}
        onSketchStart={this.SketchStart}
        strokeColors={[{ color: colors.black }]}
        defaultStrokeIndex={0}
        defaultStrokeWidth={DEFAULT_STROKE_WIDTH}
      />

    );
  }

  getColorPickerButton = () => {
    let func = () => {
      this.setState({
        showColorPicker: !this.state.showColorPicker,
        showTextSizePicker: false,
        showBrushSizePicker: false,
        showZoomPicker: false
      });
    }

    return <TouchableOpacity
      onPress={func}
      activeOpacity={0.7}
    >
      <LinearGradient colors={this.state.color} style={[styles.CircleShapeView, styles.notSelected]}>
      </LinearGradient>
    </TouchableOpacity>
  }

  updateInputText = () => {
    if (this._textInput) {
      this._textInput.setNativeProps({ text: this.state.inputTextValue + ' ' });

      setTimeout(() => {
        if (this._textInput) {
          this._textInput.setNativeProps({ text: this.state.inputTextValue });
        }
      }, 50);
    }
  }




  getBrushSizePicker = (color, size, brushSize, index) => {
    size = this.isScreenNarrow() ? size + 10 : size;
    return <TouchableOpacity
      style={{ width: size, height: size }}
      onPress={() => this.onBrushSize(brushSize)}
      activeOpacity={0.7}
      key={"" + index}
    >
      <View style={{
        flex: 1,
        backgroundColor: brushSize === this.state.strokeWidth ? '#eeeded' : 'transparent',
        borderRadius: size / 2,
        justifyContent: 'center',
        alignItems: 'center'
      }}
      >
        <Icon name={"edit"} color={color} size={brushSize * 4 + 12}></Icon>
      </View>
    </TouchableOpacity>
  }


  getSpace = (dist) => {
    let space = ''
    for (let i = 0; i < dist; i++) {
      space += ' ';
    }
    return <AppText>{space}</AppText>
  }


  getImageRect = (x, y, w, h) => {
    w = w * this.state.zoom;
    h = h * this.state.zoom;
    return <View style={{
      flexDirection: 'row',
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      zIndex: 999,
    }}>
      <TouchableOpacity
        onPress={() => {
          if (this.state.eraseMode) {
            this.state.queue.pushDeleteImage({ id: this.state.currentImageElem.id })
            this.setState({
              currentImageElem: undefined,
              needCanvasUpdate: true,
              needCanavaDataSave: true,
            });
            return;
          }
        }}
      >
        <View

          style={{
            width: w,
            height: h,
            borderStyle: "dashed",
            borderWidth: 3,
            borderColor: "black",

          }}
        />
      </TouchableOpacity>
      <View {...this._panResponderElementMove.panHandlers} style={{ top: -5 }}>
        <Icon name='open-with' size={DRAG_ICON_SIZE} />
      </View>

      <View {...this._panResponderElementResize.panHandlers}
        style={{
          position: "absolute",
          left: w,
          top: h - DRAG_ICON_SIZE,
          width: DRAG_ICON_SIZE,
          height: DRAG_ICON_SIZE,
          zIndex:30
        }}>
        <Icon name='filter-none' size={DRAG_ICON_SIZE} style={{ transform: [{ rotate: '-90deg' }] }} />
      </View>

    </View>
  }

  getTextInput = () => {
    //trace("getTextInput width:", this.getTextWidth(), "fontSize", this.normalizeTextSize(this.state.fontSize))
    this._handleInputTextLocationMovingPage(this.state.keyboardHeight, this.state.keyboardTop);
    const x = this.state.viewPortX;
    const y = this.state.viewPortY;
    return (
      <View style={{
        flex: 1, flexDirection: 'row-reverse', position: 'absolute',
        left: x - this.getTextWidth(), top: y, zIndex: 20
      }}>
        <View {...this._panResponderElementMove.panHandlers} style={{ top: -5 }}>
          <Icon name='open-with' size={DRAG_ICON_SIZE} />
        </View>

        <TextInput
          ref={textInput => this._textInput = textInput}
          onChangeText={(text) => {
            this.setState({ inputTextValue: text });
          }}
          onContentSizeChange={(event) => {
            let dim = event.nativeEvent.contentSize;
            console.log("onContentSizeChange:" + JSON.stringify(dim) + ", text:" + this.state.inputTextValue)
            setTimeout(() =>
              this.setState({
                inputTextWidth: dim.width > 0 ? dim.width : this.state.inputTextWidth,
                inputTextHeight: dim.height
              }), 10);
          }}
          autoCapitalize={'none'}
          autoCorrect={false}
          multiline={true}
          autoFocus
          allowFontScaling={false}
          style={{
            backgroundColor: 'transparent',
            textAlign: 'right',
            width: this.getTextWidth(),
            height: this.state.inputTextHeight,//this.getTextHeight(),
            borderWidth: 0,
            margin: 0,
            fontSize: this.normalizeTextSize(this.state.fontSize),
            color: this.state.color,
            fontFamily: APP_FONT,
            zIndex: 21
          }}


          value={this.state.inputTextValue}
        />
        <View style={{
          position: 'absolute', left: DRAG_ICON_SIZE - 2, top: 0,
          width: Math.max(this.state.inputTextWidth + 10, 10), height: Math.max(this.state.inputTextHeight, this.normalizeTextSize(this.state.fontSize)),
          zIndex: 20
        }}
          backgroundColor={this.state.color === '#fee100' ? 'gray' : 'yellow'}
        />
      </View >);
  }

  normalizeTextSize = (size) => {
    const newSize = size * this.state.zoom
    if (Platform.OS === 'ios') {
      return Math.round(PixelRatio.roundToNearestPixel(newSize))
    } else {
      return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2
    }
  }

  getTextWidth = () => Math.max(30, this.state.xText); //2000;//Math.max(this.state.inputTextWidth + 100, 40) * this.state.zoom; //< INITIAL_TEXT_SIZE - 20 ? INITIAL_TEXT_SIZE : this.state.inputTextWidth + this.state.fontSize * 2;
  getTextHeight = () => this.state.inputTextHeight // Math.max(this.state.inputTextHeight, this.state.fontSize + 1.2);
}

AppRegistry.registerComponent('IssieEditPhoto', () => IssieEditPhoto);

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: semanticColors.mainAreaBG
  },
  CircleShapeView: {
    width: 50,
    height: 50,
    borderRadius: 50 / 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  selected: {
    marginVertical: 0
  },
  notSelected: {
    marginVertical: 10
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  canvas: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  pickerView: {
    flexDirection: 'row',
    position: 'absolute',
    backgroundColor: 'white',
    zIndex: 99999,
    left: 0,
    borderColor: 'gray',
    borderWidth: 1
  }
}
);