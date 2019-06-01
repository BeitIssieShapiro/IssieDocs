
import React from 'react';
import {
  AppRegistry, Image, ScrollView, TouchableHighlight, StyleSheet, TextInput, View,
  Button, TouchableOpacity, Text, Alert, PanResponder, Dimensions
} from 'react-native';
import { Icon } from 'react-native-elements'
import RNSketchCanvas from '@terrylinla/react-native-sketch-canvas';
import LinearGradient from 'react-native-linear-gradient';
import * as RNFS from 'react-native-fs';
//import RNReadWriteExif from 'react-native-read-write-exif';

const topLayer = 35 + 8 + 8;
const maxZoom = 3;
const marginTop = 8;
const TOP = 0, RIGHT = 1, BOTTOM = 2, LEFT = 3;

const colors = {
  gray: ['#5B748A', '#587189'],
  orange: ['#FFA264', '#A24A04'],
  blue: ['#0097F8', '#00145C'],
  yellow: ['#FCF300', '#B0A000'],
  green: ['#00F815', '#005C05'],
  red: ['#FF0000', '#A20000'],
  black: ['#000000','#000000']
}

class DoQueue {
  constructor(name, level) {
    this._doneQueue = []
    this._undoQueue = []
  }

  pushText(elem) {
    this.add({ elem: elem, type: 'text' });
    //once new item added redo is reset
    this._undoQueue = [];
  }

  pushPath(elem) {
    this.add({ elem: elem, type: 'path' });
    //once new item added redo is reset
    this._undoQueue = [];
  }

  add(queueElem) {
    this._doneQueue.push(queueElem);
  }

  undo() {
    if (this._doneQueue.length > 0) {
      this._undoQueue.push(this._doneQueue.pop());
    }
  }

  redo() {
    if (this._undoQueue.length > 0) {
      this._doneQueue.push(this._undoQueue.pop());
    }
  }

  getAll() {
    return this._doneQueue;
  }
}


