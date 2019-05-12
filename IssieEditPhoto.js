
import React from 'react';
import {AppRegistry, Image,ImageBackground, StyleSheet,TextInput, View, 
  Button,TouchableOpacity, Text , Alert} from 'react-native';
import { SketchCanvas } from '@terrylinla/react-native-sketch-canvas';
import RNSketchCanvas from '@terrylinla/react-native-sketch-canvas';
import {globalStyle} from './GaleryScreen'
import * as RNFS from 'react-native-fs';


const pictureSize = 150;



export default class IssieEditPhoto extends React.Component {
  static navigationOptions = {
    title: 'עריכת דף',
  };
  constructor () {
    super();
  }
  Save() {
    this.sketchCanvas.save(
        'jpg', 
        false, 
        'x', 
        Date.now(), true, true);
  }

  onSketchSaved(result, path) {
    const uri = this.props.navigation.getParam('uri', '');
    if (result) {
      return RNFS.copyFile(path, uri).then(undefined,
        //on error 
        err => Alert.alert('Error saving file: ' + uri + ' err: '+err)
      ).catch(err => Alert.alert('Catch saving file: ' + uri + ', err: ' + err));  
    }
    Alert.alert('Error saving file: ' + uri);
  }
  
  Cancel() {
    this.props.navigation.goBack();
  }

  render() {
    const uri = this.props.navigation.getParam('uri', '');
    //Alert.alert("Editing " + uri);
    return (
      <View style={styles.container}>
        
        <View style={{zIndex: 1000, position: 'absolute', top: 0, left: 0}}>
          <TextInput style={styles.textInput}/>
        </View>

        <View style={{ flex: 1, flexDirection: 'row' }}>
          
          <SketchCanvas
            ref={ref => this.sketchCanvas = ref}
            onSketchSaved={this.onSketchSaved}
            localSourceImage={{filename:uri, mode: 'AspectFill'}}
            style={{ flex: 1 }}
            strokeColor={'red'}
            strokeWidth={7}
            text={[
              {
                text:'Ariel', 
                overlay: 'SketchOnText',
                anchor:{x:0,y:0},
                position:{x:100,y:100},
                fontColor:'black',
                fontSize:25,

              }
            ]}
          />
        </View>
        {
        //<Button title="Save" style={globalStyle.buttonOk} onPress={this.Save}/>
        }
      </View>
    );
  }
}
AppRegistry.registerComponent('IssieEditPhoto', () => IssieEditPhoto);

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5FCFF',
  },
  textInput: {
    height: 40, 
    width:100,
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
});
