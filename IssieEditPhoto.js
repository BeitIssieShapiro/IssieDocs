
import React from 'react';
import {
  AppRegistry, Image, ImageBackground,TouchableHighlight, StyleSheet, TextInput, View,
  Button, TouchableOpacity, Text, Alert
} from 'react-native';
import RNSketchCanvas from '@terrylinla/react-native-sketch-canvas';
//import {ResponsiveSketchCanvas} from '@projektpro/react-native-responsive-sketch-canvas';
import { globalStyle } from './GaleryScreen'
import * as RNFS from 'react-native-fs';
//import RNReadWriteExif from 'react-native-read-write-exif';

const topLayer = 30;
const marginTop = 8;

class DoQueue {
  constructor(name, level) {
    this._doneQueue = []
    this._undoQueue = []
  }
  
  pushText(elem){
    this.add({elem:elem, type:'text'});
    //once new item added redo is reset
    this._undoQueue = [];
  }

  pushPath(elem){
    this.add({elem:elem, type:'path'});
    //once new item added redo is reset
    this._undoQueue = [];
  }

  add(queueElem){
    this._doneQueue.push(queueElem);
  }

  undo (){
    if (this._doneQueue.length > 0) {
      this._undoQueue.push(this._doneQueue.pop());
    }
  }

  redo (){
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
    this.state = { textMode: false, showTextInput:false, queue: new DoQueue() }
  }

