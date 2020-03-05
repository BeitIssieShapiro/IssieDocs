import React from 'react';
import { View, Alert, Text, TouchableOpacity, PanResponder, StyleSheet, Dimensions } from 'react-native';
import { getHeaderBackButton, AppText } from './elements.js'
import { Icon } from 'react-native-elements'
import { translate } from './lang.js'

import {
    getIconButton, folderIcons, availableIcons,
    getImageDimensions, availableColorPicker,
    globalStyles,
    getPageNavigationButtons, getFileNameDialog, semanticColors, getFolderAndIcon,
    Spacer, getRoundedButton, dimensions, getColorButton
} from './elements'
import { ScrollView, TextInput } from 'react-native-gesture-handler';

export default class IssieCreateFolder extends React.Component {
    static navigationOptions = ({ navigation }) => {
        let curFolder = navigation.getParam('currentFolderName', undefined);
        let title = curFolder ? translate("EditFolderFormTitle") : translate("NewFolderFormTitle");
        return {
            title,
            headerStyle: globalStyles.headerStyle,
            headerTintColor: 'white',
            headerTitleStyle: globalStyles.headerTitleStyle,
            headerLeft: getHeaderBackButton(navigation)
        }
    };

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
        let currentFolderName = props.navigation.getParam('currentFolderName', undefined);
        if (currentFolderName) {
            let curFolder = getFolderAndIcon(currentFolderName);
            name = curFolder.name;
            icon = curFolder.icon;
            color = curFolder.color;
        }

        this.state = {
            yOffset: 0,
            name,
            icon,
            color,
            currentFolderName
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


    Save = async () => {
        let success = true;
        let saveNewFolder = this.props.navigation.getParam('saveNewFolder', undefined);
        if (saveNewFolder) {
            let folderName = this.state.name;
            if (this.state.icon.length > 0) {
                folderName += '$' + this.state.icon;
            }
            if (this.state.color.length > 0) {
                folderName += '#' + this.state.color;
            }

            success = await saveNewFolder(folderName, this.state.currentFolderName);
        }
        if (success) {
            this.props.navigation.goBack();
        }
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
                getRoundedButton(() => this.props.navigation.goBack(), 'cancel-red', translate("BtnCancel"), 30, 30, { width: 150, height: 40 })
            }
            <Spacer width={10} />
            {  //Save
                getRoundedButton(() => this.Save(), 'check-green', translate("BtnSave"), 30, 30, { width: 150, height: 40 })
            }
        </View>


        let iconsSelection = <View style={{ flex: 1, alignItems: 'flex-end', width: '100%' }}>
            <AppText style={styles.titleText}>{translate("CaptionIcon")}</AppText>

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
        }}>
            {availableColorPicker.map((color, i) => (
                <View key={i} style={[this.isLandscape() && {height: 100, width:'30%', alignItems:'center', marginTop:20}]}>
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
                    flex: 1, zIndex: 5, position: 'absolute', top: 0, width: '100%',
                    height: dimensions.toolbarHeight, backgroundColor: semanticColors.subTitle
                }} >
                    {actionButtons}
                </View>

                {/*Main view */}
                <View style={{
                    position: 'absolute',
                    height: '85%',
                    top: dimensions.toolbarHeight,
                    left: '5%', width: '90%',
                    transform: [{ translateY: this.state.yOffset }]
                }}
                    {...this._panResponderMove.panHandlers}>

                    <View style={[{ flexDirection: 'row-reverse' },
                    this.isLandscape() ? { height: '100%' } : {}]}>
                        <View style={{
                            flex: 1, flexDirection: 'column', width: '100%', alignItems: 'flex-end'
                        }}>
                            <View style={{ width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start' }}>
                                <Icon name="folder" size={55} color={this.state.color?this.state.color:'gray'} />
                                <AppText style={styles.titleText}>{translate("CaptionFolderNameInput")}</AppText>
                                <View style={{ position: 'absolute', left: 10, top: 21 }}>
                                    {this.state.icon ? <Icon name={this.state.icon} size={30} color='white' /> : null}
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
        width: "80%",
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