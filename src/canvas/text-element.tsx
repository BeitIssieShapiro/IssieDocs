// TextElement.tsx
import React from "react";
import { View, Text, TextInput, StyleSheet, LayoutChangeEvent, TextInputProps, ViewProps } from "react-native";
import IconIonic from "react-native-vector-icons/Ionicons";
import { MoveIcon } from "./canvas-elements";
import { SketchText, MoveTypes, SketchPoint, SketchTable } from "./types";
import { calcEffectiveHorizontalLines, tableColWidth, tableRowHeight } from "./utils";

interface TextElementProps {
    text: SketchText;
    editMode: boolean;
    actualWidth: number;
    ratio: React.MutableRefObject<number>;
    moveResponder: any;
    moveContext: React.MutableRefObject<any>;
    onTextChanged: (id: string, text: string) => void;
    handleTextLayout: (e: LayoutChangeEvent, text: SketchText) => void;
    tables?: SketchTable[];
    texts: SketchText[];
}

export const TextElement: React.FC<TextElementProps> = ({
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
}) => {
    const table = text.tableId && tables?.find(table => table.id == text.tableId);
    const horizontalLines = table ? calcEffectiveHorizontalLines(table, texts) : [];
    const posStyle: any = table ?
        {
            position: "absolute", // backgroundColor: "green",

            ...(text.rtl ?
                { right: actualWidth - table.verticalLines[text.x + 1] * ratio.current, } :
                { left: (table.verticalLines[text.x]) * ratio.current + table.strokeWidth }
            ),
            top: (horizontalLines[text.y]) * ratio.current + table.strokeWidth,
            width: tableColWidth(table, text.x) * ratio.current - table.strokeWidth,
            minHeight: tableRowHeight(table, text.y) * ratio.current - table.strokeWidth,
        } :
        {
            position: "absolute",
            ...(text.rtl ?
                { right: actualWidth - text.x * ratio.current }
                : { left: text.x * ratio.current }),
            top: text.y * ratio.current,
            maxWidth: text.rtl ? text.x :
                actualWidth - text.x * ratio.current
        };

    //console.log("table", ratio.current, table && table.horizontalLines, posStyle);
    const style: any = { color: text.color, fontSize: text.fontSize * ratio.current, direction: text.rtl ? "rtl" : "ltr", textAlign: text.rtl ? "right" : "left" };

    const moveIconStyle: any = { position: "absolute", ...(text.rtl ? { right: -25 } : { left: -25 }) }
    //console.log("Text style", posStyle)

    if (editMode) {
        return (
            <View
                direction={text.rtl ? "rtl" : "ltr"}
                key={text.id}
                style={[styles.textInputHost, posStyle, { textAlign: "center" }]}
                {...moveResponder.panHandlers}
                onStartShouldSetResponder={(e) => {
                    moveContext.current = { type: MoveTypes.Text, id: text.id, offsetX: text.rtl ? -15 : 15, offsetY: -15 };
                    return moveResponder.panHandlers?.onStartShouldSetResponder?.(e) || false;
                }}
            >
                {!table && <IconIonic style={moveIconStyle} name="move" size={25} color={"blue"} />}
                <>
                    <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        allowFontScaling={false}
                        multiline
                        autoFocus
                        style={[styles.textStyle, styles.textInput, style, { backgroundColor: text.color == '#fee100' ? 'gray' : 'yellow' }]}
                        value={text.text}
                        onChange={(tic) => onTextChanged(text.id, tic.nativeEvent.text)}
                    />
                    {/* Hidden Text to measure layout */}
                    <Text
                        allowFontScaling={false}
                        style={[styles.textStyle, posStyle, style, { position: "absolute", [text.rtl ? "right" : "left"]: -10000, textAlign: "left", backgroundColor: "red" }]}
                        onLayout={(e) => handleTextLayout(e, text)}
                    >
                        {text.text}
                    </Text>
                </>
            </View>
        );
    }

    return (
        <View key={text.id} style={[posStyle]} direction={text.rtl ? "rtl" : "ltr"}>
            <Text
                allowFontScaling={false}
                style={[styles.textStyle, style, { textAlign: "left" }]}
                onLayout={(e) => handleTextLayout(e, text)}
            >
                {text.text}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    textInputHost: {
        zIndex: 1000,
        flexDirection: "row",
    },
    textStyle: {
        padding: 0,
        margin: 0,
        flexWrap: "wrap",
    },
    textInput: {
        minWidth: 50,
    },
});