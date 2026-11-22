// Formatting for the selected part of a text being edited: bold, italic, underline, size and color.
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { MyIcon } from "../common/icons";
import { availableColorPicker, semanticColors } from "../elements";
import { SpanStyle } from "./text-spans";

export const FORMAT_BAR_HEIGHT = 46;

interface TextFormatBarProps {
    left?: number;
    right?: number;
    // placed by its top edge (below the text), or by its bottom edge (above the text: grows upward)
    top?: number;
    bottom?: number;
    // whether the whole selection is bold/italic/underlined; the selection's color
    bold: boolean;
    italic: boolean;
    underline: boolean;
    color?: string;
    onFormat: (patch: SpanStyle) => void;
    onSize: (step: 1 | -1) => void;
    // the iOS edit menu is hidden while editing: its cut/copy/paste are here
    onClipboard: (action: "cut" | "copy" | "paste") => void;
    // no selection, just a cursor: only Paste
    pasteOnly?: boolean;
}

export function TextFormatBar({ left, right, top, bottom, bold, italic, underline, color, onFormat, onSize, onClipboard, pasteOnly }: TextFormatBarProps) {
    const [showColors, setShowColors] = useState(false);
    const place = {
        ...(bottom !== undefined ? { bottom, flexDirection: "column-reverse" as const } : { top }),
        ...(right !== undefined ? { right } : { left }),
    };
    const button = (key: string, icon: string, active: boolean, onPress: () => void) =>
        <TouchableOpacity key={key} testID={"format-" + key} style={[styles.button, active && styles.active]} onPress={onPress}>
            <MyIcon info={{ type: "MDI", name: icon, size: 26, color: semanticColors.titleText }} />
        </TouchableOpacity>;

    if (pasteOnly) {
        return <View style={[styles.bar, place]} testID="text-paste-bar">
            <View style={styles.row}>{button("paste", "content-paste", false, () => onClipboard("paste"))}</View>
        </View>;
    }
    return (
        <View style={[styles.bar, place]} testID="text-format-bar">
            <View style={styles.row}>
                {button("bold", "format-bold", bold, () => onFormat({ bold: !bold }))}
                {button("italic", "format-italic", italic, () => onFormat({ italic: !italic }))}
                {button("underline", "format-underline", underline, () => onFormat({ underline: !underline }))}
                {button("smaller", "format-font-size-decrease", false, () => onSize(-1))}
                {button("bigger", "format-font-size-increase", false, () => onSize(1))}
                <TouchableOpacity testID="format-color" style={styles.button} onPress={() => setShowColors(!showColors)}>
                    <View style={[styles.swatch, { backgroundColor: color ?? "black" }]} />
                </TouchableOpacity>
                <View style={styles.divider} />
                {button("cut", "content-cut", false, () => onClipboard("cut"))}
                {button("copy", "content-copy", false, () => onClipboard("copy"))}
                {button("paste", "content-paste", false, () => onClipboard("paste"))}
            </View>
            {showColors && <View style={styles.row}>
                {availableColorPicker.map((c: string) =>
                    <TouchableOpacity key={c} testID={"format-color-" + c} style={styles.button}
                        onPress={() => { onFormat({ color: c }); setShowColors(false); }}>
                        <View style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchSelected]} />
                    </TouchableOpacity>)}
            </View>}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        position: "absolute",
        zIndex: 3500,
        backgroundColor: "white",
        borderRadius: 10,
        paddingHorizontal: 4,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 8,
    },
    row: {
        flexDirection: "row",
        height: FORMAT_BAR_HEIGHT,
        alignItems: "center",
    },
    button: {
        width: 40,
        height: 40,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    active: {
        backgroundColor: semanticColors.selectedListItem,
    },
    divider: {
        width: 1,
        height: 28,
        marginHorizontal: 4,
        backgroundColor: semanticColors.inputBorder,
    },
    swatch: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: semanticColors.inputBorder,
    },
    swatchSelected: {
        borderWidth: 3,
        borderColor: semanticColors.titleText,
    },
});
