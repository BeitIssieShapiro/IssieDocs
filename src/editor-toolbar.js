import React, { forwardRef, useCallback, useEffect, useImperativeHandle, Fragment, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Button } from "react-native";
import Svg, { Line } from "react-native-svg";
import { AppText, availableColorPicker, dimensions, getEraserIcon, Icon, IconButton, semanticColors, Spacer, textSizes } from "./elements";
import FadeInView from "./FadeInView";
import { getRowDirections, translate } from "./lang";
import { trace } from "./log";
import { BrushSizePicker, MyColorPicker, TextSizePicker } from "./pickers";
import { getSvgIcon, MarkerStroke, SvgIcon } from "./svg-icons";
import PushButton2 from "./push-button";

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
            <Fragment key={i}>
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

    isTextMode,
    isImageMode,
    isBrushMode,
    isMarkerMode,
    isTableMode,
    isVoiceMode,
    Table,
    fontSize,
    color,
    strokeWidth,
    markerWidth,

    sideMargin,
    maxFloatingHeight,
    onToolBarDimensionsChange

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

    isScreenNarrow = () =>{
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
            setShowPickerType(type);
            pickerTypeChanged = true;
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
                    onTableMode();
                    if (Table === undefined) {
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
            case Pickers.VOICE:
                if (!isVoiceMode) {
                    onVoiceMode();
                }
                break;
        }
    }, [isVoiceMode, isTextMode, isBrushMode, isTableMode, isImageMode, isMarkerMode, showPickerType, showPicker]);


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


    const { row, rowReverse, flexEnd, textAlign, rtl, direction } = getRowDirections();

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

    const extMenu = [
        <IconButton onPress={() => onModeButtonClick(Pickers.MARKER)} color={isMarkerMode ? color : semanticColors.editPhotoButton}
            icon="marker" size={55} iconSize={45} selected={isMarkerMode} iconType="svg" ensureContrast={true} />,

        <IconButton onPress={() => onModeButtonClick(Pickers.IMAGE)} color={semanticColors.editPhotoButton}
            icon={"image"} size={55} iconSize={45} selected={isImageMode} />,

        <IconButton onPress={() => onModeButtonClick(Pickers.TABLE)} color={isTableMode ? (Table ? Table.color : color) : semanticColors.editPhotoButton}
            icon="table-chart" size={55} iconSize={45} selected={isTableMode} ensureContrast={true} />,
        // <IconButton onPress={() => onModeButtonClick(Pickers.VOICE)} color={semanticColors.editPhotoButton}
        //     icon="record-voice-over" size={55} iconSize={45} selected={isVoiceMode} />,

        <IconButton onPress={() => onSelectButtonClick(Pickers.ZOOM)} color={semanticColors.editPhotoButton}
            icon="zoom-in" size={55} iconSize={45} />,
        getEraserIcon(onEraser, 55, eraseMode ? 'black' : semanticColors.editPhotoButton, eraseMode, 25)

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
            flexDirection: row,
            alignItems: 'center',
        }}>
            <IconButton onPress={onGoBack} color={semanticColors.editPhotoButton} icon="folder" size={55} iconSize={45} />
            <Spacer width={45} />
            <IconButton onPress={onUndo} color={semanticColors.editPhotoButton} icon={rtl ? "undo" : "redo"} size={55} />
            <Spacer width={23} />
            <IconButton onPress={onRedo} color={canRedo ? semanticColors.editPhotoButton : semanticColors.InactiveModeButton} icon={rtl ? "redo" : "undo"} size={55} />


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
            }, isScreenNarrow() ?
                { top: dimensions.toolbarHeight, left: 0 } :
                { top: 0, right: 0 }
            ]} >
                {spread(modesMenu)}
            </View>
        </View >
        {/** bottom toolbar */}
        {showExtMenu && <View style={{
            position: 'absolute',
            height: dimensions.toolbarHeight,
            flexDirection: 'row', alignItems: 'center',
            top: (isScreenNarrow() ? 2 : 1) * dimensions.toolbarHeight, left: 0
        }} >
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
        />

        {/*View for selecting brush size*/}
        <FadeInView height={showPickerType === Pickers.BRUSH && showPicker ? pickerMenuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>
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
        <FadeInView height={showPickerType === Pickers.TABLE && showPicker ? 150 : 0} style={[styles.pickerView, { flexDirection:rowReverse ,top: toolbarHeight, left: 0, right: 0 , justifyContent:"space-evenly"}]}>
            <View style={{ flexDirection: 'column', width: '40%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center', backgroundColor:"#EBECEF", margin:4, marginEnd:10, borderRadius:10, paddingEnd:10}}>
                <NumberSelector narrow={isScreenNarrow()} caption={translate("RowsCaption")} direction={rowReverse} value={tableRows} setValue={setRows} textIcon={<Icon name="table-rows" size={35} />} />
                <NumberSelector narrow={isScreenNarrow()} caption={translate("ColsCaption")} direction={rowReverse} value={tableCols} setValue={setColumns} textIcon={<Icon name="table-rows" style={{ transform: [{ rotate: '90deg' }] }} size={35} isScreenNarrow={isScreenNarrow()}/>} />
            </View>

            <View style={{ flexDirection: 'column', width: '17%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center', backgroundColor:"#EBECEF", margin:4, borderRadius:10 }}>
                {
                    [2, 5, 8].map((borderWidth, i) => (<LineWidthSelector
                        key={i}
                        borderWidth={borderWidth}
                        Table={Table}
                        TableActions={TableActions}
                        tableCols={tableCols} tableRows={tableRows}
                        color={Table ? Table.color : color}
                    />))
                }
            </View>
            <View style={{ flexDirection: 'column', width: '15%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center', backgroundColor:"#EBECEF", margin:4, borderRadius:10 }}>
                {
                    ["0,0", "2,2", "4,2"].map((style, i) => (<LineStyleSelector
                        key={i}
                        style={style}
                        Table={Table}
                        TableActions={TableActions}
                        color={Table ? Table.color : color}
                    />))
                }

            </View>
            <View style={{  width: '20%',  alignItems: 'center', backgroundColor:"#EBECEF", paddingTop:10, margin:4, borderRadius:10 }}>
                <AppText style={{fontSize: isScreenNarrow()?20:30}}>{translate("ShowTableCaption")}</AppText>
                <PushButton2 titleOn={translate("Yes")} titleOff={translate("No")} onPressCallback={() => {
                    if (Table) {
                        TableActions.delete(Table.id);
                    } else {
                        TableActions.addTable(tableRows, tableCols, color, 2);
                    }
                }} isOn={Table !== undefined} />
            </View>
        </FadeInView>

    </View >
}


function NumberSelector({ caption, value, setValue, textIcon, direction, narrow }) {
    trace("NumberSelector", narrow)
    return (
        <View style={{ flexDirection: direction, width: '100%', alignItems: "center" }}>
            {!narrow && textIcon}
            {!narrow && <AppText style={{ fontSize: 30, marginRight: 10, marginLeft: 10, width: 100, textAlign: "right" }}>{caption + ":"}</AppText>}
            <IconButton icon="remove" backgroundColor={semanticColors.mainAreaBG} size={50} onPress={() => setValue(value - 1)} />
            <Text style={{ fontSize: 40, lineHeight: 55, height: 55, width: 55, textAlign: "center", justifyContent: "center" }}>
                {value || 1}
            </Text>
            <IconButton icon="add" backgroundColor={semanticColors.mainAreaBG} size={50} onPress={() => setValue(value + 1)} />
        </View>
    )

}

function LineWidthSelector({ borderWidth, color, Table, TableActions, tableCols, tableRows }) {
    return <TouchableOpacity style={styles.lineStyle} onPress={() => {
        //add table
        if (!Table) {
            TableActions.addTable(tableCols, tableRows, color, borderWidth, "0,0");
        } else {
            TableActions.setBorderWidth(borderWidth);
        }
    }}>
        <View style={{ backgroundColor: color, height: borderWidth, width: 70 }} />
    </TouchableOpacity>
}

function LineStyleSelector({ tableCols, tableRows, style, Table, TableActions, color }) {
    return <TouchableOpacity style={styles.lineStyle} onPress={() => {
        //add table
        if (!Table) {
            TableActions.addTable(tableCols, tableRows, color, 2, style);
        } else {
            TableActions.setBorderStyle(style);
        }
    }}>
        <Svg viewBox="0 0 70 3">
            <Line x1="0" y1="0" x2="70" y2="0" stroke={color} strokeWidth="3" strokeDasharray={style} />
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
    },
    lineStyle: {
        height: 35, width: 70,
        alignItems: "center", justifyContent: "center"
    },
}
);


export default forwardRef(EditorToolbar);