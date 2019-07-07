
import React from 'react';
import {
  AppRegistry, Image, ScrollView, StyleSheet, TextInput, View,
  TouchableOpacity, Text, Alert, PanResponder, Dimensions
} from 'react-native';
import { Icon } from 'react-native-elements'
import RNSketchCanvas from './modified_canvas/index';
import LinearGradient from 'react-native-linear-gradient';
import * as RNFS from 'react-native-fs';
//import RNReadWriteExif from 'react-native-read-write-exif';
import Share from 'react-native-share';
import DoQueue from './do-queue';

import { getSquareButton, colors, getImageDimensions } from './elements'


const topLayer = 51 + 8 + 8;
const maxZoom = 3;
const marginTop = 4;
const TOP = 0, RIGHT = 1, BOTTOM = 2, LEFT = 3;
const DEFAULT_STROKE_WIDTH = 5;


export default class IssieEditPhoto extends React.Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'עריכת דף',
      headerStyle: {
        backgroundColor: '#8EAFCE',
      },
      headerTintColor: 'white',
      headerTitleStyle: {
        fontSize: 30,
        fontWeight:'bold'
      },
    };
  }
  
  constructor() {
    super();

    this.Load = this.Load.bind(this);

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => this.state.showTextInput,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => this.state.showTextInput,
      onMoveShouldSetPanResponder: (evt, gestureState) => this.state.showTextInput,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => this.state.showTextInput,
      onPanResponderMove: (evt, gestureState) => {
        if (this.state.textMode) {
          this.setState({
            xText: this.s2aW(gestureState.moveX), yText: this.s2aH(gestureState.moveY)
          });
        }
      }
    });

    this.state = {
      color: colors.black,
      fontSize: 25,
      textMode: false,
      showTextInput: false,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      queue: new DoQueue(),
      sideMargin: 0,
      canvasW: 1000,
      canvasH: 1000,
      inputTextHeight: 40,
      canvasTexts: [],
      topView: 0,
      zoom: 1.0,
      scaleRatio: 1.0,
      xOffset: 0,
      yOffset: 0,
      xText: 0,
      yText: 0
    }

  }

  componentDidMount = async () => {
    const page = this.props.navigation.getParam('page', '');
    const currentFile = page.pages.length == 0 ? page.path : page.pages[0];

    const metaDataUri = currentFile + ".json";
    this.setState({ page: page, currentFile: currentFile, metaDataUri: metaDataUri })
    setTimeout(this.Load, 100);
  }

  Load = async () => {
    this.loadFile(this.state.metaDataUri);

    if (this.props.navigation.getParam('share', false)) {
      //iterates over all files and exports them
      let dataUrls = [];

      dataUrls.push(await this.exportToBase64());
      for (let i = 1;i<this.state.page.pages.length;i++) {
        const currentFile = this.state.page.pages[i];
        const metaDataUri = currentFile + ".json";
        this.setState({currentFile, metaDataUri })
        this.loadFile(metaDataUri);
        dataUrls.push(await this.exportToBase64());
      }

      const shareOptions = {
        title: 'שתף בעזרת...',
        subject: 'דף עבודה',
        urls: dataUrls
      };

      Share.open(shareOptions).then(() => { }).catch(err => {
        Alert.alert("הפעולה בוטלה");
      });

    }
  }

  exportToBase64 = async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => this.canvas.getBase64(
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
          resolve ( 'data:image/png;base64,' + data);
        }
      ), 300)
    });
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
    ).catch((e) => {/*no json file yet*/ }).finally(() => {
      this.UpdateCanvas(true)
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
    for (let c in colors) {
      if (colors[c][0] == fc) {
        return colors[c];
      }
    }
    return this.state.color;
  }

  TextModeClick = (ev) => {
    if (this.state.showTextInput) {
      //a text box is visible and a click was pressed - save the text box contents first:
      this.SaveText()
    }

    //check that the click is in the canvas area:
    let x = this.s2aW(ev.nativeEvent.pageX);
    let y = this.s2aH(ev.nativeEvent.pageY);

    let textElemIndex = this.findTextElement({ x: x, y: y });
    let initialText = '';
    let fontSize = this.state.fontSize;
    let fontColor = this.state.color;

    let textElem = undefined;
    if (textElemIndex >= 0) {
      textElem = this.state.canvasTexts[textElemIndex];
      initialText = textElem.text;
      fontSize = textElem.fontSize;
      fontColor = this.findColor(textElem.fontColor);
      x = textElem.position.x;
      y = textElem.position.y;

      //remove the text from the canvas:
      //canvasTexts.splice(textElemIndex);

    }
    this.setState({
      showTextInput: true,
      inputTextValue: initialText,
      fontSize: fontSize,
      color: fontColor,
      currentTextElem: textElem,
      xText: x,
      yText: y
    });
  }

  SaveText = () => {
    let text = this.state.inputTextValue;
    this.state.queue.pushText(this.getTextElement(text));
    this.UpdateCanvas(false, true);
  }
  findTextElement = (coordinates) => {
    let q = this.state.canvasTexts
    for (let i = q.length - 1; i >= 0; i--) {
      if (q[i].position.x - 15 < coordinates.x &&
        q[i].position.x + 65 > coordinates.x &&
        q[i].position.y - 15 < coordinates.y &&
        q[i].position.y + 65 > coordinates.y) {
        return i;
      }
    }

    return -1;
  }

  getTextElement = (newText) => {
    newTextElem = { text: newText }
    if (this.state.currentTextElem) {
      newTextElem.id = this.state.currentTextElem.id;
    } else {
      newTextElem.id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    }

    newTextElem.anchor = { x: 0, y: 0 };
    newTextElem.position = {
      x: this.state.xText,
      y: this.state.yText,
    };
    newTextElem.alignment = 'Right';
    newTextElem.fontColor = this.state.color[0];
    newTextElem.fontSize = this.state.fontSize;
    return newTextElem;
  }

  UpdateCanvas = (dontSave, textOnly) => {
    textOnly = (textOnly === undefined) ? false : textOnly;

    if (!textOnly) {
      this.canvas.clear();
    }
    let q = this.state.queue.getAll();
    let canvasTexts = [];
    for (let i = 0; i < q.length; i++) {
      if (q[i].type === 'text') {
        let txtElem = q[i].elem;

        //first try to find same ID and replace, or add it
        let found = false;

        for (let j = 0; j < canvasTexts.length; j++) {
          if (canvasTexts[j].id === txtElem.id) {
            canvasTexts[j] = txtElem
            found = true;
            break;
          }
        }
        if (!found) canvasTexts.push(txtElem);
      } else if (q[i].type === 'path' && !textOnly) {
        this.canvas.addPath(q[i].elem);
      }
    }
    if (!dontSave) {
      this.Save()
    }
    this.setState({ canvasTexts: canvasTexts });

  }

  onTextButton = (inc) => {
    if (!this.state.textMode) {
      this.setState({
        showTextInput: false,
        textMode: true
      });
      return;
    }
    this.setState({ fontSize: this.state.fontSize + (inc * 5) });
  }

  onBrushButton = (inc) => {
    if (this.state.textMode) {
      this.SaveText();
      this.setState({
        showTextInput: false,
        textMode: false
      });
      return;
    }
    let newStrokeWidth = this.canvas.state.strokeWidth + inc;
    this.canvas.setState({ strokeWidth: newStrokeWidth });
    this.setState({ strokeWidth: newStrokeWidth })
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

    const currentFile = this.state.page.pages[currentIndex];
    const metaDataUri = currentFile + ".json";
    this.setState({ currentFile: currentFile, metaDataUri: metaDataUri })
    setTimeout(this.Load, 100);

  }

  onLayout = async (e) => {
    let windowSize = e.nativeEvent.layout;
    const measure = this.topView.measure.bind(this.topView);
    setTimeout(measure, 50, (fx, fy, width, height, px, py) => {
      this.setState({ topView: py })
    });

    //let windowSize = Dimensions.get("window");
    let sideMargin = Math.floor(windowSize.width * .05)

    windowW = windowSize.width - sideMargin * 2;
    windowH = windowSize.height - topLayer * 1.1;
    let currentFile = this.state.currentFile;

    getImageDimensions(currentFile).then(imageSize => {
      //Alert.alert("Dim:" + JSON.stringify(imageSize))
      imageWidth = imageSize.w;
      imageHeight = imageSize.h;
      wDiff = imageWidth - windowW;
      hDiff = imageHeight - windowH;
      let ratio = 1;
      if (wDiff <= 0 && hDiff <= 0) {
        //image fit w/o scale
      } else if (wDiff > hDiff) {
        //scale to fit width
        ratio = windowW / imageWidth;
      } else {
        //scale to fit height
        ratio = windowH / imageHeight;
      }

      //ratio = .67;
      //Alert.alert("ratio: " + ratio)
      this.setState({ sideMargin: sideMargin, canvasW: imageWidth * ratio, canvasH: imageHeight * ratio, scaleRatio: ratio })
      setTimeout(() => this.UpdateCanvas(true, false), 200);

    }).catch(err => {
      Alert.alert(JSON.stringify(err))
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

    return (

      <LinearGradient colors={['#E2DCCE', '#D4CDBC', '#C1B7A1']} style={styles.mainContainer}
        onLayout={this.onLayout}>

        <TouchableOpacity onPress={this.TextModeClick}
          activeOpacity={1}
          style={[drawingAreaStyle, { backgroundColor: 'black' }]} >
          <View style={{ flex: 1 }}
            ref={v => this.topView = v}
            pointerEvents={this.state.textMode ? 'box-only' : 'auto'}
          >
            <ScrollView minimumZoomScale={1} maximumZoomScale={maxZoom} zoomScale={this.state.zoom} style={{ flex: 1 }} contentContainerStyle={{ flex: 1 }}>
              {this.getCanvas()}
            </ScrollView>
          </View>
        </TouchableOpacity>
        <LinearGradient colors={['#94B2D1', '#6C97C0']} style={{ flex: 1, position: 'absolute', top: 0, width: '100%', height: '20%' }} >
          <View style={[styles.topPanel, { left: this.state.sideMargin }]}>
            {
              getSquareButton(() => {
                if (this.state.zoom == maxZoom) {
                  this.setState({ zoom: 1, xOffset: 0, yOffset: 0 });
                  return;
                }
                this.setState({ zoom: this.state.zoom + .5 })
              }
                , colors.gray, colors.orange, undefined, "search", 30, this.state.zoom > 1)
            }

            {this.getSpace(4)}

            {
              getSquareButton(() => {
                this.state.queue.undo();
                this.UpdateCanvas();
              }, colors.gray, colors.gray, undefined, "undo", 30, false)
            }
            {this.getSpace(1)}

            {
              getSquareButton(() => {
                this.state.queue.redo();
                this.UpdateCanvas();
              }, this.state.queue.canRedo() ? colors.gray : colors.disabled, this.state.queue.canRedo() ? colors.gray : colors.disabled,
                undefined, "redo", 30, false)
            }
            {this.getSpace(3)}

            {this.getColorButton(colors.black)}
            {this.getSpace(1)}
            {this.getColorButton(colors.red)}
            {this.getSpace(1)}
            {this.getColorButton(colors.yellow)}
            {this.getSpace(1)}
            {this.getColorButton(colors.green)}
            {this.getSpace(3)}

            {
              getSquareButton(() => { this.onTextButton(-1) },
                colors.gray, this.state.color, "א", undefined, 30, this.state.textMode)
            }
            {
              getSquareButton(() => { this.onTextButton(1) },
                colors.gray, this.state.color, "א", undefined, 40, this.state.textMode)
            }
            {this.getSpace(3)}

            {
              getSquareButton(() => { this.onBrushButton(-1) },
                colors.gray, this.state.color, undefined, "brush", 20, !this.state.textMode)
            }
            {
              getSquareButton(() => { this.onBrushButton(1) },
                colors.gray, this.state.color, undefined, "brush", 30, !this.state.textMode)
            }
            {this.getSpace(3)}
            {
              this.state.textMode ? <View /> :
                <LinearGradient colors={this.state.color} style={{
                  top: 20,
                  width: this.state.strokeWidth + 2,
                  height: this.state.strokeWidth + 2,
                  borderRadius: (this.state.strokeWidth + 2) / 2,
                  alignItems: 'center',
                  justifyContent: 'center'
                }
                }>
                </LinearGradient>
            }
          </View>
        </LinearGradient>

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

      </LinearGradient>
    );
  }

  getArrow = (location, func) => {
    let style = { flex: 1, position: 'absolute', zIndex: 100 }
    let deg = 0;
    if (location == TOP && this.state.yOffset < 0) {
      style.top = topLayer, style.left = 100, deg = -90;
      style.left = this.state.sideMargin + this.state.canvasW / 2
    } else if (location == RIGHT && this.state.zoom > 1) {
      style.top = topLayer + this.state.canvasH / 2;
      style.right = 5, deg = 0;
    } else if (location == BOTTOM && this.state.zoom > 1) {
      style.top = topLayer + this.state.canvasH, deg = 90;
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
        size={30}
        color="#4630EB"
      />
    </View>
  }
  getPageNavigationArrows = () => {

    if (!this.state.page || this.state.page.pages.length == 0) {
      return <View />;
    }

    return <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        height: '10%',
        position: 'absolute',
        bottom: 0,
        left: this.state.sideMargin,
        width: this.state.canvasW,
        zIndex: 1000
      }}
    >
      {(this.state.currentFile == this.state.page.pages[0]) ?
        <View /> :
        <TouchableOpacity
          onPress={() => this.movePage(-1)}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center'

          }}>

          <Icon

            name='chevron-left'
            size={60}
            color="black"
          />
          <Text style={{ fontSize: 25 }}>דף קודם</Text>
        </TouchableOpacity>
      }

      {(this.state.currentFile == this.state.page.pages[this.state.page.pages.length - 1]) ?
        <View /> :
        <TouchableOpacity
          onPress={() => this.movePage(1)}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end'
          }}>

          <Text style={{ fontSize: 25 }}>דף הבא</Text>
          <Icon

            name='chevron-right'
            size={60}
            color="black"
          />
        </TouchableOpacity>
      }
    </View>
  }

  getCanvas = () => {
    return <RNSketchCanvas
      ref={component => this.canvas = component}
      scale={this.state.zoom}
      text={this.state.canvasTexts}
      containerStyle={[styles.container]}
      canvasStyle={[styles.canvas, { transform: [{ translateX: this.state.xOffset }, { translateY: this.state.yOffset }] }]}
      localSourceImage={{ filename: this.state.currentFile, mode: 'AspectFit' }}
      onStrokeEnd={this.SketchEnd}
      strokeColors={[{ color: colors.black[0] }]}
      defaultStrokeIndex={0}
      defaultStrokeWidth={DEFAULT_STROKE_WIDTH}
    />
  }

  getColorButton = (color) => {
    let func = () => {
      this.canvas.setState({ color: color[0] })
      this.setState({ color: color })
    }
    let selected = this.state.color == color;

    return <TouchableOpacity
      onPress={func}
      activeOpacity={1}
    >
      <LinearGradient colors={color} style={[styles.CircleShapeView,
      selected ? styles.selected : styles.notSelected]}>
      </LinearGradient>
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
    return <View style={{ flex: 1, position: 'absolute', left: x, top: y, zIndex: 100 }} {...this._panResponder.panHandlers}>
      <TextInput
        onChangeText={(text) => this.setState({ inputTextValue: text })}
        autoFocus

        style={[styles.textInput, {
          width: this.getTextWidth(),
          height: this.getTextHeight(),
          color: this.state.color[0],
          fontSize: this.state.fontSize
        }]}
      >{txt}</TextInput>
    </View>
  }

  getTextWidth = () => this.state.inputTextValue.length * 20 + 80;
  getTextHeight = () => this.state.fontSize + 1.2 + 15;
}

AppRegistry.registerComponent('IssieEditPhoto', () => IssieEditPhoto);

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center'
  },
  fullSizeInParent: {
    flex: 1,
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    zIndex: 10
  },
  textInput: {
    borderColor:
      'black',
    borderWidth: 1,
    backgroundColor: 'white'

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
  topPanel: {
    position: 'absolute',
    flexDirection: 'row',
    top: marginTop,
    height: topLayer,
    backgroundColor: 'transparent'
  }
});
