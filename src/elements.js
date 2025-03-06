import {
    TouchableOpacity, Text, StyleSheet, Image, View
    , Alert, TextInput, ShadowPropTypesIOS
} from 'react-native';
import { Icon as IconLocal } from 'react-native-elements'
import LinearGradient from 'react-native-linear-gradient';
import React, { useEffect, useState } from 'react';
import { translate, getLocalizedFoldersAndIcons, isRTL, getRowDirection, getRowDirections, getFlexEnd, getRowReverseDirection, getFlexStart } from "./lang.js";
import { getUseTextSetting } from './settings.js'

import { getSvgIcon, SvgIcon } from './svg-icons.js'
import { FileSystem } from './filesystem.js';
import { trace } from './log.js';
import { isTooWhite } from './utils.js';
import { normalizeFoAndroid } from './canvas/utils';

export const Icon = IconLocal;

export const dimensions = {
    headerHeight: 38,//Platform.OS == 'android'?48:38,
    thinHeaderHeight: 52,
    toolbarHeight: 65,
    toolbarMargin: 5,
    minSideMargin: 40,
    topView: 70,
    pagesTitleHigh: 70,
    pagesTitleLow: 50,
    folderHeight: 130,
    folderAsTitleHeight: 62,
    tileWidth: 190,
    lineHeight: 70,
    tileHeight: 197

}


export function getFont() {
    return isRTL() ? 'Alef' : 'Verdana';
}
export function getFontFamily() {
    return { fontFamily: getFont() }
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
    moveInZoomButtonDisabled: "#BFA28F",
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
    selectedEditToolColor: '#eeeded',
    selectedListItem: '#e0ecf7',
    listBackground: 'white' //'#f1f2f4'


}

export const FolderTextStyle = {
    fontSize: 26,
    fontWeight: 'bold',
    color: semanticColors.titleText,
    textAlign: 'center'
}

export const availableIcons = [
    //    "account-balance",
    "alarm",
    "cake",
    "exposure-plus-2",
    //    "build",
    "location-city",
    "grade",
    "flight-takeoff",
    "face",
    "favorite",
    "home",
    "room",
    "shopping-cart",
    "today",
    //    "cloud",
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
    //    "child-friendly",
    "pool"
]

export const availableColorPicker = [
    '#000000', '#fee100', '#20ad57', '#5db7dd', '#2958af', '#d62796', '#65309c', '#da3242'
    //, '#f5771c'
]

export const textSizes = [
    25, 30, 35, 40, 45
]


export const availableBrushSize = [
    1, 3, 5, 7, 9
]


export const folderColors = [
    '#f5771c', '#da3242', '#65309c', '#2958af', '#5db7dd', '#20ad57'
]




export function getIcon(name, size, color) {
    return <Icon name={name} size={size} color={color} />
}

export function MoreButton({
    onPress,
    size,
    color
}) {

    return <TouchableOpacity
        style={{
            borderRadius: size / 2,
            width: size,
            height: size,
            borderWidth: 2,
            borderStyle: "solid",
            borderColor: color,
        }}
        onPress={onPress} >
        <Icon name={'more-horiz'} size={size - 3} color={color} />
    </TouchableOpacity>
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
            <AppText style={{ fontSize: size, color: 'white', marginLeft: lMargin, marginRight: rMargin }}>{txt ? txt : ''}</AppText>
            {icon ? <Icon name={icon} size={iconSize} color='white' /> : null}
        </LinearGradient>
    </TouchableOpacity>
}

export function getEmbeddedButton(callback, icon, iconSize, index, iconType) {
    iconType = iconType || 'material'
    return <Icon
        key={index}
        type={iconType}
        name={icon} size={iconSize}
        color={semanticColors.titleText}
        onPress={callback}
    />
}

export function getEmbeddedSvgButton(callback, icon, iconSize, key, color) {
    return <TouchableOpacity onPress={callback} key={key}>
        {getSvgIcon(icon, iconSize, color ? color : semanticColors.titleText)}
    </TouchableOpacity>;
}


