import React, { useCallback, useState } from 'react';
import {
    View,
    StyleSheet
} from 'react-native';

import {
    availableColorPicker, getColorButton, getColorButtonInt, getRoundedButton
} from './elements'
import FadeInView from './FadeInView';
import ColorPicker from 'react-native-wheel-color-picker'
import { trace } from './log';


const styles = StyleSheet.create({
    pickerView: {
        flexDirection: 'column',
        position: 'absolute',
        backgroundColor: 'white',
        zIndex: 99999,
        left: 0,
        borderColor: 'gray',
        borderWidth: 1,
        alignItems: 'center'
    }
});


export function MyColorPicker(props) {

    const [openMore, setOpenMore] = useState(false);
    const [composedColor, setComposedColor] = useState(props.color);

    const _handleSelect = useCallback(() => props.onSelect(composedColor), [composedColor]);

    let colorButtonSize = (props.width) / ((availableColorPicker.length + 1) * 1.4);
    trace("color", props.color, "composed", composedColor)
    return <FadeInView height={props.open ? colorButtonSize + 10 + (openMore ? 350 : 0) : 0}
        style={[styles.pickerView, { top: props.top, left: 0, right: 0 }]}>
        <View
            style={{
                flexDirection: 'row',
                width: '100%', top: 0, height: colorButtonSize + 10,
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
            {getColorButtonInt(openMore ? _handleSelect : () => setOpenMore(val => !val),
                openMore ? composedColor : "gray",
                colorButtonSize,
                openMore ? (props.color === composedColor ? "check" : undefined) : "add",
                ""
            )
            }
        </View>
        {openMore && <View style={{ top: 0, left: 0, height: 300, width: "80%" }}>
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

