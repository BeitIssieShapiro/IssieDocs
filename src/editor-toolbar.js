import React, { forwardRef, useCallback, useEffect, useImperativeHandle, Fragment, useState, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import Svg, { Line } from "react-native-svg";
import { AppText, availableColorPicker, colors, dimensions, getEraserIcon, getIconButton, IconButton, semanticColors, Spacer, textSizes } from "./elements";
import FadeInView from "./FadeInView";
import { getRowDirections, translate } from "./lang";
import { trace } from "./log";
import { BrushSizePicker, MyColorPicker, TextSizePicker } from "./pickers";
import { getSvgIcon, MarkerStroke } from "./svg-icons";
import { FEATURES, getFeaturesSetting } from "./settings";
import { IIF } from "./canvas/utils";
import { MyIcon } from "./common/icons";

export const TextAlignment = {
    RIGHT: "Right",
    LEFT: "Left",
    CENTER: "Center",
}
const Pickers = {
    NONE: 0,
    IMAGE: 1,
    TEXT: 2,
    BRUSH: 3,
    MARKER: 5,
    TABLE: 6,
    ZOOM: 7,
    COLOR: 8,
    VOICE: 9,
    RULER: 10,
    AUDIO: 11,
}

const availableBrushSize = [
    1, 3, 5, 7, 9
]

const availableMarkerSize = [
    10, 20, 30, 40, 50
]

const ButtonSpacer = (props) => (<Spacer key={16} width={props.width || 23} />);

function spread(btns) {
    return (<Fragment>
        <ButtonSpacer />
        {btns.map((item, i) => (
            item && <Fragment key={i}>
                {item}
                <ButtonSpacer width={isScreenNarrow() ? 15 : 23} />
            </Fragment>
        ))}
    </Fragment>);
}

function EditorToolbar({
    windowSize,
    fontSize4Toolbar,
    onGoBack,
    onUndo,
    onRedo,
    canRedo,
    eraseMode,
    onEraser,
    onTextMode,
    onImageMode,
    onAudioMode,
    onRulerMode,
    onAddImageFromCamera,
    onAddImageFromGallery,
    onMarkerMode,
    onTableMode,
    TableActions,
    onBrushMode,
    onVoiceMode,
    onZoomIn,
    onZoomOut,
    onSelectMarkerSize,
    onSelectBrushSize,
    onSelectColor,
    onSelectTextSize,
    onAddAudio,

    isTextMode,
    isImageMode,
    isAudioMode,
    isBrushMode,
    isMarkerMode,
    isTableMode,
    isVoiceMode,
    isRulerMode,
    Table,
    fontSize,

    brushColor,
    markerColor,
    rulerColor,
    textColor,
    tableColor,
    strokeWidth,
    markerWidth,

    sideMargin,
    maxFloatingHeight,
    onToolBarDimensionsChange,
    onSelectTextAlignment,
    textAlignment,
    showCenterTextAlignment,
    onSelectFont,
    textFont,
    textBold,
    textItalic,
    textUnderline,
    onSelectTextBold,
    onSelectTextItalic,
    onSelectTextUnderline,

}, ref) {
    const [showPicker, setShowPicker] = useState(false);
    const [showPickerType, setShowPickerType] = useState(Pickers.NONE);
    const [previousPickerType, setPreviousPickerType] = useState(undefined)

    const [showExtMenu, setShowExtMenu] = useState(false);
    const [toolbarHeight, setToolbarHeight] = useState(dimensions.toolbarHeight);

    const [menuHeight, setMenuHeight] = useState(0);

    const featuresRef = useRef(getFeaturesSetting());


    const [tableCols, setTableCols] = useState(Table ? Table.verticalLines.length - 1 : 3);
    const [tableRows, setTableRows] = useState(Table ? Table.horizontalLines.length - 1 : 3);

    useEffect(() => {
        onToolBarDimensionsChange(toolbarHeight, menuHeight)
    }, [menuHeight, toolbarHeight]);

    useEffect(() => {
        if (Table) {
            setTableCols(Table.verticalLines.length - 1);
            setTableRows(Table.horizontalLines.length - 1);
        }
    }, [Table]);

    const setColumns = (value) => {
        if (value >= 1) {
            TableActions.setRowsOrColumns(value, true);
            setTableCols(value);
            trace("set cols", value)
        }
    }
    const setRows = (value) => {
        if (value >= 1) {
            TableActions.setRowsOrColumns(value, false);
            setTableRows(value);
        }
    }


    fontSize = fontSize || 25;
    // strokeWidth = strokeWidth || 1;
    // color = color || colors.black;
    windowSize = windowSize || { width: 500 }

    isScreenNarrow = () => {
        return windowSize?.width < 500;
    }
    isLandscape = () => windowSize?.width > windowSize?.height;


    useImperativeHandle(ref, () => ({
        closePicker: () => {
            setShowPicker(false);
            setMenuHeight(0);
        },
        openImageSubMenu: () => {
            setShowPickerType(Pickers.IMAGE);
            setMenuHeight(70)
            setShowPicker(true);
        },
        openExtMenu: () => {
            setShowExtMenu(true);
        }

    }));


    useEffect(() => {
        setToolbarHeight(
            isScreenNarrow() ? (showExtMenu ? 3 : 2) * dimensions.toolbarHeight
                : (
                    showExtMenu ? 2 * dimensions.toolbarHeight : dimensions.toolbarHeight
                )
        )
    }, [showExtMenu, windowSize])

    onModeButtonClick = useCallback((type, height) => {
        let pickerTypeChanged = false;
        if (type !== showPickerType) {
            pickerTypeChanged = (showPickerType != Pickers.NONE);
            setShowPickerType(type);
            //pickerTypeChanged = true;
        }

        const checkPickerChange = () => {
            if (!pickerTypeChanged) setShowPicker(oldVal => {
                if (!oldVal) {
                    setMenuHeight(height);
                }
                return !oldVal
            });
        }

        switch (type) {
            case Pickers.TEXT:
                if (isTextMode) {
                    checkPickerChange()
                } else {
                    onTextMode();
                    setShowExtMenu(false);
                }
                break;
            case Pickers.BRUSH:
                if (isBrushMode) {
                    checkPickerChange()
                } else {
                    onBrushMode();
                    setShowExtMenu(false);
                }
                break;
            case Pickers.TABLE:
                if (isTableMode) {
                    checkPickerChange()
                } else {
                    const tableExists = onTableMode();
                    if (!tableExists) {
                        setMenuHeight(height);
                        setShowPicker(true);
                    }
                }
                break;
            case Pickers.MARKER:
                if (isMarkerMode) {
                    checkPickerChange()
                } else {
                    onMarkerMode();
                }
                break;
            case Pickers.IMAGE:
                if (isImageMode) {
                    checkPickerChange()
                } else {
                    onImageMode();
                }
                break;
            case Pickers.AUDIO:
                if (!isAudioMode) {
                    //     if (!pickerTypeChanged) setShowPicker(oldVal => !oldVal);
                    // } else {
                    onAudioMode();
                    //  setShowPicker(true);
                }
                break;
            case Pickers.VOICE:
                if (!isVoiceMode) {
                    onVoiceMode();
                }
                break;
            case Pickers.RULER:
                if (isRulerMode) {
                    checkPickerChange()
                } else {
                    onRulerMode();
                }
                break;
        }
    }, [isVoiceMode, isTextMode, isBrushMode, isTableMode, isImageMode, isAudioMode, isMarkerMode, showPickerType, showPicker]);


    onSelectButtonClick = useCallback((type, preservePrevious, height) => {
        if (showPickerType === type) {
            setShowPicker(oldVal => {
                if (setMenuHeight) {
                    trace("set menu height", oldVal ? 0 : height)
                    setMenuHeight(oldVal ? 0 : height)
                }
                return !oldVal
            });

        } else {
            if (preservePrevious && showPicker) {
                setPreviousPickerType(showPickerType);
            } else {
                setPreviousPickerType(undefined);
            }
            setShowPickerType(type);
            setShowPicker(true);
            if (setMenuHeight) {
                setMenuHeight(height)
            }
        }
    }, [showPickerType, showPicker]);


    const { rtl } = getRowDirections();

    let toolbarSideMargin = sideMargin > 70 ? 70 : sideMargin;
    if (windowSize && windowSize.width - 2 * toolbarSideMargin < 300) {
        toolbarSideMargin = 100;
    }

    const availablePickerWidth = windowSize ? windowSize.width - 2 * toolbarSideMargin : 500;
    let colorButtonsSize = windowSize ? (windowSize.width - 2 * toolbarSideMargin) / (availableColorPicker.length * 1.4) : 50;

    if (isScreenNarrow()) {
        colorButtonsSize *= 2;
    }

    let previewFontSize = fontSize4Toolbar(fontSize);
    let previewFontSizePlus = false;
    if (previewFontSize > dimensions.toolbarHeight - 5) {
        previewFontSizePlus = true;
        previewFontSize = dimensions.toolbarHeight - 5;
    }

    const rullerBtn = <IconButton onPress={() => onModeButtonClick(Pickers.RULER, 70)} color={rulerColor}
        iconType="MDI" icon="ruler" size={49} iconSize={45} selected={isRulerMode} ensureContrast={true} />;



    const extMenu = []

    if (featuresRef.current.includes(FEATURES.marker)) {
        extMenu.push(<IconButton onPress={() => onModeButtonClick(Pickers.MARKER, 70)} color={markerColor}
            iconType="MDI" icon="marker" size={50} iconSize={45} selected={isMarkerMode} ensureContrast={true} />
        )
    }

    if (featuresRef.current.includes(FEATURES.image)) {
        extMenu.push(<IconButton onPress={() => onModeButtonClick(Pickers.IMAGE, 70)
        } color={semanticColors.editPhotoButton}
            icon={"image"} size={47} iconSize={45} selected={isImageMode} />)
    }
    if (featuresRef.current.includes(FEATURES.voice)) {
        extMenu.push(<IconButton onPress={() => onModeButtonClick(Pickers.AUDIO, 70)
        } color={semanticColors.editPhotoButton}
            iconType="MDI" icon={"microphone"} size={47} iconSize={45} selected={isAudioMode} />)
    }

    if (featuresRef.current.includes(FEATURES.table)) {

        extMenu.push(< IconButton onPress={() => onModeButtonClick(Pickers.TABLE, isScreenNarrow() ? 160 : 80)
        } color={Table ? Table.color : tableColor}
            iconType="MDI" icon="table-large" size={47} iconSize={42} selected={isTableMode} ensureContrast={true} />)
    }
    if (featuresRef.current.includes(FEATURES.ruler)) {
        extMenu.push(rullerBtn);
    }

    const zoomBtn = <IconButton onPress={() => onSelectButtonClick(Pickers.ZOOM, false, 55)} color={semanticColors.editPhotoButton}
        icon="zoom-in" size={50} iconSize={45} />;
    if (extMenu.length > 0) {
        extMenu.push(zoomBtn);
    }

    const modesMenu = [
        <IconButton key={11} onPress={() => onModeButtonClick(Pickers.TEXT, 70)} icon={translate("A")} isText={true} selected={isTextMode}
            color={textColor} size={55} iconSize={rtl ? 45 : 40} ensureContrast={true}
        />,
        <IconButton key={13} onPress={() => onModeButtonClick(Pickers.BRUSH, 70)} icon={"edit"} size={55}
            color={brushColor} iconSize={45} selected={isBrushMode} ensureContrast={true} />,
        <IconButton onPress={() => onSelectButtonClick(Pickers.COLOR, true, 70)} iconType="MI" icon={"color-lens"}
            size={55} iconSize={45} color={semanticColors.editPhotoButton} />,
        extMenu.length > 0 ? <IconButton onPress={() => setShowExtMenu(currVal => !currVal)} iconType="MI" icon={showExtMenu ? "expand-less" : "expand-more"}
            size={45} color={semanticColors.editPhotoButton} /> : zoomBtn,
    ]

    // calc preview-window position: (width 120)
    // const folderUndoRedo = 55 * 3 + 23 * 2;
    // const modesButton = 55 * 5 + 23 * 4;
    const previewOffset = isScreenNarrow() ? 0 :
        windowSize.width / 2 - 60;
    //(windowSize.width - folderUndoRedo - modesButton) / 2 - 60 + folderUndoRedo;

    const colorByMode = IIF(semanticColors.addButton,
        [isTextMode, textColor],
        [isBrushMode, brushColor],
        [isMarkerMode, markerColor],
        [isRulerMode, rulerColor],
        [isTableMode, tableColor])


    {/* Toolbar */ }
    return <View style={{
        width: '100%',
        height: toolbarHeight, backgroundColor: semanticColors.subTitle,
        zIndex: 30
    }} >

        {/** Left side toolbar */}
        <View style={{
            direction: rtl,
            position: 'absolute',
            height: dimensions.toolbarHeight,
            left: 0,
            right: 0,
            flexDirection: rtl ? "row" : "row-reverse",
            alignItems: 'center',
            //justifyContent:"flex-end"
        }}>
            <IconButton onPress={onGoBack} color={semanticColors.editPhotoButton} icon="folder" size={55} iconSize={45} />
            <Spacer width={45} />
            <IconButton onPress={onUndo} color={semanticColors.editPhotoButton} iconType="MDI" icon={rtl ? "undo" : "redo"} size={55} />
            <Spacer width={23} />
            <IconButton onPress={onRedo} color={canRedo ? semanticColors.editPhotoButton : semanticColors.InactiveModeButton} iconType="MDI" icon={rtl ? "redo" : "undo"} size={55} />
            <Spacer width={23} />
            {getEraserIcon(onEraser, 50, eraseMode ? 'black' : semanticColors.editPhotoButton, eraseMode, 25)}
            { /* text size preview */}
            <View style={[{
                position: 'absolute',
                top: 0,
                width: 120,
                height: dimensions.toolbarHeight,
                backgroundColor: 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                alignContent: 'center',
            },
            //isScreenNarrow() ? { left: 0 } :
            { [rtl ? "right" : "left"]: previewOffset }
            ]} >
                {
                    isTextMode ?
                        <View

                        >
                            < AppText
                                style={
                                    [
                                        {
                                            fontSize: previewFontSize,
                                            width: "100%",
                                            lineHeight: previewFontSize + 8,
                                            color: textColor,
                                            textAlignVertical: 'center'
                                        },
                                        textFont ? { fontFamily: textFont } : {}
                                    ]
                                    //,rtl ? {} : { fontWeight: 'bold' }]
                                }
                            >{translate("A B C")}</AppText>
                            {previewFontSizePlus &&
                                <View style={[{
                                    position: 'absolute',
                                    top: 0,
                                    flex: 1,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    alignContent: "center"

                                }, rtl ? { left: -25 } : { right: -25 }]}><AppText
                                    style={{
                                        fontSize: 35,
                                        color: textColor,
                                    }}>+</AppText>
                                </View>}
                        </View> :
                        !isImageMode && !isTableMode && (isMarkerMode ?
                            <MarkerStroke color={colorByMode}
                                strokeWidth={markerWidth} />
                            :
                            getSvgIcon('doodle', 55, colorByMode, strokeWidth * .8))
                }
            </View>


            {/** right side top toolbar */}
            <View style={[{
                direction: rtl,
                position: 'absolute',
                [rtl ? "right" : "left"]: 0,
                height: dimensions.toolbarHeight,
                flexDirection: rtl ? "row-reverse" : "row",
                alignItems: 'center',
            }, isScreenNarrow() ?
                { top: dimensions.toolbarHeight } :
                { top: 0 }
            ]} >
                {spread(modesMenu)}
            </View>
        </View >
        {/** bottom toolbar */}
        {showExtMenu && <View style={{
            position: 'absolute', direction: rtl,
            [rtl ? "right" : "left"]: 0,
            //left:0,
            height: dimensions.toolbarHeight,
            flexDirection: rtl ? "row-reverse" : "row",
            alignItems: 'center',
            top: (isScreenNarrow() ? 2 : 1) * dimensions.toolbarHeight,

        }} >
            {/* <View style={{position:"absolute",  borderBottomWidth:1,bottom:12,left:0,width:"100%"}}/> */}
            {spread(extMenu)}
        </View>}
        {/**Side menu */}
        < View style={[{ position: "absolute", flexDirection: "column", top: 250, width: 45 },
        rtl ? { right: 0 } : { left: 0 }]
        }>
        </View >

        <MyColorPicker
            open={showPickerType === Pickers.COLOR && showPicker}
            top={toolbarHeight}
            width={availablePickerWidth}
            color={eraseMode ? undefined : colorByMode}
            isScreenNarrow={isScreenNarrow()}
            onSelect={(color) => {
                onSelectColor(color);
                if (previousPickerType) {
                    setShowPickerType(previousPickerType)
                } else {
                    setShowPicker(false);
                }
            }}
            onHeightChanged={(height) => {
                trace("color height ", height)
                setMenuHeight(height)
            }}
            maxHeight={maxFloatingHeight}
        />

        <TextSizePicker
            open={showPickerType === Pickers.TEXT && showPicker}
            top={toolbarHeight}
            width={availablePickerWidth}
            size={fontSize}
            fontSize4Toolbar={fontSize4Toolbar}
            color={textColor}
            isScreenNarrow={isScreenNarrow()}
            onSelect={(size, keepOpen) => {
                onSelectTextSize(size);
                if (!keepOpen)
                    setShowPicker(false);
            }}
            onHeightChanged={(height) => {
                trace("Text height ", height)
                setMenuHeight(height)
            }}
            maxHeight={maxFloatingHeight}
            onSelectTextAlignment={onSelectTextAlignment}
            textAlignment={textAlignment}
            showCenterTextAlignment={showCenterTextAlignment}
            onSelectFont={onSelectFont}
            textFont={textFont}
            textBold={textBold}
            textItalic={textItalic}
            textUnderline={textUnderline}
            onSelectTextBold={onSelectTextBold}
            onSelectTextItalic={onSelectTextItalic}
            onSelectTextUnderline={onSelectTextUnderline}
        />

        {/*View for selecting brush size*/}
        <FadeInView height={(showPickerType === Pickers.BRUSH || showPickerType === Pickers.RULER) && showPicker ? menuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                {
                    availableBrushSize.map((size, i) => <BrushSizePicker
                        color={brushColor}
                        brushSize={size}
                        size={colorButtonsSize}
                        key={"" + i}
                        onPress={(brushSize) => {
                            onSelectBrushSize(brushSize);
                            setShowPicker(false);
                        }}
                        selectedStrokeWidth={strokeWidth}
                        isScreenNarrow={isScreenNarrow()} />)
                }
            </View>
        </FadeInView>

        {/*View for zoom*/}
        <FadeInView height={showPickerType === Pickers.ZOOM && showPicker ? menuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: '35%', right: '35%' }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                <IconButton onPress={onZoomOut} icon={"zoom-out"} size={55} iconSize={45} />
                <IconButton onPress={onZoomIn} icon={"zoom-in"} size={55} iconSize={45} />
            </View>
        </FadeInView>

        {/*View for add image*/}
        <FadeInView height={showPickerType === Pickers.IMAGE && showPicker ? menuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: '35%', right: '35%' }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                <IconButton onPress={onAddImageFromGallery} icon={"new-image"} size={55} iconSize={45} iconType="svg" color="black" />
                <IconButton onPress={onAddImageFromCamera} icon={"new-camera"} size={55} iconSize={45} iconType="svg" color="black" />
            </View>
        </FadeInView>

        {/*View for Audio*/}
        {/* <FadeInView height={showPickerType === Pickers.AUDIO && showPicker ? menuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: '35%', right: '35%' }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                <RecordButton audioFile={currAudio} size={45} backgroundColor="red" height={55} revision={1} onNewAudioFile={(filePath)=>{
                    setCurrAudio(filePath);
                    onAddAudio(filePath);
                }}/>
            </View>
        </FadeInView> */}

        {/*View for selecting marker size*/}
        <FadeInView height={showPickerType === Pickers.MARKER && showPicker ? menuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>

            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                {
                    availableMarkerSize.map((size, i) => (<TouchableOpacity
                        key={i}
                        style={{ width: 50, height: 50 }}
                        onPress={() => {
                            onSelectMarkerSize(size);
                            setShowPicker(false);
                        }} >
                        <MarkerStroke color={markerColor} strokeWidth={size} />
                        {size === markerWidth && <View style={{ position: "absolute", bottom: 0, height: 8, width: 8, left: 21, borderRadius: 4, backgroundColor: markerColor }} />}
                    </TouchableOpacity>
                    ))
                }
            </View>
        </FadeInView>

        {/*View for selecting Table options*/}
        <FadeInView
            height={showPickerType === Pickers.TABLE && showPicker ? menuHeight : 0}
            style={[
                styles.pickerView,
                {
                    flexDirection: "row-reverse", top: toolbarHeight, left: 0, right: 0,
                    justifyContent: "space-evenly", alignItems: "center", flexWrap: "wrap"
                }
            ]}>
            <ToolbarGroup width={180} height={dimensions.toolbarHeight}>
                <NumberSelector direction={"row-reverse"} value={tableRows} setValue={setRows} icon="table-rows" />
            </ToolbarGroup>
            <ToolbarGroup width={180} height={dimensions.toolbarHeight}>
                <NumberSelector direction={"row-reverse"} value={tableCols} setValue={setColumns} icon="table-rows" rotateDeg={90} />
            </ToolbarGroup>

            <ToolbarGroup width={100} height={dimensions.toolbarHeight}>
                {
                    [2, 5, 8].map((borderWidth, i) => (<LineWidthSelector
                        height={40}
                        key={i}
                        borderWidth={borderWidth}
                        Table={Table}
                        TableActions={TableActions}
                        tableCols={tableCols} tableRows={tableRows}
                        color={Table ? Table.color : tableColor}
                    />))
                }
            </ToolbarGroup>

            <ToolbarGroup width={100} height={dimensions.toolbarHeight}>
                {
                    ["0,0", "2,2", "4,2"].map((style, i) => (<LineStyleSelector
                        height={40}
                        key={i}
                        style={style == "0,0" ? undefined : style}
                        Table={Table}
                        TableActions={TableActions}
                        color={Table ? Table.color : tableColor}
                    />))
                }
            </ToolbarGroup>

            <ToolbarGroup width={130} height={dimensions.toolbarHeight} onPress={() => {
                if (Table) {
                    TableActions.delete(Table.id);
                } else {
                    TableActions.addTable(tableCols, tableRows, tableColor, 2);
                }
            }}>
                <AppText style={{ fontSize: 20, color: semanticColors.actionButton }}>{translate(Table ? "DeleteTableCaption" : "ShowTableCaption")}</AppText>
                <MyIcon info={{ type: "MI", color: semanticColors.actionButton, name: Table ? "delete-forever" : "add", size: 35 }} />
            </ToolbarGroup>
        </FadeInView>

    </View >
}


function NumberSelector({ value, setValue, icon, direction, rotateDeg }) {
    return (
        <View style={{ flexDirection: direction, width: '100%', alignItems: "center", justifyContent: "center" }}>
            <IconButton icon="remove" size={45} onPress={() => setValue(value - 1)} color={semanticColors.actionButton} />
            <Spacer width={5} />
            <View>
                <Text allowFontScaling={false} style={{ fontSize: 20, textAlign: "center", justifyContent: "center", color: semanticColors.actionButton }}>
                    {value || 1}
                </Text>
                <MyIcon info={{ type: "MI", name: icon, size: 35, color: semanticColors.actionButton }} style={rotateDeg && { transform: [{ rotate: rotateDeg + 'deg' }] }} />
                <Spacer height={7} />
            </View>
            <Spacer width={5} />
            <IconButton icon="add" size={50} onPress={() => setValue(value + 1)} color={semanticColors.actionButton} />
        </View>
    )
}

function ToolbarGroup({ width, height, children, onPress }) {
    const style = {
        flexDirection: "row",
        justifyContent: "space-evenly",
        alignItems: "center",
        backgroundColor: semanticColors.mainAreaBG,
        borderRadius: 5,
        width,
        height,
        //backgroundColor: "#EBECEF", 
        margin: 4,
        borderRadius: 10
    }
    if (onPress) {
        return <TouchableOpacity style={style} onPress={onPress}>{children}</TouchableOpacity>
    }
    return <View style={style}>{children}</View>
}

function LineWidthSelector({ borderWidth, color, Table, TableActions, tableCols, tableRows, height }) {
    return <TouchableOpacity style={{ height, width: 20, alignItems: "center" }} onPress={() => {
        //add table
        if (!Table) {
            TableActions.addTable(tableCols, tableRows, color, borderWidth, "0,0");
        } else {
            TableActions.setBorderWidth(borderWidth);
        }
    }}>
        <View style={{ backgroundColor: color, height, width: borderWidth }} />
    </TouchableOpacity>
}

function LineStyleSelector({ tableCols, tableRows, style, Table, TableActions, color, height }) {
    return <TouchableOpacity style={{ height, width: 20, alignItems: "center" }} onPress={() => {
        //add table
        if (!Table) {
            TableActions.addTable(tableCols, tableRows, color, 2, style);
        } else {
            TableActions.setBorderStyle(style);
        }
    }}>
        <Svg viewBox={"0 0 3 " + height}>
            <Line x1="0" y1="0" x2="0" y2={height + ""} stroke={color} strokeWidth="3" strokeDasharray={style} />
        </Svg>
    </TouchableOpacity>
}
const styles = StyleSheet.create({
    pickerView: {
        flexDirection: 'row',
        position: 'absolute',
        backgroundColor: 'white',
        zIndex: 99999,
        left: 0,
        borderColor: 'gray',
        borderWidth: 1
    }
}
);


export default forwardRef(EditorToolbar);