  componentDidMount = async () => {
    if (!this.canvas) {
      Alert.alert("no canvas on mount");
      return;
    }
    const uri = this.props.navigation.getParam('uri', '');
    const metaDataUri = uri + ".json";
    RNFS.readFile(metaDataUri).then((value) => {
      let sketchState = JSON.parse(value);
      
      for (let i = 0; i < sketchState.length; i++) {
        this.state.queue.add(sketchState[i])
      }

      this.UpdateCanvas()
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

  /*
    onSketchSaved = (result, path) => {
      const uri = this.props.navigation.getParam('uri', '');
      if (result) {
        return this.replaceFile(path, uri).then(
          //success - do nothing
          undefined,
          //error 
          err => Alert.alert('Error saving file: ' + uri + ' err: ' + err)
        ).catch(err => Alert.alert('Catch saving file: ' + uri + ', err: ' + err));
      }
    }
  */
  Cancel = () => {
    this.props.navigation.goBack();
  }

  SketchEnd = (p) => {
    this.state.queue.pushPath(p);
  }

  TextModeClick = (ev) => {
    if (this.state.showTextInput) {
      //a text box is visible and a click was pressed - save the text box contents first:

      let text = this.state.inputTextValue;
      if (text.length > 0) {
        this.state.queue.pushText(this.getTextElement(text));
        this.UpdateCanvas();
      }
    }
    let textElem = this.findTextElement(ev.nativeEvent)
    let initialText = '';
    let x = ev.nativeEvent.locationX, y=ev.nativeEvent.locationY
    if (textElem) {
      initialText = textElem.text;
      x = textElem.position.x;
      y = textElem.position.y + topLayer + marginTop;
    }
    this.setState({showTextInput:true, inputTextValue:initialText, currentTextElem:textElem, textX:x, textY:y})
  }

  findTextElement = (ev) => {
    let q = this.state.queue.getAll();
    for (let i=q.length-1;i>=0;i--) {
      if (q[i].type == 'text') {
        const elem = q[i].elem;

        if (elem.position.x - 15 < Math.floor(ev.locationX) &&
            elem.position.x + 65 > Math.floor(ev.locationX) &&
            elem.position.y - 15 < Math.floor(ev.locationY) &&
            elem.position.y + 65 > Math.floor(ev.locationY)) {
          Alert.alert("found")
          return elem;
        }
      }
    }
    
    return undefined;
  }

  getTextElement = (newText) => {
    newTextElem = {text:newText}
    if (this.state.currentTextElem) {
      newTextElem.id = this.state.currentTextElem.id;
    } else {
      newTextElem.id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    }

    newTextElem.anchor = { x: 0, y: 0 };
    newTextElem.position = { x: this.state.textX, y: this.state.textY - topLayer - marginTop };
    newTextElem.alignment = 'Right';

    return newTextElem;
  }

  UpdateCanvas = () => {
    this.canvas.clear();
    let q = this.state.queue.getAll();
    let canvasTexts = [];
    for (let i = 0; i < q.length; i++) {
      if (q[i].type === 'text') {
        //first try to find same ID and replace, or add it
        let found = false;

        for (let j=0;j<canvasTexts.length;j++) {
          if(canvasTexts[j].id === q[i].elem.id) {
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
    this.setState({canvasTexts:canvasTexts});
  }

  render() {
    return (
      <View style={styles.mainContainer}>
        <TouchableOpacity onPress={this.TextModeClick}
        //onPress={()=>Alert.alert('click')} 
        activeOpacity={1}
        style={styles.fullSizeInParent} >
        <View style={styles.fullSizeInParent} pointerEvents={this.state.textMode?'box-only':'auto'}>
            {this.getCanvas()}
        </View>
        </TouchableOpacity>
        <View style={{flexDirection:'row'}}>
        {
          this.getButton(() => {
            this.setState({showTextInput:false,
               textMode:!this.state.textMode})
          }, this.state.textMode?'#0693e3':'#8ed1fc', "ABC")
        }
        {
          this.getButton(() => {
            this.state.queue.undo();
            this.UpdateCanvas();
          }, this.state.textMode?'#0693e3':'#8ed1fc', "בטל")
        }
        {
          this.getButton(() => {
            this.state.queue.redo();
            this.UpdateCanvas();
          }, this.state.textMode?'#0693e3':'#8ed1fc', "החזר")
        }
        </View>
        
        {
          this.state.showTextInput?
            //todo height should be relative to text size
            this.getTextInput(this.state.inputTextValue,this.state.textX,this.state.textY - 20):
            <Text></Text>
        }
        
      </View>
    );
  }

  getCanvas = () => {
    const uri = this.props.navigation.getParam('uri', '');

    return <RNSketchCanvas
      ref={component => this.canvas = component}
      text={this.state.canvasTexts}
      containerStyle={[ styles.container]}
      canvasStyle={[ styles.canvas]}
      localSourceImage={{ filename: uri, mode: 'AspectFill' }}
      saveComponent={<View style={styles.functionButton}><Text style={{ color: 'white' }}>Save</Text></View>}
      onSketchSaved={this.Save}
      
      onStrokeEnd={this.SketchEnd}
      clearComponent={<View style={styles.functionButton}><Text style={{ color: 'white' }}>Clear</Text></View>}
      onClearPressed={() => {
        this.canvas.clear();
      }}
      eraseComponent={<View style={styles.functionButton}><Text style={{ color: 'white' }}>Eraser</Text></View>}
      strokeComponent={(color) => <View style={[styles.CircleShapeView, { backgroundColor: color }]} ></View>}
      strokeColors={[
        { color: '#000000' },
        { color: '#FF0000' },
        { color: '#00FFFF' },
        { color: '#0000FF' },
        { color: '#0000A0' }]
      }
      strokeSelectedComponent={(color, index, changed) => {
        return (
          <View style={[styles.CircleShapeView, { backgroundColor: color, borderColor: 'black', borderWidth: 3 }]} ></View>
        )
      }}
      strokeWidthComponent={(w) => {
        return (<View style={styles.strokeWidthButton}>
          <View style={{
            backgroundColor: 'black', marginHorizontal: 2.5,
            width: Math.sqrt(w / 3) * 10, height: Math.sqrt(w / 3) * 10, borderRadius: Math.sqrt(w / 3) * 10 / 2
          }} />
        </View>
        )
      }}
      defaultStrokeIndex={0}
      defaultStrokeWidth={5}

    />
  }

  getButton = (func, bgColor, txt) => {
    return <TouchableOpacity 
      onPress={func}
      activeOpacity={1}
    >
      <View style={[styles.CircleShapeView, 
        { backgroundColor: bgColor}]}>
        <Text>{txt}</Text>
      </View>
    </TouchableOpacity>
  }

  getTextInput = (txt, x, y) => {
    return <View style={{flex:1, position:'absolute', left:x, top:y}}>
      <TextInput ref={"textInput"} 
          onChangeText={(text) => this.setState({inputTextValue:text})}
          autoFocus style={styles.textInput}>{txt}</TextInput>
    </View> 
  }


}
AppRegistry.registerComponent('IssieEditPhoto', () => IssieEditPhoto);




const styles = StyleSheet.create({
  mainContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'white',
  },
  fullSizeInParent: { 
    flex: 1, 
    flexDirection: 'column', 
    width: '100%', 
    height: '100%' },
  textInput: {
    height: 40,
    width: 100,
    borderColor:
      'black',
    borderWidth: 1,
    backgroundColor: 'white'

  },
  functionButton: {
    marginHorizontal: 2.5,
    marginVertical: marginTop,
    height: topLayer,
    width: 60,
    backgroundColor: '#39579A',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  CircleShapeView: {
    marginVertical: 2,
    width: 35,
    height: 35,
    borderRadius: 35 / 2,
    alignItems:'center',
    justifyContent: 'center'
  }, 
  container: {
    flex: 1, 
    backgroundColor: 'transparent',
    height:topLayer
  }, 
  canvas: {
    flex: 1, 
    backgroundColor: 'transparent'
  }, 
  bottomPanel: {
    position:'absolute',
    bottom:17
  },
  alignRightPanel: {
    right:17
  }
});


/*
<View style={{zIndex: 1000, position: 'absolute', top: 0, left: 0}}>
          <TextInput style={styles.textInput}/>
        </View>
*/