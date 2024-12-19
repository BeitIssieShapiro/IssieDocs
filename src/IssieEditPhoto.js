import React, { useRef } from 'react';
import {
  AppRegistry, StyleSheet, TextInput, View,
  Text, Alert, PanResponder, Keyboard, PixelRatio, Dimensions, ActivityIndicator,
  Animated,
  TouchableOpacity
} from 'react-native';
import * as Progress from 'react-native-progress';

import { hideMessage, showMessage } from 'react-native-flash-message';

import { Icon, MARKER_TRANSPARENCY_CONSTANT, Spacer } from "./elements"
import Share from 'react-native-share';
import DoQueue from './do-queue';

import {
  getRoundedButton,
  globalStyles, getFont
} from './elements'
import { getNewPage, SRC_CAMERA, SRC_FILE, SRC_GALLERY, SRC_RENAME } from './newPage';
import { fTranslate, getRowDirections, isRTL } from './lang.js'


import {
  colors, getImageDimensions,
  AppText,
  semanticColors, dimensions
} from './elements'
import { translate } from './lang';
import { arrLast, genID, tableRowHeight, setNavParam, isCellInBox, isSameCell, normalizeBox, calculateTargetBox, offsetTableCell, tableColWidth, getRulerDeleteMidPoint, nearPoint } from './utils';
import { FileSystem } from './filesystem';
import { trace } from './log';
import { pinchEnd, processPinch, processResize } from './pinch';
import EditorToolbar, { TextAlignment } from './editor-toolbar';
import { getElementMovePanResponder } from './editors-panresponders';
import Canvas, { RESIZE_TABLE_BOX_SIZE } from './canvas';
import { FileContextMenu } from './file-context-menu';
import RNSystemSounds from '@dashdoc/react-native-system-sounds';
import { AudioElement } from './audio-elem.js';

const shareTimeMs = 2000;

const TOP = 0, RIGHT = 1, BOTTOM = 2, LEFT = 3;
const DEFAULT_STROKE_WIDTH = 5;
const DEFAULT_MARKER_WIDTH = 30;
const MAX_STROKE_WIDTH = 12;
const DRAG_ICON_SIZE = 45;
const initialImageSize = 120
const Modes = {
  IMAGE: 1,
  TEXT: 2,
  BRUSH: 3,
  ERASER: 4,
  MARKER: 5,
  TABLE: 6,
  VOICE: 7,
  RULER: 8,
  AUDIO: 9,
}

const TABLE_LINE_MARGIN = 20;
const PAGE_MARGIN = RESIZE_TABLE_BOX_SIZE * 2;
const audioImgSize = 80;
const MODES_CLEANUP = {
  showTextInput: false,
  currentTextElem: undefined,
  tableSelection: undefined,
  selectedRulerElemId: undefined
}

