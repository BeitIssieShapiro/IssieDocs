import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable
} from 'react-native';
import { Settings } from "./new-settings"
import {
    AppText,
    IconButton,
    Spacer,
    availableColorPicker, getColorButton, getColorButtonInt, semanticColors, textSizes
} from './elements'
import FadeInView from './FadeInView';
import ColorPicker from 'react-native-wheel-color-picker'
import { trace } from './log';
import { translate, gCurrentLang } from './lang';
import { LAST_COLORS } from './settings';
import Slider from '@react-native-community/slider';
import { TextAlignment } from './editor-toolbar';
import { MyIcon } from './common/icons';
import { AVAILABLE_FONTS } from './fonts.ts';
import { analyticEvent, AnalyticEvent, LocalAnalyticEvent } from './common/firebase';


const fontRowHeight = 60;

const styles = StyleSheet.create({
    pickerView: {
        direction: "ltr",
        flexDirection: 'column',
        position: 'absolute',
        backgroundColor: 'white',
        zIndex: 99999,
        left: 0,
        borderColor: 'gray',
        borderWidth: 1,
        //padding: 5,
        paddingTop: 2,
        alignItems: 'center'
    },
    fontSelectionRow: {
        direction: "rtl",
        flexDirection: 'row',
        width: '100%',
        height: fontRowHeight,
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingHorizontal: 10
    }
});


export function MyColorPicker(props) {

    const [openMore, setOpenMore] = useState(false);
    const [composedColor, setComposedColor] = useState(props.color);
    const [lastColors, setLastColors] = useState([]);


    useEffect(() => {
        //load last colors
        const lastC = Settings.get(LAST_COLORS.name);
        if (lastC?.length > 0) {
            setLastColors(lastC)
        }
    }, [])

    let colorButtonSize = (props.width) / ((availableColorPicker.length + 1) * 1.4);
    if (props.isScreenNarrow) {
        colorButtonSize *= 2;
    }
    let height = props.open ? colorButtonSize + 10 + (openMore ? 290 : 0) : 0;

    useEffect(() => {
        props.onHeightChanged(height);
    }, [openMore, props.open]);


    const _handleSelect = useCallback(() => {
        props.onSelect(composedColor)
        
        // Track custom color selection
        analyticEvent(LocalAnalyticEvent.custom_color_selected, {
            color: composedColor
        });
        
        if (lastColors.find(lc => lc === composedColor)) {
            return
        }
        //save the last three colors
        const lastC = [composedColor, ...lastColors];
        while (lastC.length > LAST_COLORS.max) {
            lastC.pop()
        }
        Settings.set({ [LAST_COLORS.name]: lastC })
        setLastColors(lastC)

    }, [composedColor, lastColors]);



    //trace("last colors", lastColors)
    //trace("color", props.color, "composed", composedColor)
    return <FadeInView height={height}
        style={[styles.pickerView, { top: props.top, left: 0, right: 0 }]}>
        <View
            style={{
                flexDirection: 'row',
                width: '100%', height: colorButtonSize,
                justifyContent: 'space-evenly', alignItems: 'center'
            }}>
            {availableColorPicker.map((color, i) => getColorButton(
                () => props.onSelect(color),
                color,
                colorButtonSize,
                color == props.color,
                i))
            }
            {/* More color button */}
            {getColorButtonInt(() => setOpenMore(val => !val),
                "white",
                colorButtonSize,
                openMore ? "expand-less" : "expand-more",
                "", "black"
            )
            }
        </View>
        {openMore && <View style={{ flex: 1, top: 0, left: 0, height: 300, width: "90%", alignItems: "center" }}>
            <View style={{
                position: "absolute",
                top: 30, left: -12,
                //height: colorButtonSize * 3 + 30,
                width: colorButtonSize * 2 + 30,
                flexWrap: "wrap",
                zIndex: 1000, flexDirection: "row"
            }} >
                {lastColors.map((color, i) => <View key={i} style={{ padding: 5 }}>{
                    getColorButton(
                        () => props.onSelect(color),
                        color,
                        colorButtonSize,
                        color == props.color,
                        i)
                }</View>
                )}



            </View>

            <View style={{
                position: "absolute",
                justifyContent: "flex-end",
                top: 95, right: isScreenNarrow() ? 0 : "15%",
                //height: colorButtonSize * 3 + 30,
                width: colorButtonSize * 2 + 30,
                flexWrap: "wrap",
                zIndex: 1000, flexDirection: "row"
            }} >
                {
                    composedColor && composedColor != props.color && !lastColors.find(lc => lc === composedColor) &&
                    <View style={{ padding: 5 }}>{getColorButton(
                        _handleSelect,
                        composedColor,
                        colorButtonSize,
                        false)}</View>
                }
            </View>
            <View style={{ width: "90%", height: "100%" }}>
                <ColorPicker
                    // ref={r => { this.picker = r }}
                    color={composedColor}
                    // swatchesOnly={this.state.swatchesOnly}
                    onColorChangeComplete={(color) => {
                        if (props.open) {
                            //trace("onColorChangeComplete", color)
                            setComposedColor(color)
                        }
                    }}
                    onColorChange={(color) => {
                        if (props.open) {
                            //trace("onColorChange", color)
                            setComposedColor(color)
                        }
                    }}

                    sliderSize={0}
                    noSnap={true}
                    row={false}
                    gapSize={10}
                    thumbSize={25}
                    autoResetSlider={true}

                    swatches={false}
                />
            </View>

        </View>
        }

    </FadeInView>
}

