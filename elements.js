import {
    TouchableOpacity, Text, StyleSheet, Image, View
    , Alert, TextInput
} from 'react-native';
import { Icon } from 'react-native-elements'
import LinearGradient from 'react-native-linear-gradient';
import React, { useState } from 'react';

export const dimensions = {
    toolbarHeight: 65,
    toolbarMargin: 5,
    topView: 70
}

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
    disabledButtonG: colors.lightGray,
    disabledButton: colors.lightGray[0],
    cancelButtonG: colors.gray,
    cancelButton: colors.gray[0],
    okButtonG: colors.navyBlue,
    okButton: colors.navyBlue[0],
    deleteButtonG: colors.red,
    deleteButton: colors.red[0],
    addButton: 'white', 
    undoButtonG: colors.gray,
    undoButton: colors.gray[0],
    InactiveModeButtonG: colors.gray,
    InactiveModeButton: colors.gray[0],
    activeZoomButtonG: colors.orange,
    activeZoomButton: colors.orange[0],
    actionButtonG: colors.blue,
    actionButton: colors.blue[0],
    folderIcons: colors.navyBlue,
    pageNavigationButtonG: colors.navyBlue,
    selectedCheck: "#4630EB",
    moveInZoomButton: "#D16F28",
    header: '#183d72',
    header2: 'white',
    headerG: ['#6487B1', '#8EAFCE'],
    mainAreaBG: '#eeeded',
    title: '#DFE8EC',
    subTitle: '#315890',
    titleText: '#183d72',
    selectedFolder: '#C7D4E8',
    editPhotoButton: 'white'

}

export const FolderTextStyle = {
    fontSize: 26,
    fontWeight: 'bold',
    color: semanticColors.titleText
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

export const availableColorPicker = [
    '#000000', '#fee100', '#20ad57', '#5db7dd', '#2958af', '#d62796', '#65309c', '#da3242', '#f5771c'
]

export const availableTextSize = [
    25, 30, 35, 40, 45
]

export const availableBrushSize = [
    1, 3, 5, 7, 9
]


export const folderColors = [
    '#f5771c', '#da3242', '#65309c', '#2958af', '#5db7dd', '#20ad57'
]

export const NEW_FOLDER_NAME = 'תיקיה חדשה';
export const NO_FOLDER_NAME = 'ללא';
export const DEFAULT_FOLDER_NAME = 'Default';
export const DEFAULT_FOLDER_TITLE = "ללא נושא";

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

export function getRoundedButton(callback, icon, text, textSize, iconSize, dim, direction) {
    return <TouchableOpacity
        activeOpacity={0.7}
        onPress={callback}
        style={{ ...dim }}
    >
        <View
            style={{
                flex: 1,
                zIndex: 6,
                borderRadius: 25,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#eeeded',
                shadowColor: 'black',
                shadowOpacity: 0.8,
                elevation: 1,
                shadowOffset: { width: 0, height: -2 },
                flexDirection: direction ? direction : 'row-reverse'
            }}>
            <Text style={{ fontSize: textSize, color: semanticColors.titleText, textAlignVertical: 'center' }}>{text ? ' ' + text : ''}</Text>
            <Spacer width={10} />
            <Icon name={icon} size={iconSize} color={semanticColors.titleText} />
        </View>
    </TouchableOpacity>
}
export function getIconButton(callback, color, icon, size, isText, iconSize, selected) {
    return <TouchableOpacity
        activeOpacity={0.7}
        onPress={callback}
        style={{
            backgroundColor: selected ? 'white' : 'transparent',
            width: size, height: size,
            alignContent: 'center',
            alignItems: 'center',
            borderRadius: size / 2,
            justifyContent: 'center'
        }}
    >
        {isText ?
            <Text style={{ fontSize: iconSize ? iconSize : size, color: color, paddingTop: 6 }}>{icon}</Text> :
            <Icon name={icon} size={iconSize ? iconSize : size} color={color} />}

    </TouchableOpacity>
}



export function getFolderAndIcon(folderName) {
    if (folderName) {
        let parts = folderName.split("$")
        if (parts.length == 2) {
            return { name: parts[0], icon: parts[1] };
        }
        return { name: folderName, icon: "" };
    }
    return { name: "", icon: "" };
}

export function normalizeTitle(title) {
    if (title == DEFAULT_FOLDER_NAME) {
        return DEFAULT_FOLDER_TITLE;
    }
    return title;
}

export function getFileNameDialog(fileName,
    folderAndIcon, newFolderAndIcon, folders,
    onChangeName, onChangeFolder, onChangeNewFolder) {

    let folderName = folderAndIcon.name;
    if (folderName == DEFAULT_FOLDER_NAME) {
        folderName = NO_FOLDER_NAME;
    }

    return (
        <View style={styles.textInputView} >
            <Text style={styles.titleText}>שם הדף</Text>
            <TextInput style={globalStyles.textInput}
                onChangeText={onChangeName}
            >{fileName}</TextInput>
            <Spacer/>
            <Text style={styles.titleText}>תיקיה</Text>
            <Picker
                name={folderName}
                icon={folderAndIcon.icon}
                items={[NO_FOLDER_NAME, ...folders, NEW_FOLDER_NAME]}
                textEditable={false}
                renderRow={pickerRenderRow}
                emptyValue={'ללא'}
                selectCallback={
                    (itemIndex, itemValue) => {
                        if (itemValue == NO_FOLDER_NAME) {
                            itemValue = undefined;
                        }
                        onChangeFolder(itemValue)
                    }
                }

            />
            {folderName == NEW_FOLDER_NAME ?
                //New folder picker
                <View style={{ flex: 1, width: '100%' }}>
                    <Spacer/>
                    <Text style={styles.titleText}>שם התיקיה</Text>
                    <Picker
                        name={newFolderAndIcon.name}
                        icon={newFolderAndIcon.icon}
                        items={folderIcons}
                        textEditable={true}
                        renderRow={pickerRenderIcon}
                        emptyValue={''}
                        onChangeText={onChangeNewFolder}
                        selectCallback={(itemIndex, itemValue) => onChangeNewFolder(itemValue.text + '$' + itemValue.icon)}
                    />
                </View>
                :
                //Not new folder
                null
            }
        </View>);
}


function Picker(props) {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={{ flex: 1, width: '100%' }}>
            <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', alignContent: 'center', backgroundColor: 'white'
                }}>

                <Icon name='arrow-drop-down' size={50} color={semanticColors.folderIcons[0]} />
                {props.icon != '' ? <Icon name={props.icon} size={50} color={semanticColors.folderIcons[0]} /> : null}
                <TextInput
                    editable={props.textEditable}
                    onChangeText={props.onChangeText}
                    style={styles.textInputPicker}>{props.name ? props.name : props.emptyValue}
                </TextInput>

            </TouchableOpacity>
            {expanded ?
                <View style={{ borderTopWidth: 1, borderTopColor: 'gray' }}>
                    {props.items.map((item, index) => (
                        <TouchableOpacity key={index} onPress={() => {
                            setExpanded(false);
                            props.selectCallback(index, item)
                        }}>

                            {props.renderRow(item, index)}
                        </TouchableOpacity>
                    ))}

                </View>
                :
                null}

        </View>)

}