function printRect(rect) {
  return "{ top:" + Math.floor(rect.top) +
    ", left:" + Math.floor(rect.left) +
    ", width:" + Math.floor(rect.width) +
    ", hight:" + Math.floor(rect.height) + " }"
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
    this.inputRef = React.createRef()

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
        const ret = (this.isTextMode() && this.state.showTextInput && this.state.currentTextElem ||
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
        this.SaveCurrentEdits(true);

        if (this.isImageMode()) {
          this.SaveImageAfterMove();
        }
      },
      dragIconSize: DRAG_ICON_SIZE,
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
      onPanResponderStart: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (this.isRulerMode() && touches.length == 1 && !this._ruler) {

          const x = Math.floor(this.screen2NormX(touches[0].pageX) * this.state.scaleRatio);
          const y = Math.floor(this.screen2NormY(touches[0].pageY) * this.state.scaleRatio);
          this.RulerStart(x, y);
          this._ruler = true;
          return;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length == 2) {
          trace("pinching")
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

        if (touches.length == 1 && this.isTableMode()) {
          this._tableResize = true;
          const viewPortXY = {
            x: this.screen2ViewPortX(touches[0].pageX),
            y: this.screen2ViewPortY(touches[0].pageY)
          }
          let table = this.state.tableResizeState?.table;
          if (!table) {
            const findTableRes = this.findTable(viewPortXY);
            table = findTableRes?.table;
          }

          if (!table) return;

          const x = this.viewPort2TableX(table, viewPortXY.x);
          const y = this.viewPort2TableY(table, viewPortXY.y);

          //trace("resizing table", x, y, table)
          const state = this.state.tableResizeState || {
            initialX: x,
            initialY: y,
            existingTableSelection: this.state.tableSelection,
            table
          };

          const newState = {
            ...state,
            currentX: x,
            currentY: y,
          }

          //trace("resize table new state", newState)

          this.setState({
            tableResizeState: newState
          });
        }

        if (this.isRulerMode() && this._ruler) {
          const x = Math.floor(this.screen2NormX(touches[0].pageX) * this.state.scaleRatio);
          const y = Math.floor(this.screen2NormY(touches[0].pageY) * this.state.scaleRatio);


          this.RulerMove(x, y);
        }

      },

      onPanResponderRelease: (evt, gestureState) => {
        trace("skeching, table-resize, pinch - off")
        this._sketching = false;
        if (this._tableResize) {
          this._tableResize = false;
          this.changeTable(this.state.tableResizeState);
          this.setState({
            tableResizeState: undefined, tableSelectionMove: undefined
          });

          return;
        } else if (this.isTableMode() && this.state.currentTable) {
          const x = this.viewPort2TableX(this.state.currentTable, this.screen2ViewPortX(evt.nativeEvent.pageX));
          const y = this.viewPort2TableY(this.state.currentTable, this.screen2ViewPortY(evt.nativeEvent.pageY));

          const clickedCell = this.findCell(this.state.currentTable, x, y);
          if (clickedCell) {
            this.setState({ tableSelection: { from: clickedCell, to: clickedCell } })
          }
        }

        if (this._ruler) {
          this._ruler = false;
          this.SaveRuler()
        }

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
      showBusy: true,
      brushColor: colors.black,
      textColor: colors.black,
      tableColor: colors.blue,
      markerColor: colors.yellow,

      fontSize: 25,
      mode: Modes.TEXT,
      eraseMode: false,
      ...MODES_CLEANUP,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      markerWidth: DEFAULT_MARKER_WIDTH,
      queue: new DoQueue(async (attachName) => {
        // attachment being evicted from queue
        console.log("File Evicted from queue")
        await FileSystem.main.deleteAttachedFile(this.state.page, this.state.currentIndex, attachName)
      }),
      toolbarHeight: 0,
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
      revision: 0,
      textEditRevision: 0,
      sharing: false,
      openContextMenu: false,
    }

  }


  screen2ViewPortX = (x) => (x - this.state.sideMargin);
  screen2ViewPortY = (y) => (y - this.state.toolbarHeight - dimensions.toolbarMargin - this.props.route.params.headerHeight - this.props.route.params.insets.top);

  screen2NormX = (x) => this.viewPort2NormX(this.screen2ViewPortX(x));
  screen2NormY = (y) => this.viewPort2NormY(this.screen2ViewPortY(y));


  changeZoomOrOffset = (obj, animateMove, allowPassTop) => {
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
      if (obj.yOffset > 0 && !allowPassTop) {
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

    // remove changes if the same:
    if (stateChange.yOffset === this.state.yOffset) {
      delete stateChange.yOffset;
    }
    if (stateChange.xOffset === this.state.xOffset) {
      delete stateChange.xOffset;
    }
    if (stateChange.yText === this.state.yText) {
      delete stateChange.yText;
    }
    if (stateChange.xText === this.state.xText) {
      delete stateChange.xText;
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

    if (Object.keys(stateChange).length > 0) {
      console.log("change", stateChange)
      this.setState(stateChange);
    }
  }


  isTextMode = () => this.state.mode === Modes.TEXT;
  isBrushMode = () => this.state.mode === Modes.BRUSH;
  isMarkerMode = () => this.state.mode === Modes.MARKER;
  isTableMode = () => this.state.mode === Modes.TABLE;
  isImageMode = () => this.state.mode === Modes.IMAGE;
  isAudioMode = () => this.state.mode === Modes.AUDIO;
  isVoiceMode = () => this.state.mode === Modes.VOICE;
  isEraserMode = () => this.state.eraseMode;
  isRulerMode = () => this.state.mode === Modes.RULER;


  _shouldMove = (evt, gestureState) => {
    trace("should pinch?");
    if (evt.nativeEvent.touches.length >= 2) {
      trace("would pinch");
      return !this._sketching;
    } else if (this.isTextMode()) {
      if (this.state.showTextInput) {
        return true;
      }
      return !this.state.showTextInput;//
    } else if (this.isImageMode() || this.isTableMode() || this.isRulerMode() || this.isAudioMode()) {
      return true;
    } else if (this.isBrushMode() || this.isMarkerMode()) {
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
    }, () => this._handleInputTextLocationMovingPage());
  }

  _handleInputTextLocationMovingPage = () => {
    // if keyboard hides the textInput, scroll the window
    if (this.state.showTextInput && this.state.currentTextElem) {
      let minHeight;
      if (this.state.currentTextElem.tableCell) {
        const { table } = this.findTable();

        minHeight = this.state.currentTextElem.minHeight || this.state.fontSize * 1.2;
        minHeight = this.table2PageY(table, minHeight) * this.state.zoom;
      } else {
        minHeight = this.state.currentTextElem.height * this.state.zoom;
      }


      // positive means overlap
      let diffFromKB = (this.state.yText + minHeight) - this.state.keyboardTop;

      trace("_handleInputTextLocationMovingPage", this.state.yText, diffFromKB, this.state.keyboardTop, this.state.yOffset, minHeight)
      if (this.state.keyboardTop > 0 && diffFromKB > 0) {
        trace("scroll up due to keyboard", minHeight, this.state.currentTextElem.height + this.state.yText, this.state.keyboardTop, this.state.yOffset)
        this.changeZoomOrOffset({
          yOffset: this.state.yOffset - diffFromKB,
        }, true);
        return;
      }
    }
  }

  _keyboardDidHide = (e) => {
    // this.SaveCurrentEdits();
    // this.setState({
    //   keyboardTop: -1, keyboardHeight: 0,
    //   showTextInput: false,
    //   currentTextElem: undefined,
    //   yOffset: this.state.zoom === 1 ? 0 : this.state.yOffset
    // });

    // Animated.timing(this.state.viewPortYOffset, {
    //   toValue: this.state.zoom === 1 ? 0 : this.state.yOffset,
    //   duration: 1000,
    //   useNativeDriver: false,
    // }).start();


  }

  componentDidMount = async () => {
    this._mounted = true;
    const page = this.props.route.params.page;
    const pageIndex = this.props.route.params.pageIndex;

    const currentFile = page.defaultSrc;
    trace("EditPhoto CurrentFile: ", currentFile);
    if (page.count > 0) {
      setNavParam(this.props.navigation, 'pageTitleAddition', this.pageTitleAddition(page.count, 0));
    }
    setNavParam(this.props.navigation, 'onMoreMenu', () => this.setState({ openContextMenu: true }))
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);

    const metaDataUri = currentFile + ".json";
    //const betaFeatures = this.props.route.params.betaFeatures;
    this.setState({ page: page, currentFile: currentFile, currentIndex: 0, metaDataUri: metaDataUri },
      () => {
        this.Load()
        if (pageIndex != undefined) {
          setTimeout(() => this.movePage(pageIndex), 500);
        }
      });
  }

  componentWillUnmount = async () => {
    this._mounted = false;
    if (this.keyboardDidShowListener) {
      this.keyboardDidShowListener.remove()
    }
    if (this.keyboardDidHideListener) {
      this.keyboardDidHideListener.remove()
    }

    trace("save before exit")
    this.state.queue.clearUndo();
    await this.SaveCurrentEdits();
  }

  pageTitleAddition = (count, index) => count > 1 ? " - " + (index + 1) + "/" + count : ""

  Load = async () => {
    return new Promise((resolve) => {
      this.setState({ showBusy: true }, () => this.LoadInternal().finally(() => {
        this.setState({ showBusy: false })
        resolve();
      }));

    });
  }

  LoadInternal = async () => {
    if (this.state.metaDataUri && this.state.metaDataUri.length > 0)
      await this.loadFile(this.state.metaDataUri);

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
        await this.loadFile(metaDataUri);
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



  handleOnRevisionRendered = (revID) => {
    if (this.state.needExport && revID >= this.state.needExport.revision) {
      let promise = this.state.needExport;
      this.setState({ needExport: undefined })
      setTimeout(() => {
        this.doExport(promise.resolve, promise.reject);
      }, shareTimeMs);
    }
  }

  exportToBase64 = async () => {
    return new Promise((resolve, reject) => {
      this.setState({ needExport: { resolve, reject, revision: this.state.revision + 1 }, revision: this.state.revision + 1 })
    });
  }
  readoutText = (text) => {
    if (text?.length > 0) this.canvas.current?.canvas.current?.readoutText(text);
  }

  doExport = (resolve, reject) => {
    if (this.canvas == null) return;
    this.canvas.current?.canvas.current?.getBase64(
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
    trace("load metadata", new Date().toISOString())
    this.state.queue.clear();
    return FileSystem.main.loadFile(metaDataUri).then((value) => {
      let sketchState = JSON.parse(value);
      for (let i = 0; i < sketchState.length; i++) {
        this.state.queue.add(sketchState[i])
      }
      trace("load metadata - end", new Date().toISOString())

    },
      (err) => {/*no json file yet*/ }
    ).catch((e) => {/*no json file yet*/ })
      .finally(() => {
        this.setState({ revision: this.state.revision + 1 });
      });
  }

  UpdateQueue = (updateQueueCallback) => {
    if (updateQueueCallback(this.state.queue)) {
      this.setState({ revision: this.state.revision + 1 });
      this.Save();
    }
  }

  Save = () => {
    let sketchState = this.state.queue.getAll();
    const content = JSON.stringify(sketchState, undefined, " ");
    return FileSystem.main.writeFile(
      this.state.metaDataUri,
      content).then(
        //success
        () => {
          // Save thumbnail
          if (this.canvas && this.state.page.count === 1 || this.state.currentIndex === 0) {
            //let filePath = FileSystem.getTempFileName("jpg");
            //let fileName = FileSystem.getFileNameFromPath(filePath, true);
            //let lastSlashPos = filePath.lastIndexOf('/');
            //let folder = filePath.substring(0, lastSlashPos);
            //console.log("save thumbnail to folder", folder)

            //create a delay before exporting canvas, so the changes are rendered.
            setTimeout(() =>
              this.canvas.current?.canvas.current.export("jpg", { width: 80, height: 120 }, (err, path) => {
                console.log("save thumbnail", path)
                FileSystem.main.saveThumbnail(path, this.state.page);
              }), 500);

          }
        },
        //fail
        (e) => Alert.alert("File Save Failed" + e));

  }

  SketchEnd = (p) => {
    this._sketching = false;
    trace("sketching - off")
    if (!this._pinch) {
      this.state.queue.pushPath(p);
      this.Save()
    }
    this.setState({
      revision: this.state.revision + 1
    })

  }
  SketchStart = (p) => {
    setTimeout(() => {
      trace("Sketch Start")
      this._sketching = true;
    }, 300);

  }


  canvasClick = async (ev) => {
    let x = this.screen2ViewPortX(ev.nativeEvent.pageX);
    let y = this.screen2ViewPortY(ev.nativeEvent.pageY);
    this.toolbarRef.current.closePicker();

    trace("canvasClick x: ", x, ",y: ", y)
    // trace("yOffset", this.state.yOffset,
    //   "zoom", this.state.zoom,
    //   "scaleRatio", this.state.scaleRatio,
    //   "toolbarHeight", this.state.toolbarHeight)

    await this.SaveCurrentEdits();

    if (this.isTextMode()) {
      const { table } = this.findTable({ x, y });

      let textElem = this.canvas.current.findElementByLocation({
        x: this.viewPort2NormX(x),
        y: this.viewPort2NormY(y)
      }, this.state.scaleRatio, table);

      trace("found", textElem)
      //in erase mode, only act on found texts
      if (!textElem) {
        if (this.state.eraseMode) return;

        textElem = this.generateTextElement("",
          {
            x: this.viewPort2NormX(x),
            y: this.viewPort2NormY(y)
          },
          0, // initial width
          this.normFontSize2FontSize(this.state.fontSize), // initial height
        );
      }


      this.editTextElement(textElem, x, y);
    } else if (this.isImageMode()) {

      let imgElem = this.canvas.current.findElementByLocation({
        x: this.viewPort2NormX(x),
        y: this.viewPort2NormY(y), undefined,
      }, this.state.scaleRatio);
      if (imgElem) {

        x = Math.round(imgElem.position.x) + imgElem.width;
        y = Math.round(imgElem.position.y);
      }
      this.setState({
        currentImageElem: imgElem,
        xText: x,
        yText: y,
      });
    } else if (this.isAudioMode()) {
      const audioElem = {
        id: Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 5),
      }

      this.setState({
        showAudioRecorder: true,
        currAudioElem: audioElem,
        xText: x,
        yText: y,
      });
    }
  }

  editTextElement = (textElem, x, y) => {

    let fontSize = this.state.fontSize;
    let fontColor = this.state.textColor;
    let textAlignment = this.state.textAlignment;

    if (textElem.normFontSize) {
      fontSize = textElem.normFontSize;
    }

    if (textElem.fontColor) {
      fontColor = textElem.fontColor;
    }

    if (textElem.alignment) {
      textAlignment = textElem.alignment;
    }

    const draftTxtElem = { ...textElem, draft: true };
    if (draftTxtElem.tableCell) {
      this.state.queue.pushTableCellText(draftTxtElem);
    } else {
      this.state.queue.pushText(draftTxtElem);
    }


    // work arround sync issue with multi-line textInput
    if (this.inputRef.current) {
      const text = draftTxtElem.text || ""
      this.inputRef.current.setNativeProps({ text })
      setTimeout(() => this.inputRef.current?.setNativeProps({ text }), 70);
    }


    this.setState({
      showTextInput: !this.state.eraseMode,
      fontSize,
      textColor: fontColor,
      textAlignment,
      currentTextElem: draftTxtElem,
      xText: !textElem.tableCell ? this.norm2viewPortX(textElem.normPosition.x) : x,
      yText: !textElem.tableCell ? this.norm2viewPortY(textElem.normPosition.y) : y,
      revision: this.state.revision + 1,
    }, () => {
      if (this.state.eraseMode) {
        this.SaveText();
      }
    });
  }

  incrementRevision = () => this.setState({ revision: this.state.revision + 1 });
  incrementTextEditRevision = () => this.setState({ textEditRevision: this.state.textEditRevision + 1 })
  clearCurrentTextElement = () => this.setState({ currentTextElem: undefined, showTextInput: false, lastKnownGoodText: undefined });
  clearCurrentAudioElement = () => this.setState({ currAudioElem: undefined, showAudioRecorder: false });
  RulerStart = (normX, normY) => {
    trace("Ruler start", normX, normY)
    let elem, selectedElem
    let selectedRulerElemId = this.state.selectedRulerElemId
    if (selectedRulerElemId) {
      selectedElem = this.canvas.current.findRuler({
        x: normX,
        y: normY,

      }, this.state.pageRect, selectedRulerElemId);

      if (selectedElem?.id === selectedRulerElemId) {
        elem = { ...selectedElem, draft: true };
      }
    }
    if (!elem) {
      selectedRulerElemId = undefined;
      elem = {
        draft: true,
        id: genID(),
        x1: normX, y1: normY,
        x2: normX, y2: normY,
        color: this.state.brushColor,
        screenSize: this.state.pageRect,
        //todo stroke-width
        width: this.state.strokeWidth,
      }
    }

    const { x1, y1, x2, y2 } = elem;
    const { x: delX, y: delY, sizeX, sizeY } = getRulerDeleteMidPoint(x1, y1, x2, y2);


    elem.moveState = {
      end1: nearPoint(normX, x1, 10) && nearPoint(normY, y1, 10),
      end2: nearPoint(normX, x2, 10) && nearPoint(normY, y2, 10),
      onTrash: nearPoint(normX, delX, sizeX * 1.5) && nearPoint(normY, delY, sizeY * 1.5),
      initialXY: { x: normX, y: normY },
      lastDelta: { x: 0, y: 0 },
    };

    this.setState({
      ruler: { initialNormX: normX, initialNormY: normY },
      currentRulerElem: elem, selectedRulerElemId
    });

    this.state.queue.pushLine(elem);
  }

  RulerMove = (normX, normY) => {
    //trace("RulerMove", normX, normY)
    const elem = this.state.currentRulerElem;
    if (elem) {
      const initX = elem.moveState.initialXY.x;
      const initY = elem.moveState.initialXY.y;
      const deltaX = initX - normX;
      const deltaY = initY - normY;

      if (this.state.selectedRulerElemId) {

        // check if at startPoint
        trace("RulerMove", Math.abs(initX - elem.x1))
        if (elem.moveState.end1) {
          elem.x1 = normX, elem.y1 = normY;
        } else if (elem.moveState.end2) {
          elem.x2 = normX, elem.y2 = normY;
        } else {
          elem.x1 -= deltaX - elem.moveState.lastDelta.x;
          elem.y1 -= deltaY - elem.moveState.lastDelta.y;
          elem.x2 -= deltaX - elem.moveState.lastDelta.x;
          elem.y2 -= deltaY - elem.moveState.lastDelta.y;
        }
      } else {
        trace("RulerMove - change end point", normX, normY)
        elem.x2 = normX, elem.y2 = normY;
        elem.color = this.state.brushColor;
      }
      elem.moveState.lastDelta = { x: deltaX, y: deltaY }
      this.incrementRevision();
    }
  }

  SaveRuler = () => {
    const elem = this.state.currentRulerElem;
    this.state.queue.popDraft();


    if (elem) {
      this.setState({
        ruler: undefined,
        currentRulerElem: undefined,
        selectedRulerElemId: elem?.id
      });
      trace("end ruler", elem)
      if (elem.x1 === elem.x2 && elem.y1 === elem.y2) {

        // seems to be only click - try to select an existing ruler
        const rulerElem = this.canvas.current.findRuler({
          x: elem.x1,
          y: elem.y1
        }, elem.screenSize);

        trace("set selected ruler", rulerElem?.id)
        this.setState({ selectedRulerElemId: rulerElem?.id })
        return;
      }
      else if (elem.moveState && elem.moveState.lastDelta.x == 0 && elem.moveState.lastDelta.y == 0) {
        // check if click the delete
        trace("click on line", elem.moveState.onTrash);
        if (elem.moveState.onTrash) {
          trace("Line deleted")
          this.state.queue.pushDeleteLine(elem.id);
          this.Save();
          this.incrementRevision();
          this.setState({ selectedRulerElemId: undefined });
          return;
        }
        trace("click on line - no change");
        this.setState({ selectedRulerElemId: elem.id })
        return;
      }

      delete elem.draft;
      delete elem.moveState;

      this.state.queue.pushLine(elem);
      this.Save();
      this.incrementRevision();
    }
    trace("save ruler")
  }

  SaveCurrentEdits = (afterDrag) => {
    if (this.isTextMode()) {
      return this.SaveText(afterDrag);
    }
    if (this.isAudioMode()) {
      return this.SaveAudio();
    }
  }

  SaveAudio = async () => {
    if (this.state.currAudioElem && this.state.currAudioElem.file) {
      const audioFile = await FileSystem.main.attachedFileToPage(this.state.currAudioElem.file, this.state.page, this.state.currentIndex, "m4a");
      const elem = {
        ...this.state.currAudioElem,
        file: audioFile,
        normPosition: {
          x: this.state.xText,
          y: this.state.yText
        }
      }

      console.log("SaveAudio", elem)
      this.state.queue.pushAudio(elem);
      this.clearCurrentAudioElement();
      this.incrementRevision();

      this.Save();
      return true;
    }
    this.clearCurrentAudioElement();
    return false;

  }


  SaveText = (afterDrag) => {
    const elem = this.state.currentTextElem;
    if (!this.state.showTextInput || !elem) {
      trace("SaveText exit doing nothing")
      this.state.queue.popDraft();

      return;
    }

    if (afterDrag) {
      trace("SaveText after drop - update normPosition", elem.text);
      elem.normPosition = {
        x: this.viewPort2NormX(this.state.xText),
        y: this.viewPort2NormY(this.state.yText),
      };
      elem.modified = true;

      this.incrementRevision();
      //   (Math.abs(origElem.normPosition.x - newElem.normPosition.x) <= 5 &&
      //            Math.abs(origElem.normPosition.y - newElem.normPosition.y) <= 5)
      // todo check if moved and modify
      return false;
    }
    trace("SaveText", elem.text);

    if (!elem.modified) {
      trace("text element not modified")
      this.state.queue.popDraft();

      this.clearCurrentTextElement()
      this.incrementRevision();
      // pop draft
      return;
    }

    if (!elem.id) {
      if (!elem.text || elem.text.length == 0) {
        this.state.queue.popDraft();

        trace("empty new elem - ignore")
        this.clearCurrentTextElement();
        this.incrementRevision();
        return;
      }
      elem.id = genID();
    }


    this.state.queue.popDraft();
    delete elem.modified;
    delete elem.draft;
    delete elem.width;
    delete elem.supressEndOfPage;
    //delete elem.fontSize;

    trace("SaveText: saving", elem);

    if (elem.tableCell) {
      this.state.queue.pushTableCellText(elem);
    } else {
      this.state.queue.pushText(elem);
    }
    this.clearCurrentTextElement();
    this.incrementRevision();

    this.Save();
    return true;
  }



  generateTextElement = (text, normXY, width, height) => {
    const rtl = isRTL();
    const newTextElem = { text, height }
    newTextElem.alignment = this.state.textAlignment || (rtl ? TextAlignment.RIGHT : TextAlignment.LEFT);
    newTextElem.rtl = newTextElem.alignment == TextAlignment.RIGHT ? 'rtl' : 'ltr';
    newTextElem.fontColor = this.state.textColor;
    newTextElem.normFontSize = this.state.fontSize;
    newTextElem.fontSize = this.normFontSize2FontSize(this.state.fontSize);
    newTextElem.normPosition = normXY;
    newTextElem.font = getFont();
    newTextElem.anchor = { x: 0, y: 0 };
    newTextElem.normWidth = width * this.state.fontSize / this.normFontSize2FontSize(this.state.fontSize);

    return newTextElem;
  }

  /**  Explanation:
      ViewPort - the visible area of the page (sensitive to zoom and move). in zoom 0 and no offsets eq to page
      Page - the scaled down/up size of the original image to fit the screen dimensions (agnositic to zoom and move)
      Table - table coordinates are initialized as the page, then need to be adjusted according to ratioof current page's h/w vs. table-initial h/w 
      Norm - original size of image
  */

  viewPort2pageX = (x) => ((x - this.state.xOffset) / this.state.zoom);
  viewPort2pageY = (y) => ((y - this.state.yOffset) / this.state.zoom);

  page2ViewPortX = (x) => x * this.state.zoom + this.state.xOffset;
  page2ViewPortY = (y) => y * this.state.zoom + this.state.yOffset;

  viewPort2NormX = (x) => this.viewPort2pageX(x) / this.state.scaleRatio;
  viewPort2NormY = (y) => this.viewPort2pageY(y) / this.state.scaleRatio;

  norm2viewPortX = (x) => this.page2ViewPortX(x * this.state.scaleRatio);
  norm2viewPortY = (y) => this.page2ViewPortY(y * this.state.scaleRatio);


  viewPort2TableX = (table, x) => this.page2TableX(table, this.viewPort2pageX(x));
  viewPort2TableY = (table, y) => this.page2TableY(table, this.viewPort2pageY(y));


  page2TableX = (table, x) => x / (this.state.pageRect.width / table.size.width);
  page2TableY = (table, y) => y / (this.state.pageRect.height / table.size.height);

  table2PageX = (table, x) => x * (this.state.pageRect.width / table.size.width);
  table2PageY = (table, y) => y * (this.state.pageRect.height / table.size.height);


  normWidth2Width = (w, fontSize) => w * fontSize / this.normFontSize2FontSize(fontSize);
  width2NormWidth = (w, fontSize) => w * this.normFontSize2FontSize(fontSize) / fontSize;

  getImageElement = (imageData, ratio) => {
    let newImageElem = {
      id: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
    };

    const initialImageSizeScaled = initialImageSize / this.state.scaleRatio;
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

    const scalePos = {
      id: imgElem.id,
      width: imgElem.width,
      height: imgElem.height,
      position: { x: x, y },
    }

    if (this.state.currentImageElem) {
      this.canvas?.current.canvas.current?.setCanvasImagePosition(scalePos)
    }
    const newScaleElem = {
      ...imgElem,
      position: scalePos.position,
      normPosition: {
        x: scalePos.position.x / this.state.scaleRatio,
        y: scalePos.position.y / this.state.scaleRatio,
      }

    }

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
    this.setState({ revision: this.state.revision + 1 });
    this.Save();

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
    trace("resizeCurrentImage", scalePos)
    this.canvas.current?.canvas.current?.setCanvasImagePosition(scalePos);

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
    this.setState({ revision: this.state.revision + 1 });
    this.Save();

    return true;
  }


  txtElemNorm2Scale = (txtElem) => {
    const scaleElem = {
      ...txtElem
    }
    if (scaleElem.normFontSize === undefined) {
      //migrate elem
      scaleElem.normFontSize = scaleElem.fontSize;
    }

    scaleElem.fontSize = this.normFontSize2FontSize(scaleElem.normFontSize)

    scaleElem.position = {
      x: scaleElem.normPosition.x * this.state.scaleRatio,
      y: scaleElem.normPosition.y * this.state.scaleRatio,
    };
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
      f40: 16.7,
      f45: 14.7,
      f50: 13.4,
      f55: 13.0,
      f65: 12.2,
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
      f265: 3.6,
      f275: 3.4,
      f285: 3.2,
      f295: 3,
      f305: 2.8,
      f315: 2.6,
      f325: 2.4,
      f335: 2.3,
      f345: 2.2,
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
    this.SaveCurrentEdits();
    this.setState({
      mode: Modes.TEXT,
      eraseMode: false,
      ...MODES_CLEANUP
    });
    this.onEraserChange(true);
  }

  onAudioMode = () => {
    this.SaveCurrentEdits();
    this.setState({
      mode: Modes.AUDIO,
      ...MODES_CLEANUP
    });
  }

  onTextSize = (size) => {
    trace("set text size", size)
    this.setState({
      fontSize: size, showTextSizePicker: false, eraseMode: false
    });
    this.updateInputText();
    this.onEraserChange(true);
  }

  onTextAlignment = (textAlignment) => {
    trace("set textAlignment", textAlignment)
    this.setState({
      textAlignment
    });
  }

  onEraserButton = () => {
    trace("Eraser pressed")
    if (this.isImageMode() || this.isTableMode()) {
      this.setState({ mode: Modes.BRUSH });
    }

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
                revision: this.state.revision + 1,
                currentImageElem: scaleImg,
              });
              this.Save();
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

  onAddNewPage = async (src) => {
    getNewPage(src, (uri) => this.addNewPage(uri, src, false), undefined, (err) => { }, this.props.navigation);
  }

  onAddBlankPage = (type) => {
    FileSystem.main.getStaticPageTempFile(type).then(uri => this.addNewPage(uri, SRC_FILE, true));
  }

  addNewPage = (uri, src, isBlank) => {
    this.props.navigation.navigate('SavePhoto', {
      uri,
      isBlank,
      imageSource: src,
      addToExistingPage: this.state.page,
      goHomeAndThenToEdit: this.props.route.params.goHomeAndThenToEdit,
      pageIndex: this.state.page.count,
    })
  }


  onEraserChange = (isOff) => {
    let eraserOn = isOff ? false : !this.state.eraseMode;
    this.setState({ eraseMode: eraserOn });
    trace("onEraserChange, set to", eraserOn)
  }

  onBrushMode = (isRuler) => {
    this.SaveCurrentEdits();
    this.setState({
      yOffset: this.state.zoom == 1 ? 0 : this.state.yOffset,
      mode: isRuler ? Modes.RULER : Modes.BRUSH, ...MODES_CLEANUP
    })
    this.clearCurrentTextElement()
    this.onEraserChange(true);
  }

  onRulerMode = () => {
    this.onBrushMode(true);
  }

  onMarkerMode = () => {
    this.SaveCurrentEdits();
    this.setState({
      yOffset: this.state.zoom == 1 ? 0 : this.state.yOffset,
      mode: Modes.MARKER, ...MODES_CLEANUP
    })
    this.clearCurrentTextElement();
    this.onEraserChange(true);
  }

  onTableMode = () => {
    this.SaveCurrentEdits();
    //todo multiple tables
    const table = this.state.canvasTables?.length > 0 ? this.state.canvasTables[0] : undefined;
    this.setState({
      ...MODES_CLEANUP,
      mode: Modes.TABLE,
      eraseMode: false,
      currentTable: table,
    });
    this.onEraserChange(true);

    return !!table;
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

    if (this.isRulerMode() && this.state.selectedRulerElemId) {
      const selectedElem = this.canvas.current.findRulerById(this.state.selectedRulerElemId);
      if (selectedElem) {
        const modifiedWidth = { ...selectedElem, width: newStrokeWidth };
        this.state.queue.pushLine(modifiedWidth);
        this.Save();
        this.incrementRevision();
      }
    }


  }

  onMarkerSize = (size) => {
    this.setState({
      markerWidth: size
    })
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

    return new Promise(async (resolve, reject) => {

      await this.SaveCurrentEdits();

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
        zoom: 1, xOffset: 0, yOffset: 0, showTextInput: false, inputTextValue: '', currentImageElem: undefined,
        detectedTexts: []
      }, () => {
        this.reflectWindowSizeAndImageSize(true);

        this.Load().then(() => resolve());
      });
    });
  }



  onLayout = async (e) => {
    if (!this._mounted)
      return;
    //trace("on Layout start", new Date().toISOString())
    let windowSize = e.nativeEvent.layout;

    //this.setState({ windowSize, zoom: 1, yOffset: 0, xOffset: 0 },
    //() => this.reflectWindowSizeAndImageSize(false));
    trace("onLayout", windowSize);
    this.reflectWindowSizeAndImageSize(false, windowSize)
  }

  reflectWindowSizeAndImageSize = (remeasure, windowSize) => {

    const onImageDimensions = (imageSize, windowSize) => {
      return new Promise((resolve, reject) => {
        const winSize = windowSize ? windowSize : this.state.windowSize;
        const sideMargin = Math.max(dimensions.minSideMargin, Math.floor(winSize.width * .05))


        const maxWidth = winSize.width - sideMargin * 2;
        const maxHeight = winSize.height - this.state.toolbarHeight - 2 * dimensions.toolbarMargin;

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

        const sideMarginFinal = (winSize.width - imageSize.w * ratio) / 2
        //trace("sideMargin", sideMargin);
        const viewPortRect = {
          top: 0,
          left: sideMarginFinal,
          width: imageSize.w * ratio,
          height: imageSize.h * ratio
        }

        trace("onImageDimensions", imageSize, winSize, viewPortRect, sideMarginFinal, sideMargin)

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

        this.setState({
          layoutReady: true,
          windowSize: winSize,
          imageSize,
          viewPortRect,
          pageRect: { ...viewPortRect, top: 0, left: 0 },
          sideMargin: sideMarginFinal,
          scaleRatio: ratio,
          xText, yText,
          currentImageElem: imgElem,
          //zoom: this.state.zoom, xOffset, yOffset
        }, () => {
          if (xOffset !== this.state.xOffset || yOffset !== this.state.yOffset) {
            this.changeZoomOrOffset({ zoom: this.state.zoom, xOffset, yOffset })
          }
          resolve();
        }
        );
      });

    }

    if (remeasure || !this.state.imageSize) {
      return getImageDimensions(this.state.currentFile, windowSize)
        .then((newSize) => onImageDimensions(newSize, windowSize))
        .catch(err => Alert.alert("Error measuring image dimension:" + err.message))
    } else {
      return onImageDimensions(this.state.imageSize, windowSize);
    }
  }

  doZoom = (delta) => {
    let newZoom = this.state.zoom + delta;
    this.changeZoomOrOffset({ zoom: newZoom, xOffset: this.state.xOffset, yOffset: this.state.yOffset });
  }

  afterUndoRedo = () => {
    const currTableID = this.state.currentTable?.id;
    trace("after Undo-redo 1", currTableID)
    this.setState({
      revision: this.state.revision + 1,
      currentImageElem: undefined,
      currentTable: undefined,
      showTextInput: false,
    }, () => {
      if (currTableID) {
        setTimeout(() => {
          const currentTable = this.state.canvasTables?.find(t => t.id === currTableID);
          trace("after Undo-redo", currTableID, currentTable)
          if (currentTable) {
            this.setState({ currentTable });
          }
          trace("after Undo-redo", currTableID, currentTable)
        });
      }
    })
    this.Save();
  }



  render() {
    const { row, rowReverse, flexEnd, textAlign, rtl, direction } = getRowDirections();

    const warnningBackground = this.state.viewportBackgroundColor ? { backgroundColor: this.state.viewportBackgroundColor } : {};

    return (
      <View style={styles.mainContainer}
        onLayout={this.onLayout} >
        <EditorToolbar
          ref={this.toolbarRef}
          windowSize={this.state.windowSize}
          onGoBack={() => this.props.navigation.goBack()}
          onUndo={() => {
            if (this.state.queue.undo()) {
              this.afterUndoRedo();
            }
          }}
          canRedo={this.state.queue.canRedo()}
          onRedo={() => {
            if (this.state.queue.redo()) {
              this.afterUndoRedo();
            }
          }}
          Table={this.state.currentTable}
          fontSize4Toolbar={this.fontSize4Toolbar}
          onZoomOut={() => this.doZoom(-.5)}
          onZoomIn={() => this.doZoom(.5)}
          eraseMode={this.state.eraseMode}
          onEraser={() => this.onEraserButton()}

          onRulerMode={() => this.onRulerMode()}
          isRulerMode={this.isRulerMode()}
          onTextMode={() => this.onTextMode()}
          onImageMode={() => {
            this.SaveCurrentEdits();
            this.setState({
              mode: Modes.IMAGE,
              ...MODES_CLEANUP
            })

            // find image. if none - open sub menu. if only one, make current
            let images = []
            const queue = this.state.queue.getAll();
            for (let i = 0; i < queue.length; i++) {
              if (queue[i].type === "image") {
                images.push(queue[i].elem);
              } else if (queue[i].type === 'imagePosition') {
                trace("resize img", images)
                const elemIndex = images.findIndex(ci => ci.id === queue[i].elem.id);
                if (elemIndex >= 0) {
                  trace("resize img", elemIndex)
                  images[elemIndex] = { ...images[elemIndex], ...queue[i].elem }
                  images = images.map(img => img.id !== queue[i].elem.id ? img : queue[i].elem);
                }
              } else if (queue[i].type === "imageDelete") {
                images = images.filter(img => img.id !== queue[i].elem.id)
              }
            }

            if (images.length === 0) {
              this.toolbarRef.current.openImageSubMenu();
            } else if (images.length == 1) {
              this.setState({ currentImageElem: this.imageNorm2Scale(images[0], this.state.scaleRatio) })
            }
          }
          }
          onAudioMode={() => this.onAudioMode()}
          onAddImageFromGallery={() => this.onAddImage(SRC_GALLERY)}
          onAddImageFromCamera={() => this.onAddImage(SRC_CAMERA)}

          onAddAudio={(b64) => this.onAddAudio(b64)}

          onBrushMode={() => this.onBrushMode()}
          onMarkerMode={() => this.onMarkerMode()}
          onVoiceMode={() => this.onVoiceMode()}
          onTableMode={() => this.onTableMode()}
          TableActions={this.TableActions}

          isTableMode={this.isTableMode()}
          isMarkerMode={this.isMarkerMode()}
          isTextMode={this.isTextMode()}
          isAudioMode={this.isAudioMode()}
          isImageMode={this.isImageMode()}
          isVoiceMode={this.isVoiceMode()}
          isBrushMode={this.isBrushMode()} //!this.isTextMode() && !this.isImageMode() && !this.isMarkerMode()}
          fontSize={this.state.fontSize}
          textAlignment={this.state.textAlignment}
          showCenterTextAlignment={this.state.currentTextElem?.tableCell}
          strokeWidth={this.state.strokeWidth}
          markerWidth={this.state.markerWidth}
          sideMargin={this.state.sideMargin}
          // betaFeatures={this.state.betaFeatures}

          onSelectColor={(color) => {
            trace("setColor", color, this.state.mode)
            const updateState = { eraseMode: false }
            if (this.isBrushMode() || this.isRulerMode()) updateState.brushColor = color;
            if (this.isMarkerMode()) updateState.markerColor = color;
            this.updateInputText();
            if (this.isTableMode()) {
              updateState.tableColor = color;
              this.TableActions.setColor(color);
            }

            if (this.isTextMode()) updateState.textColor = color;
            this.setState(updateState);
            if (this.isRulerMode() && this.state.selectedRulerElemId) {
              const selectedElem = this.canvas.current.findRulerById(this.state.selectedRulerElemId);
              if (selectedElem) {
                const modifiedColor = { ...selectedElem, color };
                this.state.queue.pushLine(modifiedColor);
                this.Save();
                this.incrementRevision();
              }
            }
          }}

          color={this.getColorByMode()}

          onSelectTextSize={(size) => this.onTextSize(size)}
          onSelectTextAlignment={(newTextAlignment) => this.onTextAlignment(newTextAlignment)}

          onSelectBrushSize={(brushSize) => this.onBrushSize(brushSize)}
          onSelectMarkerSize={(markerSize) => this.onMarkerSize(markerSize)}
          onToolBarDimensionsChange={(height, floatingHeight) => {
            trace("onToolBarDimensionsChange", height, floatingHeight)
            const change = {
              toolbarHeight: height,
              floatingMenuHeight: floatingHeight
            };

            this.setState(change,
              //move Text Input if needed
              () => {
                this.reflectWindowSizeAndImageSize(false)
                // if (this.state.yOffset > 0) {
                //   this.changeZoomOrOffset({ yOffset: 0 }, true);
                // }
              }
            );
          }}
          maxFloatingHeight={this.state.viewPortRect.height - this.state.keyboardHeight}
        />
        {/** Top Margin */}
        <View style={styles.topMargin} />

        {/** NavigationArea */}
        < View style={[styles.navigationArea, warnningBackground]} >
          {
            this.state.showBusy &&
            <View style={globalStyles.busy}>
              <ActivityIndicator size="large" /></View>
          }
          {/* page more menu */}
          {/* <View style={[{ position: 'absolute', top: 0 }, rtl ? { left: 0 } : { right: 0 }]}> */}
          {this.getMoreMenu()
          }
          {/* </View> */}
          {
            [
              this.getArrow(LEFT),
              this.getArrow(TOP),
              this.getArrow(RIGHT),
              this.getArrow(BOTTOM)
            ]}

          < View //{...this._panResponderMove.panHandlers} 
            style={
              [styles.leftMargin, warnningBackground, {
                width: this.state.sideMargin,
              }]} />
          <View //{...this._panResponderMove.panHandlers} 
            style={[styles.rightMargin, warnningBackground, {
              width: this.state.sideMargin,
            }]} />

          {/* * DEBUG COORDINATES
          <View style={{ position: "absolute", top: 0, left: 0, width: 350, height: 250, zIndex: 1000 }}>
            <Text>viewPort: {printRect(this.state.viewPortRect)}</Text>
            <Text>ScaleRatio: {this.state.scaleRatio}</Text>
            <Text>x,y: {Math.floor(this.state.xText) + "," + Math.floor(this.state.yText)}</Text>
            <Text>page: {printRect(this.state.pageRect)}</Text>
            {this.state.currentTextElem?.tableCell && <Text>textElem: minHeight:{this.state.currentTextElem.minHeight}</Text>}
            {this.state.currentTextElem?.height && <Text>textElem: height:{this.state.currentTextElem.height}</Text>}
            {this.state.tableResizeState && <Text>TableResize: init x,y {Math.floor(this.state.tableResizeState.initialX) + "," + Math.floor(this.state.tableResizeState.initialY)}</Text>}
          </View> */}


          <View style={[styles.viewPort, {
            top: this.state.viewPortRect.top,
            height: this.state.viewPortRect.height,
            width: this.state.viewPortRect.width, //Math.max(this.state.viewPortRect.width * this.state.zoom, this.state.windowSize.width),
            left: this.state.viewPortRect.left //this.state.sideMargin
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

                  {/* <ProgressCircle
                    radius={150}
                    color="#3399FF"
                    shadowColor="#999"
                    bgColor="white"
                    percent={this.state.shareProgress}
                    borderWidth={5} >
                    <Text style={{ zIndex: 100, fontSize: 25 }}>{fTranslate("ExportProgress", this.state.shareProgressPage, (this.state.page.count > 0 ? this.state.page.count : 1))}</Text>
                  </ProgressCircle> */}
                  <Progress.Circle
                    size={300} // Diameter (2 * radius)
                    progress={shareProgress / 100} // Convert to 0-1 range
                    color="#3399FF"
                    unfilledColor="#999999" // Equivalent to shadowColor
                    borderWidth={5}
                    thickness={8} // Adjust thickness as needed
                    showsText={false} // We'll add custom text
                    animated={true} // Enable animation if desired
                  >
                    <View style={styles.textContainer}>
                      <Text style={styles.text}>
                        {fTranslate(
                          "ExportProgress",
                          shareProgressPage,
                          page.count > 0 ? page.count : 1
                        )}
                      </Text>
                    </View>
                  </Progress.Circle>
                </View>}


              {
                this.getCanvas(this.state.pageRect.width, this.state.pageRect.height)
              }
              {
                this.state.canvasAudio?.map(elem => (
                  <AudioElement key={elem.id}
                    basePath={FileSystem.main.getAttachmentBase(this.state.page, this.state.currentIndex)}
                    audioFile={elem.file}
                    normX={elem.normPosition.x}
                    normY={elem.normPosition.y}
                    showDelete={this.isAudioMode()}
                    scaleRatio={this.state.scaleRatio} zoom={this.state.zoom}
                    xOffset={this.state.xOffset} yOffset={this.state.yOffset}
                    onDelete={() => {
                      this.state.queue.pushDeleteAudio({ id: elem.id });
                      this.Save();
                      this.incrementRevision();
                    }}

                    onMove={(normX, normY) => {
                      this.state.queue.pushAudioPosition({ ...elem, normPosition: { x: normX, y: normY } })
                      this.Save();
                      this.incrementRevision();
                    }}
                    size={audioImgSize}
                  />
                ))
              }
              {
                this.isAudioMode() && this.state.showAudioRecorder &&
                <AudioElement
                  basePath=""//{FileSystem.main.getAttachmentBase(this.state.page, this.state.currentIndex)}
                  editMode={true}
                  audioFile={this.state.currAudioElem.file}
                  onUpdateAudioFile={(filePath) => this.setState({ currAudioElem: { ...this.state.currAudioElem, file: filePath } })}
                  //       file: await FileSystem.main.attachedFileToPage(audioFilePath, this.state.page, this.state.currentIndex, "m4a"),

                  normX={this.state.xText}
                  normY={this.state.yText}
                  scaleRatio={this.state.scaleRatio}
                  zoom={this.state.zoom}
                  xOffset={this.state.xOffset}
                  yOffset={this.state.yOffset}
                  onMove={(normX, normY) => {
                    this.setState({ xText: normX, yText: normY });
                  }}
                  size={audioImgSize * 2}
                />
              }

            </Animated.View>
            {this.state.showTextInput && this.getTextInput(rtl)}


            {/** Show Texts rectangles for voice reading */}
            {/* {
              this.isVoiceMode() && this.canvas.current?.canvasTexts()?.filter(t => t.text.length > 0).map((textElem, i) => {
                // console.log("textElem", textElem)



                const elem = this.txtElemNorm2Scale(textElem);
                return (
                  <TouchableOpacity
                    key={i}
                    style={{
                      opacity: 0.5,
                      backgroundColor: "green",
                      borderRadius: 7,
                      position: "absolute",
                      left: (elem.rtl ? elem.position.x - elem.width : elem.position.x) * this.state.zoom + + this.state.xOffset,
                      top: (elem.position.y) * this.state.zoom + this.state.yOffset,
                      width: elem.width * this.state.zoom,
                      height: elem.height * this.state.zoom,
                      zIndex: 1000,
                    }} onPress={() => this.readoutText(textElem.text)} />
                )
              })} */}

            {/* {
              this.isVoiceMode() && this.state.detectedTexts?.length > 0 &&
              this.state.detectedTexts.map((textOnImage, i) => (
                <TouchableOpacity
                  key={i}
                  style={{
                    opacity: 0.5,
                    backgroundColor: "green",
                    borderRadius: 7,
                    position: "absolute",
                    left: textOnImage.rect.x * this.state.scaleRatio * this.state.zoom + + this.state.xOffset,
                    top: textOnImage.rect.y * this.state.scaleRatio * this.state.zoom + this.state.yOffset,
                    width: textOnImage.rect.width * this.state.scaleRatio * this.state.zoom,
                    height: textOnImage.rect.height * this.state.scaleRatio * this.state.zoom,
                    zIndex: 1000,
                  }} onPress={() => this.readoutText(textOnImage.text)} />
              ))
            } */}



            {this.state.currentImageElem && this.isImageMode() && this.getImageRect()}
          </View>


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
        {/** Bottom Margin */}
        < View style={[styles.bottomMargin, warnningBackground]} />

        {
          //debug only
          // <View style={{ position: "absolute", bottom: 30, width: "100%", left: 50, zIndex: 9999 }}>
          //   <Text>xText: {this.state.xText}</Text>
          // </View>
        }

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
    // const rtl = isRTL();
    // return <Menu ref={(ref) => this.menu = ref} >


    //   <MenuTrigger >
    //     {/* {getIconButton(() => {
    //       //   
    //       this.menu.open()

    //     }, semanticColors.editPhotoButton, 'more-vert', 55)} */}
    //   </MenuTrigger>
    //   <MenuOptions {...IDMenuOptionsStyle({ top: 0, width: 300 })}      >
    //     <MenuOption onSelect={() => this.rename(true)} >
    //       {renderMenuOption(translate("BtnChangeName", rtl),
    //         "edit")}
    //     </MenuOption>
    //     <Spacer width={5} />
    //     {this.state.page && this.state.page.count > 1 ?
    //       <MenuOption onSelect={() => this.deletePage()} >
    //         {renderMenuOption(fTranslate("BeforeDeleteSubPageQuestion", this.state.currentIndex + 1, this.state.page.count, rtl),
    //           "delete-forever")}
    //       </MenuOption>
    //       : null}
    //     {this.state.page && this.state.page.count > 1 ? <Spacer /> : null}
    //     <View style={{ flex: 1, width: '100%', flexDirection: 'column', alignItems: 'center' }}>
    //       {getRoundedButton(() => this.menu.close(), 'cancel-red', translate("BtnCancel"), 30, 30, { width: 150, height: 40 })}
    //     </View>
    //     <Spacer width={5} />
    //   </MenuOptions>

    // </Menu>
    const deletePageMenu = this.state.page && this.state.page.count > 1;

    return <FileContextMenu
      item={this.state.page}
      isLandscape={this.state.windowSize.height < this.state.windowSize.width}
      open={this.state.openContextMenu}
      height={this.state.windowSize.height * .7}
      width={this.state.windowSize.width * .75}
      onClose={() => {
        this.setState({ openContextMenu: false })
      }}

      onRename={() => this.rename(true)}
      onDeletePage={deletePageMenu ? () => {
        Alert.alert(translate("BeforeDeleteSubPageTitle"), translate("BeforeDeleteSubPageQuestion"),
          [
            {
              text: translate("BtnDelete"), onPress: () => {
                this.deletePage();

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

      } : undefined}
      deletePageIndex={this.state.currentIndex + 1}
      pagesCount={this.state.page?.count}

      onBlankPage={() => this.onAddBlankPage(FileSystem.StaticPages.Blank)}
      onLinesPage={() => this.onAddBlankPage(FileSystem.StaticPages.Lines)}
      onMathPage={() => this.onAddBlankPage(FileSystem.StaticPages.Math)}
      onAddFromCamera={() => this.onAddNewPage(SRC_CAMERA)}
      onAddFromMediaLib={() => this.onAddNewPage(SRC_GALLERY)}
    />
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
      //todo - arrow goes down too much in zoom
      style.top = this.state.viewPortRect.height * this.state.zoom - 60 - this.state.keyboardHeight, deg = 90;
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

  findTable = (viewPortXY) => {
    // todo find based on coordinates
    const table = this.state.canvasTables?.length > 0 ? this.state.canvasTables[0] : undefined;
    return { table };
  }

  TableActions = {
    delete: (id) => {
      this.state.queue.pushDeleteTable(id)
      this.setState({ currentTable: undefined, revision: this.state.revision + 1 })
    },
    addTable: (cols, rows, color, borderWidth, style) => {
      trace("addTable")
      const newTable = {
        id: genID(),
        color: color + "FF",
        width: borderWidth,
        verticalLines: [],
        horizontalLines: [],
        size: {
          width: this.state.pageRect.width,
          height: this.state.pageRect.height
        },
      }
      const bottomMargin = dimensions.toolbarHeight * 2;
      const topMargin = dimensions.toolbarHeight * 1.2;
      const sideMargin = 50;
      const colWidth = Math.floor((newTable.size.width - sideMargin * 2) / cols);
      const rowHeight = Math.floor((newTable.size.height - topMargin - bottomMargin) / rows);

      for (let i = 0; i <= cols; i++) {
        newTable.verticalLines.push(sideMargin + i * colWidth);
      }
      for (let i = 0; i <= rows; i++) {
        newTable.horizontalLines.push(topMargin + i * rowHeight);
      }

      this.state.queue.pushTable(newTable);
      this.setState({ currentTable: newTable, revision: this.state.revision + 1 })
      this.Save();
      trace("table added", newTable.id)
    },
    setRowsOrColumns: (newVal, isCols) => {
      if (newVal < 1) return;

      const table = this.state.currentTable;
      if (table) {
        const newTable = { ...table };
        const changeAtBegining = isCols && isRTL();

        const array = isCols ? [...newTable.verticalLines] : [...newTable.horizontalLines];
        const newArray = [];
        const lastElemSize = changeAtBegining ? array[1] - array[0] : arrLast(array) - array[array.length - 2];
        let isGrowing = true;
        let begin = 0, end = -2;
        if (newVal < array.length - 1) {

          if (changeAtBegining) {
            newArray.push(array[0]);
            begin = 2, end = array.length;
          }

          newArray.push(...array.slice(begin, end));

          if (!changeAtBegining) {
            newArray.push(arrLast(array));
          }
          isGrowing = false;

        } else if (newVal >= array.length) {
          if (changeAtBegining) {
            newArray.push(array[0]);
          }
          newArray.push(...array);

          if (!changeAtBegining) {
            newArray.push(arrLast(array));
          }
        }


        // Adjust the other elements
        let accDelta = 0;
        if (changeAtBegining) {
          for (let i = newArray.length - 1; i > 1; i--) {
            const elemSize = newArray[i] - newArray[i - 1];
            accDelta = isGrowing ?
              accDelta + (elemSize / newArray.length) :
              accDelta - (lastElemSize / (newArray.length - 1))
            trace("change ", i, accDelta)
            newArray[i - 1] += accDelta;
          }
        } else {
          for (let i = 1; i < newArray.length - 1; i++) {
            const elemSize = newArray[i] - newArray[i - 1];
            accDelta = isGrowing ?
              accDelta - (elemSize / (newArray.length)) :
              accDelta + (lastElemSize / (newArray.length - 1))
            newArray[i] += accDelta;
          }
        }

        if (isCols) {
          newTable.verticalLines = newArray;
        } else {
          newTable.horizontalLines = newArray;
        }
        this.state.queue.pushTable(newTable);
        this.setState({ currentTable: newTable, revision: this.state.revision + 1 })
        this.Save();
      }
    },
    setColor: (newColor) => {
      const table = this.state.currentTable;
      if (table) {
        const newTable = { ...table };
        newTable.color = newColor + "FF";
        this.state.queue.pushTable(newTable);
        this.setState({ currentTable: newTable, revision: this.state.revision + 1 })
        this.Save();
      }
    },
    setBorderWidth: (borderWidth) => {
      const table = this.state.currentTable;
      if (table && table.width !== borderWidth) {
        const newTable = { ...table };
        newTable.width = borderWidth;
        this.state.queue.pushTable(newTable);
        this.setState({ currentTable: newTable, revision: this.state.revision + 1 })
        this.Save();
      }
    },
    setBorderStyle: (borderStyle) => {
      const table = this.state.currentTable;
      if (table && table.style !== borderStyle) {
        const newTable = { ...table };
        newTable.style = borderStyle;
        this.state.queue.pushTable(newTable);
        this.setState({ currentTable: newTable, revision: this.state.revision + 1 })
        this.Save();
      }
    }
  }

  changeTable = (tableResizeState) => {

    if (tableResizeState) {
      const res = this.resizeTable(tableResizeState,
        this.state.pageRect.width, this.state.pageRect.height, true);
      if (res.tableChanged) {
        this.state.queue.pushTable(res.table);
        this.setState({ currentTable: res.table });
      }


      if (res.tableSelectionMove && this.state.tableSelection) {
        const normBox = normalizeBox(this.state.tableSelection);
        const targetBox = calculateTargetBox(res.table, normBox, res.tableSelectionMove.to);

        if (!isSameCell(normBox.from, targetBox.from) || !isSameCell(normBox.to, targetBox.to)) {
          //trace(normBox, targetBox)
          // swap table cells
          // first move the original range
          const moves = []
          for (let x = normBox.from[0]; x <= normBox.to[0]; x++) {
            for (let y = normBox.from[1]; y <= normBox.to[1]; y++) {
              const from = [x, y];
              const to = offsetTableCell(targetBox.from, [x - normBox.from[0], y - normBox.from[1]])

              moves.push({ from, to });
            }
          }
          // then move the overwritten back - ignoring overlap
          for (let x = targetBox.from[0]; x <= targetBox.to[0]; x++) {
            for (let y = targetBox.from[1]; y <= targetBox.to[1]; y++) {
              const from = [x, y];
              if (!isCellInBox(from, normBox)) {
                let to = offsetTableCell(normBox.from, [x - targetBox.from[0], y - targetBox.from[1]]);

                // check if to falls on the target box
                if (isCellInBox(to, targetBox)) {
                  const move = moves.find(m => isSameCell(m.to, to));
                  if (move) {
                    to = move.from;
                  }
                }
                moves.push({ from, to });
              }
            }
          }
          trace("table range moved", moves)
          this.state.queue.pushTableRangeMove(res.table.id, moves);
        }
        this.setState({ tableSelectionMove: undefined, tableSelection: targetBox });
      }
      this.Save();
    }
  }

  findCell = (table, x, y) => {
    let row = -1, col = -1;
    for (let r = 0; r < table.horizontalLines.length - 1; r++) {
      if (table.horizontalLines[r] < y && table.horizontalLines[r + 1] > y) {
        row = r;
        break;
      }
    }
    for (let c = 0; c < table.verticalLines.length - 1; c++) {
      if (table.verticalLines[c] < x && table.verticalLines[c + 1] > x) {
        col = c;
        break;
      }
    }
    if (col >= 0 && row >= 0) {
      return [col, row];
    }
    return undefined;
  }


  resizeTable = (tableResizeState, width, height) => {
    let tableChanged = false;
    const table = tableResizeState.table;
    if (!table) return undefined;

    let retTable = { ...table };
    const tvPageRectX = this.page2TableX(table, this.state.pageRect.width)
    const tvPageRectY = this.page2TableY(table, this.state.pageRect.height)

    const onLine = (line, isVertical) => {
      const initialValue = isVertical ? tableResizeState.initialX : tableResizeState.initialY;

      return Math.abs(initialValue - line) < 20;
    }

    //trace("ResizeTable", tableResizeState.initialY, table.horizontalLines )


    const topStart = onLine(table.verticalLines[0] - RESIZE_TABLE_BOX_SIZE, true) && onLine(table.horizontalLines[0] + RESIZE_TABLE_BOX_SIZE, false);
    const bottomEnd = onLine(table.verticalLines[table.verticalLines.length - 1] + RESIZE_TABLE_BOX_SIZE / 2, true) &&
      onLine(table.horizontalLines[table.horizontalLines.length - 1] + RESIZE_TABLE_BOX_SIZE / 2, false);

    let alignX = 0, alignY = 0;
    // align to the corner
    if (topStart) {
      alignX = tableResizeState.initialX - table.verticalLines[0];
      alignY = tableResizeState.initialY - table.horizontalLines[0];
    }

    if (bottomEnd) {
      alignX = arrLast(table.verticalLines) - tableResizeState.initialX;
      alignY = arrLast(tableResizeState.initialY);
    }

    //prevents out of bounds:
    // too much left?
    if (tableResizeState.currentX - alignX < PAGE_MARGIN) {
      tableResizeState.currentX = PAGE_MARGIN + alignX;
    }

    // too much top?
    if (tableResizeState.currentY - alignY < PAGE_MARGIN) {
      tableResizeState.currentY = PAGE_MARGIN + alignY;
    }

    // too much right?
    if (tableResizeState.currentX > tvPageRectX - PAGE_MARGIN) {
      tableResizeState.currentX = tvPageRectX - PAGE_MARGIN;
    }


    // too much bottom
    if (tableResizeState.currentY > tvPageRectY - PAGE_MARGIN) {
      tableResizeState.currentY = tvPageRectY - PAGE_MARGIN;
    }

    let resizeFactorX, resizeFactorY

    if (topStart) {
      // table will overflow to the right?
      const deltaX = tableResizeState.currentX - tableResizeState.initialX;
      if (arrLast(table.verticalLines) + deltaX > tvPageRectX - PAGE_MARGIN) {
        tableResizeState.currentX = tableResizeState.initialX - arrLast(table.verticalLines) + tvPageRectX - PAGE_MARGIN;
      }
      const deltaY = tableResizeState.currentY - tableResizeState.initialY;
      if (arrLast(table.horizontalLines) + deltaY > tvPageRectY - PAGE_MARGIN) {
        tableResizeState.currentY = tableResizeState.initialY - arrLast(table.horizontalLines) + tvPageRectY - PAGE_MARGIN;
      }
    }


    if (topStart || bottomEnd) {
      retTable.verticalLines = [...table.verticalLines];
      retTable.horizontalLines = [...table.horizontalLines];
      tableChanged = true;
      const tableCurrWidth = table.verticalLines[table.verticalLines.length - 1] - table.verticalLines[0];
      const tableNewWidth = tableResizeState.currentX - table.verticalLines[0];
      resizeFactorX = tableNewWidth / tableCurrWidth;

      const tableCurrHeight = table.horizontalLines[table.horizontalLines.length - 1] - table.horizontalLines[0];
      const tableNewHeight = tableResizeState.currentY - table.horizontalLines[0];
      resizeFactorY = tableNewHeight / tableCurrHeight;
    }

    for (let c = 0; c < table.verticalLines.length; c++) {
      if (topStart) {
        retTable.verticalLines[c] += tableResizeState.currentX - tableResizeState.initialX;
      } else if (bottomEnd) {
        // calculate the total new width:
        retTable.verticalLines[c] = (retTable.verticalLines[c] - retTable.verticalLines[0]) * resizeFactorX + retTable.verticalLines[0];
      } else {
        if (c == 0) continue;
        if (onLine(table.verticalLines[c], true)) {

          retTable.verticalLines = [...table.verticalLines]


          retTable.verticalLines[c] += tableResizeState.currentX - tableResizeState.initialX;

          // verify not passed another vertical line
          if (c > 0) {
            retTable.verticalLines[c] = Math.max(retTable.verticalLines[c], retTable.verticalLines[c - 1] + TABLE_LINE_MARGIN);
          }

          if (c < table.verticalLines.length - 1) {
            retTable.verticalLines[c] = Math.min(retTable.verticalLines[c], retTable.verticalLines[c + 1] - TABLE_LINE_MARGIN);
          }
          tableChanged = true;
        }
      }

    }


    for (let r = 0; r < table.horizontalLines.length; r++) {
      if (topStart) {
        retTable.horizontalLines[r] += tableResizeState.currentY - tableResizeState.initialY;
      } else if (bottomEnd) {
        // calculate the total new height:
        retTable.horizontalLines[r] = (retTable.horizontalLines[r] - retTable.horizontalLines[0]) * resizeFactorY + retTable.horizontalLines[0];

      } else {
        if (r == 0) continue; //ignore resize on top line

        if (onLine(table.horizontalLines[r], false)) {
          retTable.horizontalLines = [...table.horizontalLines];

          let delta = tableResizeState.currentY - tableResizeState.initialY;
          const currentRowWidth = retTable.horizontalLines[r] - retTable.horizontalLines[r - 1];

          if (currentRowWidth + delta < TABLE_LINE_MARGIN) {
            delta = TABLE_LINE_MARGIN - currentRowWidth;
          }

          if (retTable.minHeights && retTable.minHeights[r - 1] > -1 && currentRowWidth + delta < retTable.minHeights[r - 1]) {
            //limit the resize to 
            delta = retTable.minHeights[r - 1] - currentRowWidth;
          }

          // verify not passing end of page vertically:
          if (arrLast(retTable.horizontalLines) + delta > this.page2TableY(retTable, height) - PAGE_MARGIN) {
            delta = this.page2TableY(retTable, height) - PAGE_MARGIN - arrLast(retTable.horizontalLines);
          }

          for (let r2 = r; r2 < retTable.horizontalLines.length; r2++) {
            retTable.horizontalLines[r2] += delta;
          }
          tableChanged = true;

          break;

        }
      }
    }



    // Check if selection fits


    let tableSelectionMove = this.state.tableSelectionMove;

    if (!tableChanged) {

      const from = this.findCell(retTable, tableResizeState.initialX, tableResizeState.initialY);
      if (from) {
        let to = this.findCell(retTable, tableResizeState.currentX, tableResizeState.currentY);
        if (!to) {
          to = from;
        }

        // Check if already some cells are selected, and draging started from them - them we are in move cells mode
        if (tableResizeState.existingTableSelection && isCellInBox(from, tableResizeState.existingTableSelection)) {
          const pixelDelta = [
            tableResizeState.currentX - tableResizeState.initialX,
            tableResizeState.currentY - tableResizeState.initialY
          ];
          if (!this.state.tableSelectionMove ||
            !isSameCell(from, tableSelectionMove.from) ||
            !isSameCell(to, tableSelectionMove.to) ||
            !isSameCell(pixelDelta, tableSelectionMove.pixelDelta)) {
            tableSelectionMove = {
              from, to,
              pixelDelta: [
                tableResizeState.currentX - tableResizeState.initialX,
                tableResizeState.currentY - tableResizeState.initialY
              ]
            }
            this.setState({ tableSelectionMove });
          }

        } else {
          // check for new selection
          if (!this.state.tableSelection ||
            !isSameCell(from, this.state.tableSelection.from) ||
            !isSameCell(to, this.state.tableSelection.to)) {

            this.setState({ tableSelection: { from, to }, tableSelectionMove: undefined });
          }
        }
      }
    }

    return {
      table: retTable,
      tableChanged,
      tableSelectionMove
    };
  }

  getColorByMode = () => {
    switch (this.state.mode) {
      case Modes.BRUSH:
      case Modes.RULER:
        return this.state.brushColor;
      case Modes.MARKER:
        return this.state.markerColor;
      case Modes.TABLE:
        return this.state.tableColor;
      default:
        return this.state.textColor;
    }
  }



  getCanvas = (width, height) => {
    let strokeWidth = this.isEraserMode() ?
      (this.state.strokeWidth * 3 < 15 ? 15 : this.state.strokeWidth * 3)
      : this.state.strokeWidth;

    let color = this.isEraserMode() ? '#00000000' : this.getColorByMode();

    return (
      <Canvas
        ref={this.canvas}
        metaDataPath={this.state.metaDataUri}
        width={width}
        height={height}
        layoutReady={this.state.layoutReady}
        revision={this.state.revision}
        zoom={this.state.zoom} //important for path to be in correct size
        scaleRatio={this.state.scaleRatio}
        isBrushMode={this.isBrushMode() || this.isMarkerMode() || (this.isRulerMode && this.isEraserMode())}
        isImageMode={this.isImageMode()}
        isTableMode={this.isTableMode()}
        Table={this.state.currentTable}
        TableResizeState={this.state.tableResizeState}
        TableSelection={this.state.tableSelection}
        TableSelectionMove={this.state.tableSelectionMove}
        SelectedRulerElemId={this.state.selectedRulerElemId}
        ResizeTable={this.resizeTable}
        imagePath={this.state.currentFile}
        SketchEnd={this.SketchEnd}
        SketchStart={this.SketchStart}
        AfterRender={this.handleOnRevisionRendered}
        queue={this.state.queue}
        normFontSize2FontSize={this.normFontSize2FontSize}
        imageNorm2Scale={this.imageNorm2Scale}
        imageScale2Norm={this.imageScale2Norm}
        currentTextElemId={this.isTextMode() && this.state.showTextInput ? this.state.currentTextElem?.id : undefined}
        strokeWidth={this.isBrushMode() ? strokeWidth : this.state.markerWidth}
        color={this.isMarkerMode() && !this.isEraserMode() ? color + MARKER_TRANSPARENCY_CONSTANT : color}
        onTableResizeDuringTextEdit={() => this.incrementTextEditRevision()}
        updateState={(newState) => {
          trace("Canvas updates state", Object.keys(newState).map(key => newState[key].map(e => e.normPosition)))
          this.setState(newState)
        }}
      />

    );
  }


  updateInputText = () => {
    // if (this._textInput) {
    //   this._textInput.setNativeProps({ text: this.state.currentTextElem?.text + ' ' });

    //   setTimeout(() => {
    //     if (this._textInput) {
    //       this._textInput.setNativeProps({ text: this.state.currentTextElem?.text });
    //     }
    //   }, 50);
    // }
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

      <View {...this._panResponderElementResize.panHandlers}
        style={{
          position: "absolute",
          left: w - DRAG_ICON_SIZE + 15,
          top: h - DRAG_ICON_SIZE + 15,
          width: DRAG_ICON_SIZE,
          height: DRAG_ICON_SIZE,
          zIndex: 25
        }}>

        <Icon type="material-community" name="resize-bottom-right" size={DRAG_ICON_SIZE} color="gray" />
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
                    revision: this.state.revision + 1,
                  });
                  this.Save();
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

  warnEndOfPage = (table, elem, tooLargeText, isFontChange) => {
    if (elem || isFontChange) {
      RNSystemSounds.beep(RNSystemSounds.Beeps.Negative)
      const tableOverflow = table && elem.tableCell?.row < table.horizontalLines.length - 2;

      showMessage({
        message: tableOverflow ? translate("TableOverflowsPage") :
          (isFontChange ? translate("FontChangeOverflowsPage") :
            translate("ReachedEndOfPage")),
        type: "warning",
        animated: true,
        duration: 10000,
        position: this.state.windowSize.height < this.state.windowSize.width ? { left: this.state.windowSize.width / 2 - 225, top: 50 } : "center",
        titleStyle: { lineHeight: 35, fontSize: 25, height: 100, textAlign: "center", margin: 15, color: "black" },
        style: { width: 450, height: 250 },

        renderAfterContent: (opt) => {
          return <View style={{ flexDirection: "row", height: 50, width: "100%", justifyContent: 'center' }}>
            {!tableOverflow && !isFontChange && getRoundedButton(
              async () => {
                trace("addPageToSheet", this.state.currentFile)
                hideMessage()

                // take the last line - after NL
                let text = ""
                text = tooLargeText
                let nlPos = text.lastIndexOf("\n");
                if (nlPos === text.length - 1) {
                  nlPos = text.lastIndexOf("\n", nlPos - 1);
                }

                if (nlPos >= 0) {
                  text = text.substring(nlPos + 1);
                  elem.text = tooLargeText.substr(0, nlPos);
                } else {
                  elem.text = "";
                }

                this.SaveText();

                const currIndex = this.state.currentIndex;

                FileSystem.main.cloneToTemp(this.state.currentFile).then((newUri) =>
                  FileSystem.main.addPageToSheet(this.state.page, newUri, this.state.currentIndex + 1)).then((updatedSheet) => {
                    trace('add page at end of file', updatedSheet)
                    this.setState({ page: updatedSheet, currentFile: updatedSheet.defaultSrc }, () => {

                      // after page is added, move to it, and if was in editing table, copy the table into the new page:
                      trace("push new page ", currIndex + 1)
                      this.movePage(currIndex + 1).then(async () => {
                        let txtElem
                        if (table) {
                          this.state.queue.pushTable({ ...table });
                          txtElem = {
                            ...elem,
                            minHeight: undefined,
                            text,
                            tableCell: {
                              tableID: table.id,
                              col: elem.tableCell.col,
                              row: 0,
                            }
                          }

                          this.state.queue.pushTableCellText(
                            txtElem
                          );
                        } else {
                          txtElem = {
                            ...elem,
                            text,
                            normPosition: {
                              x: this.viewPort2NormX(this.state.xText),
                              y: 0
                            }
                          };

                          this.state.queue.pushText(
                            txtElem
                          );
                        }
                        trace("save new page after overflow")
                        await this.Save();
                        this.editTextElement(txtElem, 1, 1);
                      });
                    });
                  })
              },
              "add",
              translate("AddPageMenuTitle"),
              25, 35, { width: 180 })}
            <Spacer />
            {getRoundedButton(
              () => { hideMessage() },
              "cancel",
              tableOverflow || isFontChange ? translate("BtnOK") : translate("BtnCancel"),
              25, 35, { width: 180 })}

          </View>

        }
      })
      //this.setState({ viewportBackgroundColor: "#F0AD4E" })
      //setTimeout(() => this.setState({ viewportBackgroundColor: undefined }), 5000)
    }
  }


  getTextInput = (defaultRTL) => {
    if (!this.state.currentTextElem) return;
    const r = this.state.scaleRatio;
    const z = this.state.zoom;

    let elem = this.state.currentTextElem;

    let x = this.state.xText;
    let y = this.state.yText;

    const isTableCell = elem.tableCell;
    let table;
    if (isTableCell) {
      const { tableID, col, row } = elem.tableCell;
      table = this.state.canvasTables?.find(t => t.id === tableID);
    }


    let textWidth = 0;
    let inputTextHeight = elem.height || 0;
    const direction = elem.alignment ? (elem.alignment == TextAlignment.RIGHT ? 'rtl' : 'ltr') : (defaultRTL ? 'rtl' : 'ltr');
    const rtl = direction == 'rtl';

    const modifiedState = {}

    if (!this.state.textAlignment) {
      modifiedState.textAlignment = defaultRTL ? TextAlignment.RIGHT : TextAlignment.LEFT;
    }

    if (isTableCell) {

      const { col, row } = elem.tableCell;

      if (table) {
        // todo table margin

        x = this.page2ViewPortX(this.table2PageX(table, table.verticalLines[col] + table.width / 2));
        y = this.page2ViewPortY(this.table2PageY(table, table.horizontalLines[row] + table.width / 2));

        textWidth = this.table2PageX(table, tableColWidth(table, col) - table.width);
        inputTextHeight = this.table2PageY(table, tableRowHeight(table, row) - table.width);

        if (this.state.xText !== x || this.state.yText !== y || this.state.currentTable != table) {
          trace("changes", this.state.xText !== x, this.state.yText !== y, this.state.currentTable != table)
          modifiedState.xText = x;
          modifiedState.yText = y;
          modifiedState.currentTable = table;
        }
      }
    } else {
      if (elem.alignment === TextAlignment.CENTER) {
        modifiedState.textAlignment = defaultRTL ? TextAlignment.RIGHT : TextAlignment.LEFT;
        elem.alignment = modifiedState.textAlignment;
        elem.modified = true;
      }
      textWidth = this.getTextWidth(x, rtl);
    }

    // calculates the width/height:

    this.measureText(isTableCell && table, elem.text || "a", elem, textWidth, y).then(({ eop, size, newTvCellHeight, minHeightDelta }) => {
      const newNormWidth = this.width2NormWidth(size.width, this.state.fontSize);

      if (isTableCell) {
        if (minHeightDelta !== 0) {
          elem.minHeight = newTvCellHeight;
          elem.modified = true;
          this._handleInputTextLocationMovingPage();
          this.incrementRevision();
        }
      }

      if ((elem.normWidth != newNormWidth || Math.ceil(size.height) != elem.height) && size.width > 0) {
        trace("text input, width or height changed", newNormWidth, size.height)
        elem.normWidth = newNormWidth;
        if (elem.height != Math.ceil(size.height)) {
          console.log("change height size", size.height)

          elem.height = Math.ceil(size.height);
          this._handleInputTextLocationMovingPage();
        }
        elem.modified = true;
        this.incrementRevision()
      }

      if (elem.normFontSize !== this.state.fontSize) {
        if (eop) {
          // revert font change:
          this.setState({ fontSize: elem.normFontSize });
          this.warnEndOfPage(undefined, undefined, undefined, true);
        } else {
          elem.normFontSize = this.state.fontSize;
          elem.fontSize = this.normFontSize2FontSize(this.state.fontSize);
          elem.modified = true;
          this.incrementRevision()
        }
      }
    });

    const fSize = this.normalizeTextSize(this.state.fontSize);

    // handle change of color/alignment
    if (elem.fontColor !== this.state.textColor || elem.rtl != rtl || (this.state.textAlignment && elem.alignment !== this.state.textAlignment)) {
      trace("modify elem", elem.fontColor !== this.state.textColor, elem.rtl != rtl, elem.alignment !== this.state.textAlignment)

      elem.fontColor = this.state.textColor;
      elem.rtl = rtl;
      if (this.state.textAlignment) {
        elem.alignment = this.state.textAlignment;
      }
      elem.modified = true;

      modifiedState.revision = this.state.revision + 1;
    }



    if (Object.keys(modifiedState).length > 0) {
      trace("textInput modify state", modifiedState)
      this.setState(modifiedState);
    }

    const textActualWidth = isTableCell ? textWidth : this.normWidth2Width(elem.normWidth, this.state.fontSize) + 13;
    const left = x - (isTableCell ? 0 : (rtl ? textWidth / r : DRAG_ICON_SIZE));


    return (
      <View style={{
        position: 'absolute',
        flexDirection: direction == 'rtl' ? "row-reverse" : "row",
        left: left,
        top: y,
        zIndex: 45,
      }}>
        {!isTableCell && <View {...this._panResponderElementMove.panHandlers}
          style={{ top: -5, zIndex: 25 }}>
          <Icon type="material-community" name="arrow-all" size={DRAG_ICON_SIZE} color="gray" />
        </View>}

        <TextInput
          ref={this.inputRef}
          value={elem.text}
          onChangeText={(text) => {
            trace("onTextChange", text)
            const origText = elem.text;
            if (text !== elem.text) {
              this.measureText(isTableCell && table, text, elem, textWidth, y).then(({ eop }) => {
                if (eop) {
                  this.warnEndOfPage(table, elem, text)
                  elem.text = origText
                  this.incrementTextEditRevision();
                }
              })

              elem.text = text;
              elem.modified = true;
              this.incrementTextEditRevision();
            }
          }}


          autoCapitalize={'none'}
          autoCorrect={false}
          multiline={true}
          autoFocus
          allowFontScaling={false}
          maxLength={elem.supressEndOfPage}
          style={{
            backgroundColor: 'transparent',
            direction,
            textAlign: elem.alignment?.toLowerCase(),
            width: textWidth / r,
            height: inputTextHeight / r,
            borderWidth: 0,
            fontSize: (fSize / r),
            color: this.getColorByMode(),
            fontFamily: getFont(),
            zIndex: 21,
            transform: this.getTransform(textWidth / r, inputTextHeight / r, z * r, rtl && !isTableCell),
            //backgroundColor: "#00B800",
            padding: 0,
            // paddingLeft: isTableCell ? 1 : 0,
            // paddingRight: isTableCell ? 1 : 0,
            borderStyle: "solid",
            textAlignVertical: 'center',
            lineHeight: fSize * 1.15 / r,
          }}
          onTouchStart={(ev) => {
            let x = this.screen2ViewPortX(ev.nativeEvent.pageX);


            if (elem.normWidth && Math.abs(this.state.xText - x) > elem.normWidth * this.state.scaleRatio * this.state.zoom + DRAG_ICON_SIZE) {
              //treats it as if click outside the text input, delegates to canvasClick
              this.canvasClick(ev);
            }
          }}

        />
        <View style={{
          position: 'absolute',
          [rtl ? "right" : "left"]: isTableCell ? 0 : (DRAG_ICON_SIZE - 2),
          top: 0,
          width: textActualWidth / r,
          height: inputTextHeight > 0 ? inputTextHeight / r : 45 / r,
          zIndex: 20,
          transform: this.getTransform(textActualWidth / r, inputTextHeight / r, z * r, rtl && !isTableCell),
          lineHeight: fSize * 1.15 / r
        }}
          backgroundColor={this.getColorByMode() === '#fee100' ? 'gray' : 'yellow'}
        />
      </View >);
  }


  measureText = (table, text, elem, textWidth, y) => {
    return this.canvas.current?.canvas.current?.measureText(text, textWidth, {
      font: getFont(),
      fontSize: this.normalizeTextSize(this.state.fontSize)
    }).then(size => {
      let newTvCellHeight, minHeightDelta
      let eop
      if (table) {
        newTvCellHeight = Math.ceil(this.page2TableY(table, (size.height || this.state.fontSize) + table.width));
        minHeightDelta = elem.minHeight ? newTvCellHeight - elem.minHeight : newTvCellHeight;

        // check that minHeight delta may case table out of page and that new minHeight is > current row height
        const tvPageRectY = this.page2TableY(table, this.state.pageRect.height)
        eop = (minHeightDelta > 0 && tableRowHeight(table, elem.tableCell.row) < newTvCellHeight &&
          arrLast(table.horizontalLines) + minHeightDelta > tvPageRectY);
      } else {
        const pageEndOfText = this.viewPort2pageY(y) + size.height;
        eop = (pageEndOfText > this.state.pageRect.height);
      }
      return { eop, size, newTvCellHeight, minHeightDelta };
    });
  }

  normalizeTextSize = (size) => {
    return this.normFontSize2FontSize(size);
    // const newSize = this.normFontSize2FontSize(size)
    // if (Platform.OS === 'ios') {
    //   return Math.round(PixelRatio.roundToNearestPixel(newSize))
    // } else {
    //   return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2
    // }
  }
  getTextWidth = (x, rtl) => {
    let width = x - this.state.xOffset;
    if (!rtl) {
      width = this.state.pageRect.width * this.state.zoom - width;
    }
    width /= this.state.zoom;
    return Math.max(25 * this.state.zoom, width);
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
    zIndex: 15,
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