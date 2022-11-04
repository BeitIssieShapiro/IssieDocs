import React from 'react';
import {
    Image, StyleSheet, View, YellowBox,
    TouchableOpacity, Button, ScrollView, Alert, Text, Dimensions, Linking, Settings,
    TextInput,
    ActivityIndicator
} from 'react-native';
import Search from './search.js'
import SettingsMenu from './settings-ui'

import FolderNew from './FolderNew';
import FileNew from './FileNew'
import {
    registerLangEvent, unregisterLangEvent, translate, fTranslate, loadLanguage, gCurrentLang, getRowDirections,
} from "./lang.js"
import { USE_COLOR, getUseColorSetting, EDIT_TITLE, VIEW } from './settings.js'
import { setNavParam } from './utils'
import {
    semanticColors,
    Spacer,
    dimensions,

    AppText,
    getSvgIconButton,
    renderMenuOption,
    getRoundedButton,
    IDMenuOptionsStyle,
    SBDraxScrollView,
} from './elements'
import {
    Menu,
    MenuOptions,
    MenuOption,
    MenuTrigger,
} from 'react-native-popup-menu';
import { DraxProvider, DraxView } from 'react-native-drax';


import { SRC_CAMERA, SRC_GALLERY, SRC_RENAME, SRC_DUPLICATE, getNewPage, SRC_FILE } from './newPage';
import DocumentPicker from 'react-native-document-picker';
import { getSvgIcon, SvgIcon } from './svg-icons';
import { StackActions } from '@react-navigation/native';
import { FileSystem, swapFolders, saveFolderOrder } from './filesystem.js';
import { trace } from './log.js';
import { showMessage } from 'react-native-flash-message';
import { LogBox } from 'react-native';
import { FileContextMenu } from './file-context-menu.js';

const SORT_BY_NAME = 0;
const SORT_BY_DATE = 1;


