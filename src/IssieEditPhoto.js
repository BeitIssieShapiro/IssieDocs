import React, { useRef } from 'react';
import {
  AppRegistry, StyleSheet, TextInput, View,
  Text, Alert, PanResponder, Keyboard, PixelRatio, Dimensions, ActivityIndicator,
  Animated
} from 'react-native';

import { Icon } from "./elements"
import RNSketchCanvas from 'issie-sketch-canvas';
import Share from 'react-native-share';
import DoQueue from './do-queue';

import {
  Spacer, getRoundedButton,
  renderMenuOption, IDMenuOptionsStyle, globalStyles, getFont
} from './elements'
import { getNewPage, SRC_CAMERA, SRC_GALLERY, SRC_RENAME } from './newPage';
import ProgressCircle from 'react-native-progress-circle'
import { fTranslate, getRowDirections, isRTL } from './lang.js'

import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu';

import {
  colors, getImageDimensions,
  AppText,
  semanticColors, dimensions
} from './elements'
import { translate } from './lang';
import { setNavParam } from './utils';
import { FileSystem } from './filesystem';
import { trace } from './log';
import { calcDistance, pinchEnd, processPinch, processResize } from './pinch';
import EditorToolbar from './editor-toolbar';
import { getElementMovePanResponder } from './editors-panresponders';

const shareTimeMs = 2000;

const TOP = 0, RIGHT = 1, BOTTOM = 2, LEFT = 3;
const DEFAULT_STROKE_WIDTH = 5;
const MAX_STROKE_WIDTH = 12;
const DRAG_ICON_SIZE = 45;
const initialImageSize = 120
const Modes = {
  IMAGE: 1,
  TEXT: 2,
  BRUSH: 3,
  ERASER: 4,
}



/**
 * scaleRatio: affects the size of the viewPort which == pageRect if zoom=0
 * once zoom is applied the scaleRatio is not a factor. viewPort may change, but pageRect stays untouched
 */

export default class IssieEditPhoto extends React.Component {

