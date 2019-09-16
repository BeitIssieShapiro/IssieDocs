import React from 'react';
import {
    Image, StyleSheet, View,
    TouchableOpacity, Button, ScrollView, Alert, Text, Dimensions, Linking
} from 'react-native';
import * as RNFS from 'react-native-fs';
import LinearGradient from 'react-native-linear-gradient';
import FolderNew from './FolderNew';
import FileNew from './FileNew'
import {
    getFolderAndIcon, normalizeTitle,
    DEFAULT_FOLDER_NAME,
    semanticColors, getSquareButton,
    Spacer, globalStyles, removeFileExt
} from './elements'
import { SRC_CAMERA, SRC_GALLERY, SRC_RENAME, getNewPage, SRC_FILE } from './newPage';
import ImagePicker from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { sortFolders, swapFolders, saveFolderOrder } from './sort'

export const FOLDERS_DIR = RNFS.DocumentDirectoryPath + '/folders/';
const DELETE_PAGE_TITLE = 'מחיקת דף';
const BEFORE_DELETE_PAGE_QUESTION = 'האם למחוק את הדף?';
const DELETE_FOLDER_TITLE = 'מחיקת תיקייה';
const DELETE_FOLDER_AN_PAGE_TITLE = 'מחיקת תיקיות ודפים';

const BEFORE_DELETE_FOLDER_QUESTION = 'מחיקת תיקייה תגרום למחיקת כל הדפים בתוכה, האם למחוק?';
const BEFORE_DELETE_FOLDER_AND_PAGES_QUESTION = 'בחרת למחוק דפים ותיקיות. מחיקת התיקיות תמחק אם כל הדפים בתוכן. האם להמשיך?';

export default class FolderGallery extends React.Component {
    static navigationOptions = ({ navigation }) => {
        let title = 'IssieDocs - שולחן העבודה שלי';

        return {
            title,
            headerStyle: {
                backgroundColor: semanticColors.header,
            },

            headerTintColor: 'white',
            headerTitleStyle: {
                fontSize: 30,
                fontWeight: 'bold'
            },
        };
    }
    constructor(props) {
        super(props);
        this.state = {}

        // this._panResponder = PanResponder.create({
        //     onStartShouldSetPanResponder: (evt, gestureState) => true,
        //     onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        //     onMoveShouldSetPanResponder: (evt, gestureState) => true,
        //     onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        //     onPanResponderMove: (evt, gestureState) => {
        //         this.setState({
        //             dragToSortX: gestureState.moveX, dragToSortY: gestureState.moveX
        //         });
        //     }
        //     ,
        //     onPanResponderRelease: (evt, gestureState) => {
        //         Alert.alert("item dropped");
        //     }
        // });
    }

    componentDidMount = async () => {

        Linking.getInitialURL().then((url) => {
            if (url) {
                this._handleOpenURL({url});
            }
        })

        //verify exists:
        RNFS.mkdir(FOLDERS_DIR).catch(() => { });

        this.props.navigation.addListener("didFocus", async () => {
            this.refresh();
        })

        Linking.addEventListener("url", this._handleOpenURL);
        await this.refresh();
    };

    componentWillUnmount = () => {
        Linking.removeAllListeners();
        this.props.navigation.removeAllListeners();
    }

    _handleOpenURL = (event)  => {
        this.props.navigation.navigate('SavePhoto', {
            uri: event.url,
            imageSource: SRC_FILE,
            folder: this.state.currentFolder ? this.state.currentFolder.name : undefined,
            returnFolderCallback: (f) => this.setReturnFolder(f)
        })
    }
 
    refresh = async () => {
        RNFS.readDir(FOLDERS_DIR).then(async (folders) => {
            let foldersState = [];

            for (let folder of folders) {
                if (!folder.isDirectory()) continue;
                const items = await RNFS.readDir(folder.path);
                const filesItems = items.filter(f => !f.name.endsWith(".json"));
                let files = [];
                for (let fi of filesItems) {
                    let lastUpdate = Number(fi.mtime);
                    //finds the .json file if exists
                    let dotJsonFile = items.find(f => f.name === fi.name + ".json");
                    if (dotJsonFile) {
                        lastUpdate = Number(dotJsonFile.mtime);
                    }

                    let pages = []
                    if (fi.isDirectory()) {
                        //read all pages
                        const innerPages = await RNFS.readDir(fi.path);

                        pages = innerPages.filter(f => !f.name.endsWith(".json")).map(p => p.path);
                        pages = pages.sort();
                    }
                    files.push({ name: fi.name, lastUpdate, path: fi.path, isFolder: fi.isDirectory(), pages: pages });
                }

                foldersState.push({ name: folder.name, lastUpdate: Number(folder.mtime), path: folder.path, files: files });
            }

            //update current folder:
            let currentFolder;
            if (this.state.returnFolderName) {
                currentFolder = foldersState.find(f => f.name == this.state.returnFolderName);
            }
            if (!currentFolder && this.state.currentFolder) {
                //try to restore to the same:
                currentFolder = foldersState.find(f => f.name == this.state.currentFolder.name);
            }
            if (!currentFolder) {
                //Alert.alert(JSON.stringify(foldersState))
                currentFolder = foldersState.find(f => f.name == DEFAULT_FOLDER_NAME);
            }


            this.setState({ folders: await sortFolders(foldersState), currentFolder, returnFolderName: undefined });

        })

    }

