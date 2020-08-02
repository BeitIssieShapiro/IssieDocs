import React from 'react';
import {
    Image, StyleSheet, View, YellowBox,
    TouchableOpacity, Button, ScrollView, Alert, Text, Dimensions, Linking, Settings,
    TextInput
} from 'react-native';
import Search from './search.js'
import Menu from './settings-ui'

import * as RNFS from 'react-native-fs';
import FolderNew from './FolderNew';
import FileNew from './FileNew'
import { pushFolderOrder, renameFolder } from './sort'
import {
    registerLangEvent, unregisterLangEvent, translate, fTranslate, loadLanguage,
} from "./lang.js"
import { USE_COLOR, getUseColorSetting } from './settings.js'
import { setNavParam } from './utils'
import {
    getFolderAndIcon,
    DEFAULT_FOLDER_NAME,
    semanticColors,
    Spacer, globalStyles, removeFileExt,
    getMaterialCommunityIconButton, dimensions,
    validPathPart,
    AppText,
    getSvgIconButton,
    FOLDERS_DIR,
    getIconButton
} from './elements'
import { SRC_CAMERA, SRC_GALLERY, SRC_RENAME, SRC_DUPLICATE, getNewPage, SRC_FILE } from './newPage';
import ImagePicker from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { sortFolders, swapFolders, saveFolderOrder } from './sort'
import { FlatList } from 'react-native-gesture-handler';
import SplashScreen from 'react-native-splash-screen';
import { getSvgIcon } from './svg-icons';


function checkFilter(filter, name) {
    if (filter === undefined || filter.length == 0)
        return true;
        
    if (name.indexOf(filter) >= 0)
        return true;

    if (name == DEFAULT_FOLDER_NAME) {
        return translate("DefaultFolder").indexOf(filter) >= 0;
    }

    return false;
}


export default class FolderGallery extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            windowSize: { width: 500, height: 1024 },
            folderColor: (getUseColorSetting() === USE_COLOR.yes),
            loading: true
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
            setNavParam(this.props.navigation, 'menuHandler', () => this._menuHandler());

            Linking.addEventListener("url", this._handleOpenURL);

            await this.refresh();

        } finally {
            setTimeout(() => SplashScreen.hide(), 2000);
        }
    };

    componentWillUnmount = () => {
        unregisterLangEvent()

        Linking.removeAllListeners();
        this.props.navigation.removeAllListeners();
    }

    _menuHandler = () => {
        this.setState({ showMenu: !this.state.showMenu })
        setNavParam(this.props.navigation, 'isMenuOpened', !this.state.showMenu);

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

    refresh = async (folderName) => {
        //todo optimize if folderName is given
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
                //currentFolder = foldersState.find(f => f.name == DEFAULT_FOLDER_NAME);
            }


            this.setState({ folders: await sortFolders(foldersState), currentFolder, returnFolderName: undefined, loading: false });

        })

    }

    newFromCamera = () => {
        if (this.state.systemModal) return;

        this.setState({ systemModal: true })
        getNewPage(SRC_CAMERA,
            (uri) => {
                this.setState({ systemModal: false })
                this.props.navigation.navigate('SavePhoto', {
                    uri: uri,
                    imageSource: SRC_CAMERA,
                    folder: this.state.currentFolder ? this.state.currentFolder.name : undefined,
                    returnFolderCallback: (f) => this.setReturnFolder(f),
                    saveNewFolder: (newFolder) => this.saveNewFolder(newFolder, false)

                })
            },
            //cancel
            () => {
                this.setState({ systemModal: false })
            }
        );
    }

    newFromMediaLib = () => {
        this.setState({ isNewPageMode: false });
        ImagePicker.launchImageLibrary({
            title: translate("MediaPickerTitle"),
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
            //return (this.state.selected.find(sel => sel.item.path == page.path) != undefined)
            return (this.state.selected.path === page.path)
        }
        return false
    }
    setSelected = (page) => {
        this.setState({ selected: page });
    }

    toggleSelection = (item, type) => {
        if (this.isSelected(item)) {
            this.setState({ selected: undefined });
        } else {
            this.setSelected(item);
        }
    };

    Share = () => {
        if (!this.state.selected) return;
        this.props.navigation.navigate('EditPhoto',
            {
                page: this.state.selected,
                share: true
            })
    }
    DeleteFolder = () => {
        if (!this.state.currentFolder) return;
        Alert.alert(translate("DeleteFolderTitle"), translate("BeforeDeleteFolderQuestion"),
            [
                {
                    text: translate("BtnDelete"), onPress: () => {
                        RNFS.unlink(this.state.currentFolder.path);
                        this.setState({ currentFolder: undefined });
                        this.refresh();
                    },
                    style: 'destructive'
                },
                {
                    text: translate("BtnCancel"), onPress: () => {
                        //do nothing
                    },
                    style: 'cancel'
                }
            ]
        );
    }

    DeletePage = () => {
        if (!this.state.selected) return;

        Alert.alert(translate("DeletePageTitle"), translate("BeforeDeletePageQuestion"),
            [
                {
                    text: translate("BtnDelete"), onPress: () => {
                        let selectedPath = this.state.selected.path;
                        RNFS.unlink(selectedPath).then(() => {
                            RNFS.unlink(selectedPath + ".json").catch((e) => {/*do nothing*/ });
                        });
                        this.setState({ selected: undefined });
                        this.refresh();
                    },
                    style: 'destructive'
                },
                {
                    text: translate("BtnCancel"), onPress: () => {
                        //do nothing
                    },
                    style: 'cancel'
                }
            ]
        );
    }

    RenamePage = (isRename) => {
        if (!this.state.selected) return;
        this.props.navigation.navigate('SavePhoto', {
            uri: this.state.selected.path,
            imageSource: SRC_RENAME,
            folder: this.state.currentFolder ? this.state.currentFolder.name : '',
            name: removeFileExt(this.state.selected.name),
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder) => this.saveNewFolder(newFolder, false),
            title: isRename ? translate("RenameFormTitle") : translate("MovePageFormTitle")

        });
        this.setState({ selected: undefined })
        this.toggleEditMode(false);

    }
    toggleEditMode(force) {
        let changeTo = force !== undefined ? force : !this.state.editMode;
        this.setState({ editMode: changeTo });
        setNavParam(this.props.navigation, 'editMode', changeTo);
    }



    RenameFolder = () => {
        if (!this.state.currentFolder) return;

        //rename folder
        this.props.navigation.navigate('CreateFolder',
            {
                saveNewFolder: (newFolder, currFolder) => this.saveNewFolder(newFolder, true, currFolder),
                isLandscape: this.isLandscape(),
                currentFolderName: this.state.currentFolder.name,
                title: translate("RenameFormTitle")
            });
        this.toggleEditMode(false);
        this.setState({ selected: undefined })
    }

    DuplicatePage = () => {
        if (!this.state.selected) return;

        this.props.navigation.navigate('SavePhoto', {
            uri: this.state.selected.path,
            imageSource: SRC_DUPLICATE,
            folder: this.state.currentFolder ? this.state.currentFolder.name : undefined,
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder) => this.saveNewFolder(newFolder, false),
            title: translate("DuplicatePageFormTitle")

        })
    }


    setReturnFolder = (folderName) => {
        //Alert.alert("return to " + folderName)
        this.setState({ returnFolderName: folderName }, () => this.refresh(folderName));
    }


    saveNewFolder = async (newFolderName, setReturnFolder, originalFolderName) => {

        if (!newFolderName || newFolderName.length == 0) {
            Alert.alert(translate("MissingFolderName"));
            return false;
        }
        let fAndi = getFolderAndIcon(newFolderName);
        if (fAndi.name.length == 0 && fAndi.icon !== "") {
            let proceed = await new Promise((resolve) =>
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
        setNavParam(this.props.navigation, 'isMenuOpened', false);

    }
    render() {
        YellowBox.ignoreWarnings(['Task orphaned']);
        let curFolderFullName = this.state.currentFolder ? this.state.currentFolder.name : "";
        let fIndex = 0;
        if (this.state.folders && this.state.folders.length) {
            fIndex = this.state.folders.findIndex(f => f.name == curFolderFullName);
        }
        let viewStyle = Settings.get('viewStyle');
        let asTiles = viewStyle === 2;
        let treeWidth = this.state.currentFolder ? (this.isLandscape() ? 220 : 180) : 0;//.36 * this.state.windowSize.width;
        let pagesContainerWidth = this.state.windowSize.width - treeWidth;
        let numColumnsForTiles = Math.floor(pagesContainerWidth / dimensions.tileWidth);
        let foldersCount = this.state.folders ? this.state.folders.length : 1;
        let foldersHeightSize = dimensions.topView + dimensions.toolbarHeight + foldersCount * dimensions.folderHeight;
        let needFoldersScroll = foldersHeightSize > this.state.windowSize.height;

        let pagesCount = this.state.currentFolder ? this.state.currentFolder.files.length : 1;
        let pagesLines = asTiles ? Math.ceil(pagesCount / numColumnsForTiles) : pagesCount;
        let pageHeight = asTiles ? dimensions.tileHeight : dimensions.lineHeight;
        let pagesAreaWindowHeight = 0.9 * (this.state.windowSize.height - dimensions.topView + dimensions.toolbarHeight);
        let pagesHeightSize = pagesLines * pageHeight * 1.2;
        let needPagesScroll = pagesHeightSize > pagesAreaWindowHeight;

        let isEmptyApp = !this.state.folders || this.state.folders.length == 0;

        return (
            <View style={styles.container}
                onLayout={this.onLayout}>

                {this.state.showMenu ?
                    <Menu
                        onAbout={() => this.gotoAbout()}
                        onClose={() => this.closeMenu()}
                        onViewChange={(style) => this.setState({ viewStyle: style })}
                        onLanguageChange={(lang) => {
                            loadLanguage();
                            this.forceUpdate();
                        }}
                        onFolderColorChange={(folderColor) => {
                            this.setState({ folderColor: (folderColor == USE_COLOR.yes) })
                        }}
                        onTextBtnChange={(textBtn) => {/* nothing to do for now */ }}
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
                        getSvgIconButton(() => {
                            this.newFromCamera();
                        }, semanticColors.addButton, "new-camera", 40)
                    }
                    <Spacer />
                    {
                        getSvgIconButton(() => {
                            this.newFromMediaLib();
                        }, semanticColors.addButton, "new-image", 40)
                    }
                    <Spacer />
                    {
                        getSvgIconButton(() => {
                            this.newFromFileExplorer();
                        }, semanticColors.addButton, "new-pdf", 40)
                    }
                    <Spacer />
                    {
                        getSvgIconButton(() => {
                            this.props.navigation.navigate('CreateFolder',
                                {
                                    saveNewFolder: (newFolder) => this.saveNewFolder(newFolder, true),
                                    isLandscape: this.isLandscape()
                                });
                        }, semanticColors.addButton, "new-folder", 45)
                    }

                    {/*right buttons */}
                    <View style={{ position: 'absolute', right: 17, flexDirection: 'row-reverse', alignItems: 'center' }}>
                        {
                            getMaterialCommunityIconButton(() => {
                                let selected = this.state.editMode ? undefined : this.state.selected;
                                this.toggleEditMode()
                            }, semanticColors.addButton, this.state.editMode ? "close-outline" : "pencil-outline", 35)
                        }
                        <Spacer width={20} />
                        {
                            this.state.currentFolder ?
                                getIconButton(() => this.setState({ currentFolder: undefined }), semanticColors.addButton, "home", 45)
                                : null
                        }
                    </View>
                </View>

                <View style={{
                    flex: 1, flexDirection: "row", backgroundColor: semanticColors.mainAreaBG,
                    position: 'absolute', width: "100%",
                    top: dimensions.toolbarHeight, left: 0,
                    height: this.state.windowSize.height - dimensions.toolbarHeight, zIndex: 4,
                }} >
                    {/* MainExplorer*/}
                    {isEmptyApp ?
                        this.state.loading ?
                            <View>
                                <AppText style={{ fontSize: 35 }}>{translate("Loading")}</AppText>
                            </View> :
                            <View style={{ width: "100%" }}>
                                <View style={{ position: 'absolute', left: 80, top: 80, alignItems: 'flex-end', flexDirection: 'row' }}>
                                    {getSvgIcon('start-icon', 150, semanticColors.addButton)}
                                    <Spacer />
                                    <AppText style={{ fontSize: 35, color: '#797a7c' }}>{translate("StartHere")}</AppText>
                                </View>
                                <View style={{ position: "absolute", width: "100%", height: '20%', top: "25%", alignItems: "center" }}>
                                    {getSvgIcon('folder', 150, semanticColors.addButton)}
                                    <AppText style={{ fontSize: 35, color: '#797a7c' }}>{translate("DesktopEmpty")}</AppText>

                                </View>
                                <View style={{ position: 'absolute', width: '100%', bottom: '20%', flexDirection: 'row', justifyContent: 'center' }}>
                                    {getSvgIcon('welcome-image', 100, semanticColors.addButton)}
                                    <Spacer width={50} />
                                    {getSvgIcon('welcome-doc', 100, semanticColors.addButton)}
                                    <Spacer width={50} />
                                    {getSvgIcon('welcome-pdf', 100, semanticColors.addButton)}
                                    <Spacer width={50} />
                                    {getSvgIcon('welcome-folder', 100, semanticColors.addButton)}

                                </View>
                            </View>
                        :
                        <View style={{
                            flex: 1, flexDirection: "column", position: 'absolute', top: 0, width: pagesContainerWidth, left: 0, height: "100%",
                        }}>
                            {/* pagesTitle */}
                            <View style={{
                                flex: 1, flexDirection: "row", height: "5%", position: 'absolute',
                                width: "100%", top: 0, height: '10%', alignItems: 'center', justifyContent: 'flex-start',
                                paddingRight: '5%', borderBottomWidth: this.state.currentFolder ? 1 : 0, borderBottomColor: 'gray'
                            }}>
                                {this.state.currentFolder ? <FolderNew
                                    index={fIndex}
                                    id="1"
                                    useColors={this.state.folderColor}
                                    name={curFolderFullName}
                                    asTitle={true}
                                    isLandscape={this.isLandscape()}
                                    editMode={this.state.editMode}
                                    onDelete={() => this.DeleteFolder()}
                                    onRename={() => this.RenameFolder()}
                                    fixedFolder={curFolderFullName === DEFAULT_FOLDER_NAME}
                                /> :
                                    <Search
                                        value={this.state.filterFolders}
                                        onChangeText={(txt) => {
                                            //Alert.alert("filter: "+ txt)
                                            this.setState({ filterFolders: txt })
                                        }
                                        }
                                    />}
                            </View>
                            {/* pages */}
                            <View style={{
                                flex: 1,
                                backgroundColor: semanticColors.mainAreaBG,
                                position: 'absolute', top: "10%", width: "100%",
                                height: '90%'
                            }}>
                                {this.state.currentFolder && this.state.currentFolder.files && this.state.currentFolder.files.length > 0 ?
                                    <FlatList
                                        style={{
                                        }}
                                        contentContainerStyle={{
                                            width: '100%', alignItems: 'flex-start',
                                            height: needPagesScroll ? pagesHeightSize : '100%',
                                            alignItems: "center"
                                        }}
                                        bounces={needPagesScroll}
                                        key={asTiles ? numColumnsForTiles.toString() : "list"}
                                        data={this.state.currentFolder.files}
                                        renderItem={({ item }) => FileNew({
                                            page: item,
                                            asTile: asTiles,
                                            name: removeFileExt(item.name),
                                            rowWidth: pagesContainerWidth,
                                            editMode: this.state.editMode,
                                            selected: this.isSelected(item),
                                            onPress: () => this.props.navigation.navigate('EditPhoto', { page: item, share: false }),
                                            onSelect: () => this.toggleSelection(item, 'file'),
                                            onDelete: () => this.DeletePage(),
                                            onRename: () => this.RenamePage(true),
                                            onMove: () => this.RenamePage(false),
                                            onShare: () => this.Share(),
                                            onDuplicate: () => this.DuplicatePage(),
                                            count: item.pages.length
                                        })}
                                        numColumns={asTiles ? numColumnsForTiles : 1}
                                        keyExtractor={(item, index) => index.toString()}
                                    />


                                    : this.state.currentFolder ?
                                        <View style={{ alignItems: 'center' }}>
                                            {getSvgIcon('folder')}
                                            <AppText style={{ fontSize: 35, color: '#797a7c' }}>{translate("NoPagesYet")}</AppText>
                                        </View>
                                        :
                                        // <FlatList
                                        //     style={{
                                        //     }}
                                        //     contentContainerStyle={{
                                        //         width: '100%', alignItems: 'flex-end',
                                        //         height: '100%',
                                        //         alignItems: "center"
                                        //     }}
                                        //     bounces={false}

                                        //     data={this.state.folders}
                                        //     renderItem={({item, index}) => 
                                        //     {
                                        //         //Alert.alert(JSON.stringify(item.name))
                                        //     return <FolderNew 
                                        //         index={index}
                                        //         id= {item.name}
                                        //         name= {item.name}
                                        //         editMode={this.state.editMode}
                                        //         fixedFolder={ false }//item.name === DEFAULT_FOLDER_NAME}
                                        //         current={false}
                                        //         onPress= {() => this.onFolderPressed(item)}

                                        //         isLandscape={ this.isLandscape()}
                                        //     />}}
                                        //     numColumns={2}
                                        //     keyExtractor={(item, index) => index.toString()}
                                        // />
                                        <View
                                            style={{
                                                flexWrap: 'wrap', flexDirection: 'row-reverse',
                                                width: '100%', justifyContent: 'flex-start',
                                                height: '100%',
                                                alignItems: 'center'
                                            }}
                                        >
                                            {this.state.folders.filter((item)=>checkFilter(this.state.filterFolders, item.name)).map((item, index) => <FolderNew
                                                key={index.toString()}
                                                id={item.name}
                                                isOverview={true}
                                                name={item.name}
                                                width={'30%'}
                                                editMode={this.state.editMode}
                                                fixedFolder={false}//item.name === DEFAULT_FOLDER_NAME}
                                                current={false}
                                                onPress={() => this.onFolderPressed(item)}

                                                isLandscape={this.isLandscape()}
                                            />)}
                                        </View>
                                }
                            </View>
                        </View>

                    }
                    {/* tree */}
                    {isEmptyApp || !this.state.currentFolder ?
                        null
                        :
                        <ScrollView
                            style={{
                                flex: 1,
                                flexDirection: "column",
                                position: 'absolute',
                                top: 0, width: treeWidth,
                                right: 0,
                                height: this.state.windowSize.height - dimensions.topView - dimensions.toolbarHeight,
                                backgroundColor: 'white'
                            }}
                            bounces={needFoldersScroll}

                            contentContainerStyle={{
                            }}>

                            {
                                this.state.folders && this.state.folders.length ?
                                    this.state.folders.map((f, i, arr) => FolderNew({
                                        index: i,
                                        isLast: i + 1 == arr.length,
                                        useColors: this.state.folderColor,
                                        id: f.name,
                                        name: f.name,
                                        editMode: this.state.editMode,
                                        fixedFolder: f.name === DEFAULT_FOLDER_NAME,
                                        //dragPanResponder: this._panResponder.panHandlers, 
                                        current: (this.state.currentFolder && f.name == this.state.currentFolder.name),
                                        onPress: () => this.onFolderPressed(f),
                                        onLongPress: () => {
                                            if (this.state.currentFolder && f.name == this.state.currentFolder.name)
                                                this.setState({ currentFolder: undefined })
                                        },
                                        onMoveUp: () => this.moveFolderUp(f),
                                        onMoveDown: () => this.moveFolderDown(f),
                                        isLandscape: this.isLandscape()
                                    })) : null

                            }
                        </ScrollView>
                    }
                </View>
            </View>
        );
    }
}
//1=create-pages, 2=create-pages+select-folder
function getDesktopHint(amount) {
    return <View style={{ flexDirection: 'row', width: '100%', marginTop: 25 }}>
        <View style={{ width: '50%', alignItems: 'center' }}>
            {getSvgIcon('start-icon', 150, semanticColors.addButton)}
            <Spacer />
            <AppText style={{ fontSize: 35, color: '#797a7c' }}>{translate("StartHere")}</AppText>
        </View>
        <Spacer />
        <Spacer />
        {amount == 2 ? <View style={{ width: '50%', alignItems: 'center' }}>

            <AppText style={{ fontSize: 35, color: '#797a7c' }}> {translate("ChooseFolder")}</AppText>
            <Spacer />
            {getSvgIcon('arrow-to-folders')}
        </View> :
            <View style={{ width: '50%' }} />}

    </View>
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


