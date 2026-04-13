// TextElement.tsx
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, StyleSheet, LayoutChangeEvent, TextInputProps, ViewProps, ColorValue, Platform, Alert } from "react-native";
import { SketchText, MoveTypes, SketchPoint, SketchTable } from "./types";
import { calcEffectiveHorizontalLines, tableColWidth, tableRowHeight } from "./utils";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { MyIcon } from "../common/icons";
import { useTranscription, speechTranscriptionEmitter, SpeechTranscription } from "../use-transcription";
import { translate } from "../lang";
import { getSetting, KB_TEXT_TOOLS, KB_SPEAK_DICTATE } from "../settings";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedIcon = Animated.createAnimatedComponent(MyIcon);


interface TextElementProps {
    text: SketchText;
    editMode: boolean;
    actualWidth: number;
    ratio: number;
    moveResponder: any;
    moveContext: React.MutableRefObject<any>;
    onTextChanged: (id: string, text: string) => void;
    handleTextLayout: (e: LayoutChangeEvent, text: SketchText) => void;
    handleCursorPositionChange: (newValue: number, text: SketchText) => void;
    tables?: SketchTable[];
    texts: SketchText[];
    canvasHeight: number;
    language?: string;
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
}: TextElementProps, ref: any) {
    const [revision, setRevision] = useState<number>(0)
    //console.log("text ratio", ratio, actualWidth, text.fontSize)
    const [textTillSelection, setTextTillSelection] = useState<string>(text.text);
    const [selection, setSelection] = useState({ start: text.text.length, end: text.text.length });
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
        setTextTillSelection(text.text.substring(0, selection.end))
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
        textToolsEnabled: getSetting(KB_TEXT_TOOLS.name, KB_TEXT_TOOLS.no) === KB_TEXT_TOOLS.yes,
        speakDictateEnabled: getSetting(KB_SPEAK_DICTATE.name, KB_SPEAK_DICTATE.yes) === KB_SPEAK_DICTATE.yes,
    });

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [highlightRange, setHighlightRange] = useState<{ location: number; length: number } | null>(null);

    // Listen for TTS events (word highlight, start/end, low volume)
    useEffect(() => {
        if (Platform.OS !== 'ios' || !speechTranscriptionEmitter || !editMode) return;

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
        if (Platform.OS !== 'ios' || !SpeechTranscription) return;

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

    const style: any = {
        color: text.color, fontSize: text.fontSize * ratio,
        textAlign: text.alignment.toLowerCase(),
        fontFamily: text.fontFamily, // could be undefined
        fontWeight: text.bold ? 'bold' : 'normal',
        fontStyle: text.italic ? 'italic' : 'normal',
        textDecorationLine: text.underline ? 'underline' : 'none',
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
                        value={text.text}
                        onChange={(tic) => onTextChanged(text.id, tic.nativeEvent.text)}
                        onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                    />
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
                        {text.text + "M"}
                    </Text>
                    {/* Second Hidden Text for Cursor Tracking */}
                    <Text
                        allowFontScaling={false}
                        style={[styles.textStyle, posStyle, style, { position: "absolute", [text.rtl ? "right" : "left"]: -10000, minHeight: 0 }, !table && { minWidth: 20 / ratio }]}
                        onLayout={(e) => {

                            const cursorHeightFromTop = e.nativeEvent.layout.height;
                            // Use this value to trigger a scroll if it's too close to the keyboard
                            handleCursorPositionChange(cursorHeightFromTop, text);
                        }}
                    >
                        {/* Only render text up to the selection start */}
                        {textTillSelection}
                        {/* {text.text.substring(0, selection.start) + 'A'} */}
                    </Text>
                </>
            </Animated.View>
        );
    }

    return (
        <View key={text.id} style={posStyle}>
            <Text
                allowFontScaling={false}
                selectable={true}
                style={[styles.textStyle, style,
                table && { width: posStyle.width },
                    // !table && { textAlign: "left" }
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
        zIndex: 13,
    },

});

export default forwardRef(TextElement);