    newFromCamera = () => {
        getNewPage(SRC_CAMERA,
            (uri) => {
                this.props.navigation.navigate('SavePhoto', {
                    uri: uri,
                    imageSource: SRC_CAMERA,
                    folder: this.state.currentFolder ? this.state.currentFolder.name : undefined,
                    returnFolderCallback: (f) => this.setReturnFolder(f)

                })
            },
            //cancel
            () => { }
        );
    }

    newFromMediaLib = () => {
        this.setState({ isNewPageMode: false });
        ImagePicker.launchImageLibrary({
            title: 'בחירת תמונה',
            mediaType: 'photo',
            noData: true
        }, (response) => {
            if (!response.didCancel) {
                this.props.navigation.navigate('SavePhoto', {
                    uri: response.uri,
                    folder: this.state.currentFolder ? this.state.currentFolder.name : undefined,
                    imageSource: SRC_GALLERY,
                    returnFolderCallback: (f) => this.setReturnFolder(f)
                });
            }
        });
    }

    newFromFileExplorer = () => {
        this.setState({ isNewPageMode: false });

        DocumentPicker.pick({
            type: [DocumentPicker.types.images, DocumentPicker.types.pdf]
        }).then(res => {
            this.props.navigation.navigate('SavePhoto', {
                uri: res.uri,
                folder: this.state.currentFolder ? this.state.currentFolder.name : undefined,
                returnFolderCallback: (f) => this.setReturnFolder(f)
            });
        }).catch(err => {
            if (!DocumentPicker.isCancel(err)) {
                Alert.alert(err);
            }
        });
    }
    onLayout = () => {
        let windowSize = Dimensions.get("window");
        this.setState({ windowSize });
    }

    onFolderPressed = (folder) => {
        this.setState({ currentFolder: folder })
    }

    isSelected = (page) => {
        if (this.state.selected && page) {
            //alert(JSON.stringify(this.state.selected))
            //alert(JSON.stringify(page))
            return (this.state.selected.find(sel => sel.item.path == page.path) != undefined)
        }
        return false
    }
    toggleSelection = (item, type) => {
        let selected = this.state.selected;
        if (!this.isSelected(item)) {
            if (!selected) {
                selected = [];
            }
            selected.push({ item: item, type });
        } else {
            selected = selected.filter(sel => (sel.item && sel.item.path !== item.path));
        }
        this.setState({ selected });
    };

    Share = () => {
        if (this.state.selected.length != 1) return;
        this.props.navigation.navigate('EditPhoto',
            {
                page: this.state.selected[0].item,
                share: true
            })
    }

    Delete = () => {

        let isFolders = false;
        let isPages = false;

        if (this.state.selected.length) {
            for (let i = 0; i < this.state.selected.length; i++) {
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

    Rename = () => {
        if (this.state.selected.length != 1 &&
            this.state.selected[0].type != 'file') return;

        this.props.navigation.navigate('SavePhoto', {
            uri: this.state.selected[0].item.path,
            imageSource: SRC_RENAME,
            folder: this.state.currentFolder ? this.state.currentFolder.name : '',
            name: removeFileExt(this.state.selected[0].item.name),
            returnFolderCallback: (f) => this.setReturnFolder(f)
        });

        this.setState({ editMode: false, selected: undefined })
    }

    setReturnFolder = (folderName) => {
        this.setState({ returnFolderName: folderName });
    }

    moveFolderUp = (folder) => {
        let index = this.state.folders.findIndex(f => f.name === folder.name);
        if (index >= 1) {
            let newFolders = swapFolders(this.state.folders, index, index - 1)
            this.setState({ folders: newFolders })
            saveFolderOrder(newFolders);
        }
    }

    moveFolderDown = (folder) => {
        let index = this.state.folders.findIndex(f => f.name === folder.name);
        if (index >= 0 && index < this.state.folders.length - 1) {
            let newFolders = swapFolders(this.state.folders, index, index + 1)
            this.setState({ folders: newFolders })
            saveFolderOrder(newFolders);
        }
    }

    render() {

        return (
            <LinearGradient style={styles.container} colors={['#F1EEE6', '#BEB39F']}
                onLayout={this.onLayout}>
                {/* header */}
                <View style={{
                    flex: 1, width: "100%", top: 0, left: 0, height: "10%", backgroundColor: semanticColors.header,
                    flexDirection: "row"
                }} >
                    {/*Left buttons*/}
                    <Spacer />
                    {
                        getSquareButton(() => {
                            this.newFromCamera();
                        }, semanticColors.addButtonG, undefined, "", "camera-alt", 45, false, globalStyles.btnDimension, 45)
                    }
                    <Spacer />
                    {
                        getSquareButton(() => {
                            this.newFromMediaLib();
                        }, semanticColors.addButtonG, undefined, "", "photo-library", 45, false, globalStyles.btnDimension, 45)
                    }
                    <Spacer />
                    {
                        getSquareButton(() => {
                            this.newFromFileExplorer();
                        }, semanticColors.addButtonG, undefined, "", "picture-as-pdf", 45, false, globalStyles.btnDimension, 45)
                    }
                    {/*right buttons */}
                    <View style={{ position: 'absolute', right: 0, flexDirection: 'row-reverse' }}>
                        {
                            getSquareButton(() => {
                                let selected = this.state.editMode ? undefined : this.state.selected;

                                this.setState({ editMode: !this.state.editMode, selected });
                            }, semanticColors.addButtonG, undefined, "", this.state.editMode ? "clear" : "edit", 45, false, globalStyles.btnDimension, 45)
                        }
                        {  //delete
                            this.state.selected && this.state.selected.length > 0 && !this.state.rename ?
                                getSquareButton(this.Delete, semanticColors.deleteButtonG, undefined, 'מחק', 'delete-forever', 30, false, { width: 150, height: 50 }, 45, true) :
                                <View />
                        }
                        {  //move
                            this.state.selected && this.state.selected.length == 1 && this.state.selected[0].type !== 'folder' && !this.state.rename ?
                                getSquareButton(this.Rename, semanticColors.actionButtonG, undefined, 'שנה שם', 'text-fields', 30, false, { width: 150, height: 50 }, 45, true) :
                                <View />
                        }
                        {  //Share
                            this.state.selected && this.state.selected.length == 1 && this.state.selected[0].type === 'file' && !this.state.rename ?
                                getSquareButton(this.Share, semanticColors.actionButtonG, undefined, 'שתף', 'share', 30, false, { width: 150, height: 50 }, 45, true) :
                                <View />
                        }
                    </View>
                </View>
                <View style={{ flex: 1, flexDirection: "row", position: 'absolute', width: "100%", top: "10%", left: 0, height: "90%" }} >
                    {/* MainExplored */}
                    <View style={[{ flex: 1, flexDirection: "column", position: 'absolute', top: 0, width: "66%", left: 0, height: "100%" }
                        , styles.borderW]}>
                        {/* pagesTitle */}
                        <View style={{ flex: 1, height: "5%", backgroundColor: semanticColors.title, position: 'absolute', width: "100%", top: 0, height: '10%', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 35 }}>{normalizeTitle(getFolderAndIcon(this.state.currentFolder && this.state.currentFolder.name).name)}</Text>
                        </View>
                        {/* pages */}
                        <View style={[{
                            flex: 1, backgroundColor: "white", position: 'absolute', top: "10%", width: "100%", height: '90%',
                        }, styles.borderW]}>
                            {
                                this.state.currentFolder && this.state.currentFolder.files ? this.state.currentFolder.files.map(p => FileNew({
                                    page: p,
                                    name: removeFileExt(p.name),
                                    editMode: this.state.editMode,
                                    selected: this.state.editMode ? this.isSelected(p) : false,
                                    onPress: () => this.props.navigation.navigate('EditPhoto', { page: p, share: false }),
                                    onSelect: () => this.toggleSelection(p, 'file'),
                                    //this.state selected.push({ item: item, obj: obj, type: type });
                                    count: p.pages.length
                                })) : null
                            }
                        </View>
                    </View>
                    {/* tree */}
                    <LinearGradient colors={semanticColors.headerG}
                        style={[{ flex: 1, flexDirection: "column", position: 'absolute', top: 0, width: "34%", right: 0, height: "100%", alignItems: "flex-end", justifyContent: "flex-start" },
                        styles.borderW]}>

                        {this.state.folders && this.state.folders.length ?
                            this.state.folders.map(f => FolderNew({
                                id: f.name,
                                name: f.name,
                                editMode: this.state.editMode,
                                fixedFolder: f.name === DEFAULT_FOLDER_NAME,
                                //dragPanResponder: this._panResponder.panHandlers, 
                                selected: this.state.editMode ? this.isSelected(f) : false,
                                current: (this.state.currentFolder && f.name == this.state.currentFolder.name),
                                onPress: () => this.onFolderPressed(f),
                                onSelect: () => this.toggleSelection(f, 'folder'),
                                onMoveUp: () => this.moveFolderUp(f),
                                onMoveDown: () => this.moveFolderDown(f)
                            })) : <Text style={{ fontSize: 25 }}>עדיין ללא תיקיות</Text>}
                    </LinearGradient>
                </View>
            </LinearGradient>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "column",
        backgroundColor: 'white',
    },
    borderW: {
        borderWidth: 3,
        borderColor: "#D1CFCF"
    }
});


