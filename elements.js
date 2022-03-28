import {
    TouchableOpacity, Text, StyleSheet, Image, View
    , Alert, TextInput, ShadowPropTypesIOS
} from 'react-native';
import { Icon } from 'react-native-elements'
import LinearGradient from 'react-native-linear-gradient';
import React, { useState } from 'react';
import { translate, getLocalizedFoldersAndIcons, isRTL, getRowDirection, getRowDirections, getFlexEnd, getRowReverseDirection } from "./lang.js";
import { getUseTextSetting } from './settings.js'

import { getSvgIcon, SvgIcon } from './svg-icons.js'
import { FileSystem } from './filesystem.js';
import { trace } from './log.js';
import { DraxScrollView } from 'react-native-drax';


export const dimensions = {
    headerHeight: 70,
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
    return isRTL() ? 'Alef' : 'Calibri';
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
    25, 30, 35, 40, 45, 50,
]
export const extendedTextSizes = [
    50, 55, 60, 65, 70, 75
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


export function getRoundedButton(callback, icon, text, textSize, iconSize, dim, direction, dark, isMobile) {

    if (getUseTextSetting() && !isMobile) {
        return getRoundedButtonInt(callback, icon, text, textSize, iconSize, dim, direction, dark)
    } else {
        let newDim = { width: dim.height, height: dim.height };
        return getRoundedButtonInt(callback, icon, "", textSize, iconSize, newDim, direction, false)
    }

}
export function getRoundedButtonInt(callback, icon, text, textSize, iconSize, dim, direction, dark) {
    let color = semanticColors.titleText;
    if (icon === 'check-green') {
        color = 'green';
        icon = 'check';
    } else if (icon == 'cancel-red') {
        color = 'red';
        icon = 'close';
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
                justifyContent: textExist ? 'flex-end' : 'center',
                backgroundColor: dark ? '#a7a7a7' : '#eeeded',
                flexDirection: direction ? direction : getRowDirection()
            }}>
            {textExist ?
                <AppText style={{ position: 'absolute', paddingTop: 5, left: 0, width: '80%', fontSize: textSize, lineHeight: textSize + 5, color: semanticColors.titleText, textAlign: 'center' }}>{text}</AppText> : null
            }
            {icon.startsWith("svg-") ?
                <SvgIcon name={icon.substr(4)} size={iconSize} color={color} />
                : <Icon name={icon} size={iconSize} color={color} />
            }
            {textExist ?
                <Spacer width={5} /> : null
            }
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
    fontWeight
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
            <Icon name={icon} type={iconType} size={sizeToUse} color={color} />

    return <View>
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
                borderBottomColor: color,
                borderBottomWidth: 6,
            }}
        /> : null}
    </View>
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

export function normalizeTitle(title) {
    if (title == FileSystem.DEFAULT_FOLDER.name) {
        return translate("DefaultFolder");
    }
    return title;
}



export function FileNameDialog({
    name,
    folder, folders,
    onChangeName, onChangeFolder, onSaveNewFolder,
    navigation, isLandscape, isMobile, onLayout }) {

    const { row, rowReverse, flexStart, flexEnd, textAlign, direction } = getRowDirections();

    const [more, setMore] = useState(false);
    const defFolder = { name: translate("DefaultFolder"), svgIcon: 'home', color: 'gray', hideName: true };


    if (!folder || folder.name === FileSystem.DEFAULT_FOLDER.name || folder.name === '') {
        folder = defFolder;
    }

    //let foldersWithDesktop = [defFolderName, ...folders];
    // getLocalizedFoldersAndIcons().forEach((itm, index) => {
    //     if (fullListFolder.findIndex(f =>
    //         f.name === itm.text) == -1) {
    //         //only add those folders that do not exist already
    //         fullListFolder.push({ name: itm.text, icon: itm.icon, color: (availableColorPicker[index % availableColorPicker.length]) });
    //     }
    // })
    return (
        <View style={[styles.textInputView, isLandscape ? { flexDirection: rowReverse } : {}]} onLayout={onLayout}>
            <View style={{ flex: 1, width: '100%' }}>
                <AppText style={[styles.titleText, { textAlign }, { marginVertical: 7 }]}>{translate("CaptionPageName")}</AppText>
                <TextInput style={[globalStyles.textInput, { direction, textAlign }, getFontFamily()]}
                    onChangeText={onChangeName}

                >{name}</TextInput>
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
                        'create-new-folder', translate("BtnNewFolder"), 30, 30, { width: 250, height: 40 }, rowReverse, true)}
                </View>
                <Spacer />
                <View style={{
                    flex: 1, width: '100%',
                    flexDirection: 'column', alignContent: flexEnd
                }}>
                    <View style={{ flex: 1, backgroundColor: semanticColors.listBackground, alignItems: flexStart }}>
                        {renderFolderLine(defFolder, -1, folder, onChangeFolder)}
                        {folders.map((item, index) => renderFolderLine(item, index, folder, onChangeFolder))}
                        {getIconButton(() => setMore(val => !val), semanticColors.titleText, more ? "expand-less" : "expand-more", 45)}
                        {more &&
                            getLocalizedFoldersAndIcons()
                                .filter(f => folders.find(f2 => f2.name === f.text) == undefined)
                                .map((itm, index) => ({ name: itm.text, icon: itm.icon, color: (availableColorPicker[index % availableColorPicker.length]) }))
                                .map((item, index) => renderFolderLine(item, index, folder, onChangeFolder))

                        }
                    </View>
                </View>
            </View>



        </View>);
}

