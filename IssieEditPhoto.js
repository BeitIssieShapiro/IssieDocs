
import React from 'react';
import {
  AppRegistry, Image, ScrollView, StyleSheet, TextInput, View,
  TouchableOpacity, Text, Alert, PanResponder, Dimensions, Keyboard
} from 'react-native';
import { Icon } from 'react-native-elements'
import RNSketchCanvas from './modified_canvas/index';
import LinearGradient from 'react-native-linear-gradient';
import * as RNFS from 'react-native-fs';
//import RNReadWriteExif from 'react-native-read-write-exif';
import Share from 'react-native-share';
import DoQueue from './do-queue';
import FadeInView from './FadeInView'
import { Spacer, globalStyles } from './elements'
import * as Progress from 'react-native-progress';

import {
  getSquareButton, colors, DEFAULT_FOLDER_NAME, getFolderAndIcon, getImageDimensions,
  getPageNavigationButtons,
  semanticColors, getIconButton, dimensions, availableTextSize, availableBrushSize, availableColorPicker
} from './elements'
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
            <Text style={{ color: 'white', fontSize: 20, top: 2 }}>{isPageOnHome ? 'בית' : folderAndIcon.name}</Text>
            <Spacer width={10} />
            <Icon name={isPageOnHome ? 'home' : 'folder'} color='white' size={30} />
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
        if (xText  < 25) {
          xText = 25 ;
        } else if (xText > this.state.canvasW) {
          xText = this.state.canvasW;
        }

        let yText = this.s2aH(gestureState.moveY - DRAG_ICON_SIZE / 2)
        if (yText < 0) {
          yText = 0;
        } else if (yText > (this.state.canvasH - this.inputTextHeight)) {
          yText = this.state.canvasH - this.inputTextHeight;
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
      textMode: false,
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
    this.setState({ keyboardHeight: e.endCoordinates.height });
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
        title: 'שתף בעזרת...',
        subject: 'דף עבודה',
        urls: dataUrls
      };
      //Alert.alert(JSON.stringify(dataUrls))
      Share.open(shareOptions).then(() => {
        Alert.alert("שיתוף הסתיים בהצלחה");
      }).catch(err => {
        Alert.alert("הפעולה בוטלה");
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
    let needCanvasUpdate = false;
    if (this.state.showTextInput) {
      //a text box is visible and a click was pressed - save the text box contents first:
      needCanvasUpdate = this.SaveText();
    }

    //check that the click is in the canvas area:
    let x = this.s2aW(ev.nativeEvent.pageX);
    //Alert.alert("x:"+x+", xOffset:"+this.state.xOffset+",zoom:"+ this.state.zoom)
    let y = this.s2aH(ev.nativeEvent.pageY) - this.state.fontSize / 2;

    let textElemIndex = this.findTextElement({ x: x, y: y });
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
      //remove the text from the canvas:
      //canvasTexts.splice(textElemIndex);

    }

    inputTextWidth = this.limitTextWidth(inputTextWidth, x, y)

    needCanvasUpdate = needCanvasUpdate || this.state.currentTextElem !== undefined || textElem !== undefined;
    //Alert.alert("a-x:" + x + ",a-y:" + y + ", ratio:" + this.state.scaleRatio)
    this.setState({
      needCanvasUpdate : needCanvasUpdate,
      needCanvasUpdateTextOnly : needCanvasUpdate,
      showTextInput: true,
      inputTextValue: initialText,
      fontSize,
      inputTextWidth,
      inputTextHeight,
      color: fontColor,
      currentTextElem: textElem,
      xText: x,
      yText: y,
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
            this.state.currentTextElem.id != txtElem.id)) {
          canvasTexts.push(txtElem);
        } 
      } else if (q[i].type === 'path' && !this.state.needCanvasUpdateTextOnly) {
        canvas.addPath(q[i].elem);
      }
    }
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
    this.setState({ fontSize: size });
    setTimeout(()=> this.setState({showTextSizePicker:false}), 700);

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
    this.setState({ strokeWidth: newStrokeWidth })
    setTimeout(()=> this.setState({showBrushSizePicker:false}), 700);
  }

  movePage = (inc) => {
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
      zoom: 1, xOffset: 0, yOffset: 0
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
      this.setState({ topView: py })
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
      this.setState({ origWindowW, windowW , windowH, sideMargin: (windowW - imageWidth * ratio) / 2, canvasW: imageWidth * ratio, canvasH: imageHeight * ratio, scaleRatio: ratio, needCanvasUpdate: true, needCanavaDataSave: false });

    }).catch(err => {
      //Alert.alert("ee: " + JSON.stringify(err))
    })
  }

  render() {
    let drawingAreaStyle = {
      flex: 1,
      position: 'absolute',
      top: topLayer,
      left: this.state.sideMargin,
      width: this.state.canvasW,
      height: this.state.canvasH,
      zIndex: 5
    };
    let toolbarSideMargin = this.state.sideMargin > 250 ? 250 : this.state.sideMargin;
    let spaceBetweenButtons = <Spacer width={23} />
    let colorButtonSize = this.state.canvasW / (availableColorPicker.length * 1.4);

    return (

      <View style={styles.mainContainer}
        onLayout={this.onLayout}>
        <Text style={{ flex: 1, position: 'absolute', top: 0, left: 0, zIndex: 10000, height: 25 }}>{"textW: " + this.state.inputTextWidth + ", textH:"+ this.state.inputTextHeight}</Text>
        <TouchableOpacity onPress={this.TextModeClick}
          activeOpacity={1}
          style={[drawingAreaStyle, { backgroundColor: 'black' }]} >
          <View style={{ flex: 1 }}
            ref={v => this.topView = v}
            pointerEvents={this.state.textMode ? 'box-only' : 'auto'}
            {...this._panResponderMove.panHandlers}
          >
            <ScrollView
              minimumZoomScale={1}
              maximumZoomScale={maxZoom}
              zoomScale={this.state.zoom}
              style={{ flex: 1 }}
              contentContainerStyle={{ flex: 1 }}
            >
              {this.state.sharing ?
                <View style={{ position: 'absolute', top: '25%', left: 0, width: this.state.canvasW, zIndex: 1000, backgroundColor: 'white', alignItems: 'center' }}>

                  <Progress.Circle size={200} progress={this.state.shareProgress} showsText={true} textStyle={{ zIndex: 100, fontSize: 25 }} formatText={(prog) => "מייצא דף " + this.state.shareProgressPage + ' מתוך ' + (this.state.page.pages.length > 0?this.state.page.pages.length:1)} thickness={5} />
                </View> : null}
              {this.getCanvas()}
            </ScrollView>
          </View>
        </TouchableOpacity>
        <View style={{
          flex: 1, position: 'absolute', top: 0, width: '100%',
          height: dimensions.toolbarHeight, backgroundColor: semanticColors.subTitle
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
              }, semanticColors.editPhotoButton, "redo", 55)
            }
            { /* text size indicator */}

            <View style={{
              position: 'absolute',
              left: this.state.windowW / 2 - toolbarSideMargin - 40,
              width: 80,
              height: '65%', backgroundColor: 'white',
              shadowColor: "black",
              shadowOpacity: 0.6,
              shadowOffset: { width: 2, height: 5 },
              elevation: 4,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {this.state.textMode ?
                <Text style={{
                  fontSize: this.state.fontSize,
                  color: this.state.color,
                  textAlignVertical: 'center'
                }}>אבג</Text> :
                <View style={{
                  width: this.state.strokeWidth + 2,
                  height: this.state.strokeWidth + 2,
                  borderRadius: (this.state.strokeWidth + 2) / 2,
                  backgroundColor: this.state.color
                }} />}
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
                getIconButton(() => this.onTextButtonPicker(),
                  this.state.textMode ? this.state.color : semanticColors.editPhotoButton, "א", 55, true, 45, this.state.textMode)
              }

              {spaceBetweenButtons}

              {
                getIconButton(() => this.onBrushButtonPicker(),
                  this.state.textMode ? semanticColors.editPhotoButton : this.state.color, "brush", 55, false, 45, !this.state.textMode) //(20 + this.state.strokeWidth * 3))
              }
            </View>
          </View>
        </View>

        { //View for selecting color
          this.state.showColorPicker ?
            <FadeInView height={70} style={[styles.pickerView, { left: this.state.sideMargin, width: this.state.canvasW }]}>
              <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                {availableColorPicker.map((c, i) => this.getColorButton((c), colorButtonSize, i))}
              </View>
            </FadeInView>
            :
            null
        }

        {
          this.state.showTextSizePicker && this.state.textMode ?
            <FadeInView height={70} style={[styles.pickerView, { left: this.state.sideMargin, width: this.state.canvasW }]}>
              <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-evenly', alignContent: 'center', alignItems: 'center' }}>
                {availableTextSize.map((size, i) => this.getTextSizePicker(this.state.color, colorButtonSize, size, i))}
              </View>
            </FadeInView>
            : null
        }
        {
          this.state.showBrushSizePicker && !this.state.textMode ?
            <FadeInView height={70} style={[styles.pickerView, { left: this.state.sideMargin, width: this.state.canvasW }]}>
              <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                {availableBrushSize.map((size, i) => this.getBrushSizePicker(this.state.color, colorButtonSize, size, i))}

              </View>
            </FadeInView>
            :
            null
        }

        {
          this.state.showTextInput ?
            //todo height should be relative to text size
            this.getTextInput(this.state.inputTextValue, this.a2cW(this.state.xText), this.a2cH(this.state.yText)) :
            <Text></Text>
        }

        {this.getArrow(LEFT, () => this.setState({ xOffset: this.state.xOffset + 50 }))}
        {this.getArrow(TOP, () => this.setState({ yOffset: this.state.yOffset + 50 }))}
        {this.getArrow(RIGHT, () => this.setState({ xOffset: this.state.xOffset - 50 }))}
        {this.getArrow(BOTTOM, () => this.setState({ yOffset: this.state.yOffset - 50 }))}
        {this.getPageNavigationArrows()}

      </View>
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
  getPageNavigationArrows = () => {

    if (!this.state.page || this.state.page.pages.length == 0) {
      return <View />;
    }

    return getPageNavigationButtons(this.state.sideMargin, this.state.canvasW,
      this.state.currentFile == this.state.page.pages[0], //isFirst
      this.state.currentFile == this.state.page.pages[this.state.page.pages.length - 1], //isLast
      this.movePage);
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
      containerStyle={[styles.container]}
      canvasStyle={[styles.canvas, { transform: [{ translateX: this.state.xOffset }, { translateY: this.state.yOffset }] }]}
      localSourceImage={{ filename: this.state.currentFile, mode: 'AspectFit' }}
      onStrokeEnd={this.SketchEnd}
      strokeColors={[{ color: colors.black}]}
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

  getColorButton = (color, size, index) => {
    let func = () => {
      this.canvas.setState({ color: color })
      this.setState({ color: [color] })
      setTimeout(()=> this.setState({showColorPicker:false}), 700);
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
        alignItems:'center',
        justifyContent: 'center'

      }}
      >
        
        {color == this.state.color ? <Icon color="white" name="check"></Icon>:null}
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
        <Text style={{ fontSize: textSize, color: color }}>א</Text>
      </View>
    </TouchableOpacity>
  }

  getBrushSizePicker = (color, size, brushSize, index) => {
    return <TouchableOpacity
      onPress={() => this.onBrushSize(brushSize)}
      activeOpacity={0.7}
      key={"" + index}
    >
      <View style={{
        backgroundColor: brushSize === this.state.strokeWidth ? '#eeeded' : 'transparent',
        borderRadius: size / 2,
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center'
      }}
      >
        <Icon name={"brush"} color={color} size={brushSize * 4 + 12}></Icon>
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

  getTextInput = (txt, x, y) => {
    return <View style={{ flex: 1, flexDirection: 'row-reverse', position: 'absolute', left: x - this.getTextWidth(), top: y, zIndex: 100 }}>
      <View {...this._panResponder.panHandlers} style={{ top: -5 }}>
        <Icon name='open-with' size={DRAG_ICON_SIZE} />
      </View>
      <TextInput
        onChangeText={(text) => {
          this.setState({ inputTextValue: text });
          // measureText(this.state.fontSize, this.state.inputTextValue).then(dim => {
          //   let addExtra = text.endsWith('\n') ? this.state.fontSize+1.2 : 0;
          //   this.setState({ inputTextValue: text, inputTextWidth: dim.width, inputTextHeight: dim.height + addExtra })
          // });
        }}
        onContentSizeChange={(event) => {
          let dim = event.nativeEvent.contentSize;
          //let addExtra = text.endsWith('\n') ? this.state.fontSize+1.2 : 0;
          console.log("onContentSizeChange:"+ JSON.stringify(dim) + ", text:" + this.state.inputTextValue )
          setTimeout(() => 
            this.setState({
              inputTextWidth: dim.width,
              inputTextHeight: dim.height //+ addExtra 
            }), 10);
        }}
        autoCapitalize={'none'}
        autoCorrect={false}
        multiline={true}
        autoFocus

        style={[styles.textInput, {
          width: this.getTextWidth(),
          height: this.getTextHeight(),
          color: this.state.color,
          fontSize: this.state.fontSize,
          borderWidth: 0,
          flexWrap: 'nowrap'
        }]}
      >{txt}</TextInput>
    </View >
  }


  getTextWidth = () => Math.max(this.state.inputTextWidth + 40, 40); //< INITIAL_TEXT_SIZE - 20 ? INITIAL_TEXT_SIZE : this.state.inputTextWidth + this.state.fontSize * 2;
  getTextHeight = () => Math.max(this.state.inputTextHeight, this.state.fontSize + 1.2);
}

AppRegistry.registerComponent('IssieEditPhoto', () => IssieEditPhoto);

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: semanticColors.mainAreaBG
  },
  fullSizeInParent: {
    flex: 1,
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    zIndex: 10
  },
  textInput: {
    borderColor: 'black',
    borderWidth: 1,
    backgroundColor: 'white',
    textAlign: 'right'

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
    shadowColor: 'black',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 3
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
