import React from 'react';
import { View, Alert, Text, TouchableOpacity, PanResponder, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements'
import { FlatList } from 'react-native-gesture-handler';

import {
    getIconButton, folderIcons, availableIcons,
    getImageDimensions,
    globalStyles, NEW_FOLDER_NAME, NO_FOLDER_NAME, DEFAULT_FOLDER_NAME,
    getPageNavigationButtons, getFileNameDialog, semanticColors, getFolderAndIcon,
    Spacer, getRoundedButton, dimensions, validPathPart
} from './elements'
import { ScrollView, TextInput } from 'react-native-gesture-handler';

export default class IssieCreateFolder extends React.Component {
    static navigationOptions = {
        title: 'יצירת תיקיה חדשה',
        headerStyle: globalStyles.headerStyle,
        headerTintColor: 'white',
        headerTitleStyle: globalStyles.headerTitleStyle,
    };

    constructor() {
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

        this.state = {
            yOffset: 0,
            name: '',
            icon: ''
        };
    }

    pickerRenderIcon(rowData, rowID, highlighted) {
        return (
            <View style={[globalStyles.textInput, {
                flex: 1,
                flexDirection: 'row',
                backgroundColor: 'white',
                alignItems: 'center',
                justifyContent: 'space-between'
            }]}>
                <Icon name={rowData.icon} size={50} color={semanticColors.folderIcons} />
                <Text style={{ fontSize: 40 }}>{rowData.text}</Text>
            </View>
        );
    }

    Save = async () => {
        let success = true;
        let saveNewFolder = this.props.navigation.getParam('saveNewFolder', undefined);
        if (saveNewFolder) {
            let folderName = this.state.name;
            if (folderName.length > 0 && this.state.icon.length > 0) {
                folderName += '$' + this.state.icon;
            }
            success = await saveNewFolder(folderName);
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
                getRoundedButton(() => this.props.navigation.goBack(), 'close', 'בטל', 30, 30, { width: 150, height: 40 })
            }
            <Spacer width={10} />
            {  //Save
                getRoundedButton(() => this.Save(), 'check', 'שמור', 30, 30, { width: 150, height: 40 })
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
                    justifyContent: 'center',
                    transform: [{ translateY: this.state.yOffset }]
                }}
                    {...this._panResponderMove.panHandlers}>

                    <View style={{ flex: 1, flexDirection: 'row-reverse', alignContent: 'space-between', height: 200 }}>
                        <View style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Text style={styles.titleText}>שם התיקיה</Text>
                            <TextInput style={[globalStyles.textInput, { right: 0, width: '90%' }]} value={this.state.name}
                                onChangeText={(txt) => this.setState({ name: txt })}
                            />
                        </View>
                        <View style={{ flex: 1, paddingRight: 100, flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Text style={[styles.titleText,{paddingTop:15}]}>סמל</Text>
                            <View style={{backgroundColor:'white', width:70, height:70, justifyContent:'center'}}>
                            {this.state.icon !== '' ? <Icon name={this.state.icon} size={55} /> : null}
                            </View>
                        </View>
                    </View>
                    <Spacer />
                    <View style={{ position:'absolute', width:'100%', left:0, top:180,flexDirection: 'column', alignItems: 'center' }}>
                        <Text style={styles.subTitleText}>מבחר סמלים</Text>

                        <FlatList
                            data={availableIcons}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={{ padding: 20 }} onPress={() => {
                                    this.setState({ icon: item, yOffset: 0 })
                                }}>
                                    <Icon name={item} size={55} />
                                </TouchableOpacity>
                            )}
                            //Setting the number of column
                            numColumns={5}
                            keyExtractor={(item, index) => index.toString()}
                        />

                    </View>

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
        fontSize: 60,
        height: 70,
        textAlign: "right",
        width: "100%",
        fontWeight: 'bold',
        color: semanticColors.titleText,
        backgroundColor: 'transparent'
    },
    subTitleText: {
        fontSize: 35,
        textAlign: "center",
        width: "100%",
        fontWeight: 'bold',
        color: semanticColors.titleText,
        backgroundColor: 'transparent'
    }


});