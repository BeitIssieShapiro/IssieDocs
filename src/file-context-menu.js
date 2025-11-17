import { View, Image, TouchableOpacity } from "react-native";
import { AppText, semanticColors, Spacer } from "./elements";
import FadeInView from "./FadeInView";
import { fTranslate, translate } from "./lang";
import { SvgIcon } from "./svg-icons";
import { getRowDirection, getRowReverseDirection, isRTL } from './lang';
import React, { useCallback } from "react";
import { trace } from "./log";
import { normalizeFoAndroid } from "./canvas/utils";
import { MyIcon } from "./common/icons";

export function FileContextMenu({
    width,
    item,
    height,
    isLandscape,
    open,
    onClose,
    inFoldersMode,

    onDeletePage,
    deletePageIndex, pagesCount,
    onDelete,
    onRename,
    onMove,
    onShareImgs,
    onShareIssieDocs,
    onDuplicate,

    onAddFromCamera,
    onAddFromMediaLib,
    onBlankPage,
    onLinesPage,
    onMathPage,

}) {

    if (!open) {
        return <View />;
    }

    //return <View style={{position:"absolute", zIndex: 100, left:100, width:100, height:100, backgroundColor:"green"}}/>

    const callbackAndClose = useCallback((callback) => () => {
        onClose();
        if (callback) callback();
    }, [onClose]);
    const scale = height < 400 || isLandscape && height < 500 ?
        .6 :
        height < 750 ?
            0.8 : 1;
    trace("fcm", width, height)
    height = Math.floor(height)
    //return <View style={{position:"absolute", zIndex: 100, left:100, width:100, height:100, backgroundColor:"green"}}/>
    return <TouchableOpacity style={{
        position: 'absolute',
        zIndex: 100, top: 0, width: '100%', height: '100%'
    }} onPress={onClose}>
        <FadeInView style={{
            position: "absolute",
            bottom: 0,
            backgroundColor: "white",
            zIndex: 1000,
            width,
            left: "12.5%",
            shadowColor: '#171717',
            shadowOffset: { width: 3, height: -5 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            borderTopLeftRadius: 15,
            borderTopRightRadius: 15,
        }}
            overflow={"visible"}
            height={open ? height : 0}
            duration={400}
        >
            {/** Close button */}
            <TouchableOpacity
                onPress={onClose}
                style={[{ position: "absolute", top: 8, width: 40, height: 40, zIndex: 101 }, isRTL() ? { left: 8 } : { right: 8 }]} >
                <MyIcon info={{ name: "close", size: 30 }} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={1} style={{ height: "100%", width: "100%" }}>

                {/**title */}
                <View style={{ flexDirection: getRowReverseDirection(), alignItems: "center", padding: 15 }}>
                    <Image source={normalizeFoAndroid({ uri: item.thumbnail })} style={{ height: 70, width: 50, resizeMode: "stretch", borderColor: "gray", borderWidth: 1 }} />
                    <Spacer width={10} />
                    <AppText style={{ fontSize: 35, width: width - 100 }}>{item.name}</AppText>
                </View>

                <Seperator />

                <View style={{
                    flexDirection: isLandscape ? getRowReverseDirection() : "column",
                    justifyContent: "space-evenly",
                    alignItems: isLandscape ? "flex-start" : "center",
                }}>
                    {/** Menu */}
                    <MenuGroup scale={scale} width={isLandscape ? "43%" : "90%"}>
                        <OneMenu scale={scale} icon="edit" onPress={callbackAndClose(onRename)} text={translate("BtnChangeName")} />
                        <Seperator />
                        {onDeletePage && <OneMenu scale={scale} icon="delete-forever" onPress={callbackAndClose(onDeletePage)} text={fTranslate("BeforeDeleteSubPageMenu", deletePageIndex, pagesCount)} />}
                        {onDeletePage && inFoldersMode && <Seperator />}
                        {inFoldersMode &&
                            <React.Fragment>
                                <OneMenu scale={scale} icon="delete-forever" onPress={callbackAndClose(onDelete)} text={translate("BtnDelete")} />
                                <Seperator />
                                <OneMenu scale={scale} icon="folder-move" iconType={"MDI"} onPress={callbackAndClose(onMove)} text={translate("BtnMove")} />
                                <Seperator />
                                <OneMenu scale={scale} icon="file-multiple" iconType={"MDI"} onPress={callbackAndClose(onDuplicate)} text={translate("BtnDuplicate")} />
                                <Seperator />
                                <OneMenu scale={scale} icon="share" onPress={callbackAndClose(onShareImgs)} text={translate("BtnShare")} />
                                <Seperator />
                                <OneMenu scale={scale} icon="ios-share" onPress={callbackAndClose(onShareIssieDocs)} text={translate("BtnShareIssieDocs")} />
                            </React.Fragment>
                        }
                    </MenuGroup>
                    <MenuGroup scale={scale} width={isLandscape ? "43%" : "90%"} title={translate("AddPageMenuTitle")} icon="menu-new-empty-page" iconType="svg">
                        <OneMenu scale={scale} icon="new-camera" iconType={"svg"} onPress={callbackAndClose(onAddFromCamera)} text={translate("MenuFromCamera")} />
                        <OneMenu scale={scale} icon="new-image" iconType={"svg"} onPress={callbackAndClose(onAddFromMediaLib)} text={translate("MenuFromMediaLib")} />
                        <OneMenu scale={scale} icon="page-empty" iconType={"svg"} onPress={callbackAndClose(onBlankPage)} text={translate("MenuNewPageEmpty")} />
                        <OneMenu scale={scale} icon="page-lines" iconType={"svg"} onPress={callbackAndClose(onLinesPage)} text={translate("MenuNewPageLines")} />
                        <OneMenu scale={scale} icon="page-math" iconType={"svg"} onPress={callbackAndClose(onMathPage)} text={translate("MenuNewPageMath")} />
                    </MenuGroup>
                </View>
            </TouchableOpacity>
        </FadeInView>
    </TouchableOpacity >
}


function MenuGroup(props) {
    return <View style={{
        flexDirection: "column",
        margin: 20 * props.scale,
        backgroundColor: "#F1F2F4",
        borderRadius: 10,
        width: props.width,
    }}>
        {props.title &&
            <View style={{ marginHorizontal: 15 }}>
                <AppText style={{ fontSize: 35 * props.scale }}>{props.title}</AppText>
            </View>
        }
        {props.title && <Seperator />}
        {props.children}
    </View>
}

function OneMenu({
    icon,
    iconType,
    onPress,
    text,
    scale
}) {
    iconType = iconType || 'MI'
    return <TouchableOpacity style={{
        flexDirection: getRowDirection(),
        justifyContent: "space-between",
        marginVertical: 10 * scale,
        marginHorizontal: 20
    }}
        onPress={onPress}

    >
        {iconType === "svg" ?

            <SvgIcon
                name={icon} size={40 * scale}
                color={semanticColors.titleText}
            />

            :
            <MyIcon info={{ type: iconType, name: icon, size: 40 * scale, color: semanticColors.titleText }} />
        }
        <AppText style={{ fontSize: 30 * scale }}>{text}</AppText>
    </TouchableOpacity>

}

function Seperator() {
    return <View
        style={{
            marginTop: 4,
            borderBottomColor: 'gray',
            borderBottomWidth: 1,
        }}
    />
}