export function getRoundedButton(callback, icon, text, textSize, iconSize, dim, direction, dark, isMobile, forceText, key) {

    if (getUseTextSetting() && !isMobile || forceText) {
        return getRoundedButtonInt(callback, icon, text, textSize, iconSize, dim, direction, dark, key)
    } else {
        let newDim = { width: dim.height, height: dim.height };
        return getRoundedButtonInt(callback, icon, "", textSize, iconSize, newDim, direction, dark, key)
    }

}
export function getRoundedButtonInt(callback, icon, text, textSize, iconSize, dim, direction, dark, key) {
    let color = dark ? "white" : semanticColors.titleText;
    if (icon === 'check-green') {
        color = 'green';
        icon = 'check';
    } else if (icon == 'cancel-red') {
        color = 'red';
        icon = 'close';
    }

    let textExist = text && text.length > 0;
    const activeDirection = direction ? direction : getRowDirection();
    const textAlign = icon ? (activeDirection == "row" ? "right" : "left") : (isRTL() ? "right" : "left");

    return <TouchableOpacity
        key={key}
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
                padding: 5,
                justifyContent: textExist ? 'flex-end' : 'center',
                backgroundColor: dark ? '#808080' : '#eeeded',
                flexDirection: activeDirection,
            }}>
            {textExist ?
                <AppText style={{
                    marginEnd: (isRTL() ? 5 : 0), marginStart: (isRTL() ? 0 : 5),
                    width: icon ? '80%' : '100%', fontSize: textSize, lineHeight: textSize + (isRTL() ? 5 : 0),
                    color: dark ? "white" : semanticColors.titleText, textAlign
                }}>{text}</AppText> : null
            }
            {icon?.startsWith("svg-") ?
                <SvgIcon name={icon.substr(4)} size={iconSize} color={color} />
                : icon && <Icon name={icon} size={iconSize} color={color} />
            }
            {/* {textExist ?
                <Spacer width={5} /> : null
            } */}
        </View>
    </TouchableOpacity>
}

export function getMaterialCommunityIconButton(callback, color, icon, size, isText, iconSize, selected) {
    return getIconButton(callback, color, icon, size, isText, iconSize, selected, "material-community")
}

export function getSvgIconButton(callback, color, icon, size, isText, iconSize, selected) {
    return getIconButton(callback, color, icon, size, isText, iconSize, selected, "svg")
}
export function getIconButton(callback, color, icon, size, isText, iconSize, selected, iconType, notPressable, key) {
    return <IconButton
        onPress={callback}
        color={color}
        icon={icon}
        size={size}
        isText={isText}
        iconSize={iconSize} selected={selected} iconType={iconType} notPressable={notPressable} key={key}
    />
}

export function IconButton({
    onPress,
    color,
    icon,
    size,
    isText,
    iconSize,
    selected,
    iconType,
    notPressable,
    fontWeight,
    backgroundColor,
    ensureContrast,
    rotateDeg,
}) {
    iconType = iconType || "material";
    let isSvg = iconType === "svg";

    let viewStyle = {
        width: size, height: size,
        alignContent: 'center',
        alignItems: 'center',
        borderRadius: size / 2,
        justifyContent: 'center',
    }
    if (backgroundColor) {
        viewStyle.backgroundColor = backgroundColor;
    }
    let backgroundContrast = {}
    let needContract = false
    if (ensureContrast && !backgroundColor && isTooWhite(color)) {
        backgroundContrast.backgroundColor = "lightgray";
        needContract = true;
    }

    const sizeToUse = iconSize ? iconSize : size;

    let viewContent = isText ?
        <AppText

            style={[
                { fontSize: sizeToUse, lineHeight: sizeToUse + 5, color: color, paddingTop: 6 },
                fontWeight ? { fontWeight } : {}
            ]}
        >{icon}
        </AppText> :
        isSvg ?
            getSvgIcon(icon, sizeToUse, color) :
            <Icon name={icon} type={iconType} size={sizeToUse} color={color} style={rotateDeg && { transform: [{ rotate: rotateDeg + 'deg' }] }} />

    return <View style={backgroundContrast}>
        {notPressable ?
            <View style={viewStyle}>
                {viewContent}
            </View>
            :
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onPress}
                style={viewStyle}
            >
                {viewContent}
            </TouchableOpacity>}
        {selected ? <View
            style={{
                borderBottomColor: needContract ? semanticColors.addButton : color,
                borderBottomWidth: 6,
            }}
        /> : null}
    </View>
}