function renderFolderLine(item, index, folder, onChangeFolder) {
    return <TouchableOpacity key={index} style={{
        height: 65, width: '100%',
        justifyContent: getFlexEnd()
    }}
        onPress={() => onChangeFolder(item)}>

        {pickerRenderRow(item, folder.name == item.name)}
    </TouchableOpacity>

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



function pickerRenderRow(rowData, highlighted) {
    const { row, rowReverse } = getRowDirections();
    const isHome = rowData.svgIcon === "home"
    return (
        <View style={[globalStyles.textInput, {
            backgroundColor: highlighted ? semanticColors.selectedListItem : semanticColors.listBackground,
            alignContent: getFlexEnd(), justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: row
        },
        getFontFamily()]}>
            {isHome ?
                <View style={{ flex: 1, flexDirection: rowReverse }}>
                    <Spacer />
                    <SvgIcon name={rowData.svgIcon} size={50} color={rowData.color} />
                </View>
                : <View style={{ alignContent: 'center', alignItems: 'center', justifyContent: 'center', paddingRight: 30, height: '100%' }}>
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
            {!rowData.hideName && <AppText style={{ fontSize: 26, textAlign: 'right', paddingRight: 25, paddingLeft: 25 }}>
                {rowData.name}
            </AppText>}
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
                    reject(err)
                });
        }
    );
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


export function SBDraxScrollView({
    persistentScrollbar = false,
    children,
    myRef,
    rtl,
    ...other
}) {
    const [nativeEvent, setNativeEvent] = useState();
    const top = nativeEvent
        ? nativeEvent.contentOffset.y +
        (nativeEvent.contentOffset.y / nativeEvent.contentSize.height) *
        nativeEvent.layoutMeasurement.height
        : 0;

    return (
        <DraxScrollView
            ref={myRef}
            scrollEventThrottle={5}
            showsVerticalScrollIndicator={false}
            onScroll={event => setNativeEvent(event.nativeEvent)}
            {...other}>
            {children}

            <View
                style={[{
                    position: 'absolute',
                    top,

                    height: 200,
                    width: 4,
                    borderRadius: 20,
                    backgroundColor: 'gray',
                    opacity: 0.6,
                }, rtl ? { left: 4 } : { right: 4 }]}
            />
        </DraxScrollView>
    );
}

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
                justifyContent:nonFullRow?'flex-start':'space-between',
            }}>
                {rowChildren}
            </View>));
    }

    return <View style={{
        flex:1,
        minWidth: "100%",
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
    }}>
        {rowsArray}
    </View>

}
export const globalStyles = StyleSheet.create({
    headerStyle: {
        backgroundColor: semanticColors.header,
        height: dimensions.headerHeight
    },
    headerThinStyle: {
        backgroundColor: semanticColors.header,
        height: dimensions.thinHeaderHeight
    },
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
    }

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
        return <Image source={{ uri: props.name }} style={{
            width: props.size,
            height: props.size
        }} />
    }
    return <Icon name={props.name} size={props.size} color={props.color} />
}

export function AppText(props) {
    return (
        <Text style={[{
            fontFamily: getFont(),
            fontSize: 24,
            textAlign: isRTL() ? 'right' : 'left',

        }, props.style]} 
        onPress={props.onPress}
        >{props.children}</Text>
    );
}

export function getColorButton(callback, color, size, selected, index) {
    return getColorButtonInt(callback, color, size, selected ? "check" : undefined, index)
}

export function getColorButtonInt(callback, color, size, icon, index, iconColor) {
    return <TouchableOpacity
        onPress={callback}
        activeOpacity={0.7}
        key={"" + index}
    >
        <View style={{
            backgroundColor: color,
            borderRadius: size / 2,
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center'

        }}
        >

            {icon && <Icon color={iconColor || "white"} size={40} name={icon}></Icon>}
        </View>
    </TouchableOpacity>
}

export function getEraserIcon(callback, size, color, selected) {
    return <View><TouchableOpacity
        activeOpacity={0.7}
        onPress={callback}
        style={{
            borderRadius: 25,
            height: size - 10,
            width: size,
            alignItems: 'center',
            justifyContent: 'flex-end',
            //backgroundColor: selected ? semanticColors.selectedEditToolColor : 'transparent'
        }}>{getSvgIcon('eraser-new', size - 10, color)}
    </TouchableOpacity>
        {selected ? <View
            style={{
                borderBottomColor: 'black',
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

