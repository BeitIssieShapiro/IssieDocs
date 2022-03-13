import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Icon } from 'react-native-elements'
import { AppText, availableColorPicker, dimensions, getEraserIcon, IconButton, semanticColors, Spacer } from "./elements";
import FadeInView from "./FadeInView";
import { translate } from "./lang";
import { trace } from "./log";
import { BrushSizePicker, MyColorPicker, TextSizePicker } from "./pickers";
import { getSvgIcon } from "./svg-icons";

const availableBrushSize = [
    1, 3, 5, 7, 9
]

export function EditorToolbar({
    windowSize,

    onGoBack,
    onUndo,
    onRedo,
    canRedo,
    eraseMode,
    onEraser,
    onTextMode,
    onImageMode,
    onAddImage,
    onBrushMode,
    onZoomIn,
    onZoomOut,

    onSelectBrushSize,
    onSelectColor,
    onSelectTextSize,

    isTextMode,
    isImageMode,
    isBrushMode,
    fontSize,
    color,
    strokeWidth,

    sideMargin,
    betaFeatures,
    toolbarHeight,
    onToolbarHeightChange

}) {
    const [showExtMenu, setShowExtMenu] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showTextSizePicker, setShowTextSizePicker] = useState(false);
    const [showBrushPicker, setShowBrushPicker] = useState(false);
    const [showZoomPicker, setShowZoomPicker] = useState(false);

    fontSize = fontSize || 25;
    strokeWidth = strokeWidth || 1;
    color = color || "black"
    windowSize = windowSize || {width:500}

    isScreenNarrow = () => windowSize?.width < 500;
    isLandscape = () => windowSize?.width > windowSize?.height;

    useEffect(()=>{
        const calcHeight = (isScreenNarrow() || showExtMenu) && !isLandscape()  ? 2 * dimensions.toolbarHeight : dimensions.toolbarHeight
        if (toolbarHeight !== calcHeight) {
            onToolbarHeightChange(calcHeight)
        }    
    }, [showExtMenu, windowSize])

    onTextButtonClick = useCallback(() => {
        if (!isTextMode) {
            onTextMode()
        }

        if (isTextMode || showBrushPicker) {
            setShowTextSizePicker(oldVal => !oldVal);
            setShowBrushPicker(false);
            setShowZoomPicker(false);
            setShowColorPicker(false);
        }
    }, [isTextMode, showBrushPicker, showTextSizePicker]);

    onBrushButtonClick = useCallback(() => {
        if (!isBrushMode) {
            onBrushMode()
        }

        if (isBrushMode || showTextSizePicker) {
            setShowBrushPicker(oldVal => !oldVal);
            setShowTextSizePicker(false);
            setShowZoomPicker(false);
            setShowColorPicker(false);
        }
    }, [isBrushMode, showBrushPicker, showTextSizePicker]);

    onColorButtonClick = () => {
        setShowColorPicker(oldVal => !oldVal);
        setShowBrushPicker(false);
        setShowTextSizePicker(false);
        setShowZoomPicker(false);
    }

    onZoomButtonClick = () => {
        setShowZoomPicker(oldVal => !oldVal);
        setShowBrushPicker(false);
        setShowTextSizePicker(false);
        setShowColorPicker(false);
    }

    onImageButtonClick = () => {
        if (isImageMode) {
            onAddImage();
        } else {
            onImageMode()
        }
    }



    let toolbarSideMargin = sideMargin > 70 ? 70 : sideMargin;
    if (windowSize && windowSize.width - 2 * toolbarSideMargin < 300) {
        toolbarSideMargin = 100;
    }

    const availablePickerWidth = windowSize ? windowSize.width - 2 * toolbarSideMargin : 500;
    let colorButtonsSize = windowSize ? (windowSize.width - 2 * toolbarSideMargin) / (availableColorPicker.length * 1.4) : 50;

    const extMenu = [
        <IconButton onPress={onImageButtonClick} color={semanticColors.editPhotoButton}
            icon={"image"} size={55} iconSize={45} key={"1"} selected={isImageMode}/>,
        <Spacer width={23} key="2" />,
        <IconButton onPress={onZoomButtonClick} color={semanticColors.editPhotoButton}
            icon="zoom-in" size={55} iconSize={45} key={"3"} />,
        <Spacer width={23} key="4" />,
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
            flexDirection: 'row',
            alignItems: 'center'
        }}>
            <IconButton onPress={onGoBack} color={semanticColors.editPhotoButton} icon="folder" size={45} />
            <Spacer width={45} />
            <IconButton onPress={onUndo} color={semanticColors.editPhotoButton} icon="undo" size={55} />
            <Spacer width={23} />
            <IconButton onPress={onRedo} color={canRedo ? semanticColors.editPhotoButton : semanticColors.InactiveModeButton} icon="redo" size={55} />
            <Spacer width={23} />
            {getEraserIcon(onEraser, 55, eraseMode ? 'black' : semanticColors.editPhotoButton, eraseMode)}


            { /* text size preview */}
            <View style={{
                position: 'absolute',
                top: 0,
                right: isScreenNarrow() ? 0 : windowSize.width / 2 - 50,
                width: 100,
                height: dimensions.toolbarHeight,
                backgroundColor: 'transparent',
                borderRadius: 24.5,
                justifyContent: 'center',
                alignItems: 'center',
                alignContent: 'center',
            }}>
                {isTextMode ?
                    <AppText
                        style={{
                            fontSize: fontSize,
                            lineHeight: fontSize + 8,
                            color: color,
                            textAlignVertical: 'center'
                        }}
                    >{translate("A B C")}</AppText> :
                    isImageMode ?
                        <Icon name={"image"} size={55} color={semanticColors.editPhotoButton} /> :
                        getSvgIcon('doodle', 55, color, strokeWidth * .8)
                }
            </View>


            {/** right side top toolbar */}
            <View style={[{
                position: 'absolute',
                height: dimensions.toolbarHeight,
                flexDirection: 'row-reverse', alignItems: 'center'
            }, isScreenNarrow() ?
                { top: dimensions.toolbarHeight, left: sideMargin } :
                { top: 0, right: 50 }
            ]} >
                <IconButton onPress={onTextButtonClick} icon={translate("A")} isText={true} selected={isTextMode}
                    color={isTextMode ? color : semanticColors.editPhotoButton} size={55} iconSize={45} />
                <Spacer width={23} />
                <IconButton onPress={onBrushButtonClick} icon={"edit"} selected={isTextMode} size={55}
                    color={isBrushMode ? color : semanticColors.editPhotoButton} iconSize={45} selected={isBrushMode} />
                <Spacer width={23} />
                <IconButton onPress={onColorButtonClick} icon={"color-lens"} size={55} color={semanticColors.editPhotoButton} />
                <Spacer width={23} />


                {isLandscape() && betaFeatures && extMenu}
                {!isLandscape() && betaFeatures &&
                    <IconButton onPress={() => setShowExtMenu(oldVal => !oldVal)} color={semanticColors.editPhotoButton}
                        icon={showExtMenu ? "expand-less" : "expand-more"} size={55} iconSize={45} />}
                {!betaFeatures && <IconButton onPress={onZoomButtonClick} color={semanticColors.editPhotoButton}
                    icon="zoom-in" size={55} iconSize={45} key={"3"} />}
            </View>

            {/** bottom toolbar */}
            {showExtMenu && betaFeatures && <View style={{
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
            betaFeatures={betaFeatures}
            top={toolbarHeight}
            width={availablePickerWidth}
            color={eraseMode ? undefined : color}
            isScreenNarrow={isScreenNarrow()}
            onSelect={(color) => onSelectColor(color)}

        />

        <TextSizePicker
            open={showTextSizePicker && isTextMode}
            betaFeatures={betaFeatures}
            top={toolbarHeight}
            width={availablePickerWidth}
            size={fontSize}
            color={color}
            isScreenNarrow={isScreenNarrow()}
            onSelect={(size) => onSelectTextSize(size)}
        />

        {/*View for selecting brush size*/}
        <FadeInView height={showBrushPicker ? 70 : 0} style={[styles.pickerView, { top: toolbarHeight, left: 0, right: 0 }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                {
                    availableBrushSize.map((size, i) => <BrushSizePicker
                        color={color}
                        brushSize={size}
                        size={colorButtonsSize}
                        key={"" + i}
                        onPress={(brushSize) => onSelectBrushSize(brushSize)}
                        selectedStrokeWidth={strokeWidth}
                        isScreenNarrow={isScreenNarrow()} />)
                }
            </View>
        </FadeInView>

        {/*View for zoom*/}
        <FadeInView height={showZoomPicker ? 70 : 0} style={[styles.pickerView, { top: toolbarHeight, left: '35%', right: '35%' }]}>
            <View style={{ flexDirection: 'row', width: '100%', bottom: 0, justifyContent: 'space-evenly', alignItems: 'center' }}>
                <IconButton onPress={onZoomOut} icon={"zoom-out"} size={55} iconSize={45} />
                <IconButton onPress={onZoomIn} icon={"zoom-in"} size={55} iconSize={45} />
            </View>
        </FadeInView>

    </View>
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
