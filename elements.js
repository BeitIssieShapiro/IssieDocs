import {
    TouchableOpacity, Text, StyleSheet, Image, View
    , Alert, TextInput
} from 'react-native';
import { Icon } from 'react-native-elements'
import LinearGradient from 'react-native-linear-gradient';
import React, { useState } from 'react';
import { translate, getLocalizedFoldersAndIcons } from "./lang.js";
import {getUseTextSetting} from './settings.js'
import { Svg, Path, Circle, Rect, Polygon, G } from 'react-native-svg'

import {getSvgIcon} from './svg-icons.js'
export const dimensions = {
    toolbarHeight: 65,
    toolbarMargin: 5,
    topView: 70,
    folderHeight: 76,
    tileWidth: 143,
    lineHeight: 70,
    tileHeight: 197

}

export const colors = {
    gray: '#5B748A',
    orange: '#FFA264',
    blue: '#0097F8',
    lightBlue: '#2F8AF2',
    navyBlue: '#1A427C',
    yellow: '#FCF300',
    green: '#00F815',
    red: '#FF0000',
    black: '#000000',
    lightGray: '#A8C2D8',
}

export const semanticColors = {
    disabledButton: colors.lightGray,
    cancelButton: colors.gray,
    okButton: colors.navyBlue,
    deleteButton: colors.red,
    addButton: '#1aaeff',
    undoButton: colors.gray,
    InactiveModeButton: colors.gray,
    activeZoomButton: colors.orange,
    actionButton: colors.blue,
    folderIcons: '#27b0ff', //colors.navyBlue,
    selectedCheck: "#4630EB",
    moveInZoomButton: "#D16F28",
    header: '#183d72',
    header2: 'white',
    mainAreaBG: '#f1f2f4',
    title: '#DFE8EC',
    subTitle: 'white', //'#315890',
    titleText: '#183d72',
    inputBorder: '#d0cfcf',
    selectedFolder: '#C7D4E8',
    editPhotoButton: '#1aaeff',
    availableIconColor: '#9a9fa9',
    selectedIconColor: '#1aaeff',
    selectedEditToolColor: '#a7a7a7',
    selectedListItem: '#e0ecf7',
    listBackground: 'white' //'#f1f2f4'


}

export const FolderTextStyle = {
    fontSize: 26,
    fontWeight: 'bold',
    color: semanticColors.titleText
}

