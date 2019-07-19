import React from 'react';
import {
  Image, StyleSheet, View,
  TouchableOpacity, Button, ScrollView, Alert, Text, Dimensions
} from 'react-native';
import * as RNFS from 'react-native-fs';
import LinearGradient from 'react-native-linear-gradient';
import ImagePicker from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import Dash from 'react-native-dash';
import { getSquareButton, colors } from './elements'

import { Icon } from 'react-native-elements'
import Photo from './Photo';
import Folder from './Folder'
import { SRC_CAMERA, getNewPage } from './newPage';

const DELETE_PAGE_TITLE = 'מחיקת דף';
const BEFORE_DELETE_PAGE_QUESTION = 'האם למחוק את הדף?';
const DELETE_FOLDER_TITLE = 'מחיקת תיקייה';
const DELETE_FOLDER_AN_PAGE_TITLE = 'מחיקת תיקיות ודפים';

const BEFORE_DELETE_FOLDER_QUESTION = 'מחיקת תיקייה תגרום למחיקת כל הדפים בתוכה, האם למחוק?';
const BEFORE_DELETE_FOLDER_AND_PAGES_QUESTION = 'בחרת למחוק דפים ותיקיות. מחיקת התיקיות תמחק אם כל הדפים בתוכן. האם להמשיך?';

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
  static navigationOptions = ({ navigation }) => {
    let folder = navigation.getParam('folder', 'דפי עבודה');
    folder = folder.split('$')[0]

    let allFolders = navigation.getParam('allFolders', false);
    return {
      title: allFolders ? 'כל התיקיות' : folder,
      headerStyle: {
        backgroundColor: '#8EAFCE',
      },
     
      headerTintColor: 'white',
      headerTitleStyle: {
        fontSize: 30,
        fontWeight: 'bold'
      },
    };
  }

  state = {
    folders: [],
    selected: [],
    isFocused: false,
    shelf: require('./shelf_transparent.png'),
    isNewPageMode: false,
    windowSize: Dimensions.get("window")
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
        const items = await RNFS.readDir(folder.path);
        const filesItems = items.filter(f => !f.name.endsWith(".json"));
        let files = [];
        for (let fi of filesItems) {
          let pages = []
          if (fi.isDirectory()) {
            //read all pages
            const innerPages = await RNFS.readDir(fi.path);
            pages = innerPages.filter(f => !f.name.endsWith(".json")).map(p => p.path);
            pages = pages.sort();
          }
          files.push({ name: fi.name, path: fi.path, isFolder: fi.isDirectory(), pages: pages });
        }

        //Alert.alert(folder.name + " : "+JSON.stringify(files))
        foldersState.push({ name: folder.name, path: folder.path,files: files });
      }
      this.setState({ folders: foldersState });

    })

  }

  onLayout = () => {
    let windowSize = Dimensions.get("window");
    this.setState({ windowSize });
  }

  toggleSelection = (item, isSelected, obj, type) => {
    let selected = this.state.selected;
    if (isSelected) {
      selected.push({ item: item, obj: obj, type: type });
    } else {
      selected = selected.filter(sel => (sel.item && sel.item.path  !== item.path)); 
    }
    this.setState({ selected });
  };

  clearSelected = () => {
    this.state.selected.map(sel => sel.obj.setState({ selected: false }));
    this.setState({ selected: [] });
  }

  renderPhoto = (page) => {
    return <Photo
      key={page.path}
      page={page}
      onSelectionToggle={this.toggleSelection}
      onPress={this.onPhotoPressed.bind(this, page)}
    />;
  }

  renderFolder = folder => {
    return <Folder
      key={folder.name}
      name={folder.name}
      files={folder.files}
      path={folder.path}
      onSelectionToggle={this.toggleSelection}
      onPress={this.onFolderPress.bind(this, folder)}
    />;
  }


  renderNewPageFolder = () => {
    return <View key={'addNewPage'} style={[pictureWrapperStyle, { backgroundColor: 'white' }]} >
      <TouchableOpacity style={styles.button} onPress={(e) => {
        this.setState({ isNewPageMode: true });

      }
      }
      >
        <Icon name="add" size={80} color='#424242' />
      </TouchableOpacity>
    </View>
  }

  onFolderPress = (folder) => {
    //console.warn(folder.name + " was pressed");
    this.props.navigation.push('Home', { folder: folder.name });
    this.clearSelected();
  }

  onPhotoPressed = (page) => {
    //console.warn(filePath + " was pressed");
    this.props.navigation.navigate('EditPhoto', { page: page, share: false })
    this.clearSelected();
  }

  onAllFolders = () => {
    this.props.navigation.push('Home', { allFolders: true });
    this.clearSelected();
  }

  onAllPages = () => {
    this.props.navigation.push('Home', { allFiles: 'all' });
    this.clearSelected();
  }

  Delete = () => {

    let isFolders = false;
    let isPages = false;

    if (this.state.selected.length) {
      for (let i=0;i< this.state.selected.length;i++) {
        let isFolder = this.state.selected[i].type == 'folder'
        isPages = isPages || !isFolder;
        isFolders = isFolders || isFolder;
      }
      let title, msg;
      if (isFolders && isPages) {
        title = DELETE_FOLDER_AN_PAGE_TITLE;
        msg = BEFORE_DELETE_FOLDER_AND_PAGES_QUESTION;
      } else if (isFolders) {
        title = DELETE_FOLDER_TITLE;
        msg = BEFORE_DELETE_FOLDER_QUESTION;
      } else {
        title = DELETE_PAGE_TITLE;
        msg = BEFORE_DELETE_PAGE_QUESTION;
      }


      Alert.alert(title, msg,
        [
          {
            text: 'מחק', onPress: () => {
              this.state.selected.forEach((toDelete) => {
                RNFS.unlink(toDelete.item.path).then(() => {
                  RNFS.unlink(toDelete.item.path + ".json").catch((e) => {/*do nothing*/ });
                });
              })
              this.setState({ selected: [] });
              this.refresh();
            },
            style: 'destructive'
          },
          {
            text: 'בטל', onPress: () => {
              //do nothing
            },
            style: 'cancel'
          }
        ]
      );
    }
  }

  MoveTo = () => {
    Alert.alert("אפשרות זו טרם מומשה...");
  }

  showCamera = () => {
    this.setState({ isNewPageMode: false });
    getNewPage(SRC_CAMERA,
      (uri) => this.props.navigation.navigate('SavePhoto', {
        uri: uri, imageSource: SRC_CAMERA,
        folder: this.props.navigation.getParam('folder', '')
      }),
      //cancel
      () => { }
    );
  }

  showMediaLib = () => {
    this.setState({ isNewPageMode: false });
    ImagePicker.launchImageLibrary({
      title: 'בחירת תמונה',
      mediaType: 'photo',
      noData: true
    }, (response) => {
      if (!response.didCancel) {
        this.props.navigation.navigate('SavePhoto', {
          uri: response.uri,
          folder: this.props.navigation.getParam('folder', '')
        });
      }
    });
  }

  ShowFileExplorer = () => {
    this.setState({ isNewPageMode: false });

   DocumentPicker.pick({
        type: [DocumentPicker.types.images, DocumentPicker.types.pdf]
      }).then( res => {
        this.props.navigation.navigate('SavePhoto', {
          uri: res.uri,
          folder: this.props.navigation.getParam('folder', '')
        });
      }).catch(err=> {
        if (!DocumentPicker.isCancel(err)) {
          Alert.alert(err);
        }
      });
  }

  Share = () => {
    if (this.state.selected.length != 1) return;
    this.props.navigation.navigate('EditPhoto',
      {
        page: this.state.selected[0].item,
        share: true
      })
  }

  render() {

    const currentFolder = this.props.navigation.getParam('folder', '');
    const allFiles = this.props.navigation.getParam('allFiles', '');
    const allFolders = this.props.navigation.getParam('allFolders', false);
    let overview = false;

    let galery = [];
    if (this.state.folders) {
      if (allFolders) {
        galery = this.state.folders.filter(f => f.name != 'Default').map(this.renderFolder);
      } else if (allFiles) {
        this.state.folders.filter(f => f.name == 'Default').map(defFolder => {
          defFolder.files.map(f => {
            galery.push(this.renderPhoto(f))
          })
        });
      } else if (currentFolder.length > 0) {
        //specific folder
        let selectedFolder = this.state.folders.find(f => f.name === currentFolder);
        if (selectedFolder) {
          this.addNewPage(galery);
          galery.push(...selectedFolder.files.map(this.renderPhoto));
        }
      } else {
        //default openning screen: 3 most recent folders, 3 most recent files
        this.addNewPage(galery);
        this.addTop5Files(galery);
        this.addTop3Folders(galery);
        overview = true;
      }
    }
    // colors={[ 'rgba(255,255,255,.7)', 'rgba(255,255,255,.7)']}

    let newPageViewOverlay = <View />
    if (this.state.isNewPageMode) {
      newPageViewOverlay = <View
        style={{
          flex: 1,
          flexDirection: 'column',
          position: 'absolute',
          top: 0,
          height: '100%',
          left: 0,
          width: '100%',
          backgroundColor: 'rgba(0,0,0,.7)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
        <View style={{
          position: 'absolute',
          right: '20%',
          top: '20%',
          width: '50%',
          justifyContent: 'center',
          alignItems: 'flex-end'
        }}>
          <TouchableOpacity onPress={this.showCamera}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}

            >
              <Icon name={'camera-alt'} size={150} color={'white'} />
              <Text>    </Text>
              <Text style={{ fontSize: 70, color: 'white' }}>מצלמה</Text>
            </View>
          </TouchableOpacity>
          <Text> </Text>
          <Text> </Text>
          <Dash style={{ width: '100%' }}
            dashThickness={5}
            dashColor={'white'}
            dashGap={10}
            dashLength={25} />
          <Text> </Text>
          <Text> </Text>
          <TouchableOpacity onPress={this.showMediaLib}>

            <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
              <Icon name={'perm-media'} size={150} color={'white'} />
              <Text>    </Text>
              <Text style={{ fontSize: 70, color: 'white' }}>ספריית תמונות</Text>
            </View>
          </TouchableOpacity>
          <Text> </Text>
          <Text> </Text>
          <Dash style={{ width: '100%' }}
            dashThickness={5}
            dashColor={'white'}
            dashGap={10}
            dashLength={25} />

          <TouchableOpacity onPress={this.ShowFileExplorer}>

            <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
              <Icon name={'folder'} size={150} color={'white'} />
              <Text>    </Text>
              <Text style={{ fontSize: 70, color: 'white' }}>קובץ</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    }

    return (
      <LinearGradient style={styles.container} colors={['#F1EEE6', '#BEB39F']}
        onLayout={this.onLayout}>

        <ScrollView contentComponentStyle={{ flex: 1 }}>
          {
            this.arrange(galery, overview)
          }
        </ScrollView>

        <View style={{ flexDirection: 'row' }}>
          {  //delete
            this.state.selected.length > 0 ?
              getSquareButton(this.Delete, colors.red, undefined, 'מחק', undefined, 30, false, { width: 180, height: 50 }) :
              <View />
          }
          {  //move
            this.state.selected.length == 1 && this.state.selected[0].type !== 'folder' ?
              getSquareButton(this.MoveTo, colors.blue, undefined, 'העבר ל...', undefined, 30, false, { width: 180, height: 50 }) :
              <View />
          }
          {  //Share
            this.state.selected.length == 1 ?
              getSquareButton(this.Share, colors.blue, undefined, 'שתף...', undefined, 30, false, { width: 180, height: 50 }) :
              //this.getButton(this.Delete, '#8ed1fc', "מחק") : 
              <View />
          }
        </View>
        {newPageViewOverlay}
      </LinearGradient>
    );
  }

  addNewPage = (galery) => {
    galery.push(this.renderNewPageFolder())
    //galery.push(Folder.empty());
    //galery.push(Folder.empty());
  }

  addTop5Files = (galery) => {
    let files = [];
    this.state.folders.filter(f => f.name == 'Default').map(defFolder => {
      //Alert.alert(JSON.stringify(defFolder))
      defFolder.files.map((page) => {

        files.push(this.renderPhoto(page))
      })
    });

    for (let i = 0; i < 5; i++) {
      if (i < files.length) {
        galery.push(files[i]);
      } else {
        galery.push(Folder.empty());
      }
    }
  }

  addTop3Folders = (galery) => {
    let folders = [];
    this.state.folders.filter(f => f.name != 'Default').map(folder => {
      folders.push(this.renderFolder(folder));
    });
    for (let i = 0; i < 3; i++) {
      if (i < folders.length) {
        galery.push(folders[i]);
      } else {
        galery.push(Folder.empty());
      }
    }
  }

  empty = () => {

  }


  arrange = (array, isOverview) => {
    return array.map((item, index, array) => {
      if (index % 3 == 0) {
        return <View key={index}>
          {this.getRowHeader(index, isOverview)}

          <View style={{
            flex: 1,
            height: this.state.windowSize.height / 3.9
          }}>

            <Image source={this.state.shelf}
              style={[styles.shelf, { top: pictureSize * .42 }]}
              resizeMode={'stretch'} />
            <View style={{
              flex: 1,
              marginHorizontal: pictureSize * .85,
              flexDirection: 'row', justifyContent: 'space-between'
            }}>
              {array[index]}
              {index + 1 < array.length ? array[index + 1] : <View />}
              {index + 2 < array.length ? array[index + 2] : <View />}
            </View>
          </View>

        </View>
      }
      return <View key={index} />
    })
  }

  getRowHeader = (index, isOverview) => {
    if (!isOverview) return <View />;
    if (index == 6) {
      return this.getRowHeaderImpl('תיקיות', 'כל התיקיות', this.onAllFolders);
    }
    if (index == 3) {
      return this.getRowHeaderImpl('', 'כל הדפים', this.onAllPages);
    }
    return <View />;
  }

  getRowHeaderImpl = (text, linkText, eventHandler) => {
    return <View style={{
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: 50
    }}>

      <Text style={{ color: 'blue', fontSize: 23, textDecorationLine: 'underline' }}
        onPress={eventHandler}>
        {linkText}
      </Text>
      <Text style={{ color: '#424242', fontSize: 35 }}>
        {text}
      </Text>
    </View>
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
    return <Button raised={true}
      title={txt}
      style={{ width: 100, color: bgColor }}
      onPress={func} />
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
  shelf: {
    flex: 1,
    position: 'absolute',
    left: '3%',
    width: '94%',
    backgroundColor: 'transparent'
  },
  button: {
    padding: 20,
  },
  whiteText: {
    color: 'white',
  }
});

// function show(obj, level) {

// }

// function showDeep(obj, level) {
//   let msg
//   for (let key in obj) {
//     if (obj[key]
//     msg += obj[key]
//   }
// }

// function IsPrimaryDataType( input ) {
// 	var returnFlag = false;
// 	if( input === null || input === 'undefined' || typeof input !==  'object' ) {
// 		returnFlag = true;
// 	}
// 	return returnFlag;
// }