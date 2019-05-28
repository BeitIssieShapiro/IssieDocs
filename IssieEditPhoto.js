
import React from 'react';
import {
  AppRegistry, Image, ScrollView, TouchableHighlight, StyleSheet, TextInput, View,
  Button, TouchableOpacity, Text, Alert, PanResponder, Dimensions
} from 'react-native';
import { Icon } from 'react-native-elements'
import RNSketchCanvas from '@terrylinla/react-native-sketch-canvas';
//import {ResponsiveSketchCanvas} from '@projektpro/react-native-responsive-sketch-canvas';
import { globalStyle } from './GaleryScreen'
import * as RNFS from 'react-native-fs';
//import RNReadWriteExif from 'react-native-read-write-exif';

const topLayer = 35 + 8 + 8;
const marginTop = 8;

const Colors = ['#000000', '#FF0000', '#00FFFF', '#0000FF', '#0000A0'];

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
      color: Colors[0],
      fontSize: 25,
      textMode: false,
      showTextInput: false,
      queue: new DoQueue(),
      sideMargin: 0,
      canvasW: 1000,
      canvasH: 1000,
      inputTextHeight: 40,
      topView: 0,
      zoom:1.0
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
    newTextElem.fontColor = this.state.color;
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
    return (
      <View style={styles.mainContainer}  >
        <TouchableOpacity onPress={this.TextModeClick}
          //onPress={()=>Alert.alert('click')} 
          activeOpacity={1}
          style={styles.fullSizeInParent} >
          <View style={{
            flex:1,
            position: 'absolute',
            top: topLayer,
            left: this.state.sideMargin,
            width: this.state.canvasW,
            height: this.state.canvasH
          }}
            ref={v => this.topView = v}
            pointerEvents={this.state.textMode ? 'box-only' : 'auto'}
          >
            <ScrollView minimumZoomScale={1} maximumZoomScale={5} zoomScale={this.state.zoom} style={{ flex: 1}} contentContainerStyle={{ flex: 1 }}>
              {this.getCanvas()}
            </ScrollView>
          </View>
        </TouchableOpacity>
        <View style={styles.topPanel}>
          {
            this.getSquareButton(() => { this.setState({ zoom: this.state.zoom + .5 }) }
              , 'white', undefined, "zoom-in", 30, false)
          }
          {this.getSpace(1)}
          {
            this.getSquareButton(() => { this.setState({ zoom: this.state.zoom - .5 }) }
              , 'white', undefined, "zoom-out", 30, false)
          }
          {this.getSpace(4)}

          {
            this.getSquareButton(() => {
              this.state.queue.undo();
              this.UpdateCanvas();
            }, 'white', undefined, "undo", 30, false)
          }
          {this.getSpace(1)}

          {
            this.getSquareButton(() => {
              this.state.queue.redo();
              this.UpdateCanvas();
            }, 'white', undefined, "redo", 30, false)
          }
          {this.getSpace(20)}

          {
            this.getCircleButton(() => {
              const newColor = { color: Colors[0] }
              this.canvas.setState(newColor)
              this.setState(newColor)
            }, Colors[0], undefined, this.state.color === Colors[0])
          }
          {this.getSpace(1)}

          {
            this.getCircleButton(() => {
              const newColor = { color: Colors[1] }
              this.canvas.setState(newColor)
              this.setState(newColor)
            }, Colors[1], undefined, this.state.color === Colors[1])
          }
          {this.getSpace(1)}
          {
            this.getCircleButton(() => {
              const newColor = { color: Colors[2] }
              this.canvas.setState(newColor)
              this.setState(newColor)
            }, Colors[2], undefined, this.state.color === Colors[2])
          }
          {this.getSpace(1)}

          {
            this.getCircleButton(() => {
              const newColor = { color: Colors[3] }
              this.canvas.setState(newColor)
              this.setState(newColor)
            }, Colors[3], undefined, this.state.color === Colors[3])
          }
          {this.getSpace(3)}
          {
            this.getSquareButton(() => { this.onTextButton(-1) },
              'blue', "א", undefined, 20, this.state.textMode)
          }
          {
            this.getSquareButton(() => { this.onTextButton(1) }
              , 'blue', "א", undefined, 30, this.state.textMode)
          }
          {this.getSpace(3)}

          {
            this.getSquareButton(() => { this.onBrushButton(-1) }
              , 'white', undefined, "brush", 20, !this.state.textMode)
          }
          {
            this.getSquareButton(() => { this.onBrushButton(1) }
              , 'white', undefined, "brush", 30, !this.state.textMode)
          }
        </View>

        {
          this.state.showTextInput ?
            //todo height should be relative to text size
            this.getTextInput(this.state.inputTextValue, this.a2cW(this.state.textX), this.a2cH(this.state.textY) ) :
            <Text></Text>
        }

      </View>
    );
  }

  getCanvas = () => {
    const uri = this.props.navigation.getParam('uri', '');

    return <RNSketchCanvas
      ref={component => this.canvas = component}
      scale={this.state.zoom}
      text={this.state.canvasTexts}
      containerStyle={[styles.container]}
      canvasStyle={[styles.canvas]}
      localSourceImage={{ filename: uri, mode: 'AspectFit' }}
      onStrokeEnd={this.SketchEnd}
      strokeColors={[{ color: Colors[0] }]}
      defaultStrokeIndex={0}
      defaultStrokeWidth={5}
    />
  }

  getCircleButton = (func, bgColor, txt, selected) => {
    return <TouchableOpacity
      onPress={func}
      activeOpacity={1}
    >
      <View style={[styles.CircleShapeView,
      { backgroundColor: bgColor }, selected ? styles.selected : styles.notSelected]}>
        <Text>{txt}</Text>
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

  getSquareButton = (func, bgColor, txt, icon, size, selected) => {
    return <TouchableOpacity
      onPress={func}
      activeOpacity={1}
    >
      <View style={[styles.squareShapeView,
      { backgroundColor: bgColor }, selected ? styles.selected : styles.notSelected]}>
        {txt ? <Text style={{ fontSize: size }}>{txt}</Text> : <Icon name={icon} size={size} color="#4630EB" />}
      </View>
    </TouchableOpacity>
  }

  getTextInput = (txt, x, y) => {
    return <View style={{ flex: 1, position: 'absolute', left: x, top: y }} {...this._panResponder.panHandlers}>
      <TextInput ref={"textInput"}
        onChangeText={(text) => this.setState({ inputTextValue: text })}
        autoFocus style={[styles.textInput, { height: this.state.inputTextHeight, color: this.state.color, fontSize: this.state.fontSize }]}>{txt}</TextInput>
    </View>
  }


}
AppRegistry.registerComponent('IssieEditPhoto', () => IssieEditPhoto);


const styles = StyleSheet.create({
  mainContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#E0D9CC',
  },
  fullSizeInParent: {
    flex: 1,
    flexDirection: 'column',
    width: '100%',
    height: '100%'
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
    borderRadius: 5,
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
    height: topLayer
  },
  alignRightPanel: {
    right: 17
  }
});
