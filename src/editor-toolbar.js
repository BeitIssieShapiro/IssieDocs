import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Button } from "react-native";
import { AppText, availableColorPicker, dimensions, getEraserIcon, IconButton, semanticColors, Spacer, textSizes } from "./elements";
import FadeInView from "./FadeInView";
import { getRowDirections, translate } from "./lang";
import { trace } from "./log";
import { BrushSizePicker, MyColorPicker, TextSizePicker } from "./pickers";
import PushButton from "./push-button";
import { getSvgIcon, MarkerStroke, SvgIcon } from "./svg-icons";

const Pickers = {
    NONE: 0,
    IMAGE: 1,
    TEXT: 2,
    BRUSH: 3,
    MARKER: 5,
    TABLE: 6,
    ZOOM: 7,
    COLOR: 8,
}

const availableBrushSize = [
    1, 3, 5, 7, 9
]

const availableMarkerSize = [
    10, 20, 30, 40, 50
]

const pickerMenuHeight = 70;


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

    isScreenNarrow = () => windowSize?.width < 500;
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
            (isScreenNarrow() || showExtMenu) && !isLandscape() ? 2 * dimensions.toolbarHeight : dimensions.toolbarHeight
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
                }
                setShowExtMenu(false);
                break;
            case Pickers.BRUSH:
                if (isBrushMode) {
                    if (!pickerTypeChanged) setShowPicker(oldVal => !oldVal);
                } else {
                    onBrushMode();
                }
                setShowExtMenu(false);

                //collapseExtended();
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
        }
    }, [isTextMode, isBrushMode, isTableMode, isImageMode, isMarkerMode, showPickerType, showPicker]);


    onSelectButtonClick = useCallback((type, preservePrevious) => {
        if (showPickerType === type) {
            setShowPicker(oldVal => !oldVal);
        } else {
            if (preservePrevious) {
                setPreviousPickerType(showPickerType);
            } else {
                setPreviousPickerType(undefined);
            }
            setShowPickerType(type);
            setShowPicker(true);
        }
    }, [showPickerType]);


    const { row, rowReverse, flexEnd, textAlign, rtl, direction } = getRowDirections();

    let toolbarSideMargin = sideMargin > 70 ? 70 : sideMargin;
    if (windowSize && windowSize.width - 2 * toolbarSideMargin < 300) {
        toolbarSideMargin = 100;
    }

    const availablePickerWidth = windowSize ? windowSize.width - 2 * toolbarSideMargin : 500;
    let colorButtonsSize = windowSize ? (windowSize.width - 2 * toolbarSideMargin) / (availableColorPicker.length * 1.4) : 50;


    let previewFontSize = fontSize4Toolbar(fontSize);
    //trace("previewFontSize", previewFontSize, dimensions.toolbarHeight)
    let previewFontSizePlus = false;
    if (previewFontSize > dimensions.toolbarHeight - 5) {
        previewFontSizePlus = true;
        previewFontSize = dimensions.toolbarHeight - 5;
    }


    const extMenu = [
        <IconButton onPress={() => onModeButtonClick(Pickers.IMAGE)} color={semanticColors.editPhotoButton}
            icon={"image"} size={55} iconSize={45} key={"1"} selected={isImageMode} />,
        <Spacer width={23} key="2" />,
        <IconButton onPress={() => onSelectButtonClick(Pickers.ZOOM)} color={semanticColors.editPhotoButton}
            icon="zoom-in" size={55} iconSize={45} key={"3"} />,
        <Spacer width={23} key="4" />,
        <IconButton onPress={() => onModeButtonClick(Pickers.MARKER)} color={isMarkerMode?color:semanticColors.editPhotoButton}
            icon="marker" size={55} iconSize={45} key={"5"} selected={isMarkerMode} iconType="svg" />,
        <Spacer width={23} key="6" />,
        <IconButton onPress={() => onModeButtonClick(Pickers.TABLE)} color={isTableMode ? (Table ? Table.color : color) : semanticColors.editPhotoButton}
            icon="table-chart" size={55} iconSize={45} key={"7"} selected={isTableMode} />,
        <Spacer width={23} key="8" />,

        // page && page.count > 1 &&
        // getIconButton(() => this.deletePage(), semanticColors.editPhotoButton, 'delete-forever', 55, undefined, undefined, undefined, "5"),
        // < Spacer width={23} key="6" />,
    ];


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
            alignItems: 'center'
        }}>
            <IconButton onPress={onGoBack} color={semanticColors.editPhotoButton} icon="folder" size={45} />
            <Spacer width={45} />
            <IconButton onPress={onUndo} color={semanticColors.editPhotoButton} icon={rtl ? "undo" : "redo"} size={55} />
            <Spacer width={23} />
            <IconButton onPress={onRedo} color={canRedo ? semanticColors.editPhotoButton : semanticColors.InactiveModeButton} icon={rtl ? "redo" : "undo"} size={55} />
            <Spacer width={23} />
            {getEraserIcon(onEraser, 55, eraseMode ? 'black' : semanticColors.editPhotoButton, eraseMode)}


            { /* text size preview */}
            <View style={{
                position: 'absolute',
                top: 0,
                right: isScreenNarrow() ? 0 : windowSize.width / 2 - 50,
                width: 120,
                height: dimensions.toolbarHeight,
                backgroundColor: 'transparent',
                borderRadius: 24.5,
                justifyContent: 'center',
                alignItems: 'center',
                alignContent: 'center',
                // borderRadius: dimensions.toolbarHeight,
                // borderColor: "black",
                // borderTopWidth: 3,
                // borderBottomWidth: 3,
                // borderStartWidth: 1,
                // borderEndWidth: 1,
            }}>
                {isTextMode ?
                    <View

                    >
                        <AppText
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
                { top: 0, right: 50 }
            ]} >
                <IconButton onPress={() => onModeButtonClick(Pickers.TEXT)} icon={translate("A")} isText={true} selected={isTextMode}
                    color={isTextMode ? color : semanticColors.editPhotoButton} size={55} iconSize={rtl ? 45 : 35}
                //fontWeight={rtl ? undefined : 'bold'} 
                />
                <Spacer width={23} />
                <IconButton onPress={() => onModeButtonClick(Pickers.BRUSH)} icon={"edit"} size={55}
                    color={isBrushMode ? color : semanticColors.editPhotoButton} iconSize={45} selected={isBrushMode} />
                <Spacer width={23} />
                <IconButton onPress={() => onSelectButtonClick(Pickers.COLOR, true)} icon={"color-lens"} size={55} color={semanticColors.editPhotoButton} />
                <Spacer width={23} />


                {(isLandscape() || isScreenNarrow()) && extMenu}
                {!isLandscape() && !isScreenNarrow() &&
                    <IconButton onPress={() => setShowExtMenu(oldVal => !oldVal)} color={semanticColors.editPhotoButton}
                        icon={showExtMenu ? "expand-less" : "expand-more"} size={55} iconSize={45} />}
                {/* {!betaFeatures && !isScreenNarrow() && <IconButton onPress={onZoomButtonClick} color={semanticColors.editPhotoButton}
                    icon="zoom-in" size={55} iconSize={45} key={"3"} />} */}
            </View>

            {/** bottom toolbar */}
            {showExtMenu && !isLandscape() && <View style={{
                position: 'absolute',
                height: dimensions.toolbarHeight,
                flexDirection: 'row', alignItems: 'center',
                top: dimensions.toolbarHeight, left: sideMargin + 30
            }} >
                {extMenu}
            </View>}
        </View>

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
        <FadeInView height={showPickerType === Pickers.TABLE && showPicker ? 150 : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>
            <View style={{ flexDirection: 'column', width: '30%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                <NumberSelector caption="rows" value={tableRows} setValue={setRows} />
                <NumberSelector caption="cols" value={tableCols} setValue={setColumns} />
            </View>

            <View style={{ flexDirection: 'column', width: '30%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                {/* <Text style={{fontSize:25}}>Line Style</Text> */}
                {/* <TouchableOpacity onPress={() => {
                    if (Table) {
                        TableActions.delete(Table.id);
                    }
                }}>
                    <Text>None</Text>
                </TouchableOpacity> */}
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
            <View style={{ flexDirection: 'column', width: '30%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                <PushButton title={"Show"} onPress={() => {
                    if (Table) return;
                    TableActions.addTable(tableCols, tableCols, color, 2);
                }} isOn={Table !== undefined} />

                <PushButton title={"Hide"} onPress={() => {
                    if (!Table) return;
                    TableActions.delete(Table.id);
                }} isOn={Table === undefined} />
            </View>

        </FadeInView>

    </View >
}


function NumberSelector({ caption, value, setValue }) {
    return (
        <View style={{ flexDirection: 'row', width: '30%', }}>
            <Text style={{ fontSize: 25, marginRight: 10 }}>{caption}</Text>
            <IconButton icon="remove" size={35} onPress={() => setValue(value - 1)} />
            <Text style={{ backgroundColor: "lightgray", fontSize: 25, lineHeight: 38, height: 35, width: 35, textAlign: "center", justifyContent: "center" }}>
                {value || 0}
            </Text>
            <IconButton icon="add" size={35} onPress={() => setValue(value + 1)} />
        </View>
    )

}

function LineWidthSelector({ borderWidth, color, Table, TableActions, tableCols, tableRows }) {
    return <TouchableOpacity style={{ height: 35, width: 70, alignItems: "center", justifyContent: "center" }} onPress={() => {
        //add table
        if (!Table) {
            TableActions.addTable(tableCols, tableCols, color, borderWidth);
        } else {
            TableActions.setBorderWidth(borderWidth);
        }
    }}>
        <View style={{ backgroundColor: color, height: borderWidth, width: 70 }} />
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