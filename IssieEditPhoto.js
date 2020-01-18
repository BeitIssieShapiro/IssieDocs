
import React from 'react';
import {
  AppRegistry, Image, ScrollView, StyleSheet, TextInput, View,
  TouchableOpacity, Text, Alert, PanResponder, Dimensions, Keyboard
} from 'react-native';
import { Svg, Path } from 'react-native-svg'
import { Icon } from 'react-native-elements'
import RNSketchCanvas from './modified_canvas/index';
import LinearGradient from 'react-native-linear-gradient';
import * as RNFS from 'react-native-fs';
//import RNReadWriteExif from 'react-native-read-write-exif';
import Share from 'react-native-share';
import DoQueue from './do-queue';
import FadeInView from './FadeInView'
import { Spacer, globalStyles, getRoundedButton, getEraserIcon } from './elements'
import * as Progress from 'react-native-progress';
import { fTranslate } from './lang.js'

import {
  colors, DEFAULT_FOLDER_NAME, getFolderAndIcon, getImageDimensions,
  getPageNavigationButtons,
  semanticColors, getIconButton, dimensions, availableTextSize, availableBrushSize, availableColorPicker
} from './elements'
import { translate } from './lang';
//import rnTextSize from 'react-native-text-size'
//import MeasureText from 'react-native-measure-text';
//import ReactNativeComponentTree from 'react-native/Libraries/Renderer/shims/ReactNativeComponentTree';

const topLayer = dimensions.toolbarHeight + dimensions.toolbarMargin; //51 + 8 + 8 + 35;
const shareTimeMs = 2000;

const maxZoom = 3;
const TOP = 0, RIGHT = 1, BOTTOM = 2, LEFT = 3;
const DEFAULT_STROKE_WIDTH = 5;
const INITIAL_TEXT_SIZE = 80;
const MAX_STROKE_WIDTH = 12;
const DRAG_ICON_SIZE = 45;

