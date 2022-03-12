import React from 'react';
import {
  AppRegistry, ScrollView, StyleSheet, TextInput, View,
  TouchableOpacity, Text, Alert, PanResponder, Keyboard, PixelRatio
} from 'react-native';

import { Icon } from 'react-native-elements'
import RNSketchCanvas from './modified_canvas/index';
import Share from 'react-native-share';
import DoQueue from './do-queue';

import {
  Spacer, getRoundedButton,
  renderMenuOption, IDMenuOptionsStyle
} from './elements'
import { getNewPage, SRC_GALLERY, SRC_RENAME } from './newPage';
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
  semanticColors, dimensions
} from './elements'
import { translate } from './lang';
import { setNavParam } from './utils';
import { FileSystem } from './filesystem';
import { trace } from './log';
import { pinchEnd, processPinch, processResize } from './pinch';
import { EditorToolbar } from './editor-toolbar';

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
        let xText = this.s2aW(gestureState.moveX - DRAG_ICON_SIZE / 2);
        if (xText < 25) {
          xText = 25;
        } else if (xText > this.state.canvasW) {
          xText = this.state.canvasW;
        }

        let yText = this.s2aH(gestureState.moveY - DRAG_ICON_SIZE / 2)
        let yOffset = this.state.yOffset;
        trace("move", yText, this.state.yOffset, this.state.canvasH)
        if (yText - DRAG_ICON_SIZE / 2 > this.state.canvasH) {
          yText = this.state.canvasH - DRAG_ICON_SIZE / 2;
        } else if (yText < 0) {
          yText = 0;
        }


        if (yText < -yOffset) {
          yOffset = -yText / this.state.zoom;
        }

        if (this.isImageMode()) {
          this.moveCurrentImage(xText, yText);
        }

        this.setState({
          xText, yText, yOffset
        });
        //}
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
      toolbarHeight: dimensions.toolbarHeight,
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
    let kbTop = this.state.windowH - e.endCoordinates.height;

    //ignore the part of keyboard that is below the canvas
    let kbHeight = e.endCoordinates.height - (this.state.windowH - this.topLayer() - this.state.canvasH);

    trace("_keyboardDidShow", kbHeight, this.topLayer(), dimensions.toolbarHeight)
    this.setState({
      keyboardHeight: kbHeight, keyboardTop: kbTop,
    });

    this._handleInputTextLocationMovingPage(kbHeight, kbTop);
  }

  _handleInputTextLocationMovingPage = (kbHeight, kbTop) => {
    if (!kbHeight || !kbTop)
      return;

    let yOffset = this.state.yOffset;

    // if keyboard hides the textInput, scroll the window
    if (this.state.showTextInput) {
      let diff = (this.state.yText + this.state.inputTextHeight) * this.state.zoom + yOffset * this.state.zoom - kbTop;
      if (diff > 0) {
        yOffset -= diff / this.state.zoom;
      }
    }
    if (yOffset !== this.state.yOffset) {
      this.setState({
        yOffset
      });

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
  s2aW = (w) => (w - this.state.sideMargin) / this.state.zoom - this.state.xOffset; // + this.getXOffsetFactor(this.state.inputTextWidth)
  s2aH = (h) => (h - this.state.topView) / this.state.zoom - this.state.yOffset; // + this.getYOffsetFactor(this.state.inputTextWidth)
  a2cW = (w) => (w + this.state.xOffset) * this.state.zoom + this.state.sideMargin; // - this.getXOffsetFactor(this.state.inputTextWidth)
  a2cH = (h) => (h + this.state.yOffset) * this.state.zoom + this.topLayer(); // - this.getYOffsetFactor(this.state.inputTextWidth)


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
        fontColor = textElem.fontColor;
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


  onTextMode = () => {
    this.setState({
      showTextInput: false,
      mode: Modes.TEXT,
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
      this.onBrushMode();
    }
    this.onEraserChange();
  }

  onAddImage = () => {
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
      { selectionLimit: 1, quality: 0 });
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

  onBrushMode = () => {
    if (this.isTextMode()) {
      this.SaveText();
    }
    this.setState({
      showTextInput: false,
      yOffset: this.state.zoom == 1 ? 0 : this.state.yOffset,
      mode: Modes.BRUSH,
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
      strokeWidth: newStrokeWidth
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

  topLayer = () => this.state.toolbarHeight + dimensions.toolbarMargin;


  onLayout = async (e) => {
    if (!this._mounted)
      return;

    if (!this.state.topViewMeasured && this.topView && this._mounted) {
      this.topView.measure((fx, fy, width, height, px, py) => {
        trace("topView", py)
        this.setState({ topView: py, topViewMeasured: true })
      });
    }

    let windowSize = e.nativeEvent.layout;


    this.setState({ windowSize, zoom: 1, yOffset: 0, xOffset: 0 },
      this.reflectWindowSize(windowSize, true));
  }

  reflectWindowSize = (windowSize) => {

    let sideMargin = Math.floor(windowSize.width * .05)

    windowW = windowSize.width - sideMargin * 2;
    windowH = windowSize.height - this.topLayer() - dimensions.toolbarMargin;

    this.CalcImageSize(this.state.currentFile, windowW, windowH);
  }


  CalcImageSize = (currentFile, windowW, windowH) => {
    trace("CalcImageSize", currentFile, windowW, windowH)
    getImageDimensions(currentFile).then(imageSize => {
      let sideMargin = Math.floor(windowW * .05)

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

      trace("CalcImageSize-result:", windowW, windowH, ratio, canvasW, canvasH)
      this.setState({
        origWindowW, windowW, windowH,
        xOffset, yOffset,
        sideMargin: (windowW - imageWidth * ratio) / 2,
        canvasW, canvasH, scaleRatio: ratio,
        needCanvasUpdate: true, needCanavaDataSave: false,
        xText, yText, currentImageElem: imgElem,
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
    if (this.state.windowSize && this.state.windowSize.width - 2 * toolbarSideMargin < 300) {
      toolbarSideMargin = 100;
    }






    return (
      <View style={styles.mainContainer}
        onLayout={this.onLayout}>
        {/* page menu 3 dots */}
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          {this.getMoreMenu(this.state.toolbarHeight + dimensions.toolbarMargin)}
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

        <EditorToolbar
          windowSize={this.state.windowSize}
          onGoBack={() => this.props.navigation.goBack()}
          onUndo={() => {
            this.state.queue.undo();
            this.setState({ needCanvasUpdate: true, needCanavaDataSave: true, currentImageElem: undefined });
          }}
          canRedo={this.state.queue.canRedo()}
          onRedo={() => {
            this.state.queue.redo();
            this.setState({ needCanvasUpdate: true, needCanavaDataSave: true });
          }}

          onZoomOut={() => this.doZoom(-.5)}
          onZoomIn={() => this.doZoom(.5)}
          eraseMode={this.state.eraseMode}
          onEraser={() => this.onEraserButton()}

          onTextMode={() => this.onTextMode()}
          onImageMode={() => {
            if (this.isTextMode()) {
              this.SaveText()
            }
            this.setState({
              mode: Modes.IMAGE, showTextInput: false,
            })
          }}
          onAddImage={() => this.onAddImage()}
          onBrushMode={() => this.onBrushMode()}

          isTextMode={this.isTextMode()}
          isImageMode={this.isImageMode()}
          isBrushMode={!this.isTextMode() && !this.isImageMode()}
          fontSize={this.state.fontSize}
          color={this.state.color}
          strokeWidth={this.state.strokeWidth}

          sideMargin={this.state.sideMargin}
          betaFeatures={this.state.betaFeatures}

          onSelectColor={(color) => {
            this.setState({ color, eraseMode: false })
            this.updateBrush(this.state.strokeWidth, color);
            this.updateInputText();

          }}
          onSelectTextSize={(size) => this.onTextSize(size)}
          onSelectBrushSize={(brushSize) => this.onBrushSize(brushSize)}
          toolbarHeight={this.state.toolbarHeight}
          onToolbarHeightChange={(toolbarHeight) => {
            this.setState({ toolbarHeight }, () => this.state.windowSize && this.reflectWindowSize(this.state.windowSize))
          }}
        />
        {
          this.state.showTextInput &&
          this.getTextInput(this.a2cW(this.state.xText), this.a2cH(this.state.yText))
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
        scale={1.0}
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
          height: DRAG_ICON_SIZE
        }}>
        <Icon name='filter-none' size={DRAG_ICON_SIZE} style={{ transform: [{ rotate: '-90deg' }] }} />
      </View>

    </View>
  }

  getTextInput = (x, y) => {
    trace("getTextInput width:", this.getTextWidth(), "fontSize", this.normalizeTextSize(this.state.fontSize))
    this._handleInputTextLocationMovingPage(this.state.keyboardHeight, this.state.keyboardTop);
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
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  canvas: {
    flex: 1,
    backgroundColor: 'transparent'
  }
}
);