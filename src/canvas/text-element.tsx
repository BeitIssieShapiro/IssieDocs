// TextElement.tsx
import React, { forwardRef, useEffect, useImperativeHandle } from "react";
import { View, Text, TextInput, StyleSheet, LayoutChangeEvent, TextInputProps, ViewProps, ColorValue } from "react-native";
import IconIonic from "react-native-vector-icons/Ionicons";
import { MoveIcon } from "./canvas-elements";
import { SketchText, MoveTypes, SketchPoint, SketchTable } from "./types";
import { calcEffectiveHorizontalLines, tableColWidth, tableRowHeight } from "./utils";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedIcon = Animated.createAnimatedComponent(IconIonic);


interface TextElementProps {
    text: SketchText;
    editMode: boolean;
    actualWidth: number;
    ratio: number;
    moveResponder: any;
    moveContext: React.MutableRefObject<any>;
    onTextChanged: (id: string, text: string) => void;
    handleTextLayout: (e: LayoutChangeEvent, text: SketchText) => void;
    tables?: SketchTable[];
    texts: SketchText[];
}

function TextElement({
    text,
    editMode,
    actualWidth,
    ratio,
    moveResponder,
    moveContext,
    onTextChanged,
    handleTextLayout,
    tables,
    texts,
}: TextElementProps, ref: any) {
    //console.log("text ratio", ratio, actualWidth, text.fontSize)
    const textBGColor = useSharedValue<ColorValue>("yellow");
    const moveIconDisplay = useSharedValue<'none' | 'flex' | undefined>("flex");
    const table = text.tableId && tables?.find(table => table.id == text.tableId);

    const bgAnimatedStyle = useAnimatedStyle(() => ({
        backgroundColor: textBGColor.value,
    }));
    const visibleAnimatedStyle = useAnimatedStyle(() => ({
        display: moveIconDisplay.value
    }));

    useImperativeHandle(ref, () => ({
        prepareForThumbnail: () => {
            console.log("prep for tn")
            textBGColor.value = "transparent";
            moveIconDisplay.value = "none";
        },
    }));

    useEffect(() => {

        textBGColor.value = (text.color == '#fee100' ? "gray" : "yellow");
        moveIconDisplay.value = "flex";
    }, [text, editMode])

    // if (text.tableId) {
    //     console.log("text table",text.tableId, table)
    // } else {
    //     console.log("text ",text)
    // }
    const horizontalLines = table ? calcEffectiveHorizontalLines(table, texts) : [];
    const posStyle: any = table ?
        {
            position: "absolute",

            ...(text.rtl ?
                { right: actualWidth - (table.verticalLines[text.x + 1] - table.strokeWidth / 2) * ratio, } :
                { left: (table.verticalLines[text.x] + table.strokeWidth / 2) * ratio }
            ),
            top: (horizontalLines[text.y]) * ratio + table.strokeWidth / 2,
            width: tableColWidth(table, text.x) * ratio - table.strokeWidth,
            minHeight: tableRowHeight(table, text.y) * ratio - table.strokeWidth,
        } :
        {
            position: "absolute",
            ...(text.rtl ?
                { right: actualWidth - text.x * ratio }
                : { left: text.x * ratio }),
            top: text.y * ratio,
            maxWidth: text.rtl ? text.x * ratio - 3 :
                actualWidth - text.x * ratio - 3,
        };

    const style: any = {
        color: text.color, fontSize: text.fontSize * ratio,
        textAlign: text.alignment.toLowerCase()
    };

    const moveIconStyle: any = { position: "absolute", ...(text.rtl ? { right: -25 } : { left: -25 }) }
    //console.log("text style", actualWidth, ratio)
    if (editMode) {
        return (
            <Animated.View
                //direction={text.rtl ? "rtl" : "ltr"}
                key={text.id}
                style={[styles.textInputHost, posStyle, { zIndex: 500 }, table && bgAnimatedStyle]}
                {...(table ? {} : moveResponder.panHandlers)}
                onStartShouldSetResponder={(e) => {
                    moveContext.current = { type: MoveTypes.Text, id: text.id, offsetX: text.rtl ? -15 : 15, offsetY: -15 };
                    return moveResponder.panHandlers?.onStartShouldSetResponder?.(e) || false;
                }}
            >
                {!table && <AnimatedIcon style={[moveIconStyle, visibleAnimatedStyle]} name="move" size={25} color={"blue"} />}
                <>
                    <AnimatedTextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        allowFontScaling={false}
                        multiline
                        autoFocus
                        style={[styles.textStyle, style, bgAnimatedStyle,
                        table && { width: posStyle.width },
                        !table && { minWidth: Math.max(text.fontSize * ratio, 20 / ratio) }
                        ]}
                        value={text.text}
                        onChange={(tic) => onTextChanged(text.id, tic.nativeEvent.text)}
                    />
                    {/* Hidden Text to measure layout */}
                    <Text
                        allowFontScaling={false}
                        style={[styles.textStyle, posStyle, style, { position: "absolute", [text.rtl ? "right" : "left"]: -10000, minHeight: 0 }, !table && { minWidth: 20 / ratio }]}
                        onLayout={(e) => handleTextLayout(e, text)}
                    >
                        {text.text}
                    </Text>
                </>
            </Animated.View>
        );
    }

    return (
        <View key={text.id} style={posStyle}>
            <Text
                allowFontScaling={false}
                style={[styles.textStyle, style,
                table && { width: posStyle.width },
                !table && { textAlign: "left" }
                ]}
                onLayout={(e) => handleTextLayout(e, text)}
            >
                {text.text}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    textInputHost: {
        zIndex: 3000,
        flexDirection: "row",
    },
    textStyle: {
        padding: 0,
        margin: 0,
        flexWrap: "wrap",
    },

});

export default forwardRef(TextElement);