  constructor() {
    super();

    this.Load = this.Load.bind(this);
    this.canvas = React.createRef(null);

    this.toolbarRef = React.createRef(null);

    this._panResponderElementMove = getElementMovePanResponder({
      getState: () => this.state,
      onMoveElement: (moveObj) => {

        const doMove = (obj) => {
          if (this.isImageMode()) {
            if (this.state.currentImageElem) {
              const x = (moveObj.x - this.state.xOffset) / this.state.zoom;
              const y = (moveObj.y - this.state.yOffset) / this.state.zoom;
              let fingerOffsetX = 0;
              let fingerOffsetY = 0;
              if (!this.state.moveElemState) {
                // set the finger offset of image

                fingerOffsetX = x - this.state.currentImageElem.position.x;
                fingerOffsetY = y - this.state.currentImageElem.position.y;
                this.setState({
                  moveElemState: {
                    dx: fingerOffsetX,
                    dy: fingerOffsetY
                  }
                })
              } else {
                fingerOffsetX = this.state.moveElemState.dx;
                fingerOffsetY = this.state.moveElemState.dy;
              }
              this.moveCurrentImage(x - fingerOffsetX, y - fingerOffsetY);
            }
          }
          this.changeZoomOrOffset({
            xText: moveObj.x,
            yText: moveObj.y,
            yOffset: moveObj.yOffset,
            xOffset: moveObj.xOffset
          });
        }

        if (moveObj.repeat) {
          if (this.repeatMovement) {
            clearInterval(this.repeatMovement)
          }
          this.repeatMovement = setInterval(() => {
            if (moveObj.repeat.xOffset) {
              moveObj.xOffset += moveObj.repeat.xOffset;
            }
            if (moveObj.repeat.yOffset) {
              moveObj.yOffset += moveObj.repeat.yOffset;
            }
            doMove(moveObj)
          }, 40)

        } else if (this.repeatMovement) {
          clearInterval(this.repeatMovement);
          this.repeatMovement = undefined;
        }
        doMove(moveObj);
      },
      shouldMoveElement: () => {
        const ret = (this.isTextMode() && this.state.showTextInput ||
          this.isImageMode() && this.state.currentImageElem)
        return !!ret;
      },

      screen2ViewPortX: (x) => this.screen2ViewPortX(x),
      screen2ViewPortY: (y) => this.screen2ViewPortY(y),
      onRelease: () => {

        this.setState({ moveElemState: undefined });
        if (this.repeatMovement) {
          clearInterval(this.repeatMovement)
          this.repeatMovement = undefined;
        }
        if (this.isTextMode()) {
          this.SaveText(false, true);
        } else if (this.isImageMode()) {
          this.SaveImageAfterMove();
        }
      },
      dragIconSize: DRAG_ICON_SIZE,
      rtl: isRTL(),

    })

    this._panResponderElementResize = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => this.state.currentImageElem,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => this.state.currentImageElem,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => false,
      onPanResponderMove: (evt, gestureState) => {

        if (this.isImageMode()) {
          const newSize = processResize(this, gestureState.dx, gestureState.dy);
          this.resizeCurrentImage(newSize);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {

        const newSize = processResize(this, gestureState.dx, gestureState.dy);
        pinchEnd(this);
        if (this.isImageMode()) {
          this.SaveImageAfterResize(newSize);
        }
      }
    });




    this._panResponderMove = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => this._shouldMove(evt, gestureState),
      onStartShouldSetPanResponderCapture: (evt, gestureState) => false,//this._shouldMove(evt, gestureState),
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => false,//this._shouldMove(evt, gestureState),

      onMoveShouldSetPanResponder: (evt, gestureState) => false, //this._shouldMove(evt, gestureState),
      onPanResponderTerminationRequest: (evt, gestureState) => !this._shouldMove(evt, gestureState),
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        let touches = evt.nativeEvent.touches;
        if (touches.length == 2) {
          this._pinch = true;
          processPinch(this,
            touches[0].pageX, touches[0].pageY,
            touches[1].pageX, touches[1].pageY,
            (state) => this.changeZoomOrOffset(state));
          return
        }
        if (touches.length == 1 && this.state.showTextInput) {// && Math.abs(touches[0].dy) > 2) {
          this._pinch = true;
          trace("move with one finger")
          processPinch(this,
            touches[0].pageX, touches[0].pageY,
            touches[0].pageX + 1, touches[0].pageY + 1,
            (state) => this.changeZoomOrOffset(state));
          return
        }

      },
      onPanResponderRelease: (evt, gestureState) => {

        if (this._pinch) {
          this._pinch = false;

          pinchEnd(this)
          return
        }

        if (Math.abs(gestureState.dx) < 3 && Math.abs(gestureState.dy) < 3) {
          //no move - click
          this.canvasClick(evt)
        }
        this.setState({
          yOffsetBegin: undefined
        });
      }
    });

    const windowSize = Dimensions.get("window");
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
      windowSize,
      viewPortRect: {
        top: 0,
        left: 0,
        width: windowSize.width,
        height: windowSize.height,
      },
      pageRect: {
        top: 0,
        left: 0,
        width: windowSize.width,
        height: windowSize.height,
      },

      inputTextHeight: 40,
      inputTextWidth: 0,
      canvasTexts: [],
      zoom: 1.0,
      minZoom: 1,
      maxZoom: 3,
      isZooming: false,
      scaleRatio: 1.0,
      // The offset of the actual image from the viewPort - not sensitive to zoom?
      xOffset: 0,
      yOffset: 0,

      viewPortXOffset: new Animated.Value(0),
      viewPortYOffset: new Animated.Value(0),



      // the viewPorts coordinates of the textBox or imageRect
      xText: 0,
      yText: 0,
      keyboardHeight: 0,
      needCanvasUpdate: false,
      needCanvasDataSave: false,
      needCanvasUpdateTextOnly: false,
      sharing: false
    }

  }


  screen2ViewPortX = (x) => x - this.state.sideMargin;
  screen2ViewPortY = (y) => y - this.state.toolbarHeight - dimensions.toolbarMargin - this.props.route.params.headerHeight;



  changeZoomOrOffset = (obj, animateMove) => {
    const stateChange = { ...obj }

    trace("changeZoomOrOffset",
      "change",
      stateChange,
      "zoom",
      this.state.zoom,
      "page", this.state.pageRect,
      "view",
      this.state.viewPortRect,

    )

    const pageRect = {
      width: this.state.pageRect.width * this.state.zoom,
      height: this.state.pageRect.height * this.state.zoom,
    }

    if (obj.xOffset !== undefined) {
      if (obj.xOffset > 0) {
        // hit left
        obj.xOffset = 0;
      } else {
        const diff = pageRect.width - (-obj.xOffset + this.state.viewPortRect.width);

        if (diff < 0) {
          trace("changeZoomOrOffset - hit right", this.state.zoom, this.state.pageRect.width)
          obj.xOffset = this.state.viewPortRect.width - pageRect.width;
        }
      }
      stateChange.xOffset = obj.xOffset;
    }

    if (obj.yOffset !== undefined) {
      if (obj.yOffset > 0) {
        // hit top
        trace("changeZoomOrOffset - hit top")
        obj.yOffset = 0;
      }
      const yOffsetLimit = (-obj.yOffset + this.state.viewPortRect.height - this.state.keyboardHeight);
      if (pageRect.height - yOffsetLimit < 0) {
        // hit bottom
        trace("changeZoomOrOffset - hit bottom", obj.yOffset, yOffsetLimit)
        obj.yOffset = - pageRect.height + this.state.viewPortRect.height - this.state.keyboardHeight;
      }

      stateChange.yOffset = obj.yOffset;
    }

    if (obj.zoom) {
      if (obj.zoom < this.state.minZoom) {
        obj.zoom = this.state.minZoom;
      } else if (obj.zoom > this.state.maxZoom) {
        obj.zoom = this.state.maxZoom;
      }

      //adjust view port to zoom:

      stateChange.sideMargin = Math.max((this.state.windowSize.width - this.state.pageRect.width * obj.zoom) / 2, dimensions.minSideMargin);
      stateChange.viewPortRect = {
        top: this.state.viewPortRect.top,
        //height: this.state.viewPortRect.height,
        height: Math.min(this.state.windowSize.height
          - this.state.toolbarHeight
          - 2 * dimensions.toolbarMargin, pageRect.height),
        left: stateChange.sideMargin,
        width: this.state.windowSize.width - 2 * stateChange.sideMargin
      }
      trace("viewport change", stateChange.viewPortRect)
      stateChange.zoom = obj.zoom;

      if (stateChange.zoom === 1) {
        stateChange.xOffset = 0;
        if (this.state.keyboardHeight === 0) {
          stateChange.yOffset = 0;
        }
      }
    }

    // Adjust xText, yText
    if (obj.xText == undefined) {
      // only adjust xText if not provided
      let normXText = this.state.xText
      if (stateChange.xOffset != undefined) {
        normXText -= this.state.xOffset;
      }
      if (stateChange.zoom) {
        normXText = normXText / this.state.zoom * stateChange.zoom;
      }
      if (stateChange.xOffset != undefined) {
        normXText += stateChange.xOffset;
      }
      stateChange.xText = normXText;
    }

    if (obj.yText == undefined) {
      // only adjust yText if not provided
      let normYText = this.state.yText
      if (stateChange.yOffset != undefined) {
        normYText -= this.state.yOffset;
      }
      if (stateChange.zoom) {
        normYText = normYText / this.state.zoom * stateChange.zoom;
      }
      if (stateChange.yOffset != undefined) {
        normYText += stateChange.yOffset;
      }
      stateChange.yText = normYText;
      trace("change yText", stateChange.yText, stateChange.yOffset)
    }

    if (stateChange.xOffset != undefined) {
      if (animateMove) {
        Animated.timing(this.state.viewPortXOffset, {
          toValue: stateChange.xOffset,
          duration: 400,
          useNativeDriver: false,
        }).start();

      } else {
        this.state.viewPortXOffset.setValue(stateChange.xOffset);
      }
    }
    if (stateChange.yOffset != undefined) {
      if (animateMove) {
        Animated.timing(this.state.viewPortYOffset, {
          toValue: stateChange.yOffset,
          duration: 400,
          useNativeDriver: false,
        }).start();
      } else {
        this.state.viewPortYOffset.setValue(stateChange.yOffset);
      }
    }

    this.setState(stateChange);
  }


  isTextMode = () => this.state.mode === Modes.TEXT;
  isBrushMode = () => this.state.mode === Modes.BRUSH;
  isImageMode = () => this.state.mode === Modes.IMAGE;
  isEraserMode = () => this.state.mode === Modes.ERASER;



  _shouldMove = (evt, gestureState) => {
    //trace("should pinch?");
    if (evt.nativeEvent.touches.length >= 2) {
      trace("would pinch");
      return true;
    } else if (this.isTextMode()) {
      if (this.state.showTextInput) {
        return true;
      }
      return !this.state.showTextInput;//
    } else if (this.isImageMode()) {



      return true;
    } else if (this.isBrushMode()) {
      return false;
    }

    trace("would NOT pinch/move!");
    return false;
  }

  _keyboardDidShow = (e) => {


    let kbTop = this.screen2ViewPortY(e.endCoordinates.screenY)

    //ignore the part of keyboard that is below the canvas
    let kbHeight = e.endCoordinates.height - dimensions.toolbarMargin;

    // if there's room below image, reduce it
    const emptyBottomSpace = (this.state.windowSize.height - this.state.toolbarHeight -
      dimensions.toolbarMargin - this.state.viewPortRect.height);

    this.setState({
      keyboardHeight: Math.max(kbHeight - emptyBottomSpace, 0), keyboardTop: kbTop,
    });

    this._handleInputTextLocationMovingPage(kbHeight, kbTop);
  }

  _handleInputTextLocationMovingPage = (kbHeight, kbTop) => {
    if (!kbHeight || !kbTop)
      return;

    let yOffset = this.state.yOffset;

    // if keyboard hides the textInput, scroll the window
    if (this.state.showTextInput) {

      let diff = (this.state.yText + this.state.inputTextHeight) - kbTop;
      if (diff > 0) {
        trace("scroll due to keyboard", this.state.inputTextHeight)
        yOffset -= diff;
      }

      if (yOffset !== this.state.yOffset) {
        this.setState({
          yOffset,
          yText: this.state.yText - diff
        });
        // trace("animate", "to", yOffset)
        // Animated.timing(this.state.viewPortYOffset, {
        //   toValue: yOffset,
        //   duration: 200,
        //   useNativeDriver: false,
        // }).start();
        this.state.viewPortYOffset.setValue(yOffset);

      }
    }
  }

  _keyboardDidHide = (e) => {

    if (this.state.showTextInput) {
      this.setState({ showTextInput: false }, () => this.SaveText(true));
    }

    this.setState({ keyboardTop: -1, keyboardHeight: 0, showTextInput: false, yOffset: this.state.zoom === 1 ? 0 : this.state.yOffset });

    Animated.timing(this.state.viewPortYOffset, {
      toValue: this.state.zoom === 1 ? 0 : this.state.yOffset,
      duration: 1000,
      useNativeDriver: false,
    }).start();

  }

  componentDidMount = async () => {
    this._mounted = true;
    const page = this.props.route.params.page;
    const currentFile = page.defaultSrc;
    trace("EditPhoto CurrentFile: ", currentFile);
    if (page.count > 0) {
      setNavParam(this.props.navigation, 'pageTitleAddition', this.pageTitleAddition(page.count, 0));
    }
    setNavParam(this.props.navigation, 'onMoreMenu', () => this.menu.open())
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);

    const metaDataUri = currentFile + ".json";
    //const betaFeatures = this.props.route.params.betaFeatures;
    this.setState({ page: page, currentFile: currentFile, currentIndex: 0, metaDataUri: metaDataUri },
      () => this.Load());
  }

  componentWillUnmount = () => {
    this._mounted = false;
    if (this.keyboardDidShowListener) {
      this.keyboardDidShowListener.remove()
    }
    if (this.keyboardDidHideListener) {
      this.keyboardDidHideListener.remove()
    }

    trace("save before exit")
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

  doExport = (resolve, reject) => {
    if (this.canvas == null) return;
    this.canvas.current.getBase64(
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
        this.setState({ needCanvasUpdate: true, needCanvasDataSave: false });
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
            this.canvas.current?.export("jpg", { width: 80, height: 120 }, (err, path) => {
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


  canvasClick = (ev) => {


    let x = this.screen2ViewPortX(ev.nativeEvent.pageX);
    let y = this.screen2ViewPortY(ev.nativeEvent.pageY);
    trace("canvasClick x: ", x, ",y: ", y)
    trace("yOffset", this.state.yOffset,
      "zoom", this.state.zoom,
      "scaleRatio", this.state.scaleRatio)
    this.toolbarRef.current.closePicker();


    if (this.isTextMode()) {

      //y -= this.state.fontSize / 2;
      let needCanvasUpdate = false;

      if (this.state.showTextInput) {
        //a text box is visible and a click was pressed - save the text box contents first:
        needCanvasUpdate = this.SaveText();
      }


      let textElemIndex = this.findElementByLocation({
        x: this.viewPort2NormX(x),
        y: this.viewPort2NormY(y)
      });

      //in erase mode, only act on found texts
      if (textElemIndex < 0 && this.state.eraseMode) return;

      let initialText = '';
      let fontSize = this.state.fontSize;
      let fontColor = this.state.color;
      let inputTextWidth = 0;
      let inputTextHeight = this.normFontSize2FontSize(this.state.fontSize);
      let textElem = undefined;
      if (textElemIndex >= 0) {
        textElem = this.state.canvasTexts[textElemIndex];



        //convert to rtl text:
        if (textElem.rtl == undefined || textElem.rtl !== isRTL()) {
          trace("convert", textElem.normPosition)
          const newNorm = { y: textElem.normPosition.y }
          if (textElem.rtl == undefined) {
            newNorm.x = textElem.normPosition.x + (isRTL() ? textElem.width : 0);
          }
          else {
            newNorm.x = textElem.normPosition.x + (isRTL() ? textElem.width : -textElem.width);
          }
          textElem.normPosition = newNorm;
          textElem.rtl = isRTL();
        }

        initialText = textElem.text;
        fontSize = textElem.normFontSize
        fontColor = textElem.fontColor;
        inputTextWidth = textElem.width;
        inputTextHeight = textElem.height * this.state.scaleRatio;
      }

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
        xText: textElemIndex >= 0 ? this.norm2viewPortX(textElem.normPosition.x) : x,
        yText: textElemIndex >= 0 ? this.norm2viewPortY(textElem.normPosition.y) : y,
      }, () => {

        if (this.state.eraseMode) {
          this.SaveText();
        }
      });
    } else if (this.isImageMode()) {
      let imgElem = undefined;

      let imageElemIndex = this.findElementByLocation({
        x: this.viewPort2NormX(x), //this.state.scaleRatio,
        y: this.viewPort2NormY(y) //this.state.scaleRatio
      });
      if (imageElemIndex >= 0) {

        imgElem = this.state.canvasImages[imageElemIndex];

        // In Erase mode, remove the img
        // if (this.isImageMode()) {
        //   this.state.queue.pushDeleteImage({ id: imgElem.id })
        //   this.setState({
        //     currentImageElem: undefined,
        //     needCanvasUpdate: true,
        //     needCanvasDataSave: true,
        //   });
        //   return;
        // }

        x = Math.round(imgElem.position.x) + imgElem.width;
        y = Math.round(imgElem.position.y);
      }
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

    //console.trace();

    if ((!text || text.length == 0) && origElem === undefined) return false;

    let txtWidth = this.state.inputTextWidth *  this.state.scaleRatio;
    let txtHeight = this.state.inputTextHeight / this.state.scaleRatio;

    let newElem = this.getTextElement(text, txtWidth, txtHeight);
    if (origElem) {
      if (origElem.text == newElem.text &&
        Math.abs(origElem.normPosition.x - newElem.normPosition.x) <= 5 &&
        Math.abs(origElem.normPosition.y - newElem.normPosition.y) <= 5 &&
        origElem.normFontSize == newElem.normFontSize &&
        origElem.fontColor == newElem.fontColor //&&
        //Math.abs(origElem.width - newElem.width) <= 2
      ) {
        //need to set the current text back to canvas
        trace("txt no change")
        if (!afterDrag) {
          this.setState({
            needCanvasUpdate: true,
            needCanvasUpdateTextOnly: true
          });
        }
        return false;
      }
      trace("txt changed", origElem, newElem)
    }
    if (afterDrag)
      return;

    this.state.queue.pushText(newElem);
    if (beforeExit) {
      this.Save();
      //return false;
    }
    this.setState({
      needCanvasUpdate: true, needCanvasDataSave: true,
      needCanvasUpdateTextOnly: true
    });
    return true;
  }

  findElementByLocation = (normXY) => {
    let q = this.isImageMode() ? this.state.canvasImages : this.state.canvasTexts;
    //let posField = this.isImageMode() ? "position" : "normPosition";
    const margin = this.isTextMode() && this.fontSize > 60 ? 0 : 5 / this.state.scaleRatio


    for (let i = q.length - 1; i >= 0; i--) {
      const elem = this.isImageMode() ? this.imageScale2Norm(q[i]) : q[i];

      trace("findElementByLocation", elem.text)
      trace("np", elem.normPosition.x, elem.normPosition.y)
      trace("normXY", normXY.x, normXY.y)
      trace("height", elem.height, "width", elem.width)

      const elemY = elem.normPosition.y;
      const normHeight = elem.height;/// this.state.scaleRatio;
      // trace("y-params",
      //   "elemY < normXY.y + 10 + margin", (elemY < normXY.y + 10 + margin) ? true : false,
      //   elemY, normXY.y,
      //   "elemY + elem.height > normXY.y + 10 - margin", (elemY + elem.height > normXY.y + 10 - margin) ? true : false)
      let foundY = elemY < normXY.y + 10 + margin && elemY + normHeight > normXY.y + 10 - margin;
      trace("findElementByLocation eng", elem.text, foundY ? "foundY " + elem.text : "notFoundY")
      const normWidth = elem.width;// /  this.state.scaleRatio;

      if (elem.rtl) {
        //todo - fix
        if (elem.normPosition.x > normXY.x - margin &&
          elem.normPosition.x - normWidth < normXY.x + margin
          && foundY) {
          return i;
        }
      } else {
        if (elem.normPosition.x < normXY.x + margin &&
          elem.normPosition.x + normWidth > normXY.x - margin
          && foundY) {
          trace("findElementByLocation eng found!")
          return i;
        }
      }
    }

    return -1;
  }

  getTextElement = (newText, width, height) => {
    const rtl = isRTL();
    const newTextElem = { text: newText, width, height: height }
    if (this.state.currentTextElem) {
      newTextElem.id = this.state.currentTextElem.id;
    } else {
      newTextElem.id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    }

    newTextElem.anchor = { x: 0, y: 0 };
    newTextElem.normPosition = {
      x: this.viewPort2NormX(this.state.xText),
      y: this.viewPort2NormY(this.state.yText),
    };
    newTextElem.alignment = rtl ? 'Right' : 'Left';
    newTextElem.rtl = rtl;
    newTextElem.fontColor = this.state.color;
    newTextElem.normFontSize = this.state.fontSize;
    newTextElem.font = getFont();
    return newTextElem;
  }

  viewPort2NormX = (x) => ((x - this.state.xOffset) / this.state.zoom) / this.state.scaleRatio;
  viewPort2NormY = (y) => ((y - this.state.yOffset) / this.state.zoom) / this.state.scaleRatio;

  norm2viewPortX = (x) => (x * this.state.scaleRatio * this.state.zoom + this.state.xOffset);
  norm2viewPortY = (y) => (y * this.state.scaleRatio * this.state.zoom + this.state.yOffset);

  getImageElement = (imageData, ratio) => {
    let newImageElem = {
      id: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
    };

    const initialImageSizeScaled = initialImageSize / this.state.scaleRatio;
    //newImageElem.anchor = { x: 0, y: 0 };
    newImageElem.normPosition = {
      x: (this.state.viewPortRect.width / 2 / this.state.scaleRatio - initialImageSizeScaled / 2 - this.state.xOffset) / this.state.zoom,
      y: (this.state.viewPortRect.height / 2 / this.state.scaleRatio - initialImageSizeScaled / 2 - this.state.yOffset) / this.state.zoom,
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

    // x = this.viewPort2NormX(x) 
    // y = this.viewPort2NormY(y) 

    const scalePos = {
      id: imgElem.id,
      width: imgElem.width,
      height: imgElem.height,
      position: { x: x, y },
    }

    if (this.state.currentImageElem) {
      this.canvas?.current.setCanvasImagePosition(scalePos)
    }
    const newScaleElem = {
      ...imgElem,
      position: scalePos.position,
      normPosition: {
        x: scalePos.position.x / this.state.scaleRatio,
        y: scalePos.position.y / this.state.scaleRatio,
      }

    }
    // const normElem = this.imageScale2Norm(newScaleElem)
    // newScaleElem.normPosition = normElem.normPosition;

    this.setState({
      currentImageElem: newScaleElem
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
      needCanvasDataSave: true,
      needCanvasUpdateImageSizeOnly: true,
    });

  }

  resizeCurrentImage = ({ width, height, x, y }) => {

    let imgElem = this.state.currentImageElem;
    if (!imgElem)
      return;

    const scalePos = {
      id: imgElem.id,
      width,
      height,
      position: imgElem.position,
    }
    this.canvas.current?.setCanvasImagePosition(scalePos);

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
      needCanvasDataSave: true,
    });
    return true;

  }

  UpdateCanvas = () => {
    const canvas = this.canvas.current

    if (!this._mounted || !canvas)
      return;

    const forceFullRedraw = false;

    if (!this.state.needCanvasUpdateTextOnly || forceFullRedraw) {
      canvas.clear();
    }

    if (!this.state.needCanvasUpdateImageSizeOnly || forceFullRedraw) {
      canvas.clearImages();
    }
    trace("UpdateCanvas", "ratio", this.state.scaleRatio, "zoom", this.state.zoom)
    let q = this.state.queue.getAll();
    //Alert.alert("before\n"+JSON.stringify(q))
    let canvasTexts = [];
    let canvasImages = [];
    for (let i = 0; i < q.length; i++) {
      if (q[i].type === 'text') {
        const txtElem = this.txtElemNorm2Scale(q[i].elem)

        //first try to find same ID and replace, or add it
        let found = false;

        for (let j = 0; j < canvasTexts.length; j++) {
          if (canvasTexts[j].id === txtElem.id) {
            canvasTexts[j] = txtElem;
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
    if (this.state.needCanvasUpdateImageSizeOnly && !forceFullRedraw) {
      canvasImages.map(({ imageData, normPosition, ...imgPos }) => imgPos).forEach(ci => {
        canvas.setCanvasImagePosition(ci)
      });
    } else {
      canvasImages.forEach(ci => canvas.addOrSetCanvasImage(ci));
    }

    if (this.state.needCanvasDataSave) {
      setTimeout(() => this.Save(), 100);
    }

    trace("u-texts", canvasTexts);

    this.setState({
      canvasTexts, canvasImages, needCanvasUpdate: false,
      needCanvasDataSave: false, needCanvasUpdateTextOnly: false,
      needCanvasUpdateImageSizeOnly: false,
      lastCanvasScaleRatio: this.state.scaleRatio
    });

  }

  txtElemNorm2Scale = (txtElem) => {
    const scaleElem = {
      ...txtElem
    }
    if (scaleElem.normFontSize === undefined) {
      //migrate elem
      scaleElem.normFontSize = scaleElem.fontSize;
      //add some to width to compensate  - todo follow - this is questionable
      //scaleElem.width += 15;
    }

    scaleElem.fontSize = this.normFontSize2FontSize(scaleElem.normFontSize)
    scaleElem.position = {
      x: scaleElem.normPosition.x * this.state.scaleRatio,
      y: scaleElem.normPosition.y * this.state.scaleRatio,
    };
    //add some to width to compensate  - todo follow - this is questionable
    //scaleElem.width += 15;
    //trace("txtElemNorm2Scale", scaleElem)
    return scaleElem;
  }

  fontSize4Toolbar = (fontSize) => {
    return this.normFontSize2FontSize(fontSize);
  }


  normFontSize2FontSize = (normFontSize) => {

    const map = {
      f25: 25.6,
      f30: 21,
      f35: 18,
      f40: 16,
      f45: 14.1,
      f55: 13.2,
      f65: 12.3,
      f75: 11.5,
      f85: 10.7,
      f95: 10,
      f105: 9.3,
      f115: 8.6,
      f125: 8,
      f135: 7.5,
      f145: 7,
      f155: 6.5,
      f165: 6,
      f175: 5.7,
      f185: 5.4,
      f195: 5.1,
      f205: 4.8,
      f215: 4.6,
      f225: 4.4,
      f235: 4.2,
      f245: 4,
      f255: 3.8,
      f275: 3.6,
      f285: 3.4,
      f295: 3.2,
      f305: 3
    }

    const y = map["f" + normFontSize];
    if (y == undefined) {
      return 30;
    }
    const h = this.state.imageSize ? this.state.imageSize.w : 1000;
    //trace("font factor", normFontSize, y, (h / y) * this.state.scaleRatio)
    return (h / y) * this.state.scaleRatio;
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
    //trace("imageScale2Norm", JSON.stringify(imgElem))
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
    trace("set text size", size)
    this.setState({
      fontSize: size, showTextSizePicker: false, eraseMode: false
    });
    this.updateInputText();
    this.onEraserChange(true);
  }

  onEraserButton = () => {

    if (this.isImageMode()) return;

    if (!this.state.eraseMode && this.isTextMode()) {
      this.onBrushMode();
    }
    this.onEraserChange();
  }

  onAddImage = (src) => {
    getNewPage(src,
      (uri) => {
        this.setState({ showBusy: true })
        //trace("image in base64", uri.length)
        // this.setState({ icon: uri})
        getImageDimensions(uri).then((imgSize) => {
          const ratio = imgSize.w / imgSize.h;
          FileSystem.main.resizeImage(uri, Math.round(this.state.viewPortRect.width / 1.5), this.state.viewPortRect.height / 1.5)
            .then(uri2 => FileSystem.main.convertImageToBase64(uri2))
            .then(imgBase64 => {

              const img = this.getImageElement(imgBase64, ratio)
              this.state.queue.pushImage(img)
              const scaleImg = this.imageNorm2Scale(img)
              this.setState({
                needCanvasUpdate: true, needCanvasDataSave: true,
                currentImageElem: scaleImg,
                //xText: Math.round(scaleImg.position.x), yText: Math.round(scaleImg.position.yText)
              });
            })
        }).finally(() => this.setState({ showBusy: false }));
      },
      //cancel
      () => {
        this.setState({ showBusy: false })
      },
      (err) => Alert.alert("Error", err.description),
      this.props.navigation,
      {
        selectionLimit: 1,
        //  quality: 0.8 
      });
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
    this.canvas.current?.setState({ strokeWidth, color });
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
    }, () => {
      this.reflectWindowSizeAndImageSize();
      this.Load();
    });
  }


  onLayout = async (e) => {
    if (!this._mounted)
      return;

    let windowSize = e.nativeEvent.layout;

    this.setState({ windowSize, zoom: 1, yOffset: 0, xOffset: 0 },
      () => this.reflectWindowSizeAndImageSize());
  }

  reflectWindowSizeAndImageSize = () => {
    const windowSize = this.state.windowSize;
    const sideMargin = Math.max(dimensions.minSideMargin, Math.floor(windowSize.width * .05))


    const maxWidth = windowSize.width - sideMargin * 2;
    const maxHeight = windowSize.height - this.state.toolbarHeight - 2 * dimensions.toolbarMargin;

    getImageDimensions(this.state.currentFile).then(imageSize => {

      // Need to calculate the layout that has lower ratio.

      const ratioX = maxWidth / imageSize.w;
      const ratioY = maxHeight / imageSize.h;


      let ratio = Math.min(ratioX, ratioY);

      ratio = Math.floor((ratio + Number.EPSILON) * 100) / 100;

      let xOffset = this.state.xOffset;
      let yOffset = this.state.yOffset;
      if (ratio != this.state.scaleRatio) {
        xOffset = xOffset / this.state.scaleRatio * ratio;
        yOffset = yOffset / this.state.scaleRatio * ratio;
      }

      //trace("getImageDimensions", this.state.currentFile, "imageSize", imageSize, "ratio", ratio)

      const sideMargin = (windowSize.width - imageSize.w * ratio) / 2
      trace("sideMergin", sideMargin);
      const viewPortRect = {
        top: 0,
        left: sideMargin,
        width: imageSize.w * ratio,
        height: imageSize.h * ratio
      }

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

      trace("x-rotate")
      this.setState({
        imageSize,
        viewPortRect,
        pageRect: viewPortRect,
        sideMargin,
        scaleRatio: ratio,
        needCanvasUpdate: true,
        needCanvasDataSave: false,
        xText, yText,
        currentImageElem: imgElem,
      });
      this.changeZoomOrOffset({ zoom: this.state.zoom, xOffset, yOffset });


    }).catch(err => {
      Alert.alert("Error measuring image dimension:" + err.message)
    })
  }

  doZoom = (delta) => {
    let newZoom = this.state.zoom + delta;
    this.changeZoomOrOffset({ zoom: newZoom, xOffset: this.state.xOffset, yOffset: this.state.yOffset });
  }

  render() {
    const { row, rowReverse, flexEnd, textAlign, rtl, direction } = getRowDirections();

    return (
      <View style={styles.mainContainer}
        onLayout={this.onLayout}>

        <EditorToolbar
          ref={this.toolbarRef}
          windowSize={this.state.windowSize}
          onGoBack={() => this.props.navigation.goBack()}
          onUndo={() => {
            this.state.queue.undo();
            this.setState({ needCanvasUpdate: true, needCanvasDataSave: true, currentImageElem: undefined });
          }}
          canRedo={this.state.queue.canRedo()}
          onRedo={() => {
            this.state.queue.redo();
            this.setState({ needCanvasUpdate: true, needCanvasDataSave: true });
          }}
          fontSize4Toolbar={this.fontSize4Toolbar}
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
            if (!(this.state?.canvasImages?.length > 0)) {
              this.toolbarRef.current.openImageSubMenu();
            } else if (this.state.canvasImages.length == 1) {
              this.setState({ currentImageElem: this.state.canvasImages[0] })
            }
          }}
          onAddImageFromGallery={() => this.onAddImage(SRC_GALLERY)}
          onAddImageFromCamera={() => this.onAddImage(SRC_CAMERA)}
          onBrushMode={() => this.onBrushMode()}

          isTextMode={this.isTextMode()}
          isImageMode={this.isImageMode()}
          isBrushMode={!this.isTextMode() && !this.isImageMode()}
          fontSize={this.state.fontSize}
          color={this.state.color}
          strokeWidth={this.state.strokeWidth}

          sideMargin={this.state.sideMargin}
          // betaFeatures={this.state.betaFeatures}

          onSelectColor={(color) => {
            this.setState({ color, eraseMode: false })
            this.updateBrush(this.state.strokeWidth, color);
            this.updateInputText();

          }}
          onSelectTextSize={(size) => this.onTextSize(size)}
          onSelectBrushSize={(brushSize) => this.onBrushSize(brushSize)}
          toolbarHeight={this.state.toolbarHeight}
          onToolbarHeightChange={(toolbarHeight) => {
            this.setState({ toolbarHeight }, () => this.reflectWindowSizeAndImageSize())
          }}
          onFloatingMenu={(size) => this.setState({ floatingMenuHeight: size })}
        />
        {/** Top Margin */}
        <View style={styles.topMargin} />


        {/** NavigationArea */}
        <View style={styles.navigationArea}>
          {this.state.showBusy && <View style={globalStyles.busy}>
            <ActivityIndicator size="large" /></View>}
          {/* page more menu */}
          <View style={[{ position: 'absolute', top: 0 }, rtl ? { left: 0 } : { right: 0 }]}>
            {this.getMoreMenu()}
          </View>
          {[
            this.getArrow(LEFT),
            this.getArrow(TOP),
            this.getArrow(RIGHT),
            this.getArrow(BOTTOM)
          ]}

          <View {...this._panResponderMove.panHandlers} style={[styles.leftMargin, {
            width: this.state.sideMargin,
          }]} />
          <View {...this._panResponderMove.panHandlers} style={[styles.rightMargin, {
            width: this.state.sideMargin,
          }]} />

          <View style={[styles.viewPort, {
            top: this.state.viewPortRect.top,
            height: this.state.viewPortRect.height,
            width: this.state.viewPortRect.width, //Math.max(this.state.viewPortRect.width * this.state.zoom, this.state.windowSize.width),
            left: this.state.sideMargin,
          }, {
          }]}  {...this._panResponderMove.panHandlers} >
            <Animated.View
              style={{
                zIndex: 1,
                // left: this.state.xOffset,
                // top: this.state.yOffset,
                left: this.state.viewPortXOffset,
                top: this.state.viewPortYOffset,
                width: this.state.pageRect.width,
                height: this.state.pageRect.height,
                backgroundColor: 'gray',
                alignSelf: 'flex-start',
                justifyContent: 'flex-start',
                transform: this.getTransform(this.state.pageRect.width, this.state.pageRect.height, this.state.zoom)
              }}

            >
              {this.state.sharing &&
                <View style={{ position: 'absolute', top: '25%', left: 0, width: this.state.viewPortRect.width, zIndex: 1000, backgroundColor: 'white', alignItems: 'center' }}>

                  <ProgressCircle
                    radius={150}
                    color="#3399FF"
                    shadowColor="#999"
                    bgColor="white"
                    percent={this.state.shareProgress}
                    borderWidth={5} >
                    <Text style={{ zIndex: 100, fontSize: 25 }}>{fTranslate("ExportProgress", this.state.shareProgressPage, (this.state.page.count > 0 ? this.state.page.count : 1))}</Text>
                  </ProgressCircle>
                </View>}
              {this.getCanvas()}
            </Animated.View>
            {this.state.showTextInput && this.getTextInput(rtl, rowReverse)}
            {this.state.currentImageElem && this.isImageMode() && this.getImageRect()}
          </View>

          {/** Bottom Margin */}
          <View style={styles.bottomMargin} />

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
        </View>
      </View >
    );
  }

  getTransform = (width, height, scale, isRtl) => {
    const neg = isRtl ? -1 : 1;
    return [
      { scale: scale },
      { translateX: neg * ((scale - 1) * width / 2) / scale },
      { translateY: ((scale - 1) * height / 2) / scale }
    ]
  }

  getMoreMenu = () => {
    const rtl = isRTL();
    return <Menu ref={(ref) => this.menu = ref} >


      <MenuTrigger >
        {/* {getIconButton(() => {
          //   
          this.menu.open()

        }, semanticColors.editPhotoButton, 'more-vert', 55)} */}
      </MenuTrigger>
      <MenuOptions {...IDMenuOptionsStyle({ top: 0, width: 300 })}      >
        <MenuOption onSelect={() => this.rename(true)} >
          {renderMenuOption(translate("BtnChangeName", rtl),
            "edit")}
        </MenuOption>
        <Spacer width={5} />
        {this.state.page && this.state.page.count > 1 ?
          <MenuOption onSelect={() => this.deletePage()} >
            {renderMenuOption(fTranslate("BeforeDeleteSubPageQuestion", this.state.currentIndex + 1, this.state.page.count, rtl),
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
    const sidesTop = Math.min(this.state.viewPortRect.height / 2 - 35, this.state.viewPortRect.height - this.state.keyboardHeight - 95)
    const upDownLeft = this.state.windowSize.width / 2 - 35;

    let deg = 0;
    if (location == TOP && this.state.yOffset < 0 && this.state.keyboardHeight == 0) {
      style.top = this.state.floatingMenuHeight, style.left = 100, deg = -90;
      style.left = upDownLeft;
    } else if (location == RIGHT && this.state.zoom > 1 &&
      this.state.viewPortRect.width - this.state.xOffset < this.state.pageRect.width * this.state.zoom) {
      style.top = sidesTop;
      style.right = 5, deg = 0;
    } else if (location == BOTTOM && this.state.keyboardHeight == 0 &&
      this.state.viewPortRect.height - this.state.yOffset - this.state.keyboardHeight < this.state.pageRect.height * this.state.zoom) {
      style.top = this.state.viewPortRect.height - 60 - this.state.keyboardHeight, deg = 90;
      style.left = upDownLeft;
    } else if (location == LEFT && this.state.xOffset < 0) {
      style.top = sidesTop;
      style.left = 5, deg = 180;
    } else {
      return;
    }
    style.transform = [{ rotate: deg + 'deg' }]

    return <View style={style} key={location}>
      <Icon
        onPress={() => {
          switch (location) {
            case TOP:
              return this.changeZoomOrOffset({ yOffset: this.state.yOffset + 50 }, true)
            case BOTTOM:
              return this.changeZoomOrOffset({ yOffset: this.state.yOffset - 50 }, true)
            case LEFT:
              return this.changeZoomOrOffset({ xOffset: this.state.xOffset + 50 }, true)
            case RIGHT:
              return this.changeZoomOrOffset({ xOffset: this.state.xOffset - 50 }, true);
          }
        }}
        name='play-arrow'
        size={70}
        color={semanticColors.moveInZoomButton}
      />
    </View>
  }


  getCanvas = () => {
    if (this.state.needCanvasUpdate) {
      this.setState({ needCanvasUpdate: false }, () => setTimeout(() => this.UpdateCanvas(), 50));
    } else if (this.state.needExport) {
      let promise = this.state.needExport;
      this.setState({ needExport: undefined })
      setTimeout(() => {
        this.doExport(promise.resolve, promise.reject);
      }, shareTimeMs);
    }

    return (
      <RNSketchCanvas
        ref={this.canvas}


        scale={this.state.zoom} //important for path to be in correct size
        touchEnabled={this.isBrushMode()}
        text={this.state.canvasTexts}
        containerStyle={styles.container}

        canvasStyle={styles.canvas}
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


  getImageRect = () => {
    const x = this.state.currentImageElem.normPosition.x;
    const y = this.state.currentImageElem.normPosition.y;
    let w = this.state.currentImageElem.width * this.state.zoom;
    let h = this.state.currentImageElem.height * this.state.zoom;

    return <View style={{
      flexDirection: 'row',
      position: 'absolute',
      left: this.norm2viewPortX(x),
      top: this.norm2viewPortY(y),
      width: w + DRAG_ICON_SIZE + 10,
      height: h,
      zIndex: 50,
    }}>
      {/* <TouchableOpacity 
        // onPress={() => {

        //   if (this.state.eraseMode) {
        //     this.state.queue.pushDeleteImage({ id: this.state.currentImageElem.id })
        //     this.setState({
        //       currentImageElem: undefined,
        //       needCanvasUpdate: true,
        //       needCanvasDataSave: true,
        //     });
        //     return;
        //   }
        // }}
      //>*/}
      <View

        style={{
          width: w,
          height: h,
          borderStyle: "dashed",
          borderWidth: 3,
          borderColor: "black",

        }}

        {...this._panResponderElementMove.panHandlers}
      />
      {/* </TouchableOpacity> */}
      {/* <View {...this._panResponderElementMove.panHandlers} style={{
        zIndex: 25, top: -5
      }}>
        <Icon name='open-with' size={DRAG_ICON_SIZE} />
      </View> */}

      <View {...this._panResponderElementResize.panHandlers}
        style={{
          position: "absolute",
          left: w - DRAG_ICON_SIZE + 15,
          top: h - DRAG_ICON_SIZE + 15,
          width: DRAG_ICON_SIZE,
          height: DRAG_ICON_SIZE,
          zIndex: 25
        }}>
        <Icon name='border-style' size={DRAG_ICON_SIZE}
          style={{ transform: [{ rotate: '180deg' }] }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          left: -DRAG_ICON_SIZE + 5,
          top: -5,//-DRAG_ICON_SIZE + 5,
          width: DRAG_ICON_SIZE,
          height: DRAG_ICON_SIZE,
          zIndex: 25
        }}

      >
        <Icon name='delete-forever' size={DRAG_ICON_SIZE} onPress={() => {
          Alert.alert(translate("DeleteImageTitle"), translate("BeforeDeleteImageQuestion"),
            [
              {
                text: translate("BtnDelete"), onPress: () => {
                  this.state.queue.pushDeleteImage({ id: this.state.currentImageElem.id })
                  this.setState({
                    currentImageElem: undefined,
                    needCanvasUpdate: true,
                    needCanvasDataSave: true,
                  });

                },
                style: 'destructive'
              },
              {
                text: translate("BtnCancel"), onPress: () => {
                  //do nothing
                },
                style: 'cancel'
              }
            ]
          );

        }} />
      </View>

    </View>
  }

  getTextInput = (rtl, rowDir) => {
    this._handleInputTextLocationMovingPage(this.state.keyboardHeight, this.state.keyboardTop);

    trace("getTextInput", 
    "fontSize", (this.normalizeTextSize(this.state.fontSize) / this.state.scaleRatio), "sr", this.state.scaleRatio)
    return (
      <View style={{
        //flex: 1,
        position: 'absolute',
        flexDirection: rowDir,
        left: this.state.xText - (rtl ? this.getTextWidth() / this.state.scaleRatio : DRAG_ICON_SIZE),
        top: this.state.yText, zIndex: 45,
      }}>
        <View {...this._panResponderElementMove.panHandlers}
          style={{ top: -5, zIndex: 25 }}>
          <Icon name='open-with' size={DRAG_ICON_SIZE} />
        </View>

        <TextInput
          ref={textInput => this._textInput = textInput}
          onChangeText={(text) => {
            this.setState({ inputTextValue: text });
          }}
          onContentSizeChange={(event) => {
            let dim = event.nativeEvent.contentSize;
            trace("onContentSizeChange", dim, this.state.inputTextWidth)
            setTimeout(() => 
              this.setState({

                inputTextWidth: dim.width > 0 ? dim.width : this.state.inputTextWidth,
                inputTextHeight: dim.height * this.state.scaleRatio || this.normalizeTextSize(this.state.fontSize)
              }), 10);
          }}
          autoCapitalize={'none'}
          autoCorrect={false}
          multiline={true}
          autoFocus
          allowFontScaling={false}
          style={{
            backgroundColor: 'transparent',
            direction: rtl ? 'rtl' : 'ltr',
            textAlign: rtl ? 'right' : 'left',
            width: this.getTextWidth() / this.state.scaleRatio,

            height: this.state.inputTextHeight / this.state.scaleRatio,
            borderWidth: 0,
            fontSize: (this.normalizeTextSize(this.state.fontSize) / this.state.scaleRatio),
            color: this.state.color,
            fontFamily: getFont(),
            zIndex: 21,
            transform: this.getTransform(this.getTextWidth() / this.state.scaleRatio, this.state.inputTextHeight / this.state.scaleRatio,
              this.state.scaleRatio * this.state.zoom, isRTL()),
          }}
          value={this.state.inputTextValue}
          onTouchStart={(ev) => {
            let x = this.screen2ViewPortX(ev.nativeEvent.pageX);
            trace("click on text input", this.state.xText - x, this.state.inputTextWidth * this.state.scaleRatio * this.state.zoom)
            if (Math.abs(this.state.xText - x) > this.state.inputTextWidth * this.state.scaleRatio * this.state.zoom + DRAG_ICON_SIZE / 2) {
              //treats it as if click outside the text input, delegates to canvasClick
              this.canvasClick(ev);
            }
          }}

        />
        <View style={{
          position: 'absolute', left: (DRAG_ICON_SIZE - 2), top: 0,
          width: Math.max(this.state.inputTextWidth + 10, 12),
          height: this.state.inputTextHeight > 0 ? this.state.inputTextHeight / this.state.scaleRatio : 45 / this.state.scaleRatio,
          zIndex: 20,
          transform: this.getTransform(this.state.inputTextWidth, this.state.inputTextHeight/ this.state.scaleRatio ,
            this.state.scaleRatio * this.state.zoom, isRTL()),
          //lineHeight: this.normalizeTextSize(this.state.fontSize)* this.state.scaleRatio,
        }}
          backgroundColor={this.state.color === '#fee100' ? 'gray' : 'yellow'}
        />
      </View >);
  }
  normalizeTextSize = (size) => {
    const newSize = this.normFontSize2FontSize(size)
    if (Platform.OS === 'ios') {
      return Math.round(PixelRatio.roundToNearestPixel(newSize))
    } else {
      return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2
    }
  }
  getTextWidth = () => {
    const width = isRTL() ? this.state.xText : this.state.viewPortRect.width - this.state.xText;
    // const width = isRTL() ?
    //   Math.min(this.state.xText, this.state.inputTextWidth + 2*this.state.fontSize) :
    //   Math.min(this.state.viewPortRect.width - this.state.xText, this.state.inputTextWidth + 2*this.state.fontSize);
    return Math.max(25, width);
  }
}

AppRegistry.registerComponent('IssieEditPhoto', () => IssieEditPhoto);

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: semanticColors.mainAreaBG,
    zIndex: 10,
  },
  topMargin: {
    height: dimensions.toolbarMargin,
    width: "100%",
    zIndex: 25,
    backgroundColor: semanticColors.mainAreaBG
  },
  bottomMargin: {
    height: dimensions.toolbarMargin * 2,
    width: "100%",
    zIndex: 25,
    backgroundColor: semanticColors.mainAreaBG
  },
  navigationArea: {
    flex: 1,
    flexDirection: 'column',
    width: "100%",
    zIndex: 20,
    backgroundColor: semanticColors.mainAreaBG
  },
  leftMargin: {
    position: "absolute",
    flex: 1, height: "100%",
    left: 0,
    top: 0,
    zIndex: 25,
    backgroundColor: semanticColors.mainAreaBG
  },
  rightMargin: {
    position: "absolute",
    flex: 1, height: "100%",
    top: 0,
    right: 0,
    zIndex: 25,
    backgroundColor: semanticColors.mainAreaBG
  },
  viewPort: {
    zIndex: 20,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1
  },
  canvas: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
    //borderWidth: 1
  }
}
);