export default class IssieEditPhoto extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const page = navigation.getParam('page', '');
    let pathParts = page.path.split('/');

    let fileName = page.path.replace(/^.*[\\\/]/, '');
    if (fileName.endsWith('.jpg')) {
      fileName = fileName.substr(0, fileName.length - 4);
    }
    let isPageOnHome = pathParts[pathParts.length - 2] == DEFAULT_FOLDER_NAME;
    let folderAndIcon = getFolderAndIcon(pathParts[pathParts.length - 2]);
    let multiPageTitleAddition = navigation.getParam('pageTitleAddition', '');

    return {
      title: fileName + multiPageTitleAddition,
      headerStyle: globalStyles.headerStyle,
      headerTintColor: 'white',
      headerTitleStyle: globalStyles.headerTitleStyle,
      headerLeft:
        <View >
          <TouchableOpacity onPress={() => { navigation.pop() }}
            activeOpacity={1}
            style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name='keyboard-arrow-left' color='white' size={35} />
            {/* <Text style={{ color: 'white', fontSize: 20, top: 2 }}>{isPageOnHome ? 'בית' : folderAndIcon.name}</Text> */}
            <Spacer width={10} />
            <Icon name={isPageOnHome ? 'home' : 'home'} color='white' size={30} />
          </TouchableOpacity>

        </View>
      ,
    };
  }

  constructor() {
    super();

    this.Load = this.Load.bind(this);

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => this._shouldDragText(evt, gestureState) && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onStartShouldSetPanResponderCapture: (evt, gestureState) => this._shouldDragText(evt, gestureState) && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onMoveShouldSetPanResponder: (evt, gestureState) => this._shouldDragText(evt, gestureState) && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => false && this._shouldDragText(evt, gestureState) && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3),
      onPanResponderMove: (evt, gestureState) => {
        let xText = this.s2aW(gestureState.moveX - DRAG_ICON_SIZE / 2);
        if (xText < 25) {
          xText = 25;
        } else if (xText > this.state.canvasW + DRAG_ICON_SIZE / 2) {
          xText = this.state.canvasW + DRAG_ICON_SIZE / 2;
        }

        let yText = this.s2aH(gestureState.moveY - DRAG_ICON_SIZE / 2)
        if (yText < -this.state.yOffset) {
          yText = -this.state.yOffset;
        } else if (yText > (this.state.canvasH - this.inputTextHeight)) {
          yText = this.state.canvasH - this.inputTextHeight;
        } else if (yText > this.state.canvasH - this.state.keyboardHeight - this.state.yOffset - 10) {
          yText = this.state.canvasH - this.state.keyboardHeight - this.state.yOffset - 10;
        }

        let inputTextWidth = this.limitTextWidth(this.state.inputTextWidth, xText, yText);
        if (this.state.textMode) {
          this.setState({
            xText, yText, inputTextWidth
          });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (this.state.textMode) this.SaveText(false, true);
      }
    });

    this._panResponderMove = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => this._shouldMove(evt, gestureState),
      onStartShouldSetPanResponderCapture: (evt, gestureState) => this._shouldMove(evt, gestureState),
      onMoveShouldSetPanResponder: (evt, gestureState) => this._shouldMove(evt, gestureState),
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => this._shouldMove(evt, gestureState),
      onPanResponderMove: (evt, gestureState) => {
        let yOffsetBegin = this.state.yOffsetBegin;
        if (!yOffsetBegin) {
          yOffsetBegin = this.state.yOffset;
        }
        let newYOffset = yOffsetBegin + gestureState.dy;
        if (newYOffset > 0) {
          newYOffset = 0;
        }
        if (newYOffset < -(this.state.keyboardHeight - 5)) {
          newYOffset = -(this.state.keyboardHeight - 5);
        }
        this.setState({
          yOffsetBegin, yOffset: newYOffset
        });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx == 0 && gestureState.dy == 0) {
          //no move - click
          this.TextModeClick(evt)
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
      textMode: true,
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
      topView: 0,
      zoom: 1.0,
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

  _shouldDragText = (evt, gestureState) => {
    return this.state.showTextInput;
  }

  _shouldMove = (evt, gestureState) => {
    let shouldMove = this.state.keyboardHeight > 0 || this.state.textMode && this.state.yOffset > 0;
    if (shouldMove) {
      //Alert.alert("should move")
    }
    return shouldMove;
  }

  _keyboardDidShow = (e) => {
    let yOffset = this.state.yOffset;
    let kbTop = this.state.windowH - e.endCoordinates.height;

    //Alert.alert("kbTop:"+kbTop+", wH:"+this.state.windowH+",cH:"+this.state.canvasH)

    //ignore the part of keyboard that is below the canvas
    let kbHeight = e.endCoordinates.height - (this.state.windowH - topLayer - this.state.canvasH);

    // if keyboard hides the textInput, scroll the window
    if (this.state.showTextInput && this.state.yText + 20 >= kbTop) {
      yOffset -= this.state.yText - kbTop + 20;
    }

    this.setState({
      yOffset, keyboardHeight: kbHeight,
      msg: "yText=" + this.state.yText + ", keyb=" + kbHeight + ",canv=" + this.state.canvasH
    });
  }

  _keyboardDidHide = (e) => {
    this.SaveText()
    this.setState({ keyboardHeight: 0, showTextInput: false });
  }

  componentDidMount = async () => {
    const page = this.props.navigation.getParam('page', '');
    const currentFile = page.pages.length == 0 ? page.path : page.pages[0];

    if (page.pages.length > 0) {
      this.props.navigation.setParams({ pageTitleAddition: this.pageTitleAddition(page.pages, 0) })
    }

    const metaDataUri = currentFile + ".json";
    this.setState({ page: page, currentFile: currentFile, metaDataUri: metaDataUri },
      this.Load);
  }

  componentWillUnmount = () => {
    if (this.state.showTextInput) {
      this.SaveText(true, false);
    }
  }

  pageTitleAddition = (pages, index) => " - " + (index + 1) + "/" + pages.length


  Load = async () => {
    this.loadFile(this.state.metaDataUri);

    if (this.props.navigation.getParam('share', false)) {
      //iterates over all files and exports them
      this.setState({ sharing: true, shareProgress: 0, shareProgressPage: 1 });
      let dataUrls = [];

      let interval = this.state.page.pages.length * shareTimeMs / 11;

      let intervalObj = setInterval(() => this.setState({ shareProgress: this.state.shareProgress + .1 }), interval);

      let data = await this.exportToBase64();
      dataUrls.push(data);
      for (let i = 1; i < this.state.page.pages.length; i++) {
        this.setState({ shareProgressPage: i + 1 });

        const currentFile = this.state.page.pages[i];
        const metaDataUri = currentFile + ".json";
        this.setState({ currentFile, metaDataUri })
        this.loadFile(metaDataUri);
        dataUrls.push(await this.exportToBase64());
      }

      clearInterval(intervalObj);
      this.setState({ sharing: false });
      //avoid reshare again
      this.props.navigation.setParams({ share: false });

      const shareOptions = {
        title: translate("ShareWithTitle"),
        subject: translate("ShareEmailSubject"),
        urls: dataUrls
      };
      //Alert.alert(JSON.stringify(dataUrls))
      Share.open(shareOptions).then(() => {
        Alert.alert(translate("ShareSuccessful"));
      }).catch(err => {
        Alert.alert(translate("ActionCancelled"));
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
    RNFS.readFile(metaDataUri).then((value) => {
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
    RNFS.writeFile(
      this.state.metaDataUri,
      content).then(
        //success
        undefined, //() =>  Alert.alert("File Saved"),
        //fail
        (e) => Alert.alert("File Save Failed" + e));

  }

  async replaceFile(src, dest) {
    //generate temp name for dest:
    const tempName = dest + Date.now().toString();
    return RNFS.moveFile(dest, tempName).then(() =>
      RNFS.moveFile(src, dest)).then(() =>
        RNFS.unlink(tempName));
  }

  SketchEnd = (p) => {
    this.state.queue.pushPath(p);
    this.Save()
  }

  //a = absolute, s=screen, c=canvas
  s2aW = (w) => { return (w - this.state.sideMargin) / this.state.zoom - this.state.xOffset }
  s2aH = (h) => { return (h - this.state.topView) / this.state.zoom - this.state.yOffset }// - this.state.inputTextHeight/2}
  a2cW = (w) => { return (w + this.state.xOffset) * this.state.zoom + this.state.sideMargin }
  a2cH = (h) => { return (h + this.state.yOffset) * this.state.zoom + topLayer } // + this.state.inputTextHeight / 2 }

  findColor = (fc) => {
    let color = availableColorPicker.find(c => c == fc)

    if (color) {
      return color;
    }
    return this.state.color;
  }

  TextModeClick = (ev) => {

    //check that the click is in the canvas area:
    if (ev.nativeEvent.pageX < this.state.sideMargin ||
      ev.nativeEvent.pageX > this.state.sideMargin + this.state.canvasW) {
      return;
    }
    let needCanvasUpdate = false;
    if (this.state.showTextInput) {
      //a text box is visible and a click was pressed - save the text box contents first:
      needCanvasUpdate = this.SaveText();
    }

    //Alert.alert("x:"+x+", xOffset:"+this.state.xOffset+",zoom:"+ this.state.zoom)
    let x = this.s2aW(ev.nativeEvent.pageX);
    let y = this.s2aH(ev.nativeEvent.pageY) - this.state.fontSize / 2;

    let textElemIndex = this.findTextElement({ x: x, y: y });
    
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
      initialText = textElem.text;
      fontSize = textElem.fontSize;
      fontColor = this.findColor(textElem.fontColor);
      inputTextWidth = textElem.width;
      inputTextHeight = textElem.height;
      x = textElem.normPosition.x * this.state.scaleRatio;
      y = textElem.normPosition.y * this.state.scaleRatio;
    }

    inputTextWidth = this.limitTextWidth(inputTextWidth, x, y)

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
  }

  limitTextWidth = (width, x, y) => {
    return width;
  }

  SaveText = (beforeExit, afterDrag) => {
    let text = this.state.inputTextValue;
    let origElem = this.state.currentTextElem;
    if (afterDrag && !this.state.currentTextElem) return false;

    if ((!text || text.length == 0) && origElem === undefined) return false;

    let txtWidth = this.state.inputTextWidth;
    let txtHeight = this.state.inputTextHeight;
    let newElem = this.getTextElement(text, txtWidth, txtHeight);
    if (origElem) {
      if (origElem.text == newElem.text &&
        origElem.normPosition.x == newElem.normPosition.x &&
        origElem.normPosition.y == newElem.normPosition.y &&
        origElem.fontSize == newElem.fontSize &&
        origElem.color == newElem.color) {
        return false;
      }
    }
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

  findTextElement = (coordinates) => {
    let q = this.state.canvasTexts
    // Alert.alert(JSON.stringify(q))
    for (let i = q.length - 1; i >= 0; i--) {
      // Alert.alert(JSON.stringify(q[i].normPosition) + '--\n' + 
      //             JSON.stringify(q[i].position) + '--\n' + 
      //             JSON.stringify(coordinates))
      if (q[i].position.x < coordinates.x + 15 &&
        q[i].position.x + q[i].width > coordinates.x - 15
        &&
        q[i].position.y < coordinates.y + 15 &&
        q[i].position.y + q[i].height > coordinates.y - 15
      ) {
        //Alert.alert("found:"+ q[i].text)
        return i;
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
      y: this.state.yText / this.state.scaleRatio
    };
    newTextElem.position = { x: 0, y: 0 };
    newTextElem.alignment = 'Right';
    newTextElem.fontColor = this.state.color;
    newTextElem.fontSize = this.state.fontSize;
    return newTextElem;
  }

  UpdateCanvas = (canvas) => {
    if (!canvas) return;

    if (!this.state.needCanvasUpdateTextOnly) {
      canvas.clear();
    }
    console.log("Updating canvas")
    let q = this.state.queue.getAll();
    //Alert.alert("before\n"+JSON.stringify(q))
    let canvasTexts = [];
    for (let i = 0; i < q.length; i++) {
      if (q[i].type === 'text') {
        //clone and align to canvas size:
        let txtElem = q[i].elem;
        txtElem.position = {
          x: (txtElem.normPosition.x) * this.state.scaleRatio - txtElem.width, // - 15,
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
          (!this.state.textMode ||
            this.state.currentTextElem == undefined ||
            this.state.currentTextElem.id != txtElem.id ||
            !this.state.showTextInput)) {
              //avoid showing the current edited text
          canvasTexts.push(txtElem);
        }
      } else if (q[i].type === 'path' && !this.state.needCanvasUpdateTextOnly) {
        canvas.addPath(q[i].elem);
      }
    }
    //Alert.alert(JSON.stringify(canvasTexts))

    if (this.state.needCanavaDataSave) {
      this.Save()
    }

    this.setState({ canvasTexts: canvasTexts, needCanvasUpdate: false, needCanavaDataSave: false, needCanvasUpdateTextOnly: false });

  }


  onTextButtonPicker = () => {
    if (!this.state.textMode) {
      this.setState({
        showTextInput: false,
        textMode: true,
        showTextSizePicker: this.state.showBrushSizePicker
      });
      return;
    }
    this.setState({
      showTextSizePicker: !this.state.showTextSizePicker,
      showColorPicker: false,
      showBrushSizePicker: false

    });
  }

  onTextSize = (size) => {
    this.setState({ fontSize: size, showTextSizePicker: false });
    this.updateInputText();
  }

  onEraserButton = () => {
    this.canvas.setState({ color: (this.state.eraseMode ?  this.state.color : '#00000000' )})
    this.setState({eraseMode : !this.state.eraseMode, showTextInput:false});
  }
  onBrushButtonPicker = () => {

    if (this.state.textMode) {
      this.SaveText();
      this.setState({
        showTextInput: false,
        textMode: false,
        yOffset: this.state.zoom == 1 ? 0 : this.state.yOffset,
        showBrushSizePicker: this.state.showTextSizePicker
      });
      return;
    }
    this.setState({
      showBrushSizePicker: !this.state.showBrushSizePicker,
      showColorPicker: false,
      showTextSizePicker: false
    })
  }
  onBrushSize = (size) => {
    let newStrokeWidth = size; //this.canvas.state.strokeWidth + inc;
    if (newStrokeWidth < 1) {
      newStrokeWidth = 1;
    }
    if (newStrokeWidth > MAX_STROKE_WIDTH) {
      newStrokeWidth = MAX_STROKE_WIDTH;
    }
    this.canvas.setState({ strokeWidth: newStrokeWidth });
    this.setState({ strokeWidth: newStrokeWidth, showBrushSizePicker: false })
  }

  movePage = (inc) => {

    if (this.state.showTextInput) {
      this.SaveText(true, false)
    }

    let currentIndex = -1;
    for (let i = 0; i < this.state.page.pages.length; i++) {
      if (this.state.page.pages[i] == this.state.currentFile) {
        currentIndex = i;
        break;
      }
    }
    currentIndex += inc;
    if (currentIndex < 0 || currentIndex >= this.state.page.pages.length) return;


    this.props.navigation.setParams({ pageTitleAddition: this.pageTitleAddition(this.state.page.pages, currentIndex) })

    const currentFile = this.state.page.pages[currentIndex];
    const metaDataUri = currentFile + ".json";
    this.setState({
      currentFile: currentFile, metaDataUri: metaDataUri,
      zoom: 1, xOffset: 0, yOffset: 0, showTextInput: false, inputTextValue: ''
    });
    this.CalcImageSize(currentFile, this.state.origWindowW, this.state.windowH);
    setTimeout(() => {
      this.Load();
    }, 200)
  }

  onLayout = async (e) => {
    let windowSize = e.nativeEvent.layout;
    const measure = this.topView.measure.bind(this.topView);
    setTimeout(measure, 50, (fx, fy, width, height, px, py) => {
      this.setState({ topView: py, windowSize })
    });

    let sideMargin = Math.floor(windowSize.width * .05)

    windowW = windowSize.width - sideMargin * 2;
    windowH = windowSize.height - topLayer - dimensions.toolbarMargin;// * .88;// - topLayer * 1.1;
    this.CalcImageSize(this.state.currentFile, windowW, windowH);
  }


  CalcImageSize = (currentFile, windowW, windowH) => {
    getImageDimensions(currentFile).then(imageSize => {
      let sideMargin = Math.floor(windowW * .05)

      let imageWidth = imageSize.w;
      let imageHeight = imageSize.h;
      wDiff = imageWidth - windowW;
      hDiff = imageHeight - windowH;
      let ratio = 1.0;

      if (wDiff <= 0 && hDiff <= 0) {
        //image fit w/o scale
      } else if (wDiff > hDiff) {
        //scale to fit width
        ratio = windowW / imageWidth;
      } else {
        //scale to fit height
        ratio = windowH / imageHeight;
      }

      //Alert.alert("Dim:" + JSON.stringify({ imageSize, windowH, windowW: windowW, sideMargin: (windowW - imageWidth * ratio) / 2, canvasW: imageWidth * ratio, canvasH: imageHeight * ratio, scaleRatio: ratio, needCanvasUpdate: true, needCanavaDataSave: false }))
      let origWindowW = windowW;
      windowW += 2 * sideMargin;
      this.setState({ origWindowW, windowW, windowH, sideMargin: (windowW - imageWidth * ratio) / 2, canvasW: imageWidth * ratio, canvasH: imageHeight * ratio, scaleRatio: ratio, needCanvasUpdate: true, needCanavaDataSave: false });

    }).catch(err => {
      //Alert.alert("ee: " + JSON.stringify(err))
    })
  }

  render() {
    let drawingAreaStyle = {
      flex: 1,
      position: 'absolute',
      top: topLayer,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 5,
    };
    let toolbarSideMargin = this.state.sideMargin > 150 ? 150 : this.state.sideMargin;

    if (this.state.windowSize && this.state.windowSize.width - 2 * toolbarSideMargin < 300) {
      toolbarSideMargin = 100;
    }

    let spaceBetweenButtons = <Spacer width={23} />
    let colorButtonSize = (this.state.windowW - 2 * toolbarSideMargin) / (availableColorPicker.length * 1.1);

    return (

      <View style={styles.mainContainer}
        onLayout={this.onLayout}>
        {/* <Text style={{ flex: 1, position: 'absolute', top: 0, left: 0, zIndex: 10000, height: 25 }}>{"yOffset:" + this.state.yOffset + ", kbH:" + this.state.keyboardHeight}</Text> */}
        <TouchableOpacity onPress={this.TextModeClick}
          activeOpacity={1}
          style={drawingAreaStyle} >
          <View style={{ flex: 1 }}
            ref={v => this.topView = v}
            pointerEvents={this.state.textMode ? 'box-only' : 'auto'}
            {...this._panResponderMove.panHandlers}
          >
            <ScrollView
              minimumZoomScale={1}
              maximumZoomScale={maxZoom}
              zoomScale={this.state.zoom}
              style={{ position: 'absolute', top: 0, height: this.state.canvasH, left: this.state.sideMargin, width: this.state.canvasW }}
              contentContainerStyle={{ flex: 1 }}
            >
              {this.state.sharing ?
                <View style={{ position: 'absolute', top: '25%', left: 0, width: this.state.canvasW, zIndex: 1000, backgroundColor: 'white', alignItems: 'center' }}>

                  <Progress.Circle size={200} progress={this.state.shareProgress} showsText={true} textStyle={{ zIndex: 100, fontSize: 25 }} formatText={(prog) =>
                    fTranslate("ExportProgress", this.state.shareProgressPage, (this.state.page.pages.length > 0 ? this.state.page.pages.length : 1))}
                    thickness={5} />
                </View> : null}
              {this.getCanvas()}
            </ScrollView>
          </View>
        </TouchableOpacity>

        {/* Toolbar */}
        <View style={{
          flex: 1, position: 'absolute', top: 0, width: '100%',
          height: dimensions.toolbarHeight, backgroundColor: semanticColors.subTitle,
          zIndex: 30
        }} >
          <View style={{
            position: 'absolute',
            height: '100%',
            left: toolbarSideMargin,
            right: toolbarSideMargin,
            flexDirection: 'row',
            alignItems: 'center'

          }}>

            {
              getIconButton(() => {
                this.state.queue.undo();
                this.setState({ needCanvasUpdate: true, needCanavaDataSave: true });
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
              getEraserIcon(() => this.onEraserButton(), 55, semanticColors.editPhotoButton, this.state.eraseMode)
              // getIconButton(() => this.onEraserButton(),
              //    semanticColors.editPhotoButton, "panorama-fish-eye", 55, false, 45, this.state.eraseMode)
            }
            { /* text size preview */}

            <View style={{
              position: 'absolute',
              left: this.state.windowW / 2 - toolbarSideMargin - 50,
              width: 100,
              height: '100%',
              backgroundColor: 'transparent',//'#eef4fa',
              //borderWidth:3,
              //borderColor: 'rgba(238,244,250, .7)',
              borderRadius: 24.5,
              justifyContent: 'center',
              alignItems: 'center',
              alignContent: 'center'
            }}>
              {this.state.textMode ?
                <Text style={{
                  fontSize: this.state.fontSize,
                  color: this.state.color,
                  textAlignVertical: 'center'
                }}>{translate("A B C")}</Text> :
                // <View style={{
                //   width: this.state.strokeWidth + 2,
                //   height: this.state.strokeWidth + 2,
                //   borderRadius: (this.state.strokeWidth + 2) / 2,
                //   backgroundColor: this.state.color
                // }} />
                //d="M160,303 C305,258 285,196 285,196 C285,196 243,70 176,146 C109,222 525,312 482,221 C439,130 347,191 347,191 C347,191 180,328 347,292 C514,256 433,110 381,124 C329,138 294,162 294,162 "

                <Svg height="100%" width="100%" preserveAspectRatio="xMidYMid meet" viewBox="-30 -30 150 200">
                  <Path
                    stroke={this.state.color}
                    strokeLinecap="round"
                    strokeWidth={(this.state.strokeWidth + 2) * 2}
                    d="M93.25 143.84C60.55 100.51 87.43 56.85 80.24 51.37C73.05 45.89 9.35 83.22 1.47 68.49C-6.4 53.77 19.28 8.22 31.61 0"
                    fill="none"

                  />
                </Svg>
              }
            </View>

            <View style={{
              position: 'absolute', top: 0, right: 0, height: '100%',
              flexDirection: 'row', alignItems: 'center'
            }} >

              {
                getIconButton(() => this.setState({
                  showColorPicker: !this.state.showColorPicker,
                  showTextSizePicker: false,
                  showBrushSizePicker: false
                }), semanticColors.editPhotoButton, "color-lens", 55)
              }
              {spaceBetweenButtons}

              {
                getIconButton(() => this.onBrushButtonPicker(),
                  this.state.textMode ? semanticColors.editPhotoButton : this.state.color, "edit", 55, false, 45, !this.state.textMode) //(20 + this.state.strokeWidth * 3))
              }
              {spaceBetweenButtons}
              {
                getIconButton(() => this.onTextButtonPicker(),
                  this.state.textMode ? this.state.color : semanticColors.editPhotoButton, translate("A"), 55, true, 45, this.state.textMode)
              }




            </View>
          </View>
        </View>
        {/*debug msg * /}
        <View style={{position:'absolute', top:0, height:40, left:0, width:200,zIndex:100}}>
          <Text size={20}>{this.state.msg}</Text>
        </View>
        {/** */}
        {/*View for selecting color*/}
        <FadeInView height={this.state.showColorPicker ? 70 : 0} style={[styles.pickerView, { left: toolbarSideMargin, right: toolbarSideMargin }]}>
          <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
            {availableColorPicker.map((c, i) => this.getColorButton((c), colorButtonSize, i))}
          </View>
        </FadeInView>

        {/*View for selecting text size*/}
        <FadeInView height={this.state.showTextSizePicker && this.state.textMode ? 70 : 0} style={[styles.pickerView, { left: toolbarSideMargin, right: toolbarSideMargin }]}>
          <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-evenly', alignContent: 'center', alignItems: 'center' }}>
            {availableTextSize.map((size, i) => this.getTextSizePicker(this.state.color, colorButtonSize, size, i))}
          </View>
        </FadeInView>

        {/*View for selecting brush size*/}
        <FadeInView height={this.state.showBrushSizePicker && !this.state.textMode ? 70 : 0} style={[styles.pickerView, { left: toolbarSideMargin, right: toolbarSideMargin }]}>
          <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
            {availableBrushSize.map((size, i) => this.getBrushSizePicker(this.state.color, colorButtonSize, size, i))}

          </View>
        </FadeInView>



        {
          this.state.showTextInput ?
            this.getTextInput(this.a2cW(this.state.xText), this.a2cH(this.state.yText)) :
            null
        }

        {this.getArrow(LEFT, () => this.setState({ xOffset: this.state.xOffset + 50 }))}
        {this.getArrow(TOP, () => this.setState({ yOffset: this.state.yOffset + 50 }))}
        {this.getArrow(RIGHT, () => this.setState({ xOffset: this.state.xOffset - 50 }))}
        {this.getArrow(BOTTOM, () => this.setState({ yOffset: this.state.yOffset - 50 }))}

        {/** previous page button */}
        {
          this.state.page && this.state.page.pages.length > 0 && this.state.currentFile !== this.state.page.pages[0] ?
            <View style={{ position: 'absolute', bottom: 50, left: 10, width: 155, height: 40, zIndex: 100 }}>
              {getRoundedButton(() => this.movePage(-1), 'chevron-left', translate("BtnPreviousPage"), 30, 30, { width: 155, height: 40 }, 'row-reverse', true)}
            </View> :
            null
        }
        {/** next page button */}
        {
          this.state.page && this.state.page.pages.length > 0 &&
            this.state.currentFile !== this.state.page.pages[this.state.page.pages.length - 1] ?
            <View style={{ position: 'absolute', bottom: 50, right: 10, width: 155, height: 40, zIndex: 100 }}>
              {getRoundedButton(() => this.movePage(1), 'chevron-right', translate("BtnNextPage"), 30, 30, { width: 155, height: 40 }, 'row', true)}
            </View> :
            null
        }
      </View >
    );
  }

  getArrow = (location, func) => {
    let style = { flex: 1, position: 'absolute', zIndex: 10000 }
    let deg = 0;
    if (location == TOP && this.state.zoom > 1 && this.state.yOffset < 0) {
      style.top = topLayer, style.left = 100, deg = -90;
      style.left = this.state.sideMargin + this.state.canvasW / 2
    } else if (location == RIGHT && this.state.zoom > 1) {
      style.top = topLayer + this.state.canvasH / 2;
      style.right = 5, deg = 0;
    } else if (location == BOTTOM && this.state.zoom > 1) {
      style.top = topLayer + this.state.canvasH - 60 - this.state.keyboardHeight, deg = 90;
      style.left = this.state.sideMargin + this.state.canvasW / 2
    } else if (location == LEFT && this.state.xOffset < 0) {
      style.top = topLayer + this.state.canvasH / 2;
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
    return <RNSketchCanvas
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
      text={this.state.canvasTexts}
      containerStyle={styles.container}
      canvasStyle={[styles.canvas, { transform: [{ translateX: this.state.xOffset }, { translateY: this.state.yOffset }] }]}
      localSourceImage={{ filename: this.state.currentFile, mode: 'AspectFit' }}
      onStrokeEnd={this.SketchEnd}
      strokeColors={[{ color: colors.black }]}
      defaultStrokeIndex={0}
      defaultStrokeWidth={DEFAULT_STROKE_WIDTH}
    />
  }

  getColorPickerButton = () => {
    let func = () => {
      this.setState({
        showColorPicker: !this.state.showColorPicker,
        showTextSizePicker: false,
        showBrushSizePicker: false
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


  getColorButton = (color, size, index) => {
    let func = () => {
      this.canvas.setState({ color: color })
      this.setState({ color: color, showColorPicker: false , eraseMode:false})
      this.updateInputText();
    }

    return <TouchableOpacity
      onPress={func}
      activeOpacity={0.7}
      key={"" + index}
    >
      <View style={{
        backgroundColor: color,
        borderRadius: size / 2,
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center'

      }}
      >

        {color == this.state.color && !this.state.eraseMode ? <Icon color="white" name="check"></Icon> : null}
      </View>
    </TouchableOpacity>
  }

  getTextSizePicker = (color, size, textSize, index) => {
    return <TouchableOpacity
      onPress={() => this.onTextSize(textSize)}
      activeOpacity={0.7}
      key={"" + index}
    >
      <View style={{
        backgroundColor: textSize === this.state.fontSize ? '#eeeded' : 'transparent',
        borderRadius: size / 2,
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center'
      }}
      >
        <Text style={{ fontSize: textSize, color: color }}>{translate("A")}</Text>
      </View>
    </TouchableOpacity>
  }

  getBrushSizePicker = (color, size, brushSize, index) => {
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
    return <Text>{space}</Text>
  }

  getTextInput = (x, y) => {
    return (
      <View style={{
        flex: 1, flexDirection: 'row-reverse', position: 'absolute',
        left: x - this.getTextWidth(), top: y, zIndex: 20
      }}>
        <View {...this._panResponder.panHandlers} style={{ top: -5 }}>
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
                inputTextWidth: dim.width,
                inputTextHeight: dim.height
              }), 10);
          }}
          autoCapitalize={'none'}
          autoCorrect={false}
          multiline={true}
          autoFocus

          style={{
            backgroundColor: 'transparent',
            textAlign: 'right',
            width: this.getTextWidth(),
            height: this.getTextHeight(),
            borderWidth: 0,
            fontSize: this.state.fontSize,
            color: this.state.color,
            zIndex: 21
          }}


          value={this.state.inputTextValue}
        />
        <View style={{
          position: 'absolute', left: DRAG_ICON_SIZE + 3, top: 0,
          width: this.state.inputTextWidth + 5, height: this.state.inputTextHeight,
          zIndex: 20
        }}
          backgroundColor={this.state.color === '#fee100' ? 'gray' : 'yellow'}
        />
      </View >);
  }


  getTextWidth = () => 2000;//Math.max(this.state.inputTextWidth + 40, 40); //< INITIAL_TEXT_SIZE - 20 ? INITIAL_TEXT_SIZE : this.state.inputTextWidth + this.state.fontSize * 2;
  getTextHeight = () => Math.max(this.state.inputTextHeight, this.state.fontSize + 1.2);
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
    top: dimensions.toolbarHeight,
    zIndex: 99999,
    left: 0,
    borderColor: 'gray',
    borderWidth: 1
  }
}
);