export function PageImage({ src, multiPage, width, height }) {
    return multiPage ?
        // <View>
        <Image source={normalizeFoAndroid({ uri: src })} style={{ width, height, resizeMode: "stretch" }} />

        // </View>
        : <Image source={normalizeFoAndroid({ uri: src })} style={{ width, height, resizeMode: "stretch" }} />

    {/* <Image source={{ uri: src }} style={{ width, height, resizeMode: "stretch", transform: [{ rotate: '15deg' }] }} /> */ }
}

export function getFolderAndIcon(folderName) {
    let ret = { name: "", icon: "", color: "" };

    //options:
    //name
    //name$icon
    //name$icon#color
    //name#color

    if (folderName) {
        let dollarSign = folderName.indexOf('$');
        let hashSign = folderName.indexOf('#');
        //color
        if (hashSign >= 0) {
            ret.color = folderName.substr(hashSign + 1);
        }

        //name
        if (dollarSign >= 0) {
            ret.name = folderName.substring(0, dollarSign);
            //icon
            ret.icon = hashSign >= 0 ? folderName.substring(dollarSign + 1, hashSign) : folderName.substr(dollarSign + 1)
        } else if (hashSign >= 0) {
            ret.name = folderName.substring(0, hashSign);
        } else {
            ret.name = folderName;
        }
    }
    return ret;
}


export function LimitedText({ text, style }) {
    return (
        <Text
            style={style}
            numberOfLines={1} // Limit the text to one line
            ellipsizeMode="tail" // Use ellipsis at the end of the text
        >
            {text}
        </Text>
    );
}

export function normalizeTitle(title) {
    if (title == FileSystem.DEFAULT_FOLDER.name) {
        return translate("DefaultFolder");
    }
    return title;
}

export function hierarchicalName(name, rtl) {
    if (!rtl) return name.replace("/", " \\ ");

    const parts = name.split("/");
    parts.reverse();
    return parts.join(' / ');

}


function RadioButton(props) {
    const borderStyle = props.selected ? {
        borderColor: semanticColors.titleText,
        borderWidth: 5,
        borderRadius: 8,
    } : undefined;

    const rotated = props.rotate != undefined ? { transform: [{ rotate: props.rotate }] } : undefined;

    return (
        <TouchableOpacity style={[{ width: 70, height: 70, padding: 3, justifyContent: "center", alignItems: "center" }, borderStyle, rotated]} onPress={props.onSelect}>
            {props.icon && getSvgIcon(props.icon, 40, 'black')}
        </TouchableOpacity>
    );
}

export function OrientationPicker({
    orientationLandscape,
    onChangeOrientation,
}) {
    const { textAlign } = getRowDirections();

    return <View style={{ flex: 1, width: '100%', zIndex: 1000 }}>
        <AppText style={[styles.titleText, { textAlign }, { marginVertical: 7 }]}>{translate("OrientationCaption")}</AppText>
        <View style={{ flexDirection: 'row', width: "100%", height: 80, justifyContent: "center" }}>
            <RadioButton value={"Portrait"} icon="page-empty" selected={!orientationLandscape}
                onSelect={() => onChangeOrientation(false)}
            />
            <Spacer width={20} />
            <RadioButton value={"Landscape"} icon="page-empty" selected={orientationLandscape}
                rotate={"90deg"}
                onSelect={() => onChangeOrientation(true)}
            />
        </View>
    </View>
}

