import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
} from "react-native";
import { translate } from "./lang";
import { MyColorPicker } from "./pickers";
import { IconButton } from "./elements";
import { MyIcon } from "./common/icons";

export interface FaceText {
    text: string;
    fontSize: number;
    fontName?: string;
    fontBold: boolean;
    backgroundColor: string;
    color: string;
}

interface EditTextProps {
    label: string;
    initialText: string;
    textOnly?: boolean;
    initialFontName?: string;
    initialFontSize?: number;
    initialFontBold?: boolean;
    initialColor?: string;
    initialBGColor?: string;
    onDone: (faceText: FaceText) => void;
    onClose: () => void;
    width: number;
    textWidth: number;
    textHeight: number;

}
export const BTN_COLOR = "#6E6E6E";
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 42];
const FONTS = [
    { label: "default", value: undefined },
    { label: "גברת לוין", value: "Gveret Levin AlefAlefAlef" }
];

interface ColorPickerProps {
    color: string;
    onSelect: (color: string) => void;
}

export const EditText: React.FC<EditTextProps> = ({
    label, initialText, textOnly, initialFontSize, initialFontBold, initialColor, initialBGColor, initialFontName,
    onDone, onClose, width, textWidth, textHeight,
}) => {
    const [text, setText] = useState(initialText);
    const [fontSize, setFoneSize] = useState(initialFontSize || 30);
    const [isBold, setIsBold] = useState(initialFontBold !== undefined ? initialFontBold : false);
    const [color, setColor] = useState(initialColor || "black");
    const [backgroundColor, setBackgroundColor] = useState(initialBGColor || "#E7E7E7");
    const [openColorPicker, setOpenColorPicker] = useState<ColorPickerProps | undefined>();
    const [fontName, setFontName] = useState<string | undefined>(initialFontName || undefined);

    console.log("Render edit-text", text, fontName)
    return (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
            <View style={[styles.container, { width: width || "90%" }]}>

                <MyColorPicker title={translate("SelectColor")} allowCustom={true} color={openColorPicker ? openColorPicker.color : "white"}
                    height={300} width={width} isScreenNarrow={true} onClose={() => setOpenColorPicker(undefined)}
                    onSelect={(color: string) => {
                        openColorPicker && openColorPicker.onSelect(color);
                        setOpenColorPicker(undefined);
                    }} open={openColorPicker != undefined}
                />

                {/* Editable Text Input */}
                <View style={{ flexDirection: "column", alignItems: "center", }}>
                    <Text allowFontScaling={false} style={styles.label}>{label}</Text>

                    <TextInput
                        style={[
                            styles.input,
                            { width: textWidth, height: textHeight },

                            { fontSize, color, fontWeight: isBold ? "bold" : "normal", backgroundColor },
                            { fontFamily: fontName }
                        ]}
                        placeholderTextColor="gray"
                        value={text}
                        autoCapitalize="none"
                        autoCorrect={false}

                        onChangeText={(newText) => {
                            setText(newText);
                        }}
                        autoFocus
                        allowFontScaling={false}
                    />
                </View>
                {!textOnly && <View style={styles.stylesHost}>
                    {/* Font Selection */}
                    {/* <View style={styles.colorSelectHost}>
                        <Text allowFontScaling={false} style={styles.styleLabel}>{translate("FontName")}</Text>

                        <Dropdown
                            style={{ width: 150, justifyContent: "flex-start", marginStart: 10 }}
                            itemTextStyle={{ fontSize: 20 }}
                            selectedTextStyle={{ fontSize: 20 }}
                            data={FONTS}
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            value={fontName}
                            onChange={item => {
                                setFontName(item.value);
                            }}
                        />
                    </View> */}

                    {/* Font Size Selection */}
                    {/* <NumberSelector min={10} max={60} title={translate("FontSize")} value={fontSize} style={styles.fontSelector}
                        onDown={() => setFoneSize(fontSize - 2)}
                        onUp={() => setFoneSize(fontSize + 2)}
                        titleStyle={styles.styleLabel}
                    /> */}


                    <TouchableOpacity style={styles.colorSelectHost}
                        onPress={() => setOpenColorPicker(({ color, onSelect: c => setColor(c) }))} >
                        <Text allowFontScaling={false} style={styles.styleLabel}>{translate("TextColor")}</Text>
                        <View style={[styles.colorCircle, { backgroundColor: color }]} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.colorSelectHost}
                        onPress={() => setOpenColorPicker(({ color: backgroundColor, onSelect: c => setBackgroundColor(c) }))} >
                        <Text allowFontScaling={false} style={styles.styleLabel}>{translate("BGColor")}</Text>
                        <View style={[styles.colorCircle, { backgroundColor: backgroundColor }]} />
                    </TouchableOpacity>

                    <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", marginEnd: 15, width: "33%" }}
                        onPress={() => setIsBold(!isBold)}>
                        {isBold ?
                            <MyIcon info={{ type: "MDI", name: "checkbox-outline", size: 30 }} /> :
                            <MyIcon info={{ type: "MDI", name: "checkbox-blank-outline", size: 30 }} />
                        }
                        <Text allowFontScaling={false} style={styles.styleLabel} >{translate("Bold")}</Text>
                    </TouchableOpacity>
                </View>}


                <View style={styles.buttonRow}>
                    <IconButton size={80} isText={true} icon={translate("OK")} onPress={() => {
                        onDone({
                            text,
                            backgroundColor,
                            color,
                            fontBold: isBold,
                            fontName,
                            fontSize,
                        })
                    }} />
                    <IconButton size={80} isText={true} icon={translate("Cancel")} onPress={onClose} />
                </View>
            </View>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    overlay: {
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1200,
        shadowColor: '#171717',
        shadowOffset: { width: 3, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 7,
    },

    container: {
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
        backgroundColor: "white",
    },
    label: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 10,
    },
    input: {
        padding: 10,
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 15,
        textAlign: "center",
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "bold",
        marginVertical: 5,
    },
    optionButton: {
        margin: 5,
        padding: 10,
        borderRadius: 5,
        backgroundColor: "#ddd",
    },
    toggleButton: {
        marginVertical: 10,
        padding: 10,
        borderWidth: 1,
        borderRadius: 5,
    },
    boldSelected: {
        backgroundColor: "lightgray",
    },
    colorBox: {
        width: 30,
        height: 30,
        margin: 5,
        borderRadius: 5,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "center",
        width: "100%",
        marginTop: 20,
    },
    button: {
        padding: 10,
        backgroundColor: "#ddd",
        borderRadius: 5,
        width: 150,
        alignItems: "center",
    },
    colorCircle: {
        width: 40, height: 40,
        borderRadius: 20,
        marginEnd: 20,
        borderColor: "gray",
        borderWidth: 1
    },
    fontSelector: {
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        width: 240,
        height: 40
    },
    stylesHost: {
        flexDirection: "column",
        justifyContent: "flex-start",
        margin: 10,
    },
    colorSelectHost: {
        flexDirection: "row",
        marginTop: 7,
        marginBottom: 7,
        alignItems: "center",
        fontSize: 25
    },
    styleLabel: {
        fontSize: 20,
        width: 100,
        fontWeight: "bold",
    },
    picker: {
        height: 50,
        // backgroundColor: "green",
        width: '100%',
        zIndex: 1900
    },
});