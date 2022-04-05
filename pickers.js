import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    Settings
} from 'react-native';

import {
    AppText,
    availableColorPicker, availableTextSize, extendedTextSizes, getColorButton, getColorButtonInt, getRoundedButton, Spacer, textSizes
} from './elements'
import FadeInView from './FadeInView';
import ColorPicker from 'react-native-wheel-color-picker'
import { trace } from './log';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { translate } from './lang';
import { LAST_COLORS } from './settings';
import { Icon } from 'react-native-elements'


const styles = StyleSheet.create({
    pickerView: {
        flexDirection: 'column',
        position: 'absolute',
        backgroundColor: 'white',
        zIndex: 99999,
        left: 0,
        borderColor: 'gray',
        borderWidth: 1,
        padding: 5,
        alignItems: 'center'
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

    const _handleSelect = useCallback(() => {
        props.onSelect(composedColor)
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

    let colorButtonSize = (props.width) / ((availableColorPicker.length + 1) * (props.isScreenNarrow ? 1.2 : 1.4));
    //trace("last colors", lastColors)
    //trace("color", props.color, "composed", composedColor)
    return <FadeInView height={props.open ? colorButtonSize + 10 + (openMore ? 350 : 0) : 0}
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
            {props.betaFeatures && getColorButtonInt(() => setOpenMore(val => !val),
                "white",
                colorButtonSize,
                openMore ? "expand-less" : "expand-more",
                "", "black"
            )
            }
        </View>
        {openMore && <View style={{ top: 0, left: 0, height: 300, width: "80%" }}>
            <View style={{
                position: "absolute",
                top: 30, left: 0,
                //height: colorButtonSize * 3 + 30,
                width: colorButtonSize * 2 + 30,
                flexWrap: "wrap",
                zIndex: 1000, flexDirection: "row"
            }} >
                {lastColors.map((color, i) => <View style={{ padding: 5 }}>{
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
                top: 30, right: 0,
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

                sliderSize={30}
                noSnap={true}
                row={false}
                gapSize={10}
                autoResetSlider={true}

                swatches={false}
            />

        </View>
        }

    </FadeInView>
}

const textSizeVolumeBarSize = 400;
const dotSize = 30;

export function TextSizePicker(props) {
    const [openMore, setOpenMore] = useState(false);
    const [composedSize, setComposedSize] = useState(props.size);

    useEffect(()=>{
        setComposedSize(props.size);
    }, [props.size])


    const textSizesAct = props.betaFeatures ? textSizes.filter(v => v < 50) : textSizes
    let buttonSize = (props.width) / ((textSizesAct.length + 1) * (props.isScreenNarrow ? 1.2 : 1.4));

    return <FadeInView height={props.open ? buttonSize + 10 + (openMore ? 350 : 0) : 0}
        style={[styles.pickerView, { top: props.top, left: 0, right: 0 }]}>
        <View
            style={{
                flexDirection: 'row', width: '100%', height: buttonSize + 5,
                justifyContent: 'space-evenly', alignContent: 'center'
            }}>
            {textSizesAct.map((size, i) => getTextSizePicker(props.color, buttonSize, size, size === props.size, i,
                (size) => {
                    setOpenMore(false)
                    props.onSelect(size)
                }))}

            {/* More button */}
            {props.betaFeatures && getColorButtonInt(() => setOpenMore(val => !val),
                "white",
                buttonSize,
                openMore ? "expand-less" : "expand-more",
                "",
                "black"
            )}
        </View>
        <View
            style={{
                flexDirection: 'column',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center'
                //justifyContent: 'space-evenly'
            }}>
            <Spacer height={15} />
            <View style={{ 
                position:'absolute',
                top:Math.max(100-composedSize/2, 0),
                minHeight: 200}}>
                <AppText style={{
                    fontSize: composedSize,
                    lineHeight: composedSize
                }}
                onPress={()=>props.onSelect(composedSize)}
                >{translate("A")}</AppText>
            </View>
            <Spacer height={25} />
            <View style={{
                height:100,
                position:'absolute',
                top:250,
            }} 
            
                onTouchStart={(e) => {
                trace("touch", e.nativeEvent.locationX);
                let val = Math.floor(e.nativeEvent.locationX);
                if (val < 10) {
                    val = 10;
                } else if (val>370) {
                    val = 370;
                }
                setComposedSize(val)
            }}
            >
                <View style={{
                    width: 0,
                    height: 0,
                    backgroundColor: "transparent",
                    borderStyle: "solid",
                    borderLeftWidth: 400,
                    borderBottomWidth: 30,
                    borderLeftColor: "transparent",
                    borderTopColor: "black"
                }}
                >
                    <View style={{
                        position: 'absolute',
                        bottom: -2 * dotSize,
                        left: -textSizeVolumeBarSize + (composedSize),
                        borderRadius: dotSize / 2,
                        width: dotSize,
                        height: dotSize,
                        backgroundColor: 'black'

                    }}></View>
                </View>
            </View>
            {/* {extendedTextSizes.map((size, i) => getTextSizePicker(props.color, buttonSize, size, size === props.size, i, (size) => props.onSelect(size)))} */}


        </View>
    </FadeInView>
}

function getTextSizePicker(color, size, textSize, selected, index, callback) {
    return <TouchableOpacity
        onPress={() => callback(textSize)}
        activeOpacity={0.7}
        key={"" + index}
    >
        <View style={{
            backgroundColor: selected ? '#eeeded' : 'transparent',
            borderRadius: size / 2,
            width: size,
            height: size,
            justifyContent: 'center',
            alignItems: 'center',
            alignContent: 'center',
        }}
        >
            <AppText style={{
                fontSize: textSize, color: color,
                textAlignVertical: 'center', lineHeight: textSize + 12
            }}>{translate("A")}</AppText>
        </View>
    </TouchableOpacity>
}


export function BrushSizePicker({ color, size, brushSize, isScreenNarrow, onPress, selectedStrokeWidth }) {
    size = isScreenNarrow ? size + 10 : size;
    return <TouchableOpacity
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
            <Icon name={"edit"} color={color} size={brushSize * 4 + 12}></Icon>
        </View>
    </TouchableOpacity>
}