export function RootFolderPicker({ folders, currentFolder, onChangeFolder, showSubFolders, showBuiltinFolders }) {
    const [more, setMore] = useState(false);
    const [reload, setReload] = useState(0);

    const [expandedFolders, setExpandedFolders] = useState([]);
    const defFolder = FileSystem.DEFAULT_FOLDER;
    //{ name: translate("DefaultFolder"), svgIcon: 'home', color: 'gray', hideName: true };

    useEffect(() => {
        const regID = FileSystem.main.registerListener((folder) => {
            setReload(old => old + 1);
        });

        // expand current folder if needed
        if (currentFolder?.parent) {
            setExpandedFolders([currentFolder.parent.ID]);
        }

        return () => FileSystem.main.unregisterListener(regID);
    }, [currentFolder])

    useEffect(() => {
        expandedFolders.forEach(folderID => {
            const folder = FileSystem.main.findFolderByID(folderID);
            if (folder) {
                folder.reloadedIfNeeded()
            }
        })
    }, [expandedFolders]);

    if (!currentFolder || currentFolder.name === '') {
        currentFolder = FileSystem.DEFAULT_FOLDER;
    }

    const { flexStart, flexEnd } = getRowDirections();


    return <View style={{
        width: '100%',
        flexDirection: 'column', alignContent: flexEnd
    }}>
        <View style={{ backgroundColor: semanticColors.listBackground, alignItems: flexStart }}>
            {renderFolderLine(defFolder, -1, currentFolder, onChangeFolder, false, 0)}
            {folders.map((item, index) => renderFolderLine(item, index, currentFolder, onChangeFolder, showSubFolders, 0, expandedFolders, setExpandedFolders))}
            {showBuiltinFolders && getIconButton(() => setMore(val => !val), semanticColors.titleText, more ? "expand-less" : "expand-more", 45)}
            {more && showBuiltinFolders &&
                getLocalizedFoldersAndIcons()
                    .filter(f => folders.find(f2 => f2.name === f.text) == undefined)
                    .map((itm, index) => ({ ID: itm.text, name: itm.text, path: itm.text, icon: itm.icon, color: (availableColorPicker[index % availableColorPicker.length]) }))
                    .map((item, index) => renderFolderLine(item, index, currentFolder, onChangeFolder, false, 0))

            }
        </View>
    </View>
}