function checkFilter(filter, name) {
    if (filter === undefined || filter.length == 0)
        return true;

    trace("checkFilter", filter, name)
    if (name.toLowerCase().indexOf(filter.toLowerCase()) >= 0) {
        trace("found")

        return true;
    }
    // if (name == FileSystem.DEFAULT_FOLDER.name) {
    //     return translate("DefaultFolder").indexOf(filter) >= 0;
    // }

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
            registerLangEvent()

            this.props.navigation.addListener("focus", async () => {
                //this.refresh();
                this.setState({ selected: undefined });
            })
            setNavParam(this.props.navigation, 'menuHandler', () => this._menuHandler());
            // setNavParam(this.props.navigation, 'betaFeatures', () => {
            //     trace
            //     if (this.state.betaCounter === 7) {
            //         //toggle beta features - always on for now
            //         // const newMode = { beta: !this.state.beta };
            //         // Settings.set(newMode);
            //         // this.setState(newMode);
            //         //Alert.alert("Beta features", "Beta features has been " + (newMode.beta ? "Enabled" : "Disabled"));

            //         return;
            //     }
            //     if (this.betaTimer) {
            //         clearTimeout(this.betaTimer);
            //     }
            //     this.betaTimer = setTimeout(() => this.setState({ betaCounter: 0 }), 1000);

            //     this.setState({ betaCounter: (this.state.betaCounter ? this.state.betaCounter + 1 : 1) });
            //     trace("betacounter ", this.state.betaCounter)
            // });
            setNavParam(this.props.navigation, 'editHandler', () => this.toggleEditMode());
            this.setEditEnabled(false);
            Linking.addEventListener("url", this._handleOpenURL);

            //load only the folders
            let folders = await FileSystem.main.getFolders();
            FileSystem.main.registerListener(async () => {
                let folders = await FileSystem.main.getFolders();

                this.setState({ folders });
            });

            //trace("beta", betaSettings)
            this.setState({
                folders, loading: false, beta: true
                //    (betaSettings ? betaSettings === 1 : false) 
            });

        } finally {

            //calculate min of 2 second from start:
            let ellapsed = new Date() - this.state.startTime;
            ellapsed /= 1000;
            var ellapsedSeconds = Math.round(ellapsed);
            console.log("loading took ", ellapsedSeconds, "seconds");
            // if (ellapsedSeconds >= 2) {
            //     SplashScreen.hide();
            // } else {
            //     setTimeout(() => SplashScreen.hide(), 2000 - ellapsed * 1000);
            // }
        }
    };

    setEditEnabled = (inFolder) => {
        setNavParam(this.props.navigation, 'isEditEnabled', () => {
            let editTitleSetting = Settings.get(EDIT_TITLE.name);
            if (editTitleSetting === undefined) {
                editTitleSetting = EDIT_TITLE.no;
            }
            return editTitleSetting === EDIT_TITLE.yes || inFolder;
        });
    }

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
        console.log("_handleOpenURL event:", JSON.stringify(event));

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
            (err) => {
                Alert.alert("Error", err.description)
                this.setState({ systemModal: false })
            },
            this.props.navigation
        );
    }

    newFromMediaLib = (addToExistingPage) => {
        this.setState({ systemModal: true })
        setTimeout(() => this.setState({ inprogress: true }), 500)
        getNewPage(SRC_GALLERY,
            (uri) => {
                this.setState({ systemModal: false, inprogress: false })
                trace("image loaded", uri)
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
                this.setState({ systemModal: false, inprogress: false })
            },
            (err) => {
                Alert.alert("Error", err.description)
                this.setState({ systemModal: false, inprogress: false })
            },
            this.props.navigation,
            undefined,
            //onProgress
            () => this.setState({ inprogress: true })
        );

    }

    newFromFileExplorer = () => {
        this.setState({ isNewPageMode: false });

        DocumentPicker.pick({
            type: [DocumentPicker.types.images, DocumentPicker.types.pdf]
        }).then(res => {
            this.props.navigation.navigate('SavePhoto', {
                imageSource: SRC_FILE,

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
        if (folder)
            this.setEditEnabled(true);
        this.setState({ currentFolder: folder, selected: undefined }, () => {
            setNavParam(this.props.navigation, 'showHome', () => {
                this.unselectFolder();
            })
            this.scrollToFolder(folder);
        });

    }

    scrollToFolder = (folder) => {
        if (this.foldersTree) {
            let index = this.state.folders.findIndex(f => f.name === folder.name);
            if (index - 3 >= 0) {
                setTimeout(() => this.foldersTree.scrollTo({ animated: true, y: (index - 3) * dimensions.folderHeight }), 50)
            }
        }

    }
    unselectFolder = () => {
        this.setState({ currentFolder: undefined })
        setNavParam(this.props.navigation, 'showHome', undefined);
        this.setEditEnabled(false);

    }

    isSelected = (page) => {
        if (this.state.selected && page) {
            //alert(JSON.stringify(this.state.selected))
            //alert(JSON.stringify(page))
            //return (this.state.selected.find(sel => sel.item.path == page.path) != undefined)
            return (this.state.selected.name === page.name)
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
                share: true,
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
                        this.unselectFolder();
                        this.toggleEditMode();
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

    DeletePage = (page) => {
        if (!page) return;

        Alert.alert(translate("DeletePageTitle"), translate("BeforeDeletePageQuestion"),
            [
                {
                    text: translate("BtnDelete"), onPress: () => {
                        let selectedPath = page.path;
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
            sheet: this.state.selected,
            imageSource: SRC_RENAME,
            folder: this.state.currentFolder,

            name: this.state.selected.name,
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
                isMobile: this.isMobile(),
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
            sheet: this.state.selected,
            imageSource: SRC_DUPLICATE,
            folder: this.state.currentFolder,
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false),
            title: translate("DuplicatePageFormTitle")

        })
    }

    setReturnFolder = (folderName) => {
        if (folderName === FileSystem.DEFAULT_FOLDER.name) {
            this.unselectFolder();
        } else {
            FileSystem.main.getFolders().then((folders) => {
                let folder = folders.find(f => f.name == folderName);
                if (folder) {
                    this.selectFolder(folder);
                }
            });
        }
    }

    saveNewFolder = async (newFolderName, newFolderColor, newFolderIcon,
        setReturnFolder, originalFolderName) => {

        try {
            if (!originalFolderName) {
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
        trace("save new folder ", newFolderName, "completed")

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
    goEdit = (page, folder, share, pageIndex) => {
        this.props.navigation.navigate('EditPhoto', {
            page,
            pageIndex,
            folder,
            share,
            goHome: () => {
                this.unselectFolder();
                this.props.navigation.goBack();
            },
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false),
            goHomeAndThenToEdit: (path, pIndex) => {
                setTimeout(async () => {
                    this.props.navigation.dispatch(StackActions.popToTop());
                    //find the page for the path
                    //todo
                    let fileName = FileSystem.getFileNameFromPath(path, false);
                    let item;
                    if (folder) {
                        item = await folder.getItem(fileName);
                    } else {
                        const defFolder = this.state.folders?.find(f => f.name == FileSystem.DEFAULT_FOLDER.name);
                        if (defFolder) {
                            item = await defFolder.getItem(fileName);
                        }
                    }

                    if (item) {
                        this.goEdit(item, this.state.currentFolder, false, pIndex);
                    } else {
                        console.log("goHomeAndThenToEdit - no page " + fileName + " in folder " + this.state.currentFolder.name)
                    }
                }, 10);
            },
        });
    }


    addEmptyPage = async (type) => {
        let folderName = this.state.currentFolder ? this.state.currentFolder.name : FileSystem.DEFAULT_FOLDER.name;
        // let fileName = await FileSystem.main.getStaticPage(folderName, type);

        // let folder = this.state.currentFolder
        // if (this.state.currentFolder == undefined) {
        //     let folders = await FileSystem.main.getFolders();
        //     folder = folders.find(f => f.name == folderName);
        //     this.selectFolder(folder);
        // }

        // let item = await folder.getItem(fileName);
        // if (item) {
        //     this.goEdit(item, folder, false);
        // } else {
        //     Alert.alert("error finding newly created file")
        // }
        let uri = await FileSystem.main.getStaticPageTempFile(type);
        this.props.navigation.navigate('SavePhoto', {
            uri,
            isBlank: true,
            imageSource: SRC_FILE,
            addToExistingPage: false,
            skipConfirm: true,
            folder: this.state.currentFolder,
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false)
        })
    }

    addEmptyPageToPage = async (addToExistingPage, pageType) => {
        let tempFileName = await FileSystem.main.getStaticPageTempFile(pageType);
        this.props.navigation.navigate('SavePhoto', {
            uri: tempFileName,
            isBlank: true,
            imageSource: SRC_FILE,
            addToExistingPage,
            folder: this.state.currentFolder,
            returnFolderCallback: (f) => this.setReturnFolder(f),
            saveNewFolder: (newFolder, color, icon) => this.saveNewFolder(newFolder, color, icon, false)
        })
    }

    getSortFunction = () => {
        return this.state.sortBy == SORT_BY_DATE ?
            (a, b) => b.lastUpdate - a.lastUpdate :
            (a, b) => a.name.localeCompare(b.name);
    }


    newPageButton = (rtl) => {
        return (

            <Menu ref={(ref) => this.menu = ref} key="6">
                <MenuTrigger >
                    {getSvgIconButton(() => this.menu.open(), semanticColors.addButton, "menu-new-empty-page", 40)}
                </MenuTrigger>
                <MenuOptions {...IDMenuOptionsStyle({ top: dimensions.toolbarHeight - 12, width: 240 })}>
                    <MenuOption onSelect={() => this.addEmptyPage(FileSystem.StaticPages.Blank)}>
                        {renderMenuOption(translate("MenuNewPageEmpty"), "page-empty", "svg", rtl)}
                    </MenuOption>
                    {/* <MenuOption onSelect={() => this.addEmptyPage(FileSystem.StaticPages.Blank)}>
                        {renderMenuOption(translate("MenuNewPageEmptyLandscape"), "page-empty", "svg", rtl)}
                    </MenuOption> */}

                    <MenuOption onSelect={() => this.addEmptyPage(FileSystem.StaticPages.Lines)}>
                        {renderMenuOption(translate("MenuNewPageLines"), "page-lines", "svg", rtl)}
                    </MenuOption>
                    {/* <MenuOption onSelect={() => this.addEmptyPage(FileSystem.StaticPages.Lines)}>
                        {renderMenuOption(translate("MenuNewPageLinesLandscape"), "page-lines", "svg", rtl)}
                    </MenuOption> */}
                    <MenuOption onSelect={() => this.addEmptyPage(FileSystem.StaticPages.Math)}>
                        {renderMenuOption(translate("MenuNewPageMath"), "page-math", "svg", rtl)}
                    </MenuOption>
                    {/* <MenuOption onSelect={() => this.addEmptyPage(FileSystem.StaticPages.Math)}>
                        {renderMenuOption(translate("MenuNewPageMathLandscape"), "page-math", "svg", rtl)}
                    </MenuOption> */}

                    <Spacer />
                    <View style={{ flex: 1, width: '100%', flexDirection: 'column', alignItems: 'center' }}>
                        {getRoundedButton(() => this.menu.close(), 'cancel-red', translate("BtnCancel"), 30, 30, { width: 150, height: 40 })}
                    </View>
                    <Spacer width={5} />
                </MenuOptions>

            </Menu>);
    }

    sortFiles = (items) => {
        console.log("sort items", items?.length);
        const clone = [...items];
        console.log(clone.map(item => item.name + ":" + item.lastUpdate % 1663000000000));
        clone.sort(this.getSortFunction());
        console.log(clone.map(item => item.name + ":" + item.lastUpdate % 1663000000000));

        return clone;
    }


    render() {
        const { row, rowReverse, flexStart, flexEnd, textAlign, rtl } = getRowDirections();

        LogBox.ignoreLogs(['Could not find image file']);
        let curFolderFullName = "", curFolderColor = "", curFolderIcon = "";
        //let currentParent = undefined;
        if (this.state.currentFolder) {
            curFolderFullName = this.state.currentFolder.name;
            curFolderColor = this.state.currentFolder.color;
            curFolderIcon = this.state.currentFolder.icon;
            // currentParent = this.state.folders.find(f => f.name === "Default");
            // if (!currentParent) {
            //     trace ("def folder not existing")
            //     currentParent = FileSystem.main.DEFAULT_FOLDER;
            // }
        }


        let fIndex = 0;
        let items = [];
        let folders = this.state.folders?.filter(f => f.name !== "Default") || [];
        let folderIsLoading = false;
        if (this.state.currentFolder) {
            items = this.state.currentFolder.items;
            folderIsLoading = this.state.currentFolder.loading;
        } else if (this.state.folders) {
            if (this.state.filterFolders?.length > 0) {

                //aggregates all files matching the filter
                this.state.folders.forEach(folder => {
                    items = items.concat(folder.items.filter(file => {
                        //trace("file.name", file.name, file.name.indexOf(this.state.filterFolders))
                        return checkFilter(this.state.filterFolders, file.name)
                    }));
                })

                folders = folders.filter((item) => checkFilter(this.state.filterFolders, item.name))
            } else {
                //renders the default folder
                const defFolder = this.state.folders.find(f => f.name === "Default");
                if (defFolder) {
                    items = defFolder.items;
                }
            }
        }

        fIndex = folders.findIndex(f => f.name == curFolderFullName);

        let viewStyle = Settings.get(VIEW.name);
        let asTiles = viewStyle === VIEW.tiles;

        let editTitleSetting = Settings.get(EDIT_TITLE.name);
        if (editTitleSetting === undefined) {
            editTitleSetting = EDIT_TITLE.no;
        }

        let treeWidth = this.state.currentFolder ? (this.isLandscape() ? 220 : this.isMobile() ? 100 : 180) : 0;//.36 * this.state.windowSize.width;
        let pagesContainerWidth = this.state.windowSize.width - treeWidth;
        let numColumnsForTiles = Math.floor(pagesContainerWidth / dimensions.tileWidth);
        let foldersCount = folders.length;
        let foldersHeightSize = (foldersCount + 1) * dimensions.folderHeight;
        //        let needFoldersScroll = foldersHeightSize > this.state.windowSize.height;
        const pagesTitleHeight = this.isScreenLow() ? dimensions.pagesTitleLow : dimensions.pagesTitleHigh

        const foldersTilesListHeight = Math.ceil(foldersCount / numColumnsForTiles) * dimensions.folderHeight;


        let pagesCount = items.length;
        let pagesLines = asTiles ? Math.ceil(pagesCount / numColumnsForTiles) : pagesCount;
        let pageHeight = asTiles ? dimensions.tileHeight : dimensions.lineHeight;
        //let pagesAreaWindowHeight = this.state.windowSize.height - dimensions.topView + dimensions.toolbarHeight - pagesTitleHeight - 20;
        let pagesHeightSize = (pagesLines + 1) * pageHeight;
        //let needPagesScroll = true;//pagesHeightSize > pagesAreaWindowHeight;


        const scrollerHeight = pagesHeightSize + (!this.state.currentFolder ? foldersTilesListHeight : 0);//+ dimensions.toolbarHeight;

        let isEmptyApp = !this.state.folders || this.state.folders.length == 0;
        if (isEmptyApp)
            console.log("empty app")


        return (
            <DraxProvider>

                <View style={styles.container}
                    onLayout={this.onLayout}>
                    <FileContextMenu
                        inFoldersMode={true}
                        isLandscape={this.isLandscape()}
                        item={this.state.selected}
                        open={this.state.selected !== undefined}
                        height={this.state.windowSize.height * .8}
                        onClose={() => {
                            this.setState({ selected: undefined })
                        }}

                        onDelete={()=>this.DeletePage(this.state.selected)}
                        onRename={() => this.RenamePage(true)}
                        onMove={() => this.RenamePage(false)}
                        onShare={() => this.Share()}
                        onDuplicate={() => this.DuplicatePage()}
                        onAddFromCamera={() => this.AddToPageFromCamera(this.state.selected)}
                        onAddFromMediaLib={() => this.AddToPageFromMediaLib(this.state.selected)}
                        onBlankPage={() => this.addEmptyPageToPage(this.state.selected, FileSystem.StaticPages.Blank)}
                        onLinesPage={() => this.addEmptyPageToPage(this.state.selected, FileSystem.StaticPages.Lines)}
                        onMathPage={() => this.addEmptyPageToPage(this.state.selected, FileSystem.StaticPages.Math)}
                    />


                    {this.state.inprogress && <ActivityIndicator size="large" />}

                    {this.state.showMenu ?
                        <SettingsMenu
                            onAbout={() => this.gotoAbout()}
                            onClose={() => this.closeMenu()}
                            onViewChange={(style) => this.setState({ viewStyle: style })}
                            onLanguageChange={(lang) => {
                                loadLanguage();
                                setNavParam(this.props.navigation, "lang", gCurrentLang.languageTag)
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
                        flexDirection: row,
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
                                        isLandscape: this.isLandscape(),
                                        isMobile: this.isMobile(),
                                    });
                            }, semanticColors.addButton, "new-folder", 45)
                        }
                        <Spacer />
                        {
                            this.newPageButton(rtl)
                        }

                        {/*right buttons */}
                        <View style={{ position: 'absolute', right: 17, flexDirection: rowReverse, alignItems: 'center' }}>
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

                    {/* MainExplorer*/}
                    <View style={{
                        flex: 1, flexDirection: row, backgroundColor: semanticColors.mainAreaBG,
                        position: 'absolute', width: "100%",
                        top: dimensions.toolbarHeight, left: 0,
                        height: this.state.windowSize.height - dimensions.toolbarHeight, zIndex: 4,
                    }} >

                        {isEmptyApp ?
                            this.state.loading ?
                                <View>
                                    <AppText style={{ fontSize: 35 }}>{translate("Loading")}</AppText>
                                </View> :
                                <View style={{ width: "100%" }}>
                                    <View style={[
                                        {
                                            position: 'absolute', top: (this.isMobile() ? '5%' : '10%'),
                                            alignItems: flexEnd, flexDirection: row
                                        },
                                        rtl ? { left: 80 } : { right: 80 }
                                    ]}>
                                        <View style={rtl ? {} : { transform: [{ scaleX: -1 }] }}>
                                            {getSvgIcon('start-icon', this.isMobile() ? 70 : 150, semanticColors.addButton)}
                                        </View>
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
                                flexDirection: "column",
                                width: pagesContainerWidth, left: 0, height: "100%",
                                alignItems: flexStart

                            }}>
                                {/* pagesTitle */}
                                <View style={{
                                    flexDirection: row,
                                    width: "100%",
                                    height: pagesTitleHeight,
                                    alignItems: 'center',
                                    alignContent: 'flex-start',
                                    borderBottomWidth: this.state.currentFolder ? 1 : 0,
                                    borderBottomColor: 'gray',
                                    backgroundColor: semanticColors.mainAreaBG,
                                    zIndex: 1000
                                }}>
                                    <Spacer width={3} />
                                    {items.length > 0 && getSvgIconButton(() => this.setState({ sortBy: SORT_BY_DATE }), semanticColors.addButton, "sort-by-date", 45, undefined, undefined, (this.state.sortBy == SORT_BY_DATE))}
                                    <Spacer width={3} />
                                    {items.length > 0 && getSvgIconButton(() => this.setState({ sortBy: SORT_BY_NAME }), semanticColors.addButton, "sort-by-name", 45, undefined, undefined, (this.state.sortBy == SORT_BY_NAME))}
                                    {items.length == 0 && <Spacer width={90} />}

                                    {this.state.currentFolder ? <FolderNew
                                        width={pagesContainerWidth - 90}
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
                                            width={this.isMobile() ? "75%" : "85%"}
                                            rtl={rtl}
                                            value={this.state.filterFolders}
                                            onChangeText={(txt) => {
                                                //Alert.alert("filter: "+ txt)
                                                this.setState({ filterFolders: txt })
                                            }
                                            }
                                        />}


                                </View>
                                {/* pages */}
                                {this.state.inprogress && <View style={{ position: 'absolute', left: "50%", top: "50%" }}>
                                    <ActivityIndicator size="large" />
                                </View>}


                                <SBDraxScrollView
                                    rtl={rtl}
                                    scrollEnabled={true}
                                    showsVerticalScrollIndicator={false}
                                    style={{
                                        flex: 1,
                                        flexDirection: "column",
                                    }}
                                    bounces={false}

                                    contentContainerStyle={{
                                        height: scrollerHeight,
                                        backgroundColor: semanticColors.mainAreaBG,
                                        top: 0,
                                        minWidth: "100%",
                                    }}>



                                    {this.state.filterFolders?.length > 0 && !this.state.currentFolder &&
                                        <AppText style={{ fontSize: 25, paddingRight: 15, lineHeight: 25 + 2 }}>
                                            {translate("SearchResults") + ":   " + (folders.length === 0 && items.length === 0 ? translate("NoSearchResults") : "")}
                                        </AppText>
                                    }


                                    {!this.state.currentFolder && <View
                                        style={{
                                            flexWrap: 'wrap', flexDirection: rowReverse,
                                            width: '100%', alignItems: 'center',
                                        }}
                                    >
                                        {folders.map((item, index) => <FolderNew
                                            key={index.toString()}
                                            id={item.name}
                                            isOverview={true}
                                            name={item.name}
                                            color={item.color}
                                            icon={item.icon}
                                            width={this.isLandscape() ? '20%' : '25%'}
                                            editMode={this.state.editMode}
                                            fixedFolder={false}//item.name === DEFAULT_FOLDER_NAME}
                                            current={false}
                                            onPress={() => this.selectFolder(item)}

                                            isLandscape={this.isLandscape()}
                                        />)}

                                    </View>}

                                    {items.length > 0 ?
                                        <View style={{
                                            flexDirection: asTiles ? rowReverse : 'column',
                                            flexWrap: 'wrap',
                                            minWidth: "100%",
                                        }}>
                                            {this.sortFiles(items).map((item, i) => (<DraxView
                                                key={i}
                                                payload={{ item, folder: this.state.currentFolder?.name }}
                                                numColumns={asTiles ? numColumnsForTiles : 1}
                                                longPressDelay={700}
                                            >
                                                {asTiles && <Spacer />}
                                                {FileNew({
                                                    rtl,
                                                    rowDir: rowReverse,
                                                    page: item,
                                                    asTile: asTiles,
                                                    name: item.name,
                                                    rowWidth: pagesContainerWidth,
                                                    editMode: this.state.editMode,
                                                    //selected: this.isSelected(item),
                                                    onPress: () => this.goEdit(item, this.state.currentFolder, false),
                                                    onContextMenu: () => this.setSelected(item),
                                                    count: item.count
                                                })}
                                            </DraxView>))
                                            }
                                        </View>


                                        : this.state.currentFolder && (folderIsLoading ?
                                            <View>
                                                <AppText style={{ fontSize: 35 }}>{translate("Loading")}</AppText>
                                            </View>
                                            :
                                            <View style={{
                                                alignItems: 'center',
                                                height: '100%',
                                                minWidth: "100%"
                                            }}>
                                                <Spacer height='20%' />
                                                {getSvgIcon('folder', this.isMobile() ? 85 : 150)}
                                                <AppText style={{ fontSize: 35, color: '#797a7c' }}>{translate("NoPagesYet")}</AppText>
                                            </View>
                                        )

                                    }
                                </SBDraxScrollView>
                            </View>

                        }
                        {/* tree */}
                        {!isEmptyApp && this.state.currentFolder &&
                            <View style={{

                                flexDirection: "column",
                                top: 0,
                                width: treeWidth,
                                right: 0,
                                height: "100%",
                                backgroundColor: 'white'
                            }}>

                                <DraxView
                                    onReceiveDragEnter={() => this.setState({ homeDragOver: true })}
                                    onReceiveDragExit={() => this.setState({ homeDragOver: false })}
                                    onReceiveDragDrop={({ dragged: { payload } }) => {
                                        this.setState({ homeDragOver: false })
                                        //trace(`received ${JSON.stringify(payload)}`);
                                        trace("Drop on Folder", "from", payload.folder, "to", FileSystem.DEFAULT_FOLDER.name)
                                        if (payload.folder === FileSystem.DEFAULT_FOLDER.name) {
                                            trace("drop on same folder")
                                            return;
                                        }
                                        FileSystem.main.movePage(payload.item, FileSystem.DEFAULT_FOLDER.name)
                                            .then(() => showMessage({
                                                message: fTranslate("SuccessfulMovePageMsg", payload.item.name, translate("DefaultFolder")),
                                                type: "success",
                                                animated: true,
                                                duration: 5000,

                                            })
                                            )
                                    }}
                                    style={{
                                        height: this.isScreenLow() ? '17%' : '10%',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: this.state.homeDragOver ? "lightblue" : "transparent"
                                    }}>
                                    <TouchableOpacity onPress={() => this.unselectFolder()}>


                                        <SvgIcon name="home" size={40} color={"gray"} />
                                    </TouchableOpacity>
                                </DraxView>


                                <SBDraxScrollView
                                    rtl={rtl}
                                    myRef={ref => this.foldersTree = ref}
                                    scrollEnabled={true}
                                    showsVerticalScrollIndicator={false}
                                    style={{
                                        flex: 1,
                                        flexDirection: "column",
                                        //height: (this.state.windowSize.height - dimensions.topView - dimensions.toolbarHeight ),
                                        backgroundColor: 'white',
                                        zIndex: 99999
                                    }}
                                    bounces={false}

                                    contentContainerStyle={{
                                        height: foldersHeightSize
                                    }}>

                                    {
                                        folders.map((f, i, arr) => <FolderNew
                                            key={i}
                                            index={i}
                                            isLast={i + 1 == arr.length}
                                            useColors={this.state.folderColor}
                                            id={f.name}
                                            name={f.name}
                                            color={f.color}
                                            icon={f.icon}
                                            editMode={this.state.editMode}
                                            fixedFolder={f.name === FileSystem.DEFAULT_FOLDER.name}
                                            //dragPanResponder={this._panResponder.panHandlers} 
                                            current={(this.state.currentFolder && f.name == this.state.currentFolder.name)}
                                            onPress={() => this.selectFolder(f)}
                                            onLongPress={() => {
                                                if (this.state.currentFolder && f.name == this.state.currentFolder.name)
                                                    this.unselectFolder()
                                            }}
                                            onMoveUp={() => this.moveFolderUp(f)}
                                            onMoveDown={() => this.moveFolderDown(f)}
                                            isLandscape={this.isLandscape()}
                                        />)

                                    }
                                </SBDraxScrollView>
                            </View>
                        }
                    </View>
                </View>
            </DraxProvider>
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


