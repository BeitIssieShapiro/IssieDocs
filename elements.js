import {
    TouchableOpacity, Text, StyleSheet, Image, View,
    TouchableHighlight, Alert, TextInput
} from 'react-native';
import { Icon } from 'react-native-elements'
import LinearGradient from 'react-native-linear-gradient';
import React from 'react';
import ModalDropdown from 'react-native-modal-dropdown';

export const colors = {
    gray: ['#5B748A', '#587189'],
    orange: ['#FFA264', '#A24A04'],
    blue: ['#0097F8', '#00145C'],
    lightBlue: ['#2F8AF2', '#1A427C'],
    navyBlue: ['#1A427C', '#1A427C'],
    //gray: ['#D2DEEA', '#D2DEEA'],
    yellow: ['#FCF300', '#B0A000'],
    green: ['#00F815', '#005C05'],
    red: ['#FF0000', '#A20000'],
    black: ['#000000', '#000000'],
    lightGray: ['#A8C2D8', '#A8C2D8']
}

export const semanticColors = {
    disabledButtonG : colors.lightGray,
    disabledButton : colors.lightGray[0],
    cancelButtonG: colors.gray,
    cancelButton: colors.gray[0],
    okButtonG: colors.navyBlue,
    okButton: colors.navyBlue[0],
    deleteButtonG: colors.red,
    deleteButton: colors.red[0],
    addButtonG: colors.navyBlue,
    addButton: colors.navyBlue[0],
    undoButtonG: colors.gray,
    undoButton: colors.gray[0],
    InactiveModeButtonG: colors.gray,
    InactiveModeButton: colors.gray[0],
    activeZoomButtonG: colors.orange,
    activeZoomButton: colors.orange[0],
    actionButtonG: colors.blue,
    actionButton:colors.blue[0],
    folderIcons:colors.navyBlue,
    pageNavigationButtonG:colors.navyBlue,
    selectedCheck: "#4630EB",
    moveInZoomButton:"#D16F28",
    header: '#8EAFCE',
    headerG: ['#6487B1','#8EAFCE'],
    title: '#DFE8EC',
    selectedFolder: '#446997'
    
}

export const folderIcons = [
    { icon: 'language', text: 'אנגלית' },
    { icon: 'music-note', text: 'מוזיקה' },
    { icon: 'pets', text: 'בעלי חיים' },
    { icon: 'exposure-plus-1', text: 'חשבון' },
    { icon: 'wb-incandescent', text: 'מדעים' },
    { icon: 'watch-later', text: 'היסטוריה' },
    { icon: 'book', text: 'תורה' },
    { icon: 'speaker-notes', text: 'לשון' },
    { icon: 'local-bar', text: 'חגים' }
]

export const NEW_FOLDER_NAME = 'תיקיה חדשה';
export const NO_FOLDER_NAME = 'ללא';
export const DEFAULT_FOLDER_NAME = 'Default';
export const DEFAULT_FOLDER_TITLE = "ללא תיקיה";

const FOLDER_NO_ICON = 'sentiment-satisfied';

export function validPathPart(pathPart) {
    if (!pathPart || pathPart.length == 0) {
        return false;
    }
    if (pathPart.includes('/')) {
        return false
    }
    return true;
}

export function getSquareButton(func, color, selectedColor, txt, icon, size, selected, dimensions,
    iconSize, iconFirst, rMargin, lMargin) {
    let dim = {
        width: styles.squareShapeView.width,
        height: styles.squareShapeView.height
    }
    if (dimensions) {
        dim = dimensions
    }
    if (!iconSize)
        iconSize = size;

    if (!rMargin) rMargin = 0;
    if (!lMargin) lMargin = 0;

    if (iconFirst == undefined)
        iconFirst = false;

    return <TouchableOpacity
        activeOpacity={0.7}
        onPress={func}
    >
        <LinearGradient
            colors={selected ? selectedColor : color}
            style={[styles.squareShapeView, dim, styles.notSelected, iconFirst ? { flexDirection: 'row-reverse' } : {}]}>
            <Text style={{ fontSize: size, color: 'white', marginLeft: lMargin, marginRight: rMargin }}>{txt ? txt : ''}</Text>
            {icon ? <Icon name={icon} size={iconSize} color='white' /> : null}
        </LinearGradient>
    </TouchableOpacity>
}

export function getFolderAndIcon(folderName) {
    if (folderName) {
        let parts = folderName.split("$")
        if (parts.length == 2) {
            return {name: parts[0], icon: parts[1]};
        }
        return {name: folderName, icon:""};
    }
    return {name:"", icon:""};
}

export function normalizeTitle(title) {
    if (title ==  DEFAULT_FOLDER_NAME) {
        return DEFAULT_FOLDER_TITLE;
    } 
    return title;
}

export function getFileNameDialog(fileName, folderAndIcon, newFolderAndIcon, folders, 
    onChangeName, onChangeFolder, onChangeNewFolder, panResponder, yOffset) {
    
    
    if (!yOffset) {
        yOffset = 0;
    }
    let folderName = folderAndIcon.name;
    if (folderName == DEFAULT_FOLDER_NAME) {
        folderName = NO_FOLDER_NAME;
    }
    //Alert.alert("folder:"+ folderName)
    return (
        <View style={[styles.textInputView, {
            transform: [{ translateY: yOffset }]
        }]} {...panResponder}>
            <Text style={styles.titleText}>שם הדף</Text>
            <TextInput style={globalStyles.textInput}
                onChangeText={onChangeName}
            >{fileName}</TextInput>
            <Text style={styles.titleText}>תיקיה</Text>
            {getFolderPicker(folderName, folderAndIcon.icon, folders,
                (itemIndex, itemValue) => {
                    if (itemValue == NO_FOLDER_NAME) {
                        itemValue = undefined;
                    }
                    onChangeFolder(itemValue)
                })
            }
            {folderName == NEW_FOLDER_NAME ?
                //New folder picker
                <View style={{ flex: 1, width: '100%' }}>
                    <Text style={styles.titleText}>שם התיקיה</Text>
                    <View style={{ flex: 1, flexDirection: 'row-reverse' }}>
                        <TextInput style={[globalStyles.textInput, { backgroundColor: 'white', width: '75%' }]}
                            onChangeText={onChangeNewFolder}
                            value={newFolderAndIcon.name}
                        />
                        <Text>   </Text>
                        {getIconPicker(newFolderAndIcon.icon, folderIcons, (itemIndex, itemValue) => {
                            onChangeNewFolder(itemValue.text + '$' + itemValue.icon);
                        })}
                    </View>
                </View>
                :
                //Not new folder
                null
            }
        </View>);
}

function getFolderPicker(folderName, iconName, folders, callback) {
    console.disableYellowBox = true;

    return <ModalDropdown
        style={[styles.pickerButton]}
        dropdownStyle={{ flex: 1, top: 0, width: '60%', height: 300 }}
        onSelect={callback}
        renderRow={pickerRenderRow}
        options={[NO_FOLDER_NAME, ...folders, NEW_FOLDER_NAME]} >
        <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            alignItems: 'center', alignContent: 'center'
        }}>
            <Icon name='arrow-drop-down' size={50} color={semanticColors.folderIcons} />
            <Icon name={iconName} size={50} color={semanticColors.folderIcons} />
            <Text style={styles.textInputPicker}>{folderName ? folderName : 'ללא'}</Text>
        </View>
    </ModalDropdown>
}

function pickerRenderRow(rowData, rowID, highlighted) {
    let evenRow = rowID % 2;
    let folderName = rowData;
    let iconName = '';
    if (rowData) {
        let parts = rowData.split("$")
        if (parts.length == 2) {
            folderName = parts[0]
            iconName = parts[1]
        }
    }
    return (
        <TouchableHighlight underlayColor='cornflowerblue'>
            <View style={[globalStyles.textInput, {
                backgroundColor: evenRow ? 'lemonchiffon' : 'white',
                alignContent: 'flex-end', justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: 'row'
            }]}>
                <Icon name={iconName} size={50} color={semanticColors.folderIcons}></Icon>
                <Text style={{ fontSize: 70, textAlign: 'right' }}>
                    {folderName}
                </Text>
            </View>
        </TouchableHighlight>
    );
}
export function getIconPicker(pickerIcon, icons, callback) {
    if (!pickerIcon || pickerIcon.length == 0) {
        pickerIcon = FOLDER_NO_ICON;
    }
    console.disableYellowBox = true;
    return <ModalDropdown
        style={[styles.pickerButton, { width: '30%' }]}
        dropdownStyle={{
            flex: 1,
            width: '60%',
            height: 300,
            top: 0
        }}
        onSelect={callback}
        renderRow={pickerRenderIcon}
        options={icons} >
        <View style={{
            height: '100%',
            flexDirection: 'row', justifyContent: 'space-between',
            alignItems: 'center', alignContent: 'center'
        }}>
            <Icon name='arrow-drop-down' size={50} color={semanticColors.folderIcons} />
            <Icon name={pickerIcon} size={50} color={semanticColors.folderIcons} />
        </View>
    </ModalDropdown>
}


function pickerRenderIcon(rowData, rowID, highlighted) {
    return (
        <TouchableHighlight underlayColor='cornflowerblue'>
            <View style={[globalStyles.textInput, {
                flex: 1,
                flexDirection: 'row',
                backgroundColor: 'white',
                alignItems: 'center',

                justifyContent: 'space-between'
            }]}>
                <Icon name={rowData.icon} size={50} color={semanticColors.folderIcons} />
                <Text style={{ fontSize: 55 }}>{rowData.text}</Text>
            </View>
        </TouchableHighlight>
    );
}

export async function getImageDimensions(uri) {
    return new Promise(
        (resolve, reject) => {
            Image.getSize(uri, (width, height) => {
                resolve({ w: width, h: height });
            },
                (err) => {
                    //Alert.alert(err)
                    reject(err)
                });
        }
    );
}

export function getPageNavigationButtons(left, width, isFirst, isLast, callback) {

    return <View
        style={{
            flexDirection: 'row',
            height: '10%',
            position: 'absolute',
            bottom: 0,
            left: left,
            width: width,
            justifyContent: 'space-between',
            zIndex: 1001
        }}
    >
        {isFirst ?
            <View /> :
            getSquareButton(() => callback(-1), semanticColors.pageNavigationButtonG, undefined, 'דף קודם', 'chevron-left', 30, undefined, { width: 150, height: 60 }, 60, true, 15)
        }

        {isLast ?
            <View /> :
            getSquareButton(() => callback(1), semanticColors.pageNavigationButtonG, undefined, 'דף הבא', 'chevron-right', 30, undefined, { width: 150, height: 60 }, 60, false, 0, 15)
        }
    </View>
}
export function removeFileExt(filePath) {
    return (filePath.split('\\').pop().split('/').pop().split('.'))[0];
}

export const globalStyles = StyleSheet.create({

    textInput: {
        fontSize: 60,
        height: 80,
        textAlign: "right",
        fontWeight: 'bold',
        color: 'black',
        width: '100%',
        backgroundColor: 'white'
    },
    okCancelView: {
        position: 'absolute',
        top: "5%",
        left: 50, right: 50, //middle
        flex: 1,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: "center",
      },
    btnDimensions: { 
        width: 60, 
        height: 60 
    }

})

export function Spacer(props) {
    return (
        <View style={{ width: props.width || 20 }} />
    );
}

const styles = StyleSheet.create({
    squareShapeView: {
        marginHorizontal: 2.5,
        alignItems: 'center',
        alignContent: 'center',
        flexDirection: 'row',
        height: 50,
        width: 50,
        backgroundColor: '#39579A',
        justifyContent: 'center',
        borderRadius: 5
    },

    pickerButton: {
        flex: 1,
        height: 80,
        fontSize: 70,
        fontWeight: 'bold',
        color: 'black',
        width: "100%",
        backgroundColor: 'white'
    },

    textInputPicker: {
        flex: 1,
        fontSize: 70,
        textAlign: "right",
        fontWeight: 'bold',
        color: 'black',
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center'
    },
    selected: {
        marginVertical: 0
    },
    notSelected: {
        marginVertical: 10
    },
    textInputView: {
        position: 'absolute',
        flex: 1,
        flexDirection: 'column',
        alignItems: "center",
        justifyContent: "flex-end",
        width: "60%",
        right: "20%",
        top: "12%",
        backgroundColor: 'transparent'
    },
    titleText: {
        fontSize: 60,
        textAlign: "right",
        width: "100%",
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: 'transparent'
    }
});