const minTextSizePickerCollapsedSize = 80;


export function TextSizePicker(props) {
    const [openMore, setOpenMore] = useState(false);
    const [height, setHeight] = useState(0);

    useEffect(() => props.onHeightChanged(height), [height]);

    const textAlignment = props.textAlignment;
    const onSelectTextAlignment = props.onSelectTextAlignment;
    const textFont = props.textFont;
    const onSelectFont = props.onSelectFont;

    // Get available fonts for selected language

    const textSizesAct = textSizes
    let buttonSize = (props.width) / ((textSizesAct.length + 1) * (props.isScreenNarrow ? .8 : 1.4));
    const simpleToolbarHeight = Math.max(buttonSize + (props.isScreenNarrow ? 0 : 10), minTextSizePickerCollapsedSize);
    const totalHeight = simpleToolbarHeight + (openMore ? 60 : 0);

    useEffect(() => {
        if (props.open) {
            setHeight(totalHeight)
        } else {
            setHeight(0);
        }
    }, [openMore, props.open, totalHeight]);

    const availableStyles = AVAILABLE_FONTS.find(af => af.name == textFont)?.supportedStyles || [];

    return <FadeInView
        overflow={"hidden"}
        height={props.open ? (simpleToolbarHeight + fontRowHeight + (openMore ? 80 : 0)) : 0}
        style={[styles.pickerView, { top: props.top, left: 0, right: 0 }]}>
        <View
            style={{
                flexDirection: 'row', width: '100%', height: simpleToolbarHeight,
                justifyContent: 'space-between', alignContent: 'center'
            }}>
            {textSizesAct.map((size, i) => getTextSizePicker(props.color, buttonSize, size, size === props.size, i, props.fontSize4Toolbar,
                (size) => {
                    setOpenMore(false)
                    props.onSelect(size)
                }))}

            <View style={{ width: 100, flexDirection: "column", justifyContent: 'flex-start', alignItems: "flex-end" }}>
                {!props.isScreenNarrow && <Spacer />}
                <View style={{ flexDirection: "row", height: 40, justifyContent: "space-evenly" }}>
                    <Spacer />
                    <SelectedCircle selected={textAlignment == TextAlignment.LEFT} size={40}>
                        <MyIcon info={{ name: "align-left", size: 25, color: props.color }}
                            onPress={() => onSelectTextAlignment(TextAlignment.LEFT)} />
                    </SelectedCircle>

                    {props.showCenterTextAlignment && <Spacer width={5} />}
                    {props.showCenterTextAlignment && <SelectedCircle selected={textAlignment == TextAlignment.CENTER} size={40}>
                        <MyIcon info={{ name: "align-center", size: 25, color: props.color }}
                            selected={textAlignment == TextAlignment.CENTER} onPress={() => onSelectTextAlignment(TextAlignment.CENTER)} />
                    </SelectedCircle>}
                    {!props.isScreenNarrow && <Spacer width={5} />}
                    <SelectedCircle selected={textAlignment == TextAlignment.RIGHT} size={40}>
                        <MyIcon info={{ name: "align-right", size: 25, color: props.color }}
                            onPress={() => onSelectTextAlignment(TextAlignment.RIGHT)} />
                    </SelectedCircle>
                    <Spacer />
                </View>
            </View>
        </View>


        {/* Font Selection Row */}
        <View
            style={styles.fontSelectionRow}>
            <View style={{ position: "absolute", left: 10 }}>
                <IconButton onPress={() => setOpenMore(val => !val)} icon={openMore ? "expand-less" : "expand-more"} color="black" size={40} />
            </View>
            {AVAILABLE_FONTS.map((font, i) => (
                <FontButton
                    key={i}
                    font={font}
                    selected={textFont === font.name}
                    onSelect={() => onSelectFont(font.name)}
                    size={42}
                />
            ))}
            <Spacer width={20} />
            <View style={{ borderWidth: 1, borderStyle: "solid", height: 40, width: 1, color: "gray" }} />
            <Spacer width={20} />
            {availableStyles.includes("bold") && <>
                <StyleButton
                    icon="format-bold"
                    selected={props.textBold}
                    onPress={() => props.onSelectTextBold?.(!props.textBold)}
                    size={42}
                />
                <Spacer width={5} />
            </>
            }
            {availableStyles.includes("italic") && <>
                <StyleButton
                    icon="format-italic"
                    selected={props.textItalic}
                    onPress={() => props.onSelectTextItalic?.(!props.textItalic)}
                    size={42}
                />
                <Spacer width={5} />
            </>
            }
            {availableStyles.includes("underline") &&
                <StyleButton
                    icon="format-underline"
                    selected={props.textUnderline}
                    onPress={() => props.onSelectTextUnderline?.(!props.textUnderline)}
                    size={42}
                />
            }
        </View>

        <View
            style={{
                height: 80,
                paddingTop: 10,
                paddingBottom: 2,
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: "85%"
            }}>
            <AppText style={{
                fontSize: 30,
                lineHeight: 30,
            }}
                onPress={() => props.onSelect(props.size - 5, true)}
            >{translate("A")}</AppText>
            <Slider
                value={props.size}
                tapToSeek={true}
                minimumValue={5}
                maximumValue={345}
                // step = {10}
                style={{
                    width: "80%", zIndex: 1000
                }}
                onSlidingComplete={(val => {
                    console.log("onSlidingComplete", val)
                    val = Math.floor(val / 10) * 10 + 5;
                    
                    // Track custom text size selection (only if not one of the preset sizes)
                    if (!textSizesAct.includes(val)) {
                        analyticEvent(LocalAnalyticEvent.custom_text_size_selected, {
                            size: val
                        });
                    }
                    
                    props.onSelect(val, false);
                })}

            />

            {/* <Slider
                style={{ backgroundColor: "green" }}
                value={10}
                onSlidingComplete={(val) => props.onSelect(val, true)}
                onValueChange={(val) => props.onSelect(val, true)}
                maximumValue={345}
                minimumValue={5}
                step={1}
                allowTouchTrack
                trackStyle={{ height: 5, backgroundColor: 'gray' }}
                thumbStyle={{ height: 20, width: 20, backgroundColor: 'blue' }}
            // thumbProps={{
            //     children: (
            //         <Icon
            //             name="heartbeat"
            //             type="font-awesome"
            //             size={20}
            //             reverse
            //             containerStyle={{ bottom: 20, right: 20 }}
            //             color={color()}
            //         />
            //     ),
            // }}
            /> */}
            <AppText style={{
                fontSize: 65,
                lineHeight: 65,
            }}
                onPress={() => props.onSelect(props.size + 5, true)}
            >{translate("A")}</AppText>
        </View>

    </FadeInView>
}

