import {
    TouchableOpacity, Text, StyleSheet, Image, View,
    TouchableHighlight, Alert
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
    gray: ['#D2DEEA', '#D2DEEA'],
    yellow: ['#FCF300', '#B0A000'],
    green: ['#00F815', '#005C05'],
    red: ['#FF0000', '#A20000'],
    black: ['#000000', '#000000'],
    disabled: ['#A8C2D8', '#A8C2D8']
}


export const NEW_FOLDER_NAME = 'תיקיה חדשה';
export const NO_FOLDER_NAME = 'ללא';
export const DEFAULT_FOLDER_NAME = 'Default';
const FOLDER_NO_ICON = 'sentiment-satisfied';


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
            style={[styles.squareShapeView, dim, selected ? styles.selected : styles.notSelected, iconFirst ? { flexDirection: 'row-reverse' } : {}]}>
            <Text style={{ fontSize: size, color: 'white', marginLeft: lMargin, marginRight: rMargin }}>{txt ? txt : ''}</Text>
            {icon ? <Icon name={icon} size={iconSize} color='white' /> : null}
        </LinearGradient>
    </TouchableOpacity>
}

export function getFolderPicker(folder, folders, callback) {
    console.disableYellowBox = true;
    let folderName = folder;
    let iconName = '';
    if (folder) {
        let parts = folder.split("$")
        if (parts.length == 2) {
            folderName = parts[0]
            iconName = parts[1]
        }
    }
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
            <Icon name='arrow-drop-down' size={50} color="#4630EB" />
            <Icon name={iconName} size={50} color="#4630EB" />
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
                <Icon name={iconName} size={50}></Icon>
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
            <Icon name='arrow-drop-down' size={50} color="#4630EB" />
            <Icon name={pickerIcon} size={50} color="#4630EB" />
        </View>
    </ModalDropdown>
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

function pickerRenderIcon(rowData, rowID, highlighted) {
    return (
        <TouchableHighlight underlayColor='cornflowerblue'>
            <View style={[globalStyles.textInput, {
                flex: 1,
                flexDirection: 'row',
                backgroundColor: 'white',
                alignItems: 'center',
                
                justifyContent:'space-between'
            }]}>
                <Icon name={rowData.icon} size={50} color="#4630EB" />
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
            getSquareButton(() => callback(-1), colors.navyBlue, undefined, 'דף קודם', 'chevron-left', 30, undefined, { width: 150, height: 60 }, 60, true, 15)
        }

        {isLast ?
            <View /> :
            getSquareButton(() => callback(1), colors.navyBlue, undefined, 'דף הבא', 'chevron-right', 30, undefined, { width: 150, height: 60 }, 60, false, 0, 15)
        }
    </View>
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
    }
})


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
});