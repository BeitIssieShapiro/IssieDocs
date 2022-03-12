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
            {props.betaFeatures && getColorButtonInt(openMore ? _handleSelect : () => setOpenMore(val => !val),
                openMore ? composedColor : "gray",
                colorButtonSize,
                openMore ? (props.color === composedColor ? "check" : undefined) : "add",
                ""
            )
            }
        </View>
        {openMore && <View style={{ top: 0, left: 0, height: 300, width: "80%" }}>
            <View style={{
                position: "absolute", top: 30, left: 0, height: colorButtonSize * 3 + 30,
                zIndex: 1000
            }} >
                {lastColors.map((color, i) => [getColorButton(
                    () => props.onSelect(color),
                    color,
                    colorButtonSize,
                    color == props.color,
                    i), <Spacer key={i + "space"} />]
                )
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


export function TextSizePicker(props) {
    const [openMore, setOpenMore] = useState(false);

    const textSizesAct = props.betaFeatures ? textSizes.filter(v => v < 50) : textSizes
    let buttonSize = (props.width) / ((textSizesAct.length + 1) * (props.isScreenNarrow ? 1.2 : 1.4));

    return <FadeInView height={props.open ? buttonSize + 10 + (openMore ? buttonSize + 10 : 0) : 0}
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
                "more-vert",
                "",
                "black"
            )}
        </View>
        <View
            style={{
                flexDirection: 'row', width: '100%', height: buttonSize + 5,
                justifyContent: 'space-evenly'
            }}>
            {extendedTextSizes.map((size, i) => getTextSizePicker(props.color, buttonSize, size, size === props.size, i, (size) => props.onSelect(size)))}


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