import React from 'react';
import {
    Image, StyleSheet, View, YellowBox,
    TouchableOpacity, Button, ScrollView, Alert, Text, Dimensions, Linking, Settings,
    TextInput
} from 'react-native';
import Search from './search.js'
import SettingsMenu from './settings-ui'

import FolderNew from './FolderNew';
import FileNew from './FileNew'
import {
    registerLangEvent, unregisterLangEvent, translate, fTranslate, loadLanguage,
} from "./lang.js"
import { USE_COLOR, getUseColorSetting, EDIT_TITLE, VIEW } from './settings.js'
import { setNavParam } from './utils'
import {
    semanticColors,
    Spacer, removeFileExt,
    dimensions,

    AppText,
    getSvgIconButton,
    renderMenuOption,
    getRoundedButton
} from './elements'
import {
    Menu,
    MenuOptions,
    MenuOption,
    MenuTrigger,
} from 'react-native-popup-menu';



import { SRC_CAMERA, SRC_GALLERY, SRC_RENAME, SRC_DUPLICATE, getNewPage, SRC_FILE } from './newPage';
import DocumentPicker from 'react-native-document-picker';
import { FlatList } from 'react-native-gesture-handler';
import SplashScreen from 'react-native-splash-screen';
import { getSvgIcon } from './svg-icons';
import { getFileNameFromPath } from './utils'
import { StackActions } from '@react-navigation/native';
import { FileSystem, swapFolders, saveFolderOrder } from './filesystem.js';
const SORT_BY_NAME = 0;
const SORT_BY_DATE = 1;


