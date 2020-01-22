import {
    TouchableOpacity, Text, StyleSheet, Image, View
    , Alert, TextInput
} from 'react-native';
import { Icon } from 'react-native-elements'
import LinearGradient from 'react-native-linear-gradient';
import React, { useState } from 'react';
import { translate, getLocalizedFoldersAndIcons } from "./lang.js";
import { Svg, Path, Circle, Rect, Polygon, G } from 'react-native-svg'
import {getUseTextSetting} from './settings.js'
export const dimensions = {
    toolbarHeight: 65,
    toolbarMargin: 5,
    topView: 70
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

export function getSvgIcon(name, size, color) {
    switch (name) {
        case 'lang-system':
            return <Svg viewBox="0 0 64 64" width={size} height={size}>
                <Path d="M33,59.974V33H59.974a28.2,28.2,0,0,1-.58,4.824l1.957.413A29.968,29.968,0,1,0,38.2,61.358L37.79,59.4A28.181,28.181,0,0,1,33,59.974ZM20.987,49.256A27.963,27.963,0,0,1,31,47.023v12.9C26.942,59.344,23.359,55.3,20.987,49.256ZM31,45.023a29.975,29.975,0,0,0-10.693,2.35A49.18,49.18,0,0,1,18.013,33H31ZM33,4.079c4.058.577,7.641,4.623,10.013,10.665A27.963,27.963,0,0,1,33,16.977Zm-2,0v12.9a27.963,27.963,0,0,1-10.013-2.233C23.359,8.7,26.942,4.656,31,4.079Zm0,14.9V31H18.013a49.18,49.18,0,0,1,2.294-14.373A29.975,29.975,0,0,0,31,18.977Zm2,0a29.975,29.975,0,0,0,10.693-2.35A49.18,49.18,0,0,1,45.987,31H33ZM59.975,31H47.987a50.754,50.754,0,0,0-2.459-15.221,30.029,30.029,0,0,0,5.9-3.918A27.914,27.914,0,0,1,59.975,31ZM49.927,10.512a28,28,0,0,1-5.09,3.371,23.581,23.581,0,0,0-5.892-9.01A27.929,27.929,0,0,1,49.927,10.512ZM19.163,13.883a28,28,0,0,1-5.09-3.371A27.929,27.929,0,0,1,25.055,4.873,23.581,23.581,0,0,0,19.163,13.883Zm-6.586-2.022a30.029,30.029,0,0,0,5.9,3.918A50.754,50.754,0,0,0,16.013,31H4.025A27.914,27.914,0,0,1,12.577,11.861ZM4.025,33H16.013a50.754,50.754,0,0,0,2.459,15.221,30.029,30.029,0,0,0-5.9,3.918A27.914,27.914,0,0,1,4.025,33ZM14.073,53.488a28,28,0,0,1,5.09-3.371,23.581,23.581,0,0,0,5.892,9.01A27.929,27.929,0,0,1,14.073,53.488Z" />
                <Path d="M61.142,45.01l-2.682-.383a10.86,10.86,0,0,0-.679-1.639l1.625-2.166a1,1,0,0,0-.093-1.307l-2.828-2.828a1,1,0,0,0-1.306-.093l-2.167,1.624a10.9,10.9,0,0,0-1.639-.678l-.383-2.682A1,1,0,0,0,50,34H46a1,1,0,0,0-.99.858l-.383,2.682a10.855,10.855,0,0,0-1.639.678l-2.167-1.624a1,1,0,0,0-1.306.093l-2.828,2.828a1,1,0,0,0-.093,1.307l1.625,2.166a10.86,10.86,0,0,0-.679,1.639l-2.682.383A1,1,0,0,0,34,46v4a1,1,0,0,0,.858.99l2.682.383a10.86,10.86,0,0,0,.679,1.639l-1.625,2.166a1,1,0,0,0,.093,1.307l2.828,2.828a1,1,0,0,0,1.306.093l2.167-1.624a10.855,10.855,0,0,0,1.639.678l.383,2.682A1,1,0,0,0,46,62h4a1,1,0,0,0,.99-.858l.383-2.682a10.9,10.9,0,0,0,1.639-.678l2.167,1.624a1,1,0,0,0,1.306-.093l2.828-2.828a1,1,0,0,0,.093-1.307l-1.625-2.166a10.86,10.86,0,0,0,.679-1.639l2.682-.383A1,1,0,0,0,62,50V46A1,1,0,0,0,61.142,45.01ZM60,49.133l-2.463.352a1,1,0,0,0-.827.742,8.923,8.923,0,0,1-.977,2.357,1,1,0,0,0,.061,1.111l1.492,1.99-1.6,1.6-1.991-1.492a1,1,0,0,0-1.11-.06,8.859,8.859,0,0,1-2.356.975,1,1,0,0,0-.744.828L49.133,60H46.867l-.351-2.463a1,1,0,0,0-.744-.828,8.859,8.859,0,0,1-2.356-.975,1,1,0,0,0-1.11.06l-1.991,1.492-1.6-1.6,1.492-1.99a1,1,0,0,0,.061-1.111,8.923,8.923,0,0,1-.977-2.357,1,1,0,0,0-.827-.742L36,49.133V46.867l2.463-.352a1,1,0,0,0,.827-.742,8.923,8.923,0,0,1,.977-2.357,1,1,0,0,0-.061-1.111l-1.492-1.99,1.6-1.6,1.991,1.492a1,1,0,0,0,1.11.06,8.859,8.859,0,0,1,2.356-.975,1,1,0,0,0,.744-.828L46.867,36h2.266l.351,2.463a1,1,0,0,0,.744.828,8.859,8.859,0,0,1,2.356.975,1,1,0,0,0,1.11-.06l1.991-1.492,1.6,1.6-1.492,1.99a1,1,0,0,0-.061,1.111,8.923,8.923,0,0,1,.977,2.357,1,1,0,0,0,.827.742L60,46.867Z" />
                <Path d="M48,42a6,6,0,1,0,6,6A6.006,6.006,0,0,0,48,42Zm0,10a4,4,0,1,1,4-4A4,4,0,0,1,48,52Z" />
                <Rect x="47" y="38" width="2" height="2" />
                <Rect x="40.636" y="40.636" width="2" height="2" transform="translate(-17.246 41.626) rotate(-44.99)" />
                <Rect x="38" y="47" width="2" height="2" />
                <Rect x="40.636" y="53.364" width="2" height="2" transform="translate(-26.246 45.364) rotate(-45)" />
                <Rect x="47" y="56" width="2" height="2" />
                <Rect x="53.364" y="53.364" width="2" height="2" transform="translate(-22.518 54.351) rotate(-44.99)" />
                <Rect x="56" y="47" width="2" height="2" />
                <Rect x="53.364" y="40.636" width="2" height="2" transform="translate(-13.517 50.648) rotate(-45.01)" />
            </Svg >;

        case 'lang-he':
            return <Svg viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" width={size} height={size}>
                <G>
                    <Path fill="#0052B4" d="M352,200.575h-64.001L256,145.15l-31.998,55.425H160L192.002,256L160,311.425h64.002L256,366.85 l31.999-55.425H352L319.998,256L352,200.575z M295.314,256l-19.656,34.048h-39.314L216.686,256l19.657-34.048h39.314L295.314,256z M256,187.903l7.316,12.672h-14.63L256,187.903z M197.028,221.952h14.632l-7.316,12.672L197.028,221.952z M197.028,290.048 l7.317-12.672l7.316,12.672H197.028z M256,324.097l-7.315-12.672h14.63L256,324.097z M314.972,290.048H300.34l7.317-12.672 L314.972,290.048z M300.34,221.952h14.632l-7.316,12.672L300.34,221.952z" />
                    <Rect y="32" fill="#0052B4" width="512" height="64" />
                    <Rect y="416" fill="#0052B4" width="512" height="64" />
                </G>
            </Svg>
        case 'lang-ar':
            return <Svg viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" width={size} height={size}>
                <Rect y="0.008" fill="#F0F0F0" width="512" height="511.989" />
                <Rect y="0.002" width="512" height="170.663" />
                <Rect y="341.337" fill="#496E2D" width="512" height="170.663" />
                <G>
                    <Polygon fill="#D80027" points="256,256.008 0,512 0,0 	" />
                    <Path fill="#D80027" d="M354.034,256c0-28.691,20.164-52.659,47.091-58.539c-4.138-0.904-8.432-1.394-12.842-1.394 c-33.102,0-59.934,26.832-59.934,59.933s26.832,59.933,59.933,59.933c4.411,0,8.704-0.49,12.842-1.394 C374.197,308.659,354.034,284.691,354.034,256z" />
                    <Polygon fill="#D80027" points="403.642,217.472 412.143,243.635 439.652,243.635 417.396,259.804 425.898,285.966 403.642,269.797 381.387,285.966 389.889,259.804 367.632,243.635 395.14,243.635 	" />
                </G></Svg>
        case 'lang-en':
            return <Svg x="0px" y="0px"
                viewBox="0 0 512 512" style="enable-background:new 0 0 512 512" width={size} height={size}>
                <Rect fill="#F0F0F0" width="512" height="512" />
                <G>
                    <Rect y="64" fill="#D80027" width="512" height="64" />
                    <Rect y="192" fill="#D80027" width="512" height="64" />
                    <Rect y="320" fill="#D80027" width="512" height="64" />
                    <Rect y="448" fill="#D80027" width="512" height="64" />
                </G>
                <Rect fill="#2E52B2" width="256" height="275.69" />
                <G>
                    <Polygon fill="#F0F0F0" points="51.518,115.318 45.924,132.529 27.826,132.529 42.469,143.163 36.875,160.375 51.518,149.741 66.155,160.375 60.56,143.163 75.203,132.529 57.106,132.529 	" />
                    <Polygon fill="#F0F0F0" points="57.106,194.645 51.518,177.434 45.924,194.645 27.826,194.645 42.469,205.279 36.875,222.49 51.518,211.857 66.155,222.49 60.56,205.279 75.203,194.645 	" />
                    <Polygon fill="#F0F0F0" points="51.518,53.202 45.924,70.414 27.826,70.414 42.469,81.047 36.875,98.259 51.518,87.625 66.155,98.259 60.56,81.047 75.203,70.414 57.106,70.414 	" />
                    <Polygon fill="#F0F0F0" points="128.003,115.318 122.409,132.529 104.311,132.529 118.954,143.163 113.36,160.375 128.003,149.741 142.64,160.375 137.045,143.163 151.689,132.529 133.591,132.529 	" />
                    <Polygon fill="#F0F0F0" points="133.591,194.645 128.003,177.434 122.409,194.645 104.311,194.645 118.954,205.279 113.36,222.49 128.003,211.857 142.64,222.49 137.045,205.279 151.689,194.645 	" />
                    <Polygon fill="#F0F0F0" points="210.076,194.645 204.489,177.434 198.894,194.645 180.797,194.645 195.44,205.279 189.845,222.49 204.489,211.857 219.125,222.49 213.531,205.279 228.174,194.645 	" />
                    <Polygon fill="#F0F0F0" points="204.489,115.318 198.894,132.529 180.797,132.529 195.44,143.163 189.845,160.375 204.489,149.741 219.125,160.375 213.531,143.163 228.174,132.529 210.076,132.529 	" />
                    <Polygon fill="#F0F0F0" points="128.003,53.202 122.409,70.414 104.311,70.414 118.954,81.047 113.36,98.259 128.003,87.625 142.64,98.259 137.045,81.047 151.689,70.414 133.591,70.414 	" />
                    <Polygon fill="#F0F0F0" points="204.489,53.202 198.894,70.414 180.797,70.414 195.44,81.047 189.845,98.259 204.489,87.625 219.125,98.259 213.531,81.047 228.174,70.414 210.076,70.414 	" />
                </G>
            </Svg>

    }
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

