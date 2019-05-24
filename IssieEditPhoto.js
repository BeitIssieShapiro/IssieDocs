
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

const pictureSize = 150;



export default class IssieEditPhoto extends React.Component {
  static navigationOptions = {
    title: 'עריכת דף',
  };
  constructor() {
    super();
    this.state = { textMode: false }
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
        let path = sketchState[i]
        this.canvas.addPath(path);
      }
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
    let sketchState = [];
    let paths = this.canvas.getPaths();
    for (let i = 0; i < paths.length; i++) {
      let path = paths[i];
      sketchState.push(path);
    }
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

  SketchStart = (a, b, c) => {
    return false; //Alert.alert("a"+a + ",b:"+b+" c:"+c);
  }

  render() {
    return (
      <View style={styles.mainContainer}>
        <TouchableOpacity onPress={()=>Alert.alert('click')} activeOpacity={1}
        style={styles.fullSizeInParent} >
        <View style={styles.fullSizeInParent} pointerEvents={this.state.textMode?'box-only':'auto'}>
            {this.getCanvas()}
        </View>
        </TouchableOpacity>
        {
              this.getButton(() => {
                this.setState({textMode:!this.state.textMode})
              }, this.state.textMode?'#0693e3':'#8ed1fc', "ABC")
            }
      </View>
    );
  }

  getCanvas = () => {
    const uri = this.props.navigation.getParam('uri', '');

    return <RNSketchCanvas
      ref={component => this.canvas = component}
      containerStyle={[ styles.container]}
      canvasStyle={[ styles.canvas]}
      localSourceImage={{ filename: uri, mode: 'AspectFill' }}
      saveComponent={<View style={styles.functionButton}><Text style={{ color: 'white' }}>Save</Text></View>}
      onSketchSaved={this.Save}
      undoComponent={<View style={styles.functionButton}><Text style={{ color: 'white' }}>Undo</Text></View>}
      onUndoPressed={(id) => {
        //Alert.alert('do something')
      }}
      onStrokeStart={this.SketchStart}
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
    marginVertical: 8,
    height: 30,
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
    backgroundColor: 'transparent'
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