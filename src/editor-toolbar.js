import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { AppText, availableColorPicker, dimensions, getEraserIcon, IconButton, semanticColors, Spacer, textSizes } from "./elements";
import FadeInView from "./FadeInView";
import { getRowDirections, translate } from "./lang";
import { trace } from "./log";
import { BrushSizePicker, MyColorPicker, TextSizePicker } from "./pickers";
import { getSvgIcon, MarkerStroke, SvgIcon } from "./svg-icons";

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
    fontSize,
    color,
    strokeWidth,
    markerWidth,

    sideMargin,
    maxFloatingHeight,
    onToolBarDimensionsChange

}, ref) {
    const [showExtMenu, setShowExtMenu] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showTextSizePicker, setShowTextSizePicker] = useState(false);
    const [showBrushPicker, setShowBrushPicker] = useState(false);
    const [showZoomPicker, setShowZoomPicker] = useState(false);
    const [showMarkerPicker, setShowMarkerPicker] = useState(false);
    const [showAddImagePicker, setShowAddImagePicker] = useState(false);
    const [toolbarHeight, setToolbarHeight] = useState(dimensions.toolbarHeight);
    const [textMenuHeight, setTextMenuHeight] = useState(0);
    const [colorMenuHeight, setColorMenuHeight] = useState(0);
    const [brushMenuHeight, setBrushMenuHeight] = useState(0);
    const [zoomMenuHeight, setZoomMenuHeight] = useState(0);
    const [imageMenuHeight, setImageMenuHeight] = useState(0);


    useEffect(() => {
        onToolBarDimensionsChange(toolbarHeight, Math.max(textMenuHeight, colorMenuHeight, brushMenuHeight, zoomMenuHeight, imageMenuHeight))
    }, [textMenuHeight, colorMenuHeight, brushMenuHeight, zoomMenuHeight, imageMenuHeight, toolbarHeight]);


    fontSize = fontSize || 25;
    strokeWidth = strokeWidth || 1;
    color = color || "black"
    windowSize = windowSize || { width: 500 }

    isScreenNarrow = () => windowSize?.width < 500;
    isLandscape = () => windowSize?.width > windowSize?.height;

    closeAllPickers = () => {
        setShowBrushPicker(false);
        setShowColorPicker(false);
        setShowTextSizePicker(false);
        setShowZoomPicker(false);
        setShowAddImagePicker(false);
    }

    collapseExtended = () => {
        setShowExtMenu(false);
        setShowZoomPicker(false);
        setShowAddImagePicker(false);
    }

    useImperativeHandle(ref, () => ({
        closePicker: () => {
            closeAllPickers();
        },
        openImageSubMenu: () => {
            closeAllPickers();
            setShowAddImagePicker(true);
        }
    }));


    useEffect(() => {
        setToolbarHeight(
            (isScreenNarrow() || showExtMenu) && !isLandscape() ? 2 * dimensions.toolbarHeight : dimensions.toolbarHeight
        )
    }, [showExtMenu, windowSize])

    onTextButtonClick = useCallback(() => {
        if (!isTextMode) {
            onTextMode()
            collapseExtended();
        }

        if (isTextMode || showBrushPicker || showMarkerPicker) {
            setShowTextSizePicker(oldVal => !oldVal);
            setShowBrushPicker(false);
            setShowZoomPicker(false);
            setShowColorPicker(false);
            setShowAddImagePicker(false);
            setShowMarkerPicker(false);
        }
    }, [isTextMode, showBrushPicker, showTextSizePicker, showMarkerPicker]);

    onBrushButtonClick = useCallback(() => {
        if (!isBrushMode) {
            onBrushMode();
            collapseExtended();
        }

        if (isBrushMode || showTextSizePicker || showMarkerPicker) {
            setShowBrushPicker(oldVal => !oldVal);
            setShowTextSizePicker(false);
            setShowZoomPicker(false);
            setShowColorPicker(false);
            setShowAddImagePicker(false);
            setShowMarkerPicker(false);

        }
    }, [isBrushMode, showBrushPicker, showTextSizePicker, showMarkerPicker]);

    onColorButtonClick = () => {
        setShowColorPicker(oldVal => !oldVal);
        setShowBrushPicker(false);
        setShowTextSizePicker(false);
        setShowZoomPicker(false);
        setShowAddImagePicker(false);
        setShowMarkerPicker(false);
        collapseExtended();
    }

    onZoomButtonClick = () => {
        setShowZoomPicker(oldVal => !oldVal);
        setShowBrushPicker(false);
        setShowTextSizePicker(false);
        setShowColorPicker(false);
        setShowAddImagePicker(false);
        setShowMarkerPicker(false);
    }

    onMarkerButtonClick = useCallback(() => {
        if (!isMarkerMode) {
            onMarkerMode();
        }

        if (isMarkerMode || showTextSizePicker || showBrushPicker) {
            setShowMarkerPicker(oldVal => !oldVal);
            setShowBrushPicker(false);
            setShowTextSizePicker(false);
            setShowColorPicker(false);
            setShowAddImagePicker(false);
            setShowZoomPicker(false);
        }
    }, [isMarkerMode, showBrushPicker, showTextSizePicker, showMarkerPicker]);


    onImageButtonClick = () => {
        if (!isImageMode) {
            onImageMode();
        } else {
            setShowAddImagePicker(oldVal => !oldVal);
            setShowBrushPicker(false);
            setShowTextSizePicker(false);
            setShowColorPicker(false);
            setShowZoomPicker(false);
            setShowMarkerPicker(false);
        }

    }

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
        <IconButton onPress={onImageButtonClick} color={semanticColors.editPhotoButton}
            icon={"image"} size={55} iconSize={45} key={"1"} selected={isImageMode} />,
        <Spacer width={23} key="2" />,
        <IconButton onPress={onZoomButtonClick} color={semanticColors.editPhotoButton}
            icon="zoom-in" size={55} iconSize={45} key={"3"} />,
        <Spacer width={23} key="4" />,
        <IconButton onPress={onMarkerButtonClick} color={semanticColors.editPhotoButton}
            icon="marker" size={55} iconSize={45} key={"5"} selected={isMarkerMode} iconType="svg" />,
        <Spacer width={23} key="6" />,

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
                    !isImageMode && (isMarkerMode ?
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
                <IconButton onPress={onTextButtonClick} icon={translate("A")} isText={true} selected={isTextMode}
                    color={isTextMode ? color : semanticColors.editPhotoButton} size={55} iconSize={rtl ? 45 : 35}
                //fontWeight={rtl ? undefined : 'bold'} 
                />
                <Spacer width={23} />
                <IconButton onPress={onBrushButtonClick} icon={"edit"} size={55}
                    color={isBrushMode ? color : semanticColors.editPhotoButton} iconSize={45} selected={isBrushMode} />
                <Spacer width={23} />
                <IconButton onPress={onColorButtonClick} icon={"color-lens"} size={55} color={semanticColors.editPhotoButton} />
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
            open={showColorPicker}
            top={toolbarHeight}
            width={availablePickerWidth}
            color={eraseMode ? undefined : color}
            isScreenNarrow={isScreenNarrow()}
            onSelect={(color) => {
                onSelectColor(color);
                setShowColorPicker(false);
            }}
            onHeightChanged={(height) => {
                trace("color height ", height)
                setColorMenuHeight(height)
            }}
            maxHeight={maxFloatingHeight}
        />

        <TextSizePicker
            open={showTextSizePicker && isTextMode}
            top={toolbarHeight}
            width={availablePickerWidth}
            size={fontSize}
            fontSize4Toolbar={fontSize4Toolbar}
            color={color}
            isScreenNarrow={isScreenNarrow()}
            onSelect={(size, keepOpen) => {
                onSelectTextSize(size);
                if (!keepOpen)
                    setShowTextSizePicker(false);
            }}
            onHeightChanged={(height) => {
                trace("Text height ", height)
                setTextMenuHeight(height)
            }}
            maxHeight={maxFloatingHeight}
        />

        {/*View for selecting brush size*/}
        <FadeInView height={showBrushPicker ? pickerMenuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                {
                    availableBrushSize.map((size, i) => <BrushSizePicker
                        color={color}
                        brushSize={size}
                        size={colorButtonsSize}
                        key={"" + i}
                        onPress={(brushSize) => {
                            onSelectBrushSize(brushSize);
                            setShowBrushPicker(false);
                        }}
                        selectedStrokeWidth={strokeWidth}
                        isScreenNarrow={isScreenNarrow()} />)
                }
            </View>
        </FadeInView>

        {/*View for zoom*/}
        <FadeInView height={showZoomPicker ? pickerMenuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: '35%', right: '35%' }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                <IconButton onPress={onZoomOut} icon={"zoom-out"} size={55} iconSize={45} />
                <IconButton onPress={onZoomIn} icon={"zoom-in"} size={55} iconSize={45} />
            </View>
        </FadeInView>

        {/*View for add image*/}
        <FadeInView height={showAddImagePicker ? pickerMenuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: '35%', right: '35%' }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                <IconButton onPress={onAddImageFromGallery} icon={"new-image"} size={55} iconSize={45} iconType="svg" color="black" />
                <IconButton onPress={onAddImageFromCamera} icon={"new-camera"} size={55} iconSize={45} iconType="svg" color="black" />
            </View>
        </FadeInView>

        {/*View for selecting marker size*/}
        <FadeInView height={showMarkerPicker ? pickerMenuHeight : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>

            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                {
                    availableMarkerSize.map((size, i) => (<TouchableOpacity
                        key={i}
                        style={{ width: 50, height: 50 }}
                        onPress={() => {
                            onSelectMarkerSize(size);
                            setShowMarkerPicker(false);
                        }} >
                        <MarkerStroke color={color} strokeWidth={size} />
                        {size === markerWidth && <View style={{ position: "absolute", bottom: 0, height: 8, width: 8, left: 21, borderRadius: 4, backgroundColor: color }} />}
                    </TouchableOpacity>
                    ))
                }
            </View>
        </FadeInView>

    </View >
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