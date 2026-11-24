// Styling for the text being edited: bold, italic, underline and size - of the selected part, or with no
// selection of the whole text box (then with alignment instead of color). Also cut/copy/paste.
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { MyIcon } from "../common/icons";
import { availableColorPicker, semanticColors } from "../elements";
import { SpanStyle } from "./text-spans";

export const FORMAT_BAR_HEIGHT = 46;
const BUTTON = 40;

export type TextStyleKey = "bold" | "italic" | "underline";
export type Alignment = "Left" | "Center" | "Right";

/** The bar's width: its first row of buttons (and a divider between groups) */
export function formatBarWidth(o: { hasSelection: boolean; styles: TextStyleKey[]; showCenter: boolean; canPaste: boolean; clipboard?: boolean }) {
    const clipboard = o.clipboard ?? true;
    const sizing = o.styles.length + 2;
    const buttons = sizing + (o.hasSelection ? 1 + (clipboard ? 3 : 0) : (o.showCenter ? 3 : 2) + (clipboard && o.canPaste ? 1 : 0));
    const dividers = o.hasSelection ? (clipboard ? 1 : 0) : (clipboard && o.canPaste ? 2 : 1);
    return buttons * BUTTON + dividers * 9 + 8;
}

interface TextFormatBarProps {
    left: number;
    // placed by its top edge (below the text), or by its bottom edge (above the text: grows upward)
    top?: number;
    bottom?: number;
    // a selected part is styled; without one, the whole text box
    hasSelection: boolean;
    // the styles the text's font has (the others are not offered)
    styles: TextStyleKey[];
    // whether the whole selection (or text) is bold/italic/underlined; the selection's color
    bold: boolean;
    italic: boolean;
    underline: boolean;
    color?: string;
    onFormat: (patch: SpanStyle) => void;
    onSize: (step: 1 | -1) => void;
    // the iOS edit menu is hidden while editing: its cut/copy/paste are here
    onClipboard: (action: "cut" | "copy" | "paste") => void;
    canPaste: boolean;
    // false: no cut/copy/paste (Android keeps its own text selection menu)
    clipboard?: boolean;
    // the page's width: a wider bar wraps its buttons into rows (a phone in portrait)
    maxWidth?: number;
    // no selection: the text's alignment (center only in table cells)
    alignment?: string;
    showCenter?: boolean;
    onAlign?: (alignment: Alignment) => void;
}

export function TextFormatBar({ left, top, bottom, hasSelection, styles: fontStyles, bold, italic, underline, color,
    onFormat, onSize, onClipboard, canPaste, clipboard = true, alignment, showCenter, onAlign, maxWidth }: TextFormatBarProps) {
    const [showColors, setShowColors] = useState(false);
    const place = {
        ...(bottom !== undefined ? { bottom, flexDirection: "column-reverse" as const } : { top }),
        left,
        ...(maxWidth !== undefined ? { maxWidth } : {}),
    };
    const rowWidth = Math.min(formatBarWidth({ hasSelection, styles: fontStyles, showCenter: !!showCenter, canPaste, clipboard }),
        maxWidth ?? Infinity) - 8;
    const button = (key: string, icon: string, active: boolean, onPress: () => void) =>
        <TouchableOpacity key={key} testID={"format-" + key} style={[styles.button, active && styles.active]} onPress={onPress}>
            <MyIcon info={{ type: "MDI", name: icon, size: 26, color: semanticColors.titleText }} />
        </TouchableOpacity>;

    const has = (k: TextStyleKey) => fontStyles.includes(k);
    const align = (a: Alignment, icon: string) => button("align-" + a.toLowerCase(), icon, alignment === a, () => onAlign?.(a));
    return (
        <View style={[styles.bar, place]} testID="text-format-bar">
            <View style={[styles.row, styles.wrap]}>
                {has("bold") && button("bold", "format-bold", bold, () => onFormat({ bold: !bold }))}
                {has("italic") && button("italic", "format-italic", italic, () => onFormat({ italic: !italic }))}
                {has("underline") && button("underline", "format-underline", underline, () => onFormat({ underline: !underline }))}
                {button("smaller", "format-font-size-decrease", false, () => onSize(-1))}
                {button("bigger", "format-font-size-increase", false, () => onSize(1))}
                {hasSelection ? <>
                    <TouchableOpacity testID="format-color" style={styles.button} onPress={() => setShowColors(!showColors)}>
                        <View style={[styles.swatch, { backgroundColor: color ?? "black" }]} />
                    </TouchableOpacity>
                    {clipboard && <>
                        <View style={styles.divider} />
                        {button("cut", "content-cut", false, () => onClipboard("cut"))}
                        {button("copy", "content-copy", false, () => onClipboard("copy"))}
                        {button("paste", "content-paste", false, () => onClipboard("paste"))}
                    </>}
                </> : <>
                    <View style={styles.divider} />
                    {align("Left", "format-align-left")}
                    {showCenter && align("Center", "format-align-center")}
                    {align("Right", "format-align-right")}
                    {clipboard && canPaste && <>
                        <View style={styles.divider} />
                        {button("paste", "content-paste", false, () => onClipboard("paste"))}
                    </>}
                </>}
            </View>
            {hasSelection && showColors && <View style={[styles.row, styles.wrap,
                // no wider than the buttons row: the colors wrap on a narrow page
                { width: rowWidth }]}>
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
    wrap: {
        flexWrap: "wrap",
        height: undefined,
        minHeight: FORMAT_BAR_HEIGHT,
    },
    button: {
        width: BUTTON,
        height: BUTTON,
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