function getTextSizePicker(color, size, textSize, selected, index, fontSize4Toolbar, callback) {
    return <Pressable
        onPress={() => callback(textSize)}
        activeOpacity={0.7}
        key={"" + index}
    >
        <SelectedCircle selected={selected} size={size}>
            <AppText style={{
                color,
                fontSize: fontSize4Toolbar(textSize), //* rotateRatio, color: color,
                textAlignVertical: 'center',
                lineHeight: fontSize4Toolbar(textSize) + 4
            }}>{translate("A")}</AppText>
        </SelectedCircle>
    </Pressable>
}

function SelectedCircle({ size, children, selected, additionalStyle }) {
    return <View style={[{
        backgroundColor: selected ? '#eeeded' : 'transparent',
        borderRadius: size / 2,
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
        alignContent: 'center',
    }, additionalStyle]}
    >{children}</View>
}

function FontButton({ font, selected, onSelect, size }) {
    return (
        <Pressable onPress={onSelect} activeOpacity={0.7}>
            <SelectedCircle additionalStyle={{ width: undefined, paddingHorizontal: 15, maring: 10 }} selected={selected} size={size}>
                <AppText style={{
                    fontFamily: font.name,
                    fontSize: size * 0.5,
                    lineHeight: size * 0.6
                }}>
                    {translate(font.preview)}
                </AppText>
            </SelectedCircle>
        </Pressable>
    );
}

function StyleButton({ icon, selected, onPress, size }) {
    return (
        <Pressable onPress={onPress} activeOpacity={0.7}>
            <SelectedCircle selected={selected} size={size}>
                <MyIcon info={{ type: "MI", name: icon, size: size * 0.6, color: "black" }} />
            </SelectedCircle>
        </Pressable>
    );
}


export function BrushSizePicker({ color, size, brushSize, isScreenNarrow, onPress, selectedStrokeWidth }) {
    size = isScreenNarrow ? size + 10 : size;
    return <Pressable
        style={{ width: size, height: size }}
        onPress={() => onPress(brushSize)}
        activeOpacity={0.7}
    >
        <View style={{
            flex: 1,
            backgroundColor: brushSize === selectedStrokeWidth ? '#eeeded' : 'transparent',
            borderRadius: size / 2,
            justifyContent: 'center',
            alignItems: 'center'
        }}
        >
            <MyIcon info={{ name: "edit", size: brushSize * 4 + 12, color }} />
        </View>
    </Pressable>
}