export default class IssieEditPhoto extends React.Component {
  static navigationOptions = {
    title: 'עריכת דף',
  };
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
            textX: this.s2aW(gestureState.moveX), textY: this.s2aH(gestureState.moveY)
          });
        }
      }
    });

    this.state = {
      color: colors.black,
      fontSize: 25,
      textMode: false,
      showTextInput: false,
      queue: new DoQueue(),
      sideMargin: 0,
      canvasW: 1000,
      canvasH: 1000,
      inputTextHeight: 40,
      topView: 0,
      zoom: 1.0,
      xOffset: 0,
      yOffset: 0
    }

  }

  async getImageDimensions(uri) {
    return new Promise(
      (resolve, reject) => {
        Image.getSize(uri, (width, height) => {
          resolve({ w: width, h: height });
        });
      },
      error => reject(error)
    );
  }

  componentDidMount = async () => {
    const measure = this.topView.measure.bind(this.topView);
    setTimeout(measure, 50, (fx, fy, width, height, px, py) => {
      this.setState({ topView: py })
    });

    const uri = this.props.navigation.getParam('uri', '');
    let windowSize = Dimensions.get("window");
    let sideMargin = Math.floor(windowSize.width * .05)

    windowW = windowSize.width - sideMargin * 2;
    windowH = windowSize.height;
    const imageSize = await this.getImageDimensions(uri);
    //Alert.alert("w:"+imageSize.w+ ", h:"+ imageSize.h)
    imageWidth = imageSize.w;
    imageHeight = imageSize.h;
    //const { imageWidth, imageHeight } = await promise;
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

    this.setState({ sideMargin: sideMargin, canvasW: imageWidth * ratio, canvasH: imageHeight * ratio })
    setTimeout(this.Load, 100);
  }

  Load = () => {
    const uri = this.props.navigation.getParam('uri', '');
    const metaDataUri = uri + ".json";
    RNFS.readFile(metaDataUri).then((value) => {
      let sketchState = JSON.parse(value);

      for (let i = 0; i < sketchState.length; i++) {
        this.state.queue.add(sketchState[i])
      }

      this.UpdateCanvas(true)
    }).catch((e) => {/*no json file yet*/ })
  }

  Save = () => {
    if (!this.canvas) {
      Alert.alert("no canvas on save");
      return;
    }
    //Alert.alert("Save called")
    /*
    this.refs.canvas.save(
        'jpg', 
        false, 
        'x', 
        Date.now(), 
        true, 
        true,
        false);
    */
    let sketchState = this.state.queue.getAll();
    const uri = this.props.navigation.getParam('uri', '');
    const metaDataUri = uri + ".json";
    const content = JSON.stringify(sketchState);
    RNFS.writeFile(
      metaDataUri,
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
  s2aW = (w) => { return w - this.state.sideMargin }
  s2aH = (h) => { return h - this.state.topView }// - this.state.inputTextHeight/2}
  a2sW = (w) => { return w + this.state.sideMargin }
  a2sH = (h) => { return h + this.state.topView } // + this.state.inputTextHeight / 2 }
  a2cW = (w) => { return w + this.state.sideMargin }
  a2cH = (h) => { return h + topLayer } // + this.state.inputTextHeight / 2 }


  TextModeClick = (ev) => {
    if (this.state.showTextInput) {
      //a text box is visible and a click was pressed - save the text box contents first:
      this.SaveText()
    }

    //check that the click is in the canvas area:
    let x = this.s2aW(ev.nativeEvent.pageX);
    let y = this.s2aH(ev.nativeEvent.pageY);
    //Alert.alert("x:"+x+",y:"+y+ ", nativeX:"+ev.nativeEvent.pageX+", nativeY:"+ev.nativeEvent.pageY+", topView:"+ this.state.topView + ",topLayer:"+topLayer)
    if (x < 0 || x > this.state.canvasW || y < 0 || y > this.state.canvasH) {
      return
    }

    let textElem = this.findTextElement({ x: x, y: y });
    let initialText = '';
    //    let x = ev.nativeEvent.locationX, y = ev.nativeEvent.locationY

    if (textElem) {
      initialText = textElem.text;
      x = textElem.position.x;
      y = textElem.position.y;
    }
    this.setState({ showTextInput: true, inputTextValue: initialText, currentTextElem: textElem, textX: x, textY: y })
  }

  SaveText = () => {
    let text = this.state.inputTextValue;
    if (text.length > 0) {
      this.state.queue.pushText(this.getTextElement(text));
      this.UpdateCanvas();
    }
  }
  findTextElement = (coordinates) => {
    let q = this.state.queue.getAll();
    for (let i = q.length - 1; i >= 0; i--) {
      if (q[i].type == 'text') {
        const elem = q[i].elem;

        if (elem.position.x - 15 < coordinates.x &&
          elem.position.x + 65 > coordinates.x &&
          elem.position.y - 15 < coordinates.y &&
          elem.position.y + 65 > coordinates.y) {
          return elem;
        }
      }
    }

    return undefined;
  }

  getTextElement = (newText) => {
    newTextElem = { text: newText }
    if (this.state.currentTextElem) {
      newTextElem.id = this.state.currentTextElem.id;
    } else {
      newTextElem.id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    }

    newTextElem.anchor = { x: 0, y: 0 };
    newTextElem.position = { x: this.state.textX / this.state.zoom, y: this.state.textY / this.state.zoom };
    newTextElem.alignment = 'Right';
    newTextElem.fontColor = this.state.color[0];
    newTextElem.fontSize = this.state.fontSize;
    return newTextElem;
  }

  UpdateCanvas = (dontSave) => {
    this.canvas.clear();
    let q = this.state.queue.getAll();
    let canvasTexts = [];
    for (let i = 0; i < q.length; i++) {
      if (q[i].type === 'text') {
        //first try to find same ID and replace, or add it
        let found = false;

        for (let j = 0; j < canvasTexts.length; j++) {
          if (canvasTexts[j].id === q[i].elem.id) {
            canvasTexts[j] = q[i].elem
            found = true;
            break;
          }
        }
        if (!found) canvasTexts.push(q[i].elem);
      } else if (q[i].type === 'path') {
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
      this.setState({
        showTextInput: false,
        textMode: false
      });
      return;
    }
    this.canvas.setState({ strokeWidth: this.canvas.state.strokeWidth + inc });
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

      <LinearGradient colors={['#E2DCCE', '#D4CDBC', '#C1B7A1']} style={styles.mainContainer}  >

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
          <View style={[styles.topPanel,{left:this.state.sideMargin}]}>
            {
              this.getSquareButton(() => {
                if (this.state.zoom == maxZoom) {
                  this.setState({ zoom: 1 });
                  return;
                }
                this.setState({ zoom: this.state.zoom + .5 })
              }
                , colors.gray, colors.orange, undefined, "search", 30, this.state.zoom > 1)
            }

            {this.getSpace(4)}

            {
              this.getSquareButton(() => {
                this.state.queue.undo();
                this.UpdateCanvas();
              }, colors.gray, colors.gray, undefined, "undo", 30, false)
            }
            {this.getSpace(1)}

            {
              this.getSquareButton(() => {
                this.state.queue.redo();
                this.UpdateCanvas();
              }, colors.gray, colors.gray, undefined, "redo", 30, false)
            }
            {this.getSpace(20)}

            { this.getColorButton(colors.black) }
            {this.getSpace(1)}
            { this.getColorButton(colors.red) }
            {this.getSpace(1)}
            { this.getColorButton(colors.blue) }
            {this.getSpace(1)}
            { this.getColorButton(colors.green) }
            {this.getSpace(3)}

            {
              this.getSquareButton(() => { this.onTextButton(-1) },
                colors.gray, this.state.color, "א", undefined, 20, this.state.textMode)
            }
            {
              this.getSquareButton(() => { this.onTextButton(1) },
                colors.gray, this.state.color, "א", undefined, 30, this.state.textMode)
            }
            {this.getSpace(3)}

            {
              this.getSquareButton(() => { this.onBrushButton(-1) },
                colors.gray, this.state.color, undefined, "brush", 20, !this.state.textMode)
            }
            {
              this.getSquareButton(() => { this.onBrushButton(1) },
                colors.gray, this.state.color, undefined, "brush", 30, !this.state.textMode)
            }
          </View>
        </LinearGradient>

        {
          this.state.showTextInput ?
            //todo height should be relative to text size
            this.getTextInput(this.state.inputTextValue, this.a2cW(this.state.textX), this.a2cH(this.state.textY)) :
            <Text></Text>
        }

        {this.getArrow(LEFT, () => this.setState({ xOffset: this.state.xOffset + 50 }))}
        {this.getArrow(TOP, () => this.setState({ yOffset: this.state.yOffset + 50 }))}
        {this.getArrow(RIGHT, () => this.setState({ xOffset: this.state.xOffset - 50 }))}
        {this.getArrow(BOTTOM, () => this.setState({ yOffset: this.state.yOffset - 50 }))}

      </LinearGradient>
    );
  }

  getArrow = (location, func) => {
    let style = { flex: 1, position: 'absolute', zIndex:100 }
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
  getCanvas = () => {
    const uri = this.props.navigation.getParam('uri', '');

    return <RNSketchCanvas
      ref={component => this.canvas = component}
      scale={this.state.zoom}
      text={this.state.canvasTexts}
      containerStyle={[styles.container]}
      canvasStyle={[styles.canvas, { transform: [{ translateX: this.state.xOffset }, { translateY: this.state.yOffset }] }]}
      localSourceImage={{ filename: uri, mode: 'AspectFit' }}
      onStrokeEnd={this.SketchEnd}
      strokeColors={[{ color: colors.black[0] }]}
      defaultStrokeIndex={0}
      defaultStrokeWidth={5}
    />
  }

  getColorButton = (color) => {
    let func = () => {
      this.canvas.setState({color: color[0]})
      this.setState({ color: color })
    }
    let selected = this.state.color == color;

    return <TouchableOpacity
      onPress={func}
      activeOpacity={1}
    >
      <LinearGradient colors= {color} style={[styles.CircleShapeView,
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






  getSquareButton = (func, color, selectedColor, txt, icon, size, selected) => {
    return <TouchableOpacity
      onPress={func}
      activeOpacity={1}
    >
      <LinearGradient
        colors={selected ? selectedColor : color}
        style={[styles.squareShapeView, selected ? styles.selected : styles.notSelected]}>
        {txt ? <Text style={{ fontSize: size, color: 'white' }}>{txt}</Text> : <Icon name={icon} size={size} color='white' />}
      </LinearGradient>
    </TouchableOpacity>
  }

  getTextInput = (txt, x, y) => {
    return <View style={{ flex: 1, position: 'absolute', left: x, top: y, zIndex:100 }} {...this._panResponder.panHandlers}>
      <TextInput ref={"textInput"}
        onChangeText={(text) => this.setState({ inputTextValue: text })}
        autoFocus style={[styles.textInput, { height: this.state.inputTextHeight, color: this.state.color[0], fontSize: this.state.fontSize }]}>{txt}</TextInput>
    </View>
  }


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
    width: 100,
    borderColor:
      'black',
    borderWidth: 1,
    backgroundColor: 'white'

  },
  CircleShapeView: {
    width: 35,
    height: 35,
    borderRadius: 35 / 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  squareShapeView: {
    marginHorizontal: 2.5,
    height: 35,
    width: 35,
    backgroundColor: '#39579A',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5
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
  },
  alignRightPanel: {
    right: 17
  }
});
