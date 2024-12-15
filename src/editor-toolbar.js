import React, { forwardRef, useCallback, useEffect, useImperativeHandle, Fragment, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import Svg, { Line } from "react-native-svg";
import { AppText, availableColorPicker, dimensions, getEraserIcon, getIconButton, IconButton, semanticColors, Spacer, textSizes } from "./elements";
import FadeInView from "./FadeInView";
import { getRowDirections, translate } from "./lang";
import { trace } from "./log";
import { BrushSizePicker, MyColorPicker, TextSizePicker } from "./pickers";
import { getSvgIcon, MarkerStroke } from "./svg-icons";
import { Icon } from "react-native-elements";
import { RecordButton } from "./recording";

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

const pickerMenuHeight = 70;

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
    color,
    strokeWidth,
    markerWidth,

    sideMargin,
    maxFloatingHeight,
    onToolBarDimensionsChange,
    onSelectTextAlignment,
    textAlignment,
    showCenterTextAlignment,

}, ref) {
    const [showPicker, setShowPicker] = useState(false);
    const [showPickerType, setShowPickerType] = useState(Pickers.NONE);
    const [previousPickerType, setPreviousPickerType] = useState(undefined)

    const [showExtMenu, setShowExtMenu] = useState(false);
    const [toolbarHeight, setToolbarHeight] = useState(dimensions.toolbarHeight);
    const [textMenuHeight, setTextMenuHeight] = useState(0);
    const [colorMenuHeight, setColorMenuHeight] = useState(0);
    const [brushMenuHeight, setBrushMenuHeight] = useState(0);
    const [zoomMenuHeight, setZoomMenuHeight] = useState(0);
    const [imageMenuHeight, setImageMenuHeight] = useState(0);

    const [currAudio, setCurrAudio] = useState("");

    const [tableCols, setTableCols] = useState(Table ? Table.verticalLines.length - 1 : 3);
    const [tableRows, setTableRows] = useState(Table ? Table.horizontalLines.length - 1 : 3);

    useEffect(() => {
        onToolBarDimensionsChange(toolbarHeight, Math.max(textMenuHeight, colorMenuHeight, brushMenuHeight, zoomMenuHeight, imageMenuHeight))
    }, [textMenuHeight, colorMenuHeight, brushMenuHeight, zoomMenuHeight, imageMenuHeight, toolbarHeight]);

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
    strokeWidth = strokeWidth || 1;
    color = color || "black"
    windowSize = windowSize || { width: 500 }

    isScreenNarrow = () => {
        return windowSize?.width < 500;
    }
    isLandscape = () => windowSize?.width > windowSize?.height;


    useImperativeHandle(ref, () => ({
        closePicker: () => {
            setShowPicker(false);
        },
        openImageSubMenu: () => {
            setShowPickerType(Pickers.IMAGE);
            setShowPicker(true);
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

    onModeButtonClick = useCallback((type) => {
        let pickerTypeChanged = false;
        if (type !== showPickerType) {
            pickerTypeChanged = (showPickerType != Pickers.NONE);
            setShowPickerType(type);
            //pickerTypeChanged = true;
        }

        switch (type) {
            case Pickers.TEXT:
                if (isTextMode) {
                    if (!pickerTypeChanged) setShowPicker(oldVal => !oldVal);
                } else {
                    onTextMode();
                    setShowExtMenu(false);
                }
                break;
            case Pickers.BRUSH:
                if (isBrushMode) {
                    if (!pickerTypeChanged) setShowPicker(oldVal => !oldVal);
                } else {
                    onBrushMode();
                    setShowExtMenu(false);
                }
                break;
            case Pickers.TABLE:
                if (isTableMode) {
                    if (!pickerTypeChanged) setShowPicker(oldVal => !oldVal);
                } else {
                    const tableExists = onTableMode();
                    if (!tableExists) {
                        setShowPicker(true);
                    }
                }
                break;
            case Pickers.MARKER:
                if (isMarkerMode) {
                    if (!pickerTypeChanged) setShowPicker(oldVal => !oldVal);
                } else {
                    onMarkerMode();
                }
                break;
            case Pickers.IMAGE:
                if (isImageMode) {
                    if (!pickerTypeChanged) setShowPicker(oldVal => !oldVal);
                } else {
                    onImageMode();
                }
                break;
            case Pickers.AUDIO:
                if (isAudioMode) {
                    if (!pickerTypeChanged) setShowPicker(oldVal => !oldVal);
                } else {
                    onAudioMode();
                    setShowPicker(true);
                }
                break;
            case Pickers.VOICE:
                if (!isVoiceMode) {
                    onVoiceMode();
                }
                break;
            case Pickers.RULER:
                if (isRulerMode) {
                    if (!pickerTypeChanged) setShowPicker(oldVal => !oldVal);
                } else {
                    onRulerMode();
                }
                break;
        }
    }, [isVoiceMode, isTextMode, isBrushMode, isTableMode, isImageMode, isAudioMode, isMarkerMode, showPickerType, showPicker]);


    onSelectButtonClick = useCallback((type, preservePrevious) => {
        if (showPickerType === type) {
            setShowPicker(oldVal => !oldVal);
        } else {
            if (preservePrevious && showPicker) {
                setPreviousPickerType(showPickerType);
            } else {
                setPreviousPickerType(undefined);
            }
            setShowPickerType(type);
            setShowPicker(true);
        }
    }, [showPickerType, showPicker]);


    const { row, rowReverse, rtl } = getRowDirections();

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
    //trace("previewFontSize", previewFontSize, dimensions.toolbarHeight)
    let previewFontSizePlus = false;
    if (previewFontSize > dimensions.toolbarHeight - 5) {
        previewFontSizePlus = true;
        previewFontSize = dimensions.toolbarHeight - 5;
    }

    const sideMenu = [
        // <IconButton onPress={() => onSelectButtonClick(Pickers.ZOOM)} color={semanticColors.editPhotoButton}
        //     icon="zoom-in" size={42} iconSize={42}/>,
        //     <ButtonSpacer/>,
        // <IconButton onPress={() => onSelectButtonClick(Pickers.COLOR, true)} icon={"color-lens"}
        //     size={42} color={semanticColors.editPhotoButton} />,
        //     <ButtonSpacer/>,
        // getEraserIcon(onEraser, 42, eraseMode ? 'black' : semanticColors.editPhotoButton, eraseMode, 25)
    ]

    const rullerBtn = <IconButton onPress={() => onModeButtonClick(Pickers.RULER)} color={isRulerMode ? color : semanticColors.editPhotoButton}
        iconType="material-community" icon="ruler" size={49} iconSize={45} selected={isRulerMode} ensureContrast={true} />;

    const eraserBtn = getEraserIcon(onEraser, 50, eraseMode ? 'black' : semanticColors.editPhotoButton, eraseMode, 25);

    const extMenu = [
        <IconButton onPress={() => onModeButtonClick(Pickers.MARKER)} color={isMarkerMode ? color : semanticColors.editPhotoButton}
            iconType="material-community" icon="marker" size={50} iconSize={45} selected={isMarkerMode} ensureContrast={true} />,

        isScreenNarrow() && eraserBtn,

        <IconButton onPress={() => onModeButtonClick(Pickers.IMAGE)
        } color={semanticColors.editPhotoButton}
            icon={"image"} size={47} iconSize={45} selected={isImageMode} />,

        <IconButton onPress={() => onModeButtonClick(Pickers.AUDIO)
        } color={semanticColors.editPhotoButton}
            iconType="material-community" icon={"microphone"} size={47} iconSize={45} selected={isAudioMode} />,

        <IconButton onPress={() => onModeButtonClick(Pickers.TABLE)} color={isTableMode ? (Table ? Table.color : color) : semanticColors.editPhotoButton}
            iconType="font-awesome" icon="table" size={47} iconSize={42} selected={isTableMode} ensureContrast={true} />,

        rullerBtn,
        <IconButton onPress={() => onSelectButtonClick(Pickers.ZOOM)} color={semanticColors.editPhotoButton}
            icon="zoom-in" size={50} iconSize={45} />,
        // <IconButton onPress={() => onModeButtonClick(Pickers.VOICE)} color={semanticColors.editPhotoButton}
        //     icon="record-voice-over" size={55} iconSize={45} selected={isVoiceMode} />,



    ]

    const modesMenu = [
        <IconButton key={11} onPress={() => onModeButtonClick(Pickers.TEXT)} icon={translate("A")} isText={true} selected={isTextMode}
            color={isTextMode ? color : semanticColors.editPhotoButton} size={55} iconSize={rtl ? 45 : 40} ensureContrast={true}
        />,
        <IconButton key={13} onPress={() => onModeButtonClick(Pickers.BRUSH)} icon={"edit"} size={55}
            color={isBrushMode ? color : semanticColors.editPhotoButton} iconSize={45} selected={isBrushMode} ensureContrast={true} />,
        <IconButton onPress={() => onSelectButtonClick(Pickers.COLOR, true)} icon={"color-lens"}
            size={55} iconSize={45} color={semanticColors.editPhotoButton} />,
        <IconButton onPress={() => setShowExtMenu(currVal => !currVal)} icon={showExtMenu ? "expand-less" : "expand-more"}
            size={45} color={semanticColors.editPhotoButton} />,
    ]

    // calc preview-window position: (width 120)
    // const folderUndoRedo = 55 * 3 + 23 * 2;
    // const modesButton = 55 * 5 + 23 * 4;
    const previewOffset = isScreenNarrow() ? 0 :
        windowSize.width / 2 - 60;
    //(windowSize.width - folderUndoRedo - modesButton) / 2 - 60 + folderUndoRedo;


    {/* Toolbar */ }
    return <View style={{
        width: '100%',
        height: toolbarHeight, backgroundColor: semanticColors.subTitle,
        zIndex: 30
    }} >

        {/** Left side toolbar */}
        <View style={{
            position: 'absolute',
            height: dimensions.toolbarHeight,
            left: 0,
            right: 0,
            flexDirection: "row",
            alignItems: 'center',
            //justifyContent:"flex-end"
        }}>
            <IconButton onPress={onGoBack} color={semanticColors.editPhotoButton} icon="folder" size={55} iconSize={45} />
            <Spacer width={45} />
            <IconButton onPress={onUndo} color={semanticColors.editPhotoButton} icon={rtl ? "undo" : "redo"} size={55} />
            <Spacer width={23} />
            <IconButton onPress={onRedo} color={canRedo ? semanticColors.editPhotoButton : semanticColors.InactiveModeButton} icon={rtl ? "redo" : "undo"} size={55} />
            <Spacer width={23} />
            {!isScreenNarrow() && eraserBtn}

            { /* text size preview */}
            <View style={{
                position: 'absolute',
                top: 0,
                width: 120,
                height: dimensions.toolbarHeight,
                backgroundColor: 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                alignContent: 'center',
                right: isScreenNarrow() ? 0 : previewOffset
            }} >
                {
                    isTextMode ?
                        <View

                        >
                            < AppText
                                style={
                                    //[
                                    {
                                        fontSize: previewFontSize,
                                        width: "100%",
                                        lineHeight: previewFontSize + 8,
                                        color: color,
                                        textAlignVertical: 'center'
                                    }
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
                                        color: color,
                                    }}>+</AppText>
                                </View>}
                        </View> :
                        !isImageMode && !isTableMode && (isMarkerMode ?
                            <MarkerStroke color={color} strokeWidth={markerWidth} />
                            :
                            getSvgIcon('doodle', 55, color, strokeWidth * .8))
                }
            </View>


            {/** right side top toolbar */}
            <View style={[{
                position: 'absolute',
                height: dimensions.toolbarHeight,
                flexDirection: rowReverse, alignItems: 'center',
            }, //isScreenNarrow() ?
            //{ top: dimensions.toolbarHeight, left: 0 } //:
            { top: 0, right: 0 }
            ]} >
                {spread(modesMenu)}
            </View>
        </View >
        {/** bottom toolbar */}
        {showExtMenu && <View style={[{
            position: 'absolute',
            height: dimensions.toolbarHeight,
            flexDirection: rowReverse, alignItems: 'center',
            top: (isScreenNarrow() ? 2 : 1) * dimensions.toolbarHeight,

        }, rtl ? { right: 0 } : { left: 0 }]} >
            {/* <View style={{position:"absolute",  borderBottomWidth:1,bottom:12,left:0,width:"100%"}}/> */}
            {spread(extMenu)}
        </View>}
        {/**Side menu */}
        < View style={[{ position: "absolute", flexDirection: "column", top: 250, width: 45 },
        rtl ? { right: 0 } : { left: 0 }]
        }>
            {sideMenu}
        </View >

        <MyColorPicker
            open={showPickerType === Pickers.COLOR && showPicker}
            top={toolbarHeight}
            width={availablePickerWidth}
            color={eraseMode ? undefined : color}
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
                setColorMenuHeight(height)
            }}
            maxHeight={maxFloatingHeight}
        />

        <TextSizePicker
            open={showPickerType === Pickers.TEXT && showPicker}
            top={toolbarHeight}
            width={availablePickerWidth}
            size={fontSize}
            fontSize4Toolbar={fontSize4Toolbar}
            color={color}
            isScreenNarrow={isScreenNarrow()}
            onSelect={(size, keepOpen) => {
                onSelectTextSize(size);
                if (!keepOpen)
                    setShowPicker(false);
            }}
            onHeightChanged={(height) => {
                trace("Text height ", height)
                setTextMenuHeight(height)
            }}
            maxHeight={maxFloatingHeight}
            onSelectTextAlignment={onSelectTextAlignment}
            textAlignment={textAlignment}
            showCenterTextAlignment={showCenterTextAlignment}
        />

        {/*View for selecting brush size*/}
        <FadeInView height={(showPickerType === Pickers.BRUSH || showPickerType === Pickers.RULER) && showPicker ? pickerMenuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                {
                    availableBrushSize.map((size, i) => <BrushSizePicker
                        color={color}
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
        <FadeInView height={showPickerType === Pickers.ZOOM && showPicker ? pickerMenuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: '35%', right: '35%' }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                <IconButton onPress={onZoomOut} icon={"zoom-out"} size={55} iconSize={45} />
                <IconButton onPress={onZoomIn} icon={"zoom-in"} size={55} iconSize={45} />
            </View>
        </FadeInView>

        {/*View for add image*/}
        <FadeInView height={showPickerType === Pickers.IMAGE && showPicker ? pickerMenuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: '35%', right: '35%' }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                <IconButton onPress={onAddImageFromGallery} icon={"new-image"} size={55} iconSize={45} iconType="svg" color="black" />
                <IconButton onPress={onAddImageFromCamera} icon={"new-camera"} size={55} iconSize={45} iconType="svg" color="black" />
            </View>
        </FadeInView>

        {/*View for Audio*/}
        <FadeInView height={showPickerType === Pickers.AUDIO && showPicker ? pickerMenuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: '35%', right: '35%' }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                <RecordButton audioB64={currAudio} size={45} backgroundColor="red" height={55} revision={1} onNewAudioFile={(b64)=>{
                    setCurrAudio(b64);
                    onAddAudio(b64);
                }}/>
            </View>
        </FadeInView>

        {/*View for selecting marker size*/}
        <FadeInView height={showPickerType === Pickers.MARKER && showPicker ? pickerMenuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>

            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                {
                    availableMarkerSize.map((size, i) => (<TouchableOpacity
                        key={i}
                        style={{ width: 50, height: 50 }}
                        onPress={() => {
                            onSelectMarkerSize(size);
                            setShowPicker(false);
                        }} >
                        <MarkerStroke color={color} strokeWidth={size} />
                        {size === markerWidth && <View style={{ position: "absolute", bottom: 0, height: 8, width: 8, left: 21, borderRadius: 4, backgroundColor: color }} />}
                    </TouchableOpacity>
                    ))
                }
            </View>
        </FadeInView>

        {/*View for selecting Table options*/}
        <FadeInView
            height={showPickerType === Pickers.TABLE && showPicker ? (isScreenNarrow() ? 2 * pickerMenuHeight : pickerMenuHeight) : 0}
            style={[
                styles.pickerView,
                {
                    flexDirection: rowReverse, top: toolbarHeight, left: 0, right: 0,
                    justifyContent: "space-evenly", alignItems: "center", flexWrap: "wrap"
                }
            ]}>
            <ToolbarGroup width={180} height={pickerMenuHeight - 15}>
                <NumberSelector direction={rowReverse} value={tableRows} setValue={setRows} icon="table-rows" />
            </ToolbarGroup>
            <ToolbarGroup width={180} height={pickerMenuHeight - 15}>
                <NumberSelector direction={rowReverse} value={tableCols} setValue={setColumns} icon="table-rows" rotateDeg={90} />
            </ToolbarGroup>

            <ToolbarGroup width={100} height={pickerMenuHeight - 15}>
                {
                    [2, 5, 8].map((borderWidth, i) => (<LineWidthSelector
                        height={40}
                        key={i}
                        borderWidth={borderWidth}
                        Table={Table}
                        TableActions={TableActions}
                        tableCols={tableCols} tableRows={tableRows}
                        color={Table ? Table.color : color}
                    />))
                }
            </ToolbarGroup>

            <ToolbarGroup width={100} height={pickerMenuHeight - 15}>
                {
                    ["0,0", "2,2", "4,2"].map((style, i) => (<LineStyleSelector
                        height={40}
                        key={i}
                        style={style}
                        Table={Table}
                        TableActions={TableActions}
                        color={Table ? Table.color : color}
                    />))
                }
            </ToolbarGroup>

            {/* <View style={{ width: '20%', alignItems: 'center', backgroundColor: "#EBECEF", paddingTop: 10, margin: 4, borderRadius: 10 }}>
                <AppText style={{ fontSize: isScreenNarrow() ? 20 : 30 }}>{translate(Table ? "DeleteTableCaption" : "ShowTableCaption")}</AppText> */}
            {/*<PushButton2 titleOn={translate("Yes")} titleOff={translate("No")} onPressCallback={() => {
                    if (Table) {
                        TableActions.delete(Table.id);
                    } else {
                        TableActions.addTable(tableRows, tableCols, color, 2);
                    }
                }} isOn={Table !== undefined} />
                 */}
            <ToolbarGroup width={130} height={pickerMenuHeight - 15} onPress={() => {
                if (Table) {
                    TableActions.delete(Table.id);
                } else {
                    TableActions.addTable(tableCols, tableRows, color, 2);
                }
            }}>
                <AppText style={{ fontSize: 20, color: semanticColors.actionButton }}>{translate(Table ? "DeleteTableCaption" : "ShowTableCaption")}</AppText>
                <Icon color={semanticColors.actionButton} name={Table ? "delete-forever" : "add"} size={35} />

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
                <Text style={{ fontSize: 20, textAlign: "center", justifyContent: "center", color: semanticColors.actionButton }}>
                    {value || 1}
                </Text>
                <Icon name={icon} size={35} color={semanticColors.actionButton} style={rotateDeg && { transform: [{ rotate: rotateDeg + 'deg' }] }} />
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
    return <TouchableOpacity style={{ height, width: 15 }} onPress={() => {
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
    return <TouchableOpacity style={{ height, width: 15 }} onPress={() => {
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