export const availableIcons = [
    "account-balance",
    "alarm",
    "cake",
    "exposure-plus-2",
    "build",
    "location-city",
    "grade",
    "flight-takeoff",
    "face",
    "favorite",
    "home",
    "room",
    "shopping-cart",
    "today",
    "cloud",
    "headset",
    "computer",
    "toys",
    "brush",
    "color-lens",
    "filter-vintage",
    "directions-run",
    "local-pizza",
    "traffic",
    "beach-access",
    "child-friendly",
    "pool"
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

export const NEW_FOLDER_NAME = 'NewFolder'; //todo lang
export const NO_FOLDER_NAME = 'Without'; //todo lang
export const DEFAULT_FOLDER_NAME = 'Default';

export function validPathPart(PathPart) {
    if (!PathPart || PathPart.length == 0) {
        return false;
    }
    if (PathPart.includes('/')) {
        return false
    }
    return true;
}

export function getIcon(name, size, color) {
    return <Icon name={name} size={size} color={color} />
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

export function getEmbeddedButton(callback, icon, iconSize, index) {
    return <Icon
        key={index}
        name={icon} size={iconSize}
        color={semanticColors.titleText}
        onPress={callback}
    />
}

export function getEmbeddedSvgButton(callback, icon, iconSize, key, color) {
    return <TouchableOpacity onPress={callback} key={key}>
            {getSvgIcon(icon, iconSize, color?color:semanticColors.titleText)}
            </TouchableOpacity>;
}


export function getRoundedButton(callback, icon, text, textSize, iconSize, dim, direction, dark) {
    if (getUseTextSetting()) {
        return getRoundedButtonInt(callback, icon, text, textSize, iconSize, dim, direction, dark)
    } else {
        let newDim = {width:60, height:60};
        return getRoundedButtonInt(callback, icon, undefined, textSize, 45, newDim, direction, dark)
    }
        
}
export function getRoundedButtonInt(callback, icon, text, textSize, iconSize, dim, direction, dark) {
    let color = semanticColors.titleText;
    if (icon === 'check-circle') {
        color = 'green';
    } else if (icon === 'cancel') {
        color = 'red';
    }

    let textExist = text && text.length > 0;

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
                alignContent: 'center',
                justifyContent: textExist ? 'flex-end':'center',
                backgroundColor: dark ? '#a7a7a7' : '#eeeded',
                flexDirection: direction ? direction : 'row'
            }}>
            {textExist ? <Text style={{ position: 'absolute', paddingTop: 5, left: 0, width: '80%', fontSize: textSize, color: semanticColors.titleText, textAlign: 'center' }}>{text}</Text>:null}
            <Icon name={icon} size={iconSize} color={color} />
            {textExist ? <Spacer width={5} />:null}
        </View>
    </TouchableOpacity>
}
export function getIconButton(callback, color, icon, size, isText, iconSize, selected) {
    return <TouchableOpacity
        activeOpacity={0.7}
        onPress={callback}
        style={{
            backgroundColor: selected ? semanticColors.selectedEditToolColor : 'transparent',
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
        return translate("DefaultFolderLanguage");
    }
    return title;
}



export function getFileNameDialog(fileName,
    currentFolderName, folders,
    onChangeName, onChangeFolder, onSaveNewFolder,
    navigation, isLandscape) {


    if (currentFolderName === DEFAULT_FOLDER_NAME || currentFolderName === '') {
        currentFolderName = NO_FOLDER_NAME;
    }

    let fullListFolder = [NO_FOLDER_NAME, ...folders];
    getLocalizedFoldersAndIcons().forEach((itm) => {
        let fni = itm.text + '$' + itm.icon;
        if (fullListFolder.findIndex(f => f === fni) == -1) {
            fullListFolder.push(fni);
        }
    })
    return (
        <View style={[styles.textInputView, isLandscape ? { flexDirection: 'row-reverse' } : {}]} >
            <View style={{ flex: 1, width: '100%' }}>
                <Text style={styles.titleText}>{translate("CaptionPageName")}</Text>
                <TextInput style={globalStyles.textInput}
                    onChangeText={onChangeName}
                >{fileName}</TextInput>
            </View>
            <Spacer />
            <View style={{ flex: 1, width: '100%' }}>
                <View style={{
                    flex: 1, flexDirection: 'row-reverse',
                    width: '100%',
                    alignItems: 'center'
                }}>
                    <Text style={[styles.titleText, { width: isLandscape ? '40%' : '30%' }]}>{translate("CaptionFolderNameList")}</Text>
                    {getRoundedButton(() => navigation.navigate('CreateFolder',
                        { saveNewFolder: onSaveNewFolder }),
                        'create-new-folder', translate("BtnNewFolder"), 30, 30, { width: 250, height: 40 }, undefined, true)}
                </View>
                <Spacer />
                <View style={{
                    flex: 1, width: '100%',
                    flexDirection: 'column', alignContent: 'flex-end'
                }}>
                    <View style={{ flex: 1, backgroundColor: semanticColors.listBackground }}>
                        {fullListFolder.map((item, index) => (
                            <TouchableOpacity key={index} style={{ height: 65, width: '100%', justifyContent: 'flex-end' }}
                                onPress={() => onChangeFolder(item)}>

                                {pickerRenderRow(item, currentFolderName === item)}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>



        </View>);
}


export function Picker(props) {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={{ flex: 1, width: '100%' }}>
            <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', alignContent: 'center', backgroundColor: 'white'
                }}>

                <Icon name='arrow-drop-down' size={50} color={semanticColors.folderIcons} />
                {props.icon != '' ? <Icon name={props.icon} size={50} color={semanticColors.folderIcons} /> : null}
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



function pickerRenderRow(rowData, highlighted) {
    let folderAndIcon = getFolderAndIcon(rowData);

    return (
        <View style={[globalStyles.textInput, {
            backgroundColor: highlighted ? semanticColors.selectedListItem : semanticColors.listBackground,
            alignContent: 'flex-end', justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row'
        }]}>
            {folderAndIcon.icon != '' ?
                <View style={{ flexDirection: 'row' }}>
                    <Spacer />
                    <Icon name={folderAndIcon.icon} size={50} color={semanticColors.folderIcons}></Icon>
                </View>
                : <View />}
            <Text style={{ fontSize: 26, textAlign: 'right', paddingRight: 25 }}>
                {folderAndIcon.name}
            </Text>
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
            zIndex: 1001,
            backgroundColor: 'green'

        }}
    >

        {isFirst ?
            <View /> :
            getRoundedButton(() => callback(-1), 'chevron-left', translate("BtnPreviousPage"), 30, 30, { width: 155, height: 40 }, 'row-reverse')
        }

        {isLast ?
            <View /> :
            getRoundedButton(() => callback(1), 'chevron-right', translate("BtnNextPage"), 30, 30, { width: 155, height: 40 }, 'row')
        }

    </View>
}
export function removeFileExt(filePath) {
    return (filePath.split('\\').pop().split('/').pop().split('.'))[0];
}

export const globalStyles = StyleSheet.create({
    headerStyle: {
        backgroundColor: semanticColors.header,
        height: 55
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
        color: 'black',
        width: '100%',
        backgroundColor: 'white',
        borderColor: semanticColors.inputBorder,
        borderWidth: 1
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

export function getHeaderBackButton(nav) {
    return <View >
        <TouchableOpacity onPress={() => { nav.pop() }}
          activeOpacity={1}
          style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name='keyboard-arrow-left' color='white' size={35} />
          <Spacer width={10} />
          <Icon name={'home'} color='white' size={30} />
        </TouchableOpacity>

      </View>
}

export function Spacer(props) {
    return (
        <View style={{ width: props.width || 20, height: props.height || 20 }} />
    );
}

export function getEraserIcon(callback, size, color, selected) {
    return <TouchableOpacity
        activeOpacity={0.7}
        onPress={callback}
        style={{
            borderRadius: 25,
            height: size,
            width: size,
            alignItems: 'center',
            justifyContent: 'flex-end',
            backgroundColor: selected ? semanticColors.selectedEditToolColor : 'transparent'
        }}><Svg
            width={size * .8} height={size * .8}

            viewBox="638.932 206.758 226.611 216.611">
            <Path stroke={color} d="M772.811,400.086h-69.3l24.006-24.006l0,0l0.905-0.906l0,0c0.906,0.906,2.265,0.906,2.718,0.453 c0.906-0.905,0.453-1.812-0.453-2.718l-49.823-50.729c-0.905-0.906-2.265-0.906-2.718-0.453c-0.905,0.906-0.453,1.812,0.453,2.718 l0,0l-1.358,1.358l0,0l-24.912,24.912c-4.529,4.529-4.529,11.776,0,16.306l33.518,33.518c1.359,1.358,3.171,2.265,5.436,3.17 c0.452,0.453,0.905,0.453,1.358,0.453h80.624c1.358,0,2.265-0.905,2.265-2.265C775.529,400.539,774.169,400.086,772.811,400.086z M655.046,364.304c-2.718-2.718-2.718-7.247,0-9.965l22.194-22.194l43.935,43.936l-22.193,22.194 c-1.359,1.358-2.718,1.812-4.53,1.812h-1.358c-1.812,0-3.171-0.906-4.529-1.812L655.046,364.304z" />
            <Path stroke={color} d="M789.117,400.086h-8.153c-1.358,0-2.265,0.905-2.265,2.265c0,1.358,0.906,2.265,2.265,2.265h8.153 c1.358,0,2.265-0.906,2.265-2.265C791.381,400.991,790.475,400.086,789.117,400.086z" />
            <Circle stroke={color} cx="797.27" cy="402.351" r="2.265" />
            <Path stroke={color} d="M854.792,245.181c-0.905-0.906-2.265-0.906-3.17,0l-79.265,79.717L761.94,314.48l77-77.906 c0.453-0.453,0.453-1.812,0-2.265c-0.453-0.453-1.812-0.453-2.265,0l-77.453,77.453l-18.117-18.118l74.282-74.282 c0.453-0.453,0.453-1.812,0-2.265s-1.812-0.453-2.265,0l-74.282,74.735l-10.871-10.87l58.883-58.429 c0.905-0.906,0.905-2.265,0-3.171c-0.906-0.906-2.265-0.906-3.171,0l-58.43,58.429l-1.812,1.812l50.276,50.276l1.813-1.812 l79.717-79.717C855.699,247.445,855.699,246.086,854.792,245.181z" />
            <Path stroke={color} d="M744.729,358.415l12.682-12.682l0,0c0.905,0.905,2.265,0.905,2.718,0.452c0.905-0.905,0.453-1.812-0.453-2.717 l-50.276-50.276c-0.905-0.906-2.265-0.906-2.718-0.453c-0.905,0.905-0.453,1.812,0.453,2.718l0,0l-12.683,12.682L744.729,358.415z M743.37,342.109c0.906-0.905,2.265-0.905,3.623,0c0.906,0.906,0.906,2.265,0,3.624c-0.905,0.905-2.264,0.905-3.623,0 C742.464,344.827,742.464,343.016,743.37,342.109z M725.251,324.445c0.906-0.906,2.266-0.906,3.624,0 c0.906,0.905,0.906,2.265,0,3.623c-0.906,0.906-2.265,0.906-3.624,0C724.346,326.71,724.346,325.351,725.251,324.445z M707.587,306.327c0.906-0.905,2.265-0.905,3.171,0c0.905,0.906,0.905,2.265,0,3.171c-0.906,0.906-2.265,0.906-3.171,0 C706.681,309.045,706.681,307.233,707.587,306.327z" />
            <Path stroke={color} d="M732.046,371.551l3.17-3.171l0,0c0.906,0.906,2.265,0.906,2.718,0.453c0.906-0.906,0.453-1.812-0.453-2.718 l-50.275-50.729c-0.906-0.905-2.265-0.905-2.718-0.452c-0.453,0.452-0.453,1.812,0.453,2.717l0,0l-3.171,3.171L732.046,371.551z" />
            <Path stroke={color} d="M738.387,364.757l3.171-3.171l0,0c0.906,0.906,2.265,0.906,2.718,0.453c0.905-0.906,0.453-1.812-0.453-2.718 l-50.276-50.276c-0.906-0.906-2.265-0.906-2.718-0.453c-0.906,0.906-0.453,1.813,0.453,2.718l0,0l-3.171,3.171L738.387,364.757z" />
            <Path stroke={color} d="M760.582,342.563l3.17-3.171l0,0c0.906,0.906,2.266,0.906,2.718,0.453c0.906-0.905,0.453-1.812-0.452-2.718 l-49.824-50.276c-0.905-0.905-2.265-0.905-2.718-0.452c-0.905,0.905-0.452,1.812,0.453,2.717l0,0l-3.17,3.171L760.582,342.563z" />
            <Path stroke={color} d="M766.922,336.222l3.171-3.171l0,0c0.906,0.906,2.265,0.906,2.718,0.453c0.905-0.906,0.453-1.812-0.453-2.718 l-49.823-50.276c-0.906-0.906-2.265-0.906-2.718-0.453c-0.906,0.906-0.453,1.813,0.453,2.718l0,0l-3.171,3.171L766.922,336.222z" />
            <Path stroke={color} d="M659.576,361.133c-0.906-0.905-0.906-2.718,0-3.623l5.889-5.889c0.452-0.453,0.452-1.358,0-1.812 c-0.453-0.453-1.359-0.453-1.813,0l-5.888,5.889c-1.812,1.812-1.812,4.981,0,6.794l6.341,6.341c0.453,0.453,1.359,0.453,1.812,0 c0.453-0.453,0.453-1.358,0-1.812L659.576,361.133z" />

        </Svg>
    </TouchableOpacity>
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
        justifyContent: "flex-start",
        width: "90%",
        right: "5%",
        top: "3%",
        backgroundColor: 'transparent'
    },
    titleText: {
        fontSize: 35,
        textAlign: "right",
        width: "100%",
        fontWeight: 'bold',
        color: semanticColors.titleText,
        backgroundColor: 'transparent'
    }
});

