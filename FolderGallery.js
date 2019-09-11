import React from 'react';
import {
    Image, StyleSheet, View,
    TouchableOpacity, Button, ScrollView, Alert, Text, Dimensions
} from 'react-native';
import * as RNFS from 'react-native-fs';
import LinearGradient from 'react-native-linear-gradient';
import FolderNew from './FolderNew';
import FileNew from './FileNew'
import {
    getFolderAndIcon, normalizeTitle,
    DEFAULT_FOLDER_NAME,
    semanticColors, getSquareButton
} from './elements'
import { SRC_CAMERA, SRC_GALLERY, getNewPage } from './newPage';
import ImagePicker from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';

export const FOLDERS_DIR = RNFS.DocumentDirectoryPath + '/folders/';

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
            let foldersState = [];

            for (let folder of folders) {
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
            if (this.state.currentFolder) {
                //try to restore to the same:
                currentFolder = foldersState.find(f => f.name == this.state.currentFolder.name);
            }
            if (!currentFolder) {
                //Alert.alert(JSON.stringify(foldersState))
                currentFolder = foldersState.find(f => f.name == DEFAULT_FOLDER_NAME);
            }
            

            this.setState({ folders: organizeFolders(foldersState), currentFolder });

        })

    }

    newFromCamera = () => {
        getNewPage(SRC_CAMERA,
            (uri) => this.props.navigation.navigate('SavePhoto', {
                uri: uri, imageSource: SRC_CAMERA,
                folder: this.state.currentFolder? this.state.currentFolder.name: undefined 
            }),
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
                    folder: this.state.currentFolder? this.state.currentFolder.name: undefined ,
                    imageSource: SRC_GALLERY
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
                folder: this.state.currentFolder? this.state.currentFolder.name: undefined 
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
                        }, semanticColors.addButtonG, undefined, "", "camera-alt", 55, false, { width: 70, height: 70 }, 55)
                    }
                    <Spacer />
                    {
                        getSquareButton(() => {
                            this.newFromMediaLib();
                        }, semanticColors.addButtonG, undefined, "", "photo-library", 55, false, { width: 70, height: 70 }, 55)
                    }
                    <Spacer />
                    {
                        getSquareButton(() => {
                            this.newFromFileExplorer();
                        }, semanticColors.addButtonG, undefined, "", "picture-as-pdf", 55, false, { width: 70, height: 70 }, 55)
                    }
                    {/*right buttons */}
                    <View style={{ position: 'absolute', right: 0, flexDirection: 'row-reverse' }}>
                        {
                            getSquareButton(() => {
                                this.setState({ editMode: true });
                            }, semanticColors.addButtonG, undefined, "", "edit", 55, false, { width: 70, height: 70 }, 55)
                        }
                    </View>
                </View>
                <View style={{ flex: 1, flexDirection: "row", position: 'absolute', width: "100%", top: "10%", left: 0, height: "90%" }} >
                    {/* MainExplored */}
                    <View style={[{ flex: 1, flexDirection: "column", position: 'absolute', top: 0, width: "66%", left: 0, height: "100%" }
                        , styles.borderW]}>
                        {/* pagesTitle */}
                        <View style={{ flex: 1, height: "5%", backgroundColor: semanticColors.title, position: 'absolute', width: "100%", top: 0, height: '10%', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 35 }}>{normalizeTitle(getFolderAndIcon(this.state.currentFolder && this.state.currentFolder.name)[0])}</Text>
                        </View>
                        {/* pages */}
                        <View style={[{
                            flex: 1, backgroundColor: "white", position: 'absolute', top: "10%", width: "100%", height: '90%',
                        }, styles.borderW]}>
                            {
                                this.state.currentFolder && this.state.currentFolder.files ? this.state.currentFolder.files.map(p => FileNew({
                                    page: p, 
                                    onPress: () => this.props.navigation.navigate('EditPhoto', { page: p, share: false }),
                                    count: p.pages.length
                                })) : null
                            }
                        </View>
                    </View>
                    {/* tree */}
                    <LinearGradient colors={semanticColors.headerG}
                        style={[{ flex: 1, flexDirection: "column", position: 'absolute', top: 0, width: "34%", right: 0, height: "100%", alignItems: "flex-end", justifyContent: "flex-start" },
                        styles.borderW]}>

                        {this.state.folders ?
                            this.state.folders.map(f => FolderNew({
                                id: f.name,
                                name: f.name,
                                current: (this.state.currentFolder && f.name == this.state.currentFolder.name),
                                onPress: () => this.onFolderPressed(f)
                            })) : null}
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

function Spacer(props) {
    return (
        <View style={{ width: props.width || 20 }} />
    );
}

function organizeFolders(folders) {
    if (!folders) {
        return folders;
    }

    let defIndex = folders.findIndex(f => f.name == DEFAULT_FOLDER_NAME);
    if (defIndex < 0) {
        //Add a default empty - todo
    } else {
        //swap
        let temp = folders[0];
        folders[0] = folders[defIndex];
        folders[defIndex] = temp;
    }
    return folders;
}

