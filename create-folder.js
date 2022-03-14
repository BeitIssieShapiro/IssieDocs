import React from 'react';
import { View, Alert, Text, TouchableOpacity, PanResponder, StyleSheet, Dimensions } from 'react-native';
import { AppText, FolderIcon, getSvgIconButton } from './elements.js'
import { Icon } from 'react-native-elements'
import { translate } from './lang.js'
import Scroller from './scroller';

import {
    getIconButton, folderIcons, availableIcons,
    getImageDimensions, availableColorPicker,
    globalStyles,
    getPageNavigationButtons, semanticColors,
    Spacer, getRoundedButton, dimensions, getColorButton
} from './elements'
import { ScrollView, TextInput } from 'react-native-gesture-handler';
import { getNewPage, SRC_GALLERY } from './newPage.js';
import { trace } from './log.js';
import { FileSystem } from './filesystem.js';

export default class IssieCreateFolder extends React.Component {


    constructor(props) {
        super();

        this._panResponderMove = PanResponder.create({
            onStartShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
            onStartShouldSetPanResponderCapture: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
            onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
            onMoveShouldSetPanResponderCapture: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
            onPanResponderMove: (evt, gestureState) => {

                let yOffsetBegin = this.state.yOffsetBegin;
                if (!yOffsetBegin) {
                    yOffsetBegin = this.state.yOffset;
                }
                let newYOffset = yOffsetBegin + gestureState.dy;
                if (newYOffset > 0) {
                    newYOffset = 0;
                }

                this.setState({
                    yOffsetBegin, yOffset: newYOffset
                });
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (gestureState.dx == 0 && gestureState.dy == 0) {
                    return
                }
                this.setState({
                    yOffsetBegin: undefined
                });
            }
        });

        let name = '', icon = '', color = '';
        let currentFolderName = props.route.params.currentFolderName;
        name = currentFolderName;
        icon = props.route.params.currentFolderIcon;
        color = props.route.params.currentFolderColor;

        this.state = {
            yOffset: 0,
            name,
            icon,
            color,
            currentFolderName,
            windowSize: { height: 1000, width: 1000 }
        };
    }

    onLayout = () => {
        let windowSize = Dimensions.get("window");
        this.setState({ windowSize });
    }

    isLandscape = () => {
        let dim = this.state.windowSize;
        if (!dim) {
            return false;
        }
        return dim.width > dim.height;
    }

    isMobile=() => this.props.route.params.isMobile

    Save = async () => {
        if (this.saveInProgress)
            return;
        try {
            this.saveInProgress = true;

            let success = true;
            let saveNewFolder = this.props.route.params.saveNewFolder;
            if (saveNewFolder) {
                success = await saveNewFolder(this.state.name, this.state.color, this.state.icon, this.state.currentFolderName);
            }
            if (success) {
                this.props.navigation.goBack();
            }
        } finally {
            this.saveInProgress = false;
        }
    }

    AddPhoto() {
        getNewPage(SRC_GALLERY,
            //okEvent
            uri => {
                // trace("image in base64", uri.length)
                // this.setState({ icon: uri})
                trace("Saving photo for folder", uri)
                this.props.navigation.push('SavePhoto', {
                    uri: uri,
                    title: "עריכת תמונה",
                    imageSource: SRC_GALLERY,
                    onConfirm: (uri) => {
                        FileSystem.main.resizeImage(uri, 100, 100)
                            .then(uri2 => FileSystem.main.convertImageToBase64(uri2))
                            .then(imgBase64 => this.setState({ icon: imgBase64 }))
                    },
                    skipConfirm: false,
                    folder: undefined,
                    returnFolderCallback: (f) => { },
                    saveNewFolder: (newFolder, color, icon) => { }

                })
            },
            //cancelEvent
            () => {},
            this.props.navigation,
            { selectionLimit: 1, quality: 0 }
        );
    }

