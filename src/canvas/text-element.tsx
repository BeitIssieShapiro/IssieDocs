// TextElement.tsx
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, StyleSheet, LayoutChangeEvent, TextInputProps, ViewProps, ColorValue, Platform, Alert } from "react-native";
import { SketchText, MoveTypes, SketchPoint, SketchTable } from "./types";
import { calcEffectiveHorizontalLines, tableColWidth, tableRowHeight } from "./utils";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { MyIcon } from "../common/icons";
import { useTranscription, speechTranscriptionEmitter, SpeechTranscription } from "../use-transcription";
import { translate } from "../lang";
import { getSetting, KB_SPEAK_DICTATE } from "../settings";
import { SpanStyle, textSegments } from "./text-spans";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedIcon = Animated.createAnimatedComponent(MyIcon);


interface TextElementProps {
    text: SketchText;
    editMode: boolean;
    actualWidth: number;
    ratio: number;
    moveResponder: any;
    moveContext: React.MutableRefObject<any>;
    // edited: the selection the change replaced (where it was typed)
    onTextChanged: (id: string, text: string, edited?: { start: number; end: number }) => void;
    handleTextLayout: (e: LayoutChangeEvent, text: SketchText) => void;
    handleCursorPositionChange: (newValue: number, text: SketchText) => void;
    tables?: SketchTable[];
    texts: SketchText[];
    canvasHeight: number;
    language?: string;
    // where the piece it lies on moves (and scales) it, while that piece is dragged or resized
    dragOffset?: { dx: number; dy: number; scale?: number };
    // the selection while editing (start..end), for the selection format toolbar
    onSelectionChange?: (id: string, selection: { start: number; end: number }) => void;
    // hide the iOS edit menu while editing (the format bar has cut/copy/paste). It must be hidden
    // from the start: turning it off when a selection is made does not close a menu already shown
    hideEditMenu?: boolean;
    // the edited text box's layout (view points, in the canvas), to place the format bar
    onEditLayout?: (id: string, layout: { x: number; y: number; width: number; height: number }) => void;
    // a tap on the text box while it is edited (like the system menu: it shows or hides the format bar)
    onEditTap?: (id: string) => void;
    // the text's place among the drawing's canvases (a piece laid over it covers it)
    zIndex?: number;
    // false: touches pass through to the canvas (select tool: a drag on the text moves its piece,
    // instead of starting the system's drag of selectable text, which hides the text meanwhile)
    touchable?: boolean;
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
    canvasHeight,
    handleCursorPositionChange,
    language,
    dragOffset,
    touchable = true,
    onSelectionChange,
    hideEditMenu,
    onEditLayout,
    onEditTap,
    zIndex,
}: TextElementProps, ref: any) {
    const [revision, setRevision] = useState<number>(0)
    //console.log("text ratio", ratio, actualWidth, text.fontSize)
    const [textTillSelection, setTextTillSelection] = useState<string>(text.text);
    const [selection, setSelection] = useState({ start: text.text.length, end: text.text.length });

    // While a range is selected the input's selection is controlled (mirrored from the user's):
    // formatting re-renders the styled text, and iOS keeps the selection only if it is given in
    // that same update. A plain cursor stays uncontrolled, so typing is not affected.
    // the range is kept with the text it was selected in: after cut/paste it no longer applies
    const [rangeSelection, setRangeSelection] = useState<{ start: number; end: number; text: string } | undefined>(undefined);
    const heldSelection = rangeSelection && rangeSelection.text === text.text ?
        { start: rangeSelection.start, end: rangeSelection.end } : undefined;
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
    }, [text.color, editMode])

    useEffect(() => {
        const safeEnd = Math.min(selection.end, text.text.length);
        setTextTillSelection(text.text.substring(0, safeEnd))
    }, [selection]);

    useEffect(() => {
        if (editMode) {
            // when entering edit mode, the cursor at the end
            setTextTillSelection(text.text)
        }
    }, [editMode]);

    const handleTranscriptionText = useCallback((newText: string) => {
        onTextChanged(text.id, newText);
    }, [text.id, onTextChanged]);

    const { isRecording } = useTranscription({
        text: text.text,
        selectionEnd: selection.end,
        onTextChanged: handleTranscriptionText,
        language: language || 'en',
        enabled: editMode,
        textToolsEnabled: false, // the native bar over the keyboard is replaced by the text styling bar
        speakDictateEnabled: getSetting(KB_SPEAK_DICTATE.name, KB_SPEAK_DICTATE.yes) === KB_SPEAK_DICTATE.yes,
    });

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [highlightRange, setHighlightRange] = useState<{ location: number; length: number } | null>(null);

    // Listen for TTS events (word highlight, start/end, low volume)
    useEffect(() => {
        if (!speechTranscriptionEmitter || !editMode) return;

        const startSub = speechTranscriptionEmitter.addListener('onSpeakingStart', () => {
            setIsSpeaking(true);
            setHighlightRange(null);
        });

        const wordSub = speechTranscriptionEmitter.addListener('onSpeakingWord', (event: { location: number; length: number }) => {
            setHighlightRange({ location: event.location, length: event.length });
        });

        const endSub = speechTranscriptionEmitter.addListener('onSpeakingEnd', () => {
            setIsSpeaking(false);
            setHighlightRange(null);
        });

        const volumeSub = speechTranscriptionEmitter.addListener('onLowVolume', () => {
            Alert.alert(translate("LowVolumeWarning"));
        });

        return () => {
            startSub.remove();
            wordSub.remove();
            endSub.remove();
            volumeSub.remove();
        };
    }, [editMode]);

    // Stop speaking on unmount or when leaving edit mode
    useEffect(() => {
        if (!SpeechTranscription) return;

        return () => {
            SpeechTranscription.stopSpeaking();
        };
    }, [editMode]);


    // if (text.tableId) {
    //     console.log("text table",text.tableId, table)
    // } else {
    //     console.log("text ",text)
    // }
    const horizontalLines = table ? calcEffectiveHorizontalLines(table, canvasHeight, texts) : [];
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
            //maxHeight: tableRowHeight(table, text.y) * ratio - table.strokeWidth,
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

    const widthStyle = text.width ? { width: text.width * ratio } : undefined;

    // Gveret Levin handwriting font has glyphs that extend beyond the advance box
    // (e.g. נ tail). Pad the box so descenders/swashes are not clipped.
    const isHandwritingFont =
        text.fontFamily === 'GveretLevinAlefAlefAlef-Regular' ||
        text.fontFamily === 'Gveret Levin AlefAlefAlef-Regular';
    const fontPadding = isHandwritingFont
        ? {
            paddingLeft: text.fontSize * ratio * 0.35 + 10,
            paddingRight: text.fontSize * ratio * 0.15,
            paddingTop: text.fontSize * ratio * 0.1,
            paddingBottom: text.fontSize * ratio * 0.1 + 2,
        }
        : undefined;

    const style: any = {
        color: text.color, fontSize: text.fontSize * ratio,
        textAlign: text.alignment.toLowerCase(),
        fontFamily: text.fontFamily, // could be undefined
        fontWeight: text.bold ? 'bold' : 'normal',
        fontStyle: text.italic ? 'italic' : 'normal',
        textDecorationLine: text.underline ? 'underline' : 'none',
        ...fontPadding,
    };

    // The text with its styled ranges: a segment per style, each overriding the text's own style
    const spanStyle = (st: SpanStyle) => ({
        ...(st.color !== undefined ? { color: st.color } : {}),
        ...(st.fontSize !== undefined ? { fontSize: st.fontSize * ratio } : {}),
        ...(st.bold !== undefined ? { fontWeight: st.bold ? 'bold' : 'normal' } : {}),
        ...(st.italic !== undefined ? { fontStyle: st.italic ? 'italic' : 'normal' } : {}),
        ...(st.underline !== undefined ? { textDecorationLine: st.underline ? 'underline' : 'none' } : {}),
    }) as any;
    const renderStyled = (content: string, suffix = "") => {
        if (!text.spans?.length) return content + suffix;
        return [
            ...textSegments(content, text.spans).map(seg =>
                <Text key={seg.start} style={spanStyle(seg.style)}>{seg.text}</Text>),
            ...(suffix ? [suffix] : []),
        ];
    };

    const highlightedTextSpans = useMemo(() => {
        if (!isSpeaking || !highlightRange) {
            return <Text allowFontScaling={false} style={[styles.textStyle, style]}>{text.text}</Text>;
        }
        const { location, length } = highlightRange;
        const before = text.text.substring(0, location);
        const word = text.text.substring(location, location + length);
        const after = text.text.substring(location + length);
        return (
            <Text allowFontScaling={false} style={[styles.textStyle, style]}>
                {before}
                <Text style={{ backgroundColor: '#FFD700' }}>{word}</Text>
                {after}
            </Text>
        );
    }, [isSpeaking, highlightRange, text.text, style]);

    const moveIconStyle: any = { position: "absolute", ...(text.rtl ? { right: -25 } : { left: -25 }) }
    // console.log("text style", widthStyle)
    if (editMode) {
        return (
            <Animated.View
                //direction={text.rtl ? "rtl" : "ltr"}
                key={text.id}
                testID="text-element-edit"
                onLayout={(e) => onEditLayout?.(text.id, e.nativeEvent.layout)}
                style={[styles.textInputHost, posStyle, { zIndex: 500 }, table && bgAnimatedStyle]}
                {...(table ? {} : moveResponder.panHandlers)}
                onStartShouldSetResponder={(e) => {
                    moveContext.current = { type: MoveTypes.Text, id: text.id, offsetX: text.rtl ? -15 : 15, offsetY: -15 };
                    return moveResponder.panHandlers?.onStartShouldSetResponder?.(e) || false;
                }}
            >
                {!table && <AnimatedIcon style={[moveIconStyle, visibleAnimatedStyle]} info={{ type: "Ionicons", name: "move", size: 25, color: "blue" }} />}
                <>
                    <AnimatedTextInput
                        testID="text-input-active"
                        disableKeyboardShortcuts={true}
                        autoCapitalize="none"
                        autoCorrect={false}
                        allowFontScaling={false}
                        multiline
                        autoFocus
                        textAlignVertical="top"
                        style={[styles.textStyle, style, bgAnimatedStyle,
                        !table && widthStyle,
                        table && { width: posStyle.width },
                        !table && { minWidth: Math.max(text.fontSize * ratio, 20 / ratio) },
                        isSpeaking && { opacity: 0 }
                        ]}
                        {...(text.spans?.length ? {} : { value: text.text })}
                        onChange={(tic) => onTextChanged(text.id, tic.nativeEvent.text, selection)}
                        {...(heldSelection ? { selection: heldSelection } : {})}
                        contextMenuHidden={!!hideEditMenu}
                        // spelling suggestions show in a bubble over the selection too
                        spellCheck={hideEditMenu ? false : undefined}
                        onPressIn={() => onEditTap?.(text.id)}
                        onSelectionChange={(e) => {
                            const sel = e.nativeEvent.selection;
                            setRangeSelection(sel.end !== sel.start ? { start: sel.start, end: sel.end, text: text.text } : undefined);
                            setSelection(sel);
                            onSelectionChange?.(text.id, e.nativeEvent.selection);
                        }}
                    >
                        {/* styled text is given as children: the input shows the styles while editing */}
                        {text.spans?.length ? renderStyled(text.text) : undefined}
                    </AnimatedTextInput>
                    {isSpeaking && (
                        <Animated.View style={[bgAnimatedStyle,
                            { position: 'absolute', top: 0, left: 0, right: 0 },
                            !table && widthStyle,
                            table && { width: posStyle.width },
                            !table && { minWidth: Math.max(text.fontSize * ratio, 20 / ratio) }
                        ]}>
                            {highlightedTextSpans}
                        </Animated.View>
                    )}
                    {/* Hidden Text to measure layout */}
                    <Text
                        allowFontScaling={false}
                        style={[styles.textStyle, posStyle, style, { position: "absolute", [text.rtl ? "right" : "left"]: -10000, minHeight: 0 }, !table && { minWidth: 20 / ratio }]}
                        onLayout={(e) => {
                            handleTextLayout(e, text)
                            setRevision(prev => prev + 1)
                        }}
                    >
                        {renderStyled(text.text, "M")}
                    </Text>
                    {/* Second Hidden Text for Cursor Tracking */}
                    <Text
                        allowFontScaling={false}
                        style={[styles.textStyle, posStyle, style, { position: "absolute", [text.rtl ? "right" : "left"]: -10000, minHeight: 0 }, !table && widthStyle, !table && { minWidth: 20 / ratio }]}
                        onLayout={(e) => {

                            const cursorHeightFromTop = e.nativeEvent.layout.height;
                            // Use this value to trigger a scroll if it's too close to the keyboard
                            handleCursorPositionChange(cursorHeightFromTop, text);
                        }}
                    >
                        {/* Only render text up to the selection start */}
                        {renderStyled(textTillSelection)}
                        {/* {text.text.substring(0, selection.start) + 'A'} */}
                    </Text>
                </>
            </Animated.View>
        );
    }

    return (
        // zIndex: above the drawing canvas also when this view is kept (moving, pass-through) - otherwise
        // React Native flattens it away and the text (zIndex 13) lands above the canvas on its own
        <View key={text.id} pointerEvents={touchable ? "auto" : "none"}
            style={[posStyle, { zIndex: zIndex ?? 13 }, dragOffset && { transform: [{ translateX: dragOffset.dx }, { translateY: dragOffset.dy }, { scale: dragOffset.scale ?? 1 }] }]}>
            <Text
                allowFontScaling={false}
                selectable={touchable}
                style={[styles.textStyle, style, { zIndex: zIndex ?? 13 },
                table && { width: posStyle.width },
                    // !table && { textAlign: "left" }
                ]}
                onLayout={(e) => handleTextLayout(e, text)}
            >
                {renderStyled(text.text)}
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
        zIndex: 13,
    },

});

export default forwardRef(TextElement);
