import React from 'react';
import {
    Image, StyleSheet, View,
    TouchableOpacity, Button, ScrollView, Alert, Text, Dimensions, Linking, Settings
} from 'react-native';
import { Icon } from 'react-native-elements'
import Menu from './settings'

import * as RNFS from 'react-native-fs';
import FolderNew from './FolderNew';
import FileNew from './FileNew'
import { pushFolderOrder, renameFolder } from './sort'
import {registerLangEvent, unregisterLangEvent, translate, fTranslate } from "./lang.js"

import {
    getFolderAndIcon,
    DEFAULT_FOLDER_NAME,
    semanticColors,
    Spacer, globalStyles, removeFileExt,
    getIconButton, getRoundedButton, dimensions,
    validPathPart
} from './elements'
import { SRC_CAMERA, SRC_GALLERY, SRC_RENAME, getNewPage, SRC_FILE } from './newPage';
import ImagePicker from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { sortFolders, swapFolders, saveFolderOrder } from './sort'
import { SafeAreaView } from 'react-navigation';
import { FlatList } from 'react-native-gesture-handler';
import SplashScreen from 'react-native-splash-screen';

export const FOLDERS_DIR = RNFS.DocumentDirectoryPath + '/folders/';

export default class FolderGallery extends React.Component {
    static navigationOptions = ({ navigation }) => {
        let title = fTranslate("DefaultAppTitle", "IssieDocs");
        let menuIcon = 'menu';

        let isMenuOpened = navigation.getParam('isMenuOpened')
        if (isMenuOpened) {
            menuIcon = 'close';
        }

        return {
            title,
            headerStyle: globalStyles.headerStyle,
            headerTintColor: 'white',
            headerTitleStyle: globalStyles.headerTitleStyle,
            headerRight: (
                <View style={{ flexDirection: 'row-reverse' }}>
                    <Spacer />
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                            let menuHandler = navigation.getParam('menuHandler')
                            if (menuHandler) {
                                menuHandler();
                            }
                        }
                        }
                    >
                        <Icon name={menuIcon} color='white' size={35} />
                    </TouchableOpacity>
                </View>)
        };
    }
    constructor(props) {
        super(props);
        this.state = {
            windowSize: { width: 500, height: 1024 }
        }

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
        try {
            Linking.getInitialURL().then((url) => {
                if (url) {
                    this._handleOpenURL({ url });
                }
            })

            registerLangEvent()

            //verify exists:
            RNFS.mkdir(FOLDERS_DIR).catch(() => { });

            this.props.navigation.addListener("didFocus", async () => {
                this.refresh();
            })

            this.props.navigation.setParams({ menuHandler: () => this._menuHandler() });

            Linking.addEventListener("url", this._handleOpenURL);



            await this.refresh();
        } finally {
            setTimeout(() => SplashScreen.hide(), 1000);
        }
    };

    componentWillUnmount = () => {
        unregisterLangEvent()

        Linking.removeAllListeners();
        this.props.navigation.removeAllListeners();
    }

    _menuHandler = () => {
        this.setState({ showMenu: !this.state.showMenu })
        this.props.navigation.setParams({ isMenuOpened: !this.state.showMenu });
    }

    _handleOpenURL = (event) => {
        this.props.navigation.navigate('SavePhoto', {
            uri: decodeURI(event.url),
            imageSource: SRC_FILE,
            folder: this.state.currentFolder ? this.state.currentFolder.name : undefined,
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder) => this.saveNewFolder(newFolder, false)
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
                    returnFolderCallback: (f) => this.setReturnFolder(f),
                    saveNewFolder: (newFolder) => this.saveNewFolder(newFolder, false)

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
                    returnFolderCallback: (f) => this.setReturnFolder(f),
                    saveNewFolder: (newFolder) => this.saveNewFolder(newFolder, false)

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
                returnFolderCallback: (f) => this.setReturnFolder(f),
                saveNewFolder: (newFolder) => this.saveNewFolder(newFolder, false)

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
                title = translate("DeleteFoldersAndPagesTitle");
                msg = translate("BeforeDeleteFoldersAndPagesQuestion");
            } else if (isFolders) {
                title = translate("DeleteFolderTitle");
                msg = translate("BeforeDeleteFolderQuestion");
            } else {
                title = translate("DeletePageTitle");
                msg = translate("BeforeDeletePageQuestion");
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
        if (this.state.selected.length != 1) return;

        if (this.state.selected[0].type == 'file') {
            this.props.navigation.navigate('SavePhoto', {
                uri: this.state.selected[0].item.path,
                imageSource: SRC_RENAME,
                folder: this.state.currentFolder ? this.state.currentFolder.name : '',
                name: removeFileExt(this.state.selected[0].item.name),
                returnFolderCallback: (f) => this.setReturnFolder(f),
                saveNewFolder: (newFolder) => this.saveNewFolder(newFolder, false)

            });
        } else {
            //rename folder

            this.props.navigation.navigate('CreateFolder',
                {
                    saveNewFolder: (newFolder, currFolder) => this.saveNewFolder(newFolder, false, currFolder),
                    isLandscape: this.isLandscape(),
                    currentFolderName: this.state.selected[0].item.name
                });
        }
    
        this.setState({ editMode: false, selected: undefined })
    }

setReturnFolder = (folderName) => {
    this.setState({ returnFolderName: folderName });
}


saveNewFolder = async (newFolderName, setReturnFolder, originalFolderName) => {
    
    if (!newFolderName || newFolderName.length == 0) {
        Alert.alert(translate("MissingFolderName"));
        return false;
    }
    let fAndi = getFolderAndIcon(newFolderName);
    if (fAndi.name == 0 && fAndi.icon !== "") {
        let proceed = await new Promise((resolve)=>
            Alert.alert(translate("Warning"), translate("SaveFolderWithEmptyNameQuestion"),
            [
            {
                text: translate("BtnContinue"), onPress: () => {
                    resolve(true);
                },
                style: 'default'
            },
            {
                text: translate("BtnCancel"), onPress: () => {
                    resolve(false);
                },
                style: 'cancel'
            }
            ]
        ));
        if (!proceed)
            return;
    }

    if (!validPathPart(newFolderName)) {
        Alert.alert(translate("IllegalCharacterInFolderName"));
        return false;
    }
    let targetFolder = FOLDERS_DIR + newFolderName;
    try {
        await RNFS.stat(targetFolder);
        //folder exists:
        Alert.alert(translate("FolderAlreadyExists"));
        return false;
    } catch (e) {
        await RNFS.mkdir(targetFolder);
        if (!originalFolderName) {
            await pushFolderOrder(newFolderName)
        } else {
            //rename existing
            //move all files and delete old folder
            await RNFS.readDir(FOLDERS_DIR + originalFolderName).then(async (files) => {
                for (let f of files) {
                    await RNFS.moveFile(f.path, FOLDERS_DIR + newFolderName + "/" + f.name);
                }
            });
            await RNFS.unlink(FOLDERS_DIR + originalFolderName);
            await renameFolder(originalFolderName, newFolderName);
        }
    }
    if (setReturnFolder) {
        this.setState({ returnFolderName: newFolderName }, () => this.refresh());
    } else {
        //add the folder to the list:
        this.refresh();
    }
    return true;
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

gotoAbout = () => {
    this.closeMenu();
    this.props.navigation.navigate('About')
}
isLandscape = () => this.state.windowSize.width > this.state.windowSize.height

closeMenu = () => {
    this.setState({ showMenu: false });
    this.props.navigation.setParams({ isMenuOpened: false });
}
render() {
    let curFolderFullName = this.state.currentFolder ? this.state.currentFolder.name : "";
    let curFolder = getFolderAndIcon(curFolderFullName);
    let fIndex = 0;
    if (this.state.folders && this.state.folders.length) {
        fIndex = this.state.folders.findIndex(f => f.name == curFolderFullName);
    }
    //        let folderColor = folderColors[fIndex % folderColors.length];
    let viewStyle = Settings.get('viewStyle');
    let asTiles = viewStyle === 2;
    let treeWidth = .36 * this.state.windowSize.width;
    let pagesContainerWidth = this.state.windowSize.width - treeWidth;
    let tileWidth = 143;
    let numColumnsForTiles = Math.floor(pagesContainerWidth / tileWidth);

    return (
        <View style={styles.container}
            onLayout={this.onLayout}>

            {this.state.showMenu ?
                <Menu 
                    onAbout={() => this.gotoAbout()} 
                    onClose={() => this.closeMenu()} 
                    onViewChange={(style)=>this.setState({viewStyle:style})} 
                /> : null}
            {/* header */}
            <View style={{
                position: 'absolute', width: "100%", height: dimensions.toolbarHeight, top: 0, left: 0, backgroundColor: 'white',
                shadowColor: "gray",
                shadowOpacity: 0.8,
                shadowOffset: { width: 0, height: 1 },
                elevation: 1,
                zIndex: 5,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: semanticColors.subTitle

            }} >
                {/*Left buttons*/}
                <Spacer />
                {
                    getIconButton(() => {
                        this.newFromCamera();
                    }, semanticColors.addButton, "add-a-photo", 45)
                }
                <Spacer />
                {
                    getIconButton(() => {
                        this.newFromMediaLib();
                    }, semanticColors.addButton, "photo-library", 45)
                }
                <Spacer />
                {
                    getIconButton(() => {
                        this.newFromFileExplorer();
                    }, semanticColors.addButton, "picture-as-pdf", 45)
                }
                <Spacer />
                {
                    getIconButton(() => {
                        this.props.navigation.navigate('CreateFolder',
                            {
                                saveNewFolder: (newFolder) => this.saveNewFolder(newFolder, true),
                                isLandscape: this.isLandscape()
                            });
                    }, semanticColors.addButton, "create-new-folder", 45)
                }

                {/*right buttons */}
                <View style={{ position: 'absolute', right: 0, flexDirection: 'row-reverse', alignItems: 'center' }}>
                    {
                        getIconButton(() => {
                            let selected = this.state.editMode ? undefined : this.state.selected;

                            this.setState({ editMode: !this.state.editMode, selected });
                        }, semanticColors.addButton, this.state.editMode ? "clear" : "edit", 35)
                    }
                    {<Spacer width={10} />}

                    {  //delete
                        this.state.selected && this.state.selected.length > 0 ?
                            getRoundedButton(this.Delete, 'delete-forever', 'מחק', 30, 30, { width: 120, height: 40 }) :
                            null
                    }
                    {<Spacer width={10} />}
                    {  //move
                        this.state.selected && this.state.selected.length == 1 ?
                            getRoundedButton(this.Rename, 'text-fields', 'שנה שם', 30, 30, { width: 135, height: 40 }) :
                            null
                    }
                    {<Spacer width={10} />}
                    {  //Share
                        this.state.selected && this.state.selected.length == 1 && this.state.selected[0].type === 'file' ?
                            getRoundedButton(this.Share, 'share', 'שתף', 30, 30, { width: 120, height: 40 }) :
                            null
                    }
                </View>
            </View>

            <View style={{
                flex: 1, flexDirection: "row", backgroundColor: semanticColors.mainAreaBG, position: 'absolute', width: "100%", top: dimensions.toolbarHeight, left: 0, height: "94%", zIndex: 4,
            }} >
                {/* MainExplorer*/}
                <View style={{
                    flex: 1, flexDirection: "column", position: 'absolute', top: 0, width: pagesContainerWidth, left: 0, height: "100%",
                }}>
                    {/* pagesTitle */}
                    <View style={{
                        flex: 1, flexDirection: "row-reverse", height: "5%", position: 'absolute',
                        width: "100%", top: 0, height: '10%', alignItems: 'center', justifyContent: 'flex-start',
                        paddingRight: '5%', borderBottomWidth: 1, borderBottomColor: 'gray'
                    }}>
                        <FolderNew index={fIndex} id="1" name={curFolderFullName} asTitle={true} isLandscape={this.isLandscape()}
                        />
                    </View>
                    {/* pages */}
                    <View style={{
                        flex: 1, backgroundColor: semanticColors.mainAreaBG, position: 'absolute', top: "10%", width: "100%", height: '90%'
                    }}>
                        {this.state.currentFolder && this.state.currentFolder.files ?
                            <FlatList
                                contentContainerStyle={{ width: '100%', alignItems: 'flex-end' }}

                                key={asTiles ? numColumnsForTiles.toString() : "list"}
                                data={this.state.currentFolder.files}
                                renderItem={({ item }) => FileNew({
                                    page: item,
                                    asTile: asTiles,
                                    name: removeFileExt(item.name),
                                    rowWidth: pagesContainerWidth,
                                    editMode: this.state.editMode,
                                    selected: this.state.editMode ? this.isSelected(item) : false,
                                    onPress: () => this.props.navigation.navigate('EditPhoto', { page: item, share: false }),
                                    onSelect: () => this.toggleSelection(item, 'file'),
                                    count: item.pages.length
                                })}
                                numColumns={asTiles ? numColumnsForTiles : 1}
                                keyExtractor={(item, index) => index.toString()}
                            />


                            : <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 35 }}> {translate("NoPagesYet")}</Text>
                            </View>}
                    </View>
                </View>
                {/* tree */}
                <View
                    style={{
                        flex: 1,
                        flexDirection: "column",
                        position: 'absolute',
                        top: 0, width: treeWidth, right: 0, height: "100%",
                        alignItems: "flex-end", justifyContent: "flex-start",
                        backgroundColor: 'white'
                    }}>

                    {this.state.folders && this.state.folders.length ?
                        this.state.folders.map((f, i, arr) => FolderNew({
                            index: i,
                            isLast: i + 1 == arr.length,
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
                            onMoveDown: () => this.moveFolderDown(f),
                            isLandscape: this.isLandscape()
                        })) : <Text style={{ fontSize: 25 }}>{translate("NoFoldersYet")}</Text>}
                </View>

            </View>
        </View>
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
        //borderWidth: 3,
        //borderColor: "#D1CFCF"
    }
});