    render() {
        let actionButtons = <View style={{
            position: 'absolute',
            height: '100%',
            right: 10,
            flexDirection: 'row',
            alignItems: 'center'
        }}>



            {  //Cancel
                getRoundedButton(() => this.props.navigation.goBack(), 'cancel-red', translate("BtnCancel"), 30, 30, { width: 150, height: 40 },undefined, undefined, this.isMobile())
            }
            <Spacer width={10} />
            {  //Save
                getRoundedButton(() => this.Save(), 'check-green', translate("BtnSave"), 30, 30, { width: 150, height: 40 },undefined, undefined, this.isMobile())
            }
        </View>



        let iconsSelection = <View style={{ flex: 1, width: '100%' }}>
            <View
                style={{
                    flexDirection: 'row-reverse',
                    //width:"80%",
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    //backgroundColor: 'green'
                }}>
                <AppText style={styles.titleText}>{translate("CaptionIcon")}</AppText>

                {getRoundedButton(() => this.AddPhoto(),
                    'svg-new-image', translate("BtnAddPhoto"), 30, 30, { width: 250, height: 40 }, 'row-reverse', true)
                }
            </View>
            <View style={{
                width: '100%',
                borderRadius: 10,
                backgroundColor: 'white',
                flexDirection: 'row-reverse',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <TouchableOpacity style={{ padding: 20 }} onPress={() => {
                    this.setState({ icon: "", yOffset: 0 })
                }}>
                    <AppText style={{ fontSize: 35, color: (this.state.icon === "" ? semanticColors.selectedIconColor : semanticColors.availableIconColor) }} >{translate("NoIcon")}</AppText>
                </TouchableOpacity>
                {
                    availableIcons.map((item, i) => (
                        <TouchableOpacity style={{ padding: 20 }} key={i} onPress={() => {
                            this.setState({ icon: item, yOffset: 0 })
                        }}>
                            <Icon name={item} size={55} color={this.state.icon === item ? semanticColors.selectedIconColor : semanticColors.availableIconColor} />
                        </TouchableOpacity>
                    ))
                }
            </View>
        </View>

        let colorSelection = <View style={{
            flexDirection: 'row',
            width: '100%', bottom: 0,
            justifyContent: 'space-evenly',
            alignItems: 'center',
            flexWrap: 'wrap'
        }}
        >
            {availableColorPicker.map((color, i) => (
                <View key={i} style={[this.isLandscape() && { height: 100, width: '30%', alignItems: 'center', marginTop: 20 }]}>
                    {getColorButton(() => this.setState({ color: color }),
                        color, 50, color == this.state.color, i)}
                </View>))
            }
        </View>

        return (
            <View style={styles.container}
                ref={v => this.topView = v}
                onLayout={this.onLayout}>

                {/* Toolbar */}
                <View style={{
                    zIndex: 5, width: '100%',
                    height: dimensions.toolbarHeight, backgroundColor: semanticColors.subTitle
                }} >
                    {actionButtons}
                </View>

                {/*Main view */}
                <View style={{
                    flexDirection: 'column', height: '100%',
                    left: '5%', width: '90%'
                }}
                >
                    <View style={[{ flexDirection: 'row-reverse' },
                    this.isLandscape() ? { height: '100%' } : {}]}>
                        <View style={{
                            flex: 1, flexDirection: 'column', width: '100%', alignItems: 'flex-end'
                        }}
                        >
                            <View style={{ width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start' }}>
                                <Icon name="folder" size={55} color={this.state.color ? this.state.color : 'gray'} />
                                <AppText style={styles.titleText}>{translate("CaptionFolderNameInput")}</AppText>
                                <View style={{ position: 'absolute', left: 10, top: 21 }}>
                                    {this.state.icon ? <FolderIcon name={this.state.icon} size={30} color='white' /> : null}
                                </View>
                            </View>


                            <TextInput style={[globalStyles.textInput]} value={this.state.name}
                                onChangeText={(txt) => this.setState({ name: txt })}
                            />
                            <AppText style={styles.titleText}>{translate("CaptionFolderColor")}</AppText>
                            {colorSelection}
                        </View>
                        {this.isLandscape() ? <Spacer /> : null}
                        {this.isLandscape() ? iconsSelection : null}
                    </View>
                    <Spacer />
                    {this.isLandscape() ? null : iconsSelection}
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: semanticColors.mainAreaBG,
        opacity: 5
    },
    textInputView: {
        position: 'absolute',
        flex: 1,
        flexDirection: 'column',
        alignItems: "center",
        justifyContent: "flex-end",
        width: "60%",
        right: "20%",
        top: "3%",
        backgroundColor: 'transparent'
    },
    titleText: {
        fontSize: 35,
        height: 70,
        paddingTop: 12,
        textAlign: "right",
        fontWeight: 'bold',
        color: semanticColors.titleText,
        backgroundColor: 'transparent'
    },
    subTitleText: {
        fontSize: 35,
        textAlign: "right",
        paddingRight: 15,
        width: "100%",
        fontWeight: 'bold',
        color: semanticColors.titleText,
        backgroundColor: 'transparent'
    }


});