export function FileNameDialog({
    name,
    folder, folders,
    orientationLandscape,
    includeOrientation,
    onChangeOrientation,
    onChangeName, onChangeFolder, onSaveNewFolder,
    navigation, isLandscape, isMobile, onLayout }) {

    const { row, rowReverse, flexStart, flexEnd, textAlign, direction } = getRowDirections();

    //const [more, setMore] = useState(false);
    trace("FileNameDialog", folders, folder, name)
    return (
        <View style={[styles.textInputView, isLandscape ? { flexDirection: rowReverse } : {}]} onLayout={onLayout}>
            <View style={{ flex: 1, width: '100%' }}>
                <AppText style={[styles.titleText, { textAlign }, { marginVertical: 7 }]}>{translate("CaptionPageName")}</AppText>
                <TextInput style={[globalStyles.textInput, { direction, textAlign }, getFontFamily()]}
                    onChangeText={onChangeName}
                    value={name}
                    allowFontScaling={false}
                />
                <Spacer />
                {includeOrientation && <View style={{ flex: 1, width: '100%' }}>
                    <AppText style={[styles.titleText, { textAlign }, { marginVertical: 7 }]}>{translate("OrientationCaption")}</AppText>
                    <View style={{ flexDirection: 'row', width: "100%", height: 80, justifyContent: "center" }}>
                        <RadioButton value={"Portrait"} icon="page-empty" selected={!orientationLandscape}
                            onSelect={() => onChangeOrientation(false)}
                        />
                        <Spacer width={20} />
                        <RadioButton value={"Landscape"} icon="page-empty" selected={orientationLandscape}
                            rotate={"90deg"}
                            onSelect={() => onChangeOrientation(true)}
                        />
                    </View>
                </View>}
            </View>
            <Spacer />
            <View style={{ flex: 1, width: '100%' }}>
                <View style={{
                    flex: 1,
                    flexDirection: rowReverse,
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <AppText style={[styles.titleText, { textAlign }, { width: isLandscape ? '40%' : '30%' }]}>{translate("CaptionFolderNameList")}</AppText>
                    {getRoundedButton(() => navigation.navigate('CreateFolder',
                        { saveNewFolder: onSaveNewFolder, isMobile }),
                        'create-new-folder', translate("BtnNewFolder"), 30, 30, { width: 220, height: 40 }, row, true)}
                </View>
                <Spacer />
                <RootFolderPicker onChangeFolder={onChangeFolder} folders={folders} currentFolder={folder} showSubFolders={true} showBuiltinFolders={true} />
            </View>



        </View>);
}

function renderFolderLine(rowData, index, currentFolder, onChangeFolder, showSubFolders, indentLevel, expandedFolders, setExpandedFolders) {
    const { row, rowReverse, flexStart, flexEnd } = getRowDirections();
    const isHome = rowData.svgIcon === "home";
    const expanded = !!expandedFolders?.some(ef => ef == rowData.ID);

    if (expanded && rowData.loading)
        rowData.reload();

    // trace("pickerRenderRow", rowData.ID, expanded, expandedFolders)
    trace(currentFolder.ID, rowData)

    return [<TouchableOpacity key={index} style={{
        height: 65, width: '100%',
        justifyContent: flexEnd
    }}
        onPress={() => onChangeFolder(rowData)}>

        <View style={[globalStyles.textInput, {
            backgroundColor: currentFolder.ID === rowData.ID ? semanticColors.selectedListItem : semanticColors.listBackground,
            //justifyContent: flexEnd,
            alignItems: 'center',
            flexDirection: rowReverse
        },
        getFontFamily()]}>
            {indentLevel > 0 && <View style={{ minWidth: 70 * indentLevel }} />}
            {!isHome && showSubFolders && <Icon name={expanded ? "expand-less" : "expand-more"} size={45} onPress={() => {
                if (expanded) {
                    setExpandedFolders(expandedFolders.filter(f => f !== rowData.ID))
                } else {
                    trace("setExpandedFolder", [rowData.ID, ...expandedFolders])
                    setExpandedFolders([rowData.ID, ...expandedFolders])
                }
            }} />}


            {isHome ?
                <View style={{ flex: 1, flexDirection: rowReverse }}>
                    <Spacer />
                    <SvgIcon name={rowData.svgIcon} size={50} color={rowData.color} />
                </View>
                :
                <View style={{ alignContent: 'center', alignItems: 'center', justifyContent: 'center', paddingRight: 30, height: '100%' }}>
                    <Icon name="folder" size={45} color={rowData.color} />
                    <View style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}>
                        <View style={{
                            width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center',
                            flexDirection: rowReverse
                        }}>
                            {rowData.icon?.length > 0 ? <FolderIcon
                                size={20}
                                name={rowData.icon}
                                color={'white'}
                                icon={rowData.icon}
                            /> : null}
                        </View>
                    </View>
                </View>
            }
            {/* {rowData.icon && rowData.icon != '' ?
                <View style={{ flexDirection: 'row' }}>
                    <Spacer />
                    <FolderIcon name={rowData.icon} size={50} color={rowData.color ? rowData.color : semanticColors.folderIcons} />
                </View>
                : <View />}
            {rowData.svgIcon && <View style={{ flex: 1, flexDirection: rowReverse }}>
                <Spacer />
                <SvgIcon name={rowData.svgIcon} size={50} color={rowData.color} />
            </View> 
    */}
            {!rowData.hideName && <AppText style={{ fontSize: 26, textAlign: "left", paddingRight: 25, paddingLeft: 25 }}>
                {rowData.name}
            </AppText>}


        </View>
    </TouchableOpacity>,
    expanded && rowData?.folders.length > 0 ?
        rowData.folders.map((subFolder, j) => renderFolderLine(subFolder, index + "-" + j, currentFolder, onChangeFolder, false, indentLevel + 1)) : null
    ]

}

// export function Picker(props) {
//     const [expanded, setExpanded] = useState(false);

//     return (
//         <View style={{ flex: 1, width: '100%' }}>
//             <TouchableOpacity
//                 onPress={() => setExpanded(!expanded)}
//                 style={{
//                     flexDirection: 'row', justifyContent: 'space-between',
//                     alignItems: 'center', alignContent: 'center', backgroundColor: 'white'
//                 }}>

//                 <Icon name='arrow-drop-down' size={50} color={semanticColors.folderIcons} />
//                 {props.icon != '' ? <Icon name={props.icon} size={50} color={semanticColors.folderIcons} /> : null}
//                 <TextInput
//                     editable={props.textEditable}
//                     onChangeText={props.onChangeText}
//                     style={styles.textInputPicker}>{props.name ? props.name : props.emptyValue}
//                 </TextInput>

//             </TouchableOpacity>
//             {expanded ?
//                 <View style={{ borderTopWidth: 1, borderTopColor: 'gray' }}>
//                     {props.items.map((item, index) => (
//                         <TouchableOpacity key={index} onPress={() => {
//                             setExpanded(false);
//                             props.selectCallback(index, item)
//                         }}>

//                             {props.renderRow(item, index)}
//                         </TouchableOpacity>
//                     ))}

//                 </View>
//                 :
//                 null}

//         </View>)

// }



function pickerRenderRow(rowData, currentFolder, onChangeFolder, indentLevel, subFolders, expandedFolders, setExpandedFolders) {


}



export async function getImageDimensions(uri) {
    return new Promise((resolve, reject) => {
        trace("getImageDimensions", uri)
        Image.getSize("file://" + uri, (width, height) => {
            trace("getImageDimensions2", uri, width, height)
            resolve({ w: width, h: height });
        },
            (err) => {
                reject(err)
            });
    });
}

export function IDMenuOptionsStyle(props) {
    return {
        optionsContainerStyle: {
            backgroundColor: 'white', width: props.width || 200, borderRadius: 10,
            alignItems: 'center', justifyContent: 'center', alignContent: 'center'
        },
        customStyles: {
            optionsWrapper: {
                position: 'absolute', left: 0, top: props.top || 0,
                width: '100%', backgroundColor: 'white', borderRadius: 10,
                shadowColor: 'black',
                shadowOpacity: 0.26,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3
            }
        }
    }

}

export function renderMenuOption(title, icon, iconType, rtl) {
    return <View style={{ width: '100%', flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
        {getIconButton(undefined, semanticColors.addButton, icon, 40, undefined, undefined, undefined, iconType, true)}
        <Spacer width={5} />
        <AppText>{title}</AppText>
    </View>
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
            getRoundedButton(() => callback(-1), 'chevron-left', translate("BtnPreviousPage"), 30, 30, { width: 155, height: 40 }, 'row-reverse')
        }

        {isLast ?
            <View /> :
            getRoundedButton(() => callback(1), 'chevron-right', translate("BtnNextPage"), 30, 30, { width: 155, height: 40 }, 'row')
        }

    </View>
}


// export function SBDraxScrollView({
//     persistentScrollbar = false,
//     children,
//     myRef,
//     rtl,
//     ...other
// }) {
//     const [nativeEvent, setNativeEvent] = useState();
//     const top = nativeEvent
//         ? nativeEvent.contentOffset.y +
//         (nativeEvent.contentOffset.y / nativeEvent.contentSize.height) *
//         nativeEvent.layoutMeasurement.height
//         : 0;

//     return (
//         <View
//             ref={myRef}
//             scrollEventThrottle={5}
//             showsVerticalScrollIndicator={false}
//             onScroll={event => setNativeEvent(event.nativeEvent)}
//             {...other}>
//             {children}

//             <View
//                 style={[{
//                     position: 'absolute',
//                     top,

//                     height: 200,
//                     width: 4,
//                     borderRadius: 20,
//                     backgroundColor: 'gray',
//                     opacity: 0.6,
//                 }, rtl ? { left: 4 } : { right: 4 }]}
//             />
//         </View>
//     );
// }

export function TilesView({
    children,
    rtl,
    numColumns,
    ...other
}) {

    if (numColumns <= 1) {
        return children;
    }
    trace("tiles", numColumns)
    const rows = Math.ceil(children.length / numColumns)
    const rowsArray = [];
    let index = 0;
    for (let i = 0; i < rows; i++) {
        let untilIndex = index + numColumns;
        let nonFullRow = false;
        if (untilIndex > children.length) {
            untilIndex = children.length;
            nonFullRow = true;
        }
        const rowChildren = []
        for (; index < untilIndex; index++) {
            rowChildren.push(children[index]);
        }
        rowsArray.push((
            <View key={i} style={{
                flexDirection: rtl ? 'row-reverse' : 'row',
                width: "100%",
                alignItems: 'center',
                justifyContent: nonFullRow ? 'flex-start' : 'space-between',
            }}>
                {rowChildren}
            </View>));
    }

    return <View style={{
        flex: 1,
        minWidth: "100%",
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
    }}>
        {rowsArray}
    </View>

}
export const globalStyles = StyleSheet.create({

    headerTitleStyle: {
        width: '100%',
        fontSize: 30,
        fontWeight: 'bold'
    },
    headerThinTitleStyle: {
        fontSize: 25,
        fontWeight: 'bold',
        marginRight: 30,
        marginLeft: 30,
        color: 'white'
    },
    textInput: {
        fontSize: 40,
        height: 70,
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
    },
    busy: {
        position: 'absolute',
        left: "48%",
        top: "40%",
        zIndex: 1000
    },
    progressBarHost: {
        position: 'absolute',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 3.84,
        borderRadius: 10,
        padding: 10,
        top: '25%', left: '15%', width: '70%', zIndex: 1000,
        backgroundColor: 'white', alignItems: 'center'
    },
})

export function getHeaderBackButton(callback) {
    return <View >
        <TouchableOpacity onPress={callback}
            activeOpacity={1}
            style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* <Icon name='keyboard-arrow-left' color='white' size={35} /> */}
            <Spacer width={10} />
            {/* <Icon name={'home'} color='white' size={40} /> */}
            <SvgIcon name='home' color='white' size={30} />
        </TouchableOpacity>

    </View>
}

export function Spacer(props) {
    return (
        <View style={{ width: props.width || 20, height: props.height || 20 }} />
    );
}

export function FolderIcon(props) {
    if (props.name?.startsWith("svg-")) {
        return getSvgIcon(props.name.substr(4), props.size, props.color);
    }
    if (props.name?.startsWith("data:")) {
        return <Image source={normalizeFoAndroid({ uri: props.name })} style={{
            width: props.size,
            height: props.size
        }} />
    }
    return <Icon name={props.name} size={props.size} color={props.color} />
}

export function AppText(props) {

    const moreProps = props.ellipsizeMode ? {
        numberOfLines: 1,
        ellipsizeMode: "tail"
    } : {}

    return (
        <Text allowFontScaling={false}
            style={[{
                fontFamily: getFont(),
                fontSize: 24,
                textAlign: isRTL() ? 'right' : 'left',

            }, props.style]}
            onPress={props.onPress}

            {...moreProps}
        >{props.children}</Text>
    );
}

export function getColorButton(callback, color, size, selected, index) {
    return getColorButtonInt(callback, color, size, selected ? "check" : undefined, index)
}

export function getColorButtonInt(callback, color, size, icon, index, iconColor) {
    let borderStyle = {}
    if (isTooWhite(color)) {
        borderStyle = { borderWidth: 1, borderColor: "gray" }
    }

    return <TouchableOpacity
        onPress={callback}
        activeOpacity={0.7}
        key={"" + index}
    >
        <View style={[{
            backgroundColor: color,
            borderRadius: size / 2,
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center'

        }, borderStyle]}
        >

            {icon && <Icon color={iconColor || "white"} size={size} name={icon}></Icon>}
        </View>
    </TouchableOpacity>
}

export function getEraserIcon(callback, size, color, selected, key) {
    return <View key={key} style={{ alignItems: "center" }}><TouchableOpacity
        activeOpacity={0.7}
        onPress={callback}
        style={{
            borderRadius: 25,
            height: size - 10,
            width: size,
            alignItems: 'center',
            justifyContent: 'flex-end',
        }}>{getSvgIcon('eraser-new', size - 10, color)}
    </TouchableOpacity>
        {selected ? <View
            style={{
                width: "80%",
                marginTop: 2,
                borderBottomColor: semanticColors.editPhotoButton,
                borderBottomWidth: 6,
            }}
        /> : null}
    </View>
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

