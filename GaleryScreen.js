import React from 'react';
import {
  Button, StyleSheet, View,
  TouchableOpacity, Text, ScrollView, Alert
} from 'react-native';
import * as RNFS from 'react-native-fs';
import LinearGradient from 'react-native-linear-gradient';

import { Icon } from 'react-native-elements'
import Photo from './Photo';
import Folder from './Folder'

export const FOLDERS_DIR = RNFS.DocumentDirectoryPath + '/folders/';
export const pictureSize = 150;
export const pictureWrapperStyle = {
  width: pictureSize * 4 / 5,
  height: pictureSize,
  alignItems: 'center',
  justifyContent: 'center',
  margin: 5,
  zIndex: 1
}


export default class GalleryScreen extends React.Component {
  static navigationOptions = {
    title: 'דפי עבודה',
  };
  state = {
    folders: [],
    selected: [],
    isFocused: false
  };

  componentWillUnmount() {
    this.subs.forEach(sub => sub.remove());
  }

  componentDidMount = async () => {
    //verify exists:
    RNFS.mkdir(FOLDERS_DIR).catch(() => { });

    this.subs = [
      this.props.navigation.addListener("didFocus", async () => {
        this.refresh();
      }),
    ];

    await this.refresh();
  };

  refresh = async () => {

    RNFS.readDir(FOLDERS_DIR).then(async (folders) => {
      //Alert.alert("Loading " + folders.length + " folders");
      let foldersState = [];

      for (let folder of folders) {
        //Alert.alert("reading files from: " + folder.path);
        const filesItems = await RNFS.readDir(folder.path);

        const filesPath = filesItems.filter((f) => !f.name.endsWith(".json")).map(fileItem => fileItem.path);
        foldersState.push({ name: folder.name, files: filesPath });

      }
      this.setState({ folders: foldersState });

    })

  }

  toggleSelection = (uri, isSelected) => {
    let selected = this.state.selected;
    if (isSelected) {
      selected.push(uri);
    } else {
      selected = selected.filter(item => item !== uri);
    }
    this.setState({ selected });
  };

  renderPhoto = fileName => {
    return <Photo
      key={fileName}
      uri={fileName}
      onSelectionToggle={this.toggleSelection}
      onPress={this.onPhotoPressed.bind(this, fileName)}
    />;
  }

  renderFolder = folder => {
    return <Folder
      key={folder.name}
      name={folder.name}
      files={folder.files}
      onSelectionToggle={this.toggleSelection}
      onPress={this.onFolderPress.bind(this, folder)}
    />;
  }
  /*
  renderFolder = (folder) => {
    //Alert.alert("render folder: "+folder.name);
    return <View key={folder.name} style={styles.folder} >
            <TouchableOpacity style={styles.button} onPress={this.onFolderPress.bind(this,folder)}>
              <Text>{folder.name}</Text> 
            </TouchableOpacity>
          </View>
  }
  */

  renderNewPageFolder = () => {
    return <View key={'addNewPage'} style={[pictureWrapperStyle, { backgroundColor: 'white' }]} >
      <TouchableOpacity style={styles.button} onPress={(e) => {
        this.props.navigation.navigate('Camera');
      }}>
        <Icon name="add" size={80} color='#424242' />
      </TouchableOpacity>
    </View>
  }

  onFolderPress = (folder) => {
    //console.warn(folder.name + " was pressed");
    //this.setState({currentFolder:folder.name});
    this.props.navigation.push('Home', { folder: folder.name });
  }

  //onArrowBackPress = () => {
  //  this.setState({currentFolder: ""});
  //}

  onPhotoPressed = (filePath) => {
    //console.warn(filePath + " was pressed");
    this.props.navigation.navigate('EditPhoto', { uri: filePath })
  }

  Delete = () => {
    if (this.state.selected) {
      //todo add verification questions
      this.state.selected.forEach((toDelete) => {
        RNFS.unlink(toDelete).then(() => {
          RNFS.unlink(toDelete + ".json").catch((e) => {/*do nothing*/ });
        });
      })
      this.refresh();
    }
  }

  render() {
    //fire and forget - refresh
    //this.refresh();

    const currentFolder = this.props.navigation.getParam('folder', '');
    const { navigate } = this.props.navigation;
    let galery = <View />;
    if (this.state.folders) {
      if (currentFolder.length == 0) {
        galery = this.state.folders.filter(f => f.name != 'Default').map(this.renderFolder);
        if (!galery) {
          gelery = [];
        }
        galery.unshift(this.renderNewPageFolder())

        //add pages w/o folder
        this.state.folders.filter(f => f.name == 'Default').map(defFolder => {
          defFolder.files.map(f => {
            galery.push(this.renderPhoto(f))
          })
        });

      } else {
        let selectedFolder = this.state.folders.find(f => f.name === currentFolder);
        if (selectedFolder) {
          galery = selectedFolder.files.map(this.renderPhoto);
        }
      }
    }
    return (
      <LinearGradient style={styles.container} colors={['#F1EEE6', '#BEB39F']}>
        <ScrollView contentComponentStyle={{ flex: 1 }}>
          <View style={styles.pictures}>
            {galery}
          </View>
        </ScrollView>
        {this.getButton(this.Delete, '#8ed1fc', "מחק")}
      </LinearGradient>
    );
  }

  getShelf = () => {
    return <View
      style={{
        width: 200,
        height: 0,
        borderBottomWidth: 30,
        borderBottomColor: '#9D7B32',
        borderLeftWidth: 50,
        borderLeftColor: 'transparent',
        borderRightWidth: 50,
        borderRightColor: 'transparent',
        borderStyle: 'solid'
      }} />
  }

  getButton = (func, bgColor, txt) => {
    return <TouchableOpacity
      onPress={func}
      activeOpacity={1}
    >
      <View style={[styles.CircleShapeView,
      { backgroundColor: bgColor }]}>
        <Text>{txt}</Text>
      </View>
    </TouchableOpacity>
  }

}

export const globalStyle = StyleSheet.create({
  buttonOk: {
    backgroundColor: 'green',
    borderWidth: 1,
    borderColor: 'black',
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: "25%",
    paddingLeft: "25%",
    marginTop: 10,
    width: 60
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: 'white',
  },
  CircleShapeView: {
    marginVertical: 2,
    width: 35,
    height: 35,
    borderRadius: 35 / 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4630EB',
  },
  folder: {
    alignContent: "center",
    width: 100,
    height: 100,
    backgroundColor: 'powderblue',
    borderColor: 'black'
  },
  pictures: {
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  button: {
    padding: 20,
  },
  whiteText: {
    color: 'white',
  }
});