function pickerRenderRow(rowData, rowID, highlighted) {
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
        <View style={[globalStyles.textInput, {
            backgroundColor: 'white',
            alignContent: 'flex-end', justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row'
        }]}>
            {iconName != '' ? <Icon name={iconName} size={50} color={semanticColors.folderIcons[0]}></Icon> : <View />}
            <Text style={{ fontSize: 50, textAlign: 'right' }}>
                {folderName}
            </Text>
        </View>
    );
}

function pickerRenderIcon(rowData, rowID, highlighted) {
    return (
        <View style={[globalStyles.textInput, {
            flex: 1,
            flexDirection: 'row',
            backgroundColor: 'white',
            alignItems: 'center',

            justifyContent: 'space-between'
        }]}>
            <Icon name={rowData.icon} size={50} color={semanticColors.folderIcons[0]} />
            <Text style={{ fontSize: 55 }}>{rowData.text}</Text>
        </View>
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
            //getSquareButton(() => callback(-1), semanticColors.pageNavigationButtonG, undefined, 'דף קודם', 'chevron-left', 30, undefined, { width: 150, height: 60 }, 60, true, 15)
            getRoundedButton(() => callback(-1), 'chevron-left', 'דף קודם', 30, 30, { width: 155, height: 40 })
        }

        {isLast ?
            <View /> :
            //getSquareButton(() => callback(1), semanticColors.pageNavigationButtonG, undefined, 'דף הבא', 'chevron-right', 30, undefined, { width: 150, height: 60 }, 60, false, 0, 15)
            getRoundedButton(() => callback(1), 'chevron-right', 'דף הבא', 30, 30, { width: 155, height: 40 }, 'row')
        }
    </View>
}
export function removeFileExt(filePath) {
    return (filePath.split('\\').pop().split('/').pop().split('.'))[0];
}

export const globalStyles = StyleSheet.create({
    headerStyle: {
        backgroundColor: semanticColors.header,
        height: 75
    },
    headerTitleStyle: {
        fontSize: 30,
        fontWeight: 'bold'
    },
    textInput: {
        fontSize: 40,
        height: 70,
        textAlign: "right",
        fontWeight: 'bold',
        color: semanticColors.titleText,
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
        <View style={{ width: props.width || 20, height: props.height || 20 }} />
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
        fontSize: 55,
        textAlign: "right",
        paddingTop: 10,
        fontWeight: 'bold',
        color: 'black',
        backgroundColor: 'white',
        justifyContent: 'flex-end',
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
        top: "3%",
        backgroundColor: 'transparent'
    },
    titleText: {
        fontSize: 60,
        textAlign: "right",
        width: "100%",
        fontWeight: 'bold',
        color: semanticColors.titleText,
        backgroundColor: 'transparent'
    }
});