function checkFilter(filter, name) {
    if (filter === undefined || filter.length == 0)
        return true;

    if (name.indexOf(filter) >= 0)
        return true;

    if (name == FileSystem.DEFAULT_FOLDER.name) {
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
            loading: true,
            startTime: new Date(),
            sortBy: SORT_BY_NAME
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

            this.props.navigation.addListener("didFocus", async () => {
                //this.refresh();
            })
            setNavParam(this.props.navigation, 'menuHandler', () => this._menuHandler());
            setNavParam(this.props.navigation, 'editHandler', () => this.toggleEditMode());
            setNavParam(this.props.navigation, 'isEditEnabled', () => {
                let editTitleSetting = Settings.get(EDIT_TITLE.name);
                if (editTitleSetting === undefined) {
                    editTitleSetting = EDIT_TITLE.no;
                }
                return editTitleSetting === EDIT_TITLE.yes ||
                    this.state.currentFolder && (this.state.foldersCount > 1 || this.state.currentFolder.name !== FileSystem.DEFAULT_FOLDER.name);
            });

            Linking.addEventListener("url", this._handleOpenURL);

            //load only the folders
            let folders = await FileSystem.main.getFolders();
            FileSystem.main.registerListener(async () => {
                let folders = await FileSystem.main.getFolders();

                FileSystem.main.getFolders().then(folder => this.setState({ folders }));
            });

            this.setState({ folders, loading: false });

        } finally {

            //calculate min of 2 second from start:
            let ellapsed = new Date() - this.state.startTime;
            ellapsed /= 1000;
            var ellapsedSeconds = Math.round(ellapsed);
            if (ellapsedSeconds >= 2) {
                SplashScreen.hide();
            } else {
                setTimeout(() => SplashScreen.hide(), 2000 - ellapsed * 1000);
            }
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
            folder: this.state.currentFolder,
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false)
        })
    }

    // refresh = async (folderName, callback) => {

    //         //update current folder:
    //         let currentFolder;
    //         if (this.state.returnFolderName) {
    //             currentFolder = foldersState.find(f => f.name == this.state.returnFolderName);
    //         }
    //         if (!currentFolder && this.state.currentFolder) {
    //             //try to restore to the same:
    //             currentFolder = foldersState.find(f => f.name == this.state.currentFolder.name);
    //         }
    //         if (!currentFolder) {
    //             //Alert.alert(JSON.stringify(foldersState))
    //             //currentFolder = foldersState.find(f => f.name == DEFAULT_FOLDER_NAME);
    //         }
    //         if (currentFolder) {
    //             this.selectFolder(currentFolder)
    //         } else {
    //             this.unselectFolder(currentFolder)
    //         }

    //         let newFolders = await sortFolders(foldersState);
    //         this.setState({ folders: newFolders, returnFolderName: undefined, loading: false }, () => {
    //             if (callback)
    //                 callback()
    //         });

    //     })

    // }

    newFromCamera = (addToExistingPage) => {
        if (this.state.systemModal) return;

        this.setState({ systemModal: true })
        getNewPage(SRC_CAMERA, 
            (uri) => {
                console.log("Camera returned: " + uri)
                this.setState({ systemModal: false })
                this.props.navigation.navigate('SavePhoto', {
                    uri: uri,
                    imageSource: SRC_CAMERA,
                    addToExistingPage,
                    folder: this.state.currentFolder,
                    returnFolderCallback: (f) => this.setReturnFolder(f),
                    saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false)

                })
            },
            //cancel
            () => {
                this.setState({ systemModal: false })
            },
            this.props.navigation
        );
    }

    newFromMediaLib = (addToExistingPage) => {
        this.setState({ systemModal: true })
        getNewPage(SRC_GALLERY,
            (uri) => {
                this.setState({ systemModal: false })
                this.props.navigation.navigate('SavePhoto', {
                    uri: uri,
                    imageSource: SRC_GALLERY,
                    addToExistingPage,
                    folder: this.state.currentFolder,
                    returnFolderCallback: (f) => this.setReturnFolder(f),
                    saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false)

                })
            },
            //cancel
            () => {
                this.setState({ systemModal: false })
            },
            this.props.navigation
        );

    }

    newFromFileExplorer = () => {
        this.setState({ isNewPageMode: false });

        DocumentPicker.pick({
            type: [DocumentPicker.types.images, DocumentPicker.types.pdf]
        }).then(res => {
            this.props.navigation.navigate('SavePhoto', {
                uri: res.uri,
                folder: this.state.currentFolder,
                returnFolderCallback: (f) => this.setReturnFolder(f),
                saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false)

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
        //Alert.alert(JSON.stringify(windowSize));
    }

    isScreenNarrow = () => this.state.windowSize.width < 500;
    isScreenLow = () => this.state.windowSize.height < 700;
    isMobile = () => this.isScreenNarrow() || this.isScreenLow();


    selectFolder = (folder) => {
        this.setState({ currentFolder: folder })
        setNavParam(this.props.navigation, 'showHome', () => this.unselectFolder());

    }

    unselectFolder = () => {
        this.setState({ currentFolder: undefined })
        setNavParam(this.props.navigation, 'showHome', undefined);
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
                folder: this.state.currentFolder,
                share: true
            })
    }

    AddToPageFromCamera = (page) => {
        this.newFromCamera(page)
    }

    AddToPageFromMediaLib = (page) => {
        this.newFromMediaLib(page)
    }

    DeleteFolder = () => {
        if (!this.state.currentFolder) return;
        Alert.alert(translate("DeleteFolderTitle"), translate("BeforeDeleteFolderQuestion"),
            [
                {
                    text: translate("BtnDelete"), onPress: () => {
                        FileSystem.main.deleteFolder(this.state.currentFolder.name)
                        this.unselectFolder()
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
                        FileSystem.main.deleteFile(selectedPath);

                        this.setState({ selected: undefined });

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
            folder: this.state.currentFolder,

            name: removeFileExt(this.state.selected.name),
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false),
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
                saveNewFolder: (name, color, icon, currFolder) => this.saveNewFolder(name, color, icon, true, currFolder),
                isLandscape: this.isLandscape(),
                currentFolderName: this.state.currentFolder.name,
                currentFolderColor: this.state.currentFolder.color,
                currentFolderIcon: this.state.currentFolder.icon,
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
            folder: this.state.currentFolder,
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false),
            title: translate("DuplicatePageFormTitle")

        })
    }

    setReturnFolder = (folderName) => {
        FileSystem.main.getFolders().then((folders) => {
            let folder = folders.find(f => f.name == folderName);
            if (folder) {
                this.setState({ currentFolder: folder });
            }
        });
    }

    saveNewFolder = async (newFolderName, newFolderColor, newFolderIcon,
        setReturnFolder, originalFolderName) => {

        try {
            if (newFolderName == originalFolderName) {
                console.log("add folder")
                await FileSystem.main.addFolder(newFolderName, newFolderIcon, newFolderColor, true);
            } else {
                console.log("rename folder")
                await FileSystem.main.renameFolder(originalFolderName, newFolderName, newFolderIcon, newFolderColor);

            }
        } catch (e) {
            Alert.alert(e);
            return false;
        }


        if (setReturnFolder) {
            this.setReturnFolder(newFolderName);
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
    goEdit = (page, folder, share) => {

        this.props.navigation.navigate('EditPhoto', {
            page,
            folder,
            share,
            goHome: () => {
                this.unselectFolder();
                this.props.navigation.goBack();
            },
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false),
            goHomeAndThenToEdit: (path) => {
                setTimeout(async () => {
                    this.props.navigation.dispatch(StackActions.popToTop());
                    //find the page for the path
                    let fileName = getFileNameFromPath(path, false);
                    let item = await folder.getItem(fileName);
                    if (item) {
                        this.goEdit(item, this.state.currentFolder, false);
                    } else {
                        console.log("goHomeAndThenToEdit - no page " + fileName + " in folder " + this.state.currentFolder.name)
                    }
                }, 10);
            }
        });
    }


    addEmptyPage = async (type) => {
        let folderName = this.state.currentFolder ? this.state.currentFolder.name : FileSystem.DEFAULT_FOLDER.name;
        let fileName = await FileSystem.main.getStaticPage(folderName, type);

        let folder = this.state.currentFolder
        if (this.state.currentFolder == undefined) {
            folder = this.state.folders.find(f => f.name == folderName);
            this.selectFolder(folder);
        }

        let item = await folder.getItem(fileName);
        if (item) {
            this.goEdit(item, folder, false);
        } else {
            Alert.alert("error finding newly created file")
        }
    }

    addEmptyPageToPage = async (addToExistingPage, pageType) => {
        let tempFileName = await FileSystem.main.getStaticPageTempFile(pageType);
        this.props.navigation.navigate('SavePhoto', {
            uri: tempFileName,
            imageSource: SRC_FILE,
            addToExistingPage,
            folder: this.state.currentFolder,
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false)
        })
    }




    getSortFunction = () => {
        return this.state.sortBy == SORT_BY_DATE ?
            (a, b) => a.lastUpdate < b.lastUpdate :
            (a, b) => a.name > b.name;
    }


    newPageButton = () => {
        return (
            <Menu ref={(ref) => this.menu = ref} key="6">
                <MenuTrigger >
                    {getSvgIconButton(() => this.menu.open(), semanticColors.addButton, "menu-new-empty-page", 40)}
                </MenuTrigger>
                <MenuOptions
                    optionsContainerStyle={{
                        backgroundColor: 'white', width: 250, borderRadius: 10,
                        alignItems: 'center', justifyContent: 'center', alignContent: 'center'
                    }}                    >
                    <MenuOption onSelect={() => this.addEmptyPage(FileSystem.StaticPages.Blank)}>
                        {renderMenuOption(translate("MenuNewPageEmpty"), "page-empty", "svg")}
                    </MenuOption>
                    <MenuOption onSelect={() => this.addEmptyPage(FileSystem.StaticPages.Lines)}>
                        {renderMenuOption(translate("MenuNewPageLines"), "page-lines", "svg")}
                    </MenuOption>
                    <MenuOption onSelect={() => this.addEmptyPage(FileSystem.StaticPages.Math)}>
                        {renderMenuOption(translate("MenuNewPageMath"), "page-math", "svg")}
                    </MenuOption>
                    <Spacer />
                    {getRoundedButton(() => this.menu.close(), 'cancel-red', translate("BtnCancel"), 30, 30, { width: 150, height: 40 })}
                    <Spacer width={5} />
                </MenuOptions>
            </Menu>);
    }


    render() {
        //YellowBox.ignoreWarnings(['Task orphaned']);
        let curFolderFullName = "", curFolderColor = "", curFolderIcon = "";
        if (this.state.currentFolder) {
            curFolderFullName = this.state.currentFolder.name;
            curFolderColor = this.state.currentFolder.color;
            curFolderIcon = this.state.currentFolder.icon;
        }

        let fIndex = 0;
        let items = [];
        let folderIsLoading = false;
        if (this.state.currentFolder) {
            //console.log(this.state.currentFolder);
            items = this.state.currentFolder.items;
            folderIsLoading = this.state.currentFolder.loading;
        }

        if (this.state.folders && this.state.folders.length) {
            fIndex = this.state.folders.findIndex(f => f.name == curFolderFullName);
        }
        let viewStyle = Settings.get(VIEW.name);
        let asTiles = viewStyle === VIEW.tiles;

        let editTitleSetting = Settings.get(EDIT_TITLE.name);
        if (editTitleSetting === undefined) {
            editTitleSetting = EDIT_TITLE.no;
        }

        let treeWidth = this.state.currentFolder ? (this.isLandscape() ? 220 : 180) : 0;//.36 * this.state.windowSize.width;
        let pagesContainerWidth = this.state.windowSize.width - treeWidth;
        let numColumnsForTiles = Math.floor(pagesContainerWidth / dimensions.tileWidth);
        let foldersCount = this.state.folders ? this.state.folders.length : 1;
        let foldersHeightSize = dimensions.topView + dimensions.toolbarHeight + foldersCount * dimensions.folderHeight;
        let needFoldersScroll = foldersHeightSize > this.state.windowSize.height;

        let pagesCount = items.length;
        let pagesLines = asTiles ? Math.ceil(pagesCount / numColumnsForTiles) : pagesCount;
        let pageHeight = asTiles ? dimensions.tileHeight : dimensions.lineHeight;
        let pagesAreaWindowHeight = 0.9 * (this.state.windowSize.height - dimensions.topView + dimensions.toolbarHeight);
        let pagesHeightSize = pagesLines * pageHeight * 1.2;
        let needPagesScroll = pagesHeightSize > pagesAreaWindowHeight;

        let isEmptyApp = !this.state.folders || this.state.folders.length == 0;
        if (isEmptyApp)
            console.log("empty app")


        return (
            <View style={styles.container}
                onLayout={this.onLayout}>

                {this.state.showMenu ?
                    <SettingsMenu
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
                                    saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, true),
                                    isLandscape: this.isLandscape()
                                });
                        }, semanticColors.addButton, "new-folder", 45)
                    }
                    <Spacer />
                    {
                        this.newPageButton()
                    }

                    {/*right buttons */}
                    <View style={{ position: 'absolute', right: 17, flexDirection: 'row-reverse', alignItems: 'center' }}>
                        {/* {
                            getIconButton(enableEdit ? () => {
                                this.toggleEditMode()
                            } : undefined, enableEdit ? semanticColors.addButton : semanticColors.disabledButton, this.state.editMode ? "close" : "edit", 35)

                        } */}
                        {/* <Spacer width={20} />
                        {
                            this.state.currentFolder ?
                                getIconButton(() => this.setState({ currentFolder: undefined }), semanticColors.addButton, "home", 45)
                                : null
                        } */}
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
                                <View style={{ position: 'absolute', left: 80, top: (this.isMobile() ? '5%' : '10%'), alignItems: 'flex-end', flexDirection: 'row' }}>
                                    {getSvgIcon('start-icon', this.isMobile() ? 70 : 150, semanticColors.addButton)}
                                    <Spacer />
                                    <AppText style={{ fontSize: this.isMobile() ? 20 : 35, color: '#797a7c' }}>{translate("StartHere")}</AppText>
                                </View>
                                <View style={{ position: "absolute", width: "100%", height: '20%', top: this.isMobile() ? '20%' : '30%', alignItems: "center" }}>
                                    {getSvgIcon('folder', this.isMobile() ? 85 : 150, semanticColors.addButton)}
                                    <AppText style={{ fontSize: 35, color: '#797a7c' }}>{translate("DesktopEmpty")}</AppText>

                                </View>
                                <View style={{ position: 'absolute', width: '100%', bottom: '20%', flexDirection: 'row', justifyContent: 'center' }}>
                                    {getSvgIcon('welcome-image', this.isMobile() ? 50 : 80, semanticColors.addButton)}
                                    <Spacer width={50} />
                                    {getSvgIcon('welcome-doc', this.isMobile() ? 50 : 80, semanticColors.addButton)}
                                    <Spacer width={50} />
                                    {getSvgIcon('welcome-pdf', this.isMobile() ? 50 : 80, semanticColors.addButton)}
                                    <Spacer width={50} />
                                    {getSvgIcon('welcome-folder', this.isMobile() ? 50 : 80, semanticColors.addButton)}

                                </View>
                            </View>
                        :
                        <View style={{
                            flex: 1, flexDirection: "column", position: 'absolute', top: 0, width: pagesContainerWidth, left: 0, height: "100%",
                        }}>
                            {/* pagesTitle */}
                            <View style={{
                                flex: 1, flexDirection: "row", height: "5%", position: 'absolute',
                                width: "100%", top: 0, height: this.isScreenLow() ? '17%' : '10%', alignItems: 'center', justifyContent: 'flex-start',
                                borderBottomWidth: this.state.currentFolder ? 1 : 0, borderBottomColor: 'gray'
                            }}>
                                {this.state.currentFolder ? <Spacer width={3} /> : null}
                                {this.state.currentFolder ? getSvgIconButton(() => this.setState({ sortBy: SORT_BY_DATE }), semanticColors.addButton, "sort-by-date", 45, undefined, undefined, (this.state.sortBy == SORT_BY_DATE)) : null}
                                {this.state.currentFolder ? <Spacer width={3} /> : null}
                                {this.state.currentFolder ? getSvgIconButton(() => this.setState({ sortBy: SORT_BY_NAME }), semanticColors.addButton, "sort-by-name", 45, undefined, undefined, (this.state.sortBy == SORT_BY_NAME)) : null}

                                {this.state.currentFolder ? <FolderNew
                                    width="85%"
                                    index={fIndex}
                                    id="1"
                                    useColors={this.state.folderColor}
                                    name={curFolderFullName}
                                    color={curFolderColor}
                                    icon={curFolderIcon}
                                    asTitle={true}
                                    isLandscape={this.isLandscape()}
                                    editMode={this.state.editMode}
                                    onDelete={() => this.DeleteFolder()}
                                    onRename={() => this.RenameFolder()}
                                    fixedFolder={curFolderFullName === FileSystem.DEFAULT_FOLDER.name}
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
                                position: 'absolute', top: this.isScreenLow() ? '17%' : '10%', width: "100%",
                                height: this.isScreenLow() ? '83%' : '90%'
                            }}>
                                {items.length > 0 ?
                                    <FlatList
                                        style={{
                                        }}
                                        contentContainerStyle={{
                                            width: '100%', alignItems: 'flex-start',
                                            height: needPagesScroll ? pagesHeightSize : '100%',
                                            alignItems: 'flex-end'
                                        }}
                                        bounces={needPagesScroll}
                                        key={asTiles ? numColumnsForTiles.toString() : "list"}
                                        data={[...items].sort(this.getSortFunction())}
                                        renderItem={({ item }) => FileNew({
                                            page: item,
                                            asTile: asTiles,
                                            starred: item.starred,
                                            name: removeFileExt(item.name),
                                            rowWidth: pagesContainerWidth,
                                            editMode: this.state.editMode,
                                            selected: this.isSelected(item),
                                            onPress: () => this.goEdit(item, this.state.currentFolder, false),
                                            onSelect: () => this.toggleSelection(item, 'file'),
                                            onDelete: () => this.DeletePage(),
                                            onRename: () => this.RenamePage(true),
                                            onMove: () => this.RenamePage(false),
                                            onShare: () => this.Share(),
                                            onAddFromCamera: () => this.AddToPageFromCamera(item),
                                            onAddFromMediaLib: () => this.AddToPageFromMediaLib(item),
                                            onBlankPage: () => this.addEmptyPageToPage(item, FileSystem.StaticPages.Blank),
                                            onLinesPage: () => this.addEmptyPageToPage(item, FileSystem.StaticPages.Lines),
                                            onMathPage: () => this.addEmptyPageToPage(item, FileSystem.StaticPages.Math),
                                            onDuplicate: () => this.DuplicatePage(),
                                            count: item.pages.length
                                        })}
                                        numColumns={asTiles ? numColumnsForTiles : 1}
                                        keyExtractor={(item, index) => index.toString()}
                                    />


                                    : this.state.currentFolder ?
                                        folderIsLoading ?
                                            <View>
                                                <AppText style={{ fontSize: 35 }}>{translate("Loading")}</AppText>
                                            </View>
                                            :
                                            <View style={{ alignItems: 'center', height: '100%' }}>
                                                <Spacer height='20%' />
                                                {getSvgIcon('folder', this.isMobile() ? 85 : 150)}
                                                <AppText style={{ fontSize: 35, color: '#797a7c' }}>{translate("NoPagesYet")}</AppText>
                                            </View>
                                        :

                                        <View
                                            style={{
                                                flexWrap: 'wrap', flexDirection: 'row-reverse',
                                                width: '90%', justifyContent: 'flex-start', alignItems: 'center',
                                                height: '100%'
                                            }}
                                        >
                                            {this.state.folders.filter((item) => checkFilter(this.state.filterFolders, item.name)).map((item, index) => <FolderNew
                                                key={index.toString()}
                                                id={item.name}
                                                isOverview={true}
                                                name={item.name}
                                                color={item.color}
                                                icon={item.icon}
                                                width={'30%'}
                                                editMode={this.state.editMode}
                                                fixedFolder={false}//item.name === DEFAULT_FOLDER_NAME}
                                                current={false}
                                                onPress={() => this.selectFolder(item)}

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
                                        color: f.color,
                                        icon: f.icon,
                                        editMode: this.state.editMode,
                                        fixedFolder: f.name === FileSystem.DEFAULT_FOLDER.name,
                                        //dragPanResponder: this._panResponder.panHandlers, 
                                        current: (this.state.currentFolder && f.name == this.state.currentFolder.name),
                                        onPress: () => this.selectFolder(f),
                                        onLongPress: () => {
                                            if (this.state.currentFolder && f.name == this.state.currentFolder.name)
                                                this.unselectFolder()
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
// function getDesktopHint(amount) {
//     return <View style={{ flexDirection: 'row', width: '100%', marginTop: 25 }}>
//         <View style={{ width: '50%', alignItems: 'center' }}>
//             {getSvgIcon('start-icon', 150, semanticColors.addButton)}
//             <Spacer />
//             <AppText style={{ fontSize: 35, color: '#797a7c' }}>{translate("StartHere")}</AppText>
//         </View>
//         <Spacer />
//         <Spacer />
//         {amount == 2 ? <View style={{ width: '50%', alignItems: 'center' }}>

//             <AppText style={{ fontSize: 35, color: '#797a7c' }}> {translate("ChooseFolder")}</AppText>
//             <Spacer />
//             {getSvgIcon('arrow-to-folders')}
//         </View> :
//             <View style={{ width: '50%' }} />}

//     </View>
// }

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


