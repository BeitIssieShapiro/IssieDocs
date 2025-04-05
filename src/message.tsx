import React, { createContext, useCallback, useContext, useState } from "react";
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
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
import { getRoundedButton, IconButton, Spacer } from "./elements";

interface MessageButton {
    text: string;
    onPress: (doNotShowAgain?: boolean) => void;
    style?: string;
}


interface MessageBoxProps {
    title: string;
    message: string;
    buttons: MessageButton[];
    onClose: () => void;
    width?: number;
    showDoNotShow?: boolean;
}

export const BTN_COLOR = "#6E6E6E";

export const MessageBox: React.FC<MessageBoxProps> = ({
    title, message, buttons, width, showDoNotShow, onClose
}) => {
    const [doNotShow, setSetDoNotShow] = useState<boolean | undefined>(showDoNotShow ? false : undefined);


    return (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
            <View style={[styles.container, { width: width || "90%" }]}>

                <View style={{ flexDirection: "column", alignItems: "center", width: width ? width * .8 : "80%" }}>
                    <Text allowFontScaling={false} style={styles.title}>{title}</Text>

                    <Text
                        style={[
                            styles.message,
                        ]}
                        allowFontScaling={false}
                    >{message}</Text>
                </View>

                {showDoNotShow && <TouchableOpacity style={styles.checkBoxHost}
                    onPress={() => setSetDoNotShow(prev => !prev)}>
                    {doNotShow ?
                        <IconMCI name="checkbox-outline" style={{ fontSize: 30, color: BTN_COLOR }} /> :
                        <IconMCI name="checkbox-blank-outline" style={{ fontSize: 30, color: BTN_COLOR }} />
                    }
                    <Text allowFontScaling={false} style={styles.checkbox} >{translate("DoNotAskAgain")}</Text>
                </TouchableOpacity>}

                <View style={styles.buttonRow}>
                    {buttons.map((btn, i) => (
                        <View key={i} style={{ flexDirection: "row" }}>
                            {getRoundedButton(() => {
                                onClose()
                                setTimeout(() =>
                                    btn.onPress(showDoNotShow ? doNotShow : undefined))
                            },
                                btn.style == "cancel" ? 'cancel-red' : (btn.style == "default" ? "check-green" : undefined),
                                btn.text, 30, 30, { width: 150, height: 40 }, undefined, undefined, false, true)}
                            <Spacer w={10} />
                        </View>
                    ))}
                </View>
                {showDoNotShow && <Spacer height={50} />}
            </View>
        </View>
    );
};



// Define the context type.
interface MessageBoxContextType {
    showMessageBox: (title: string, message: string, buttons: MessageButton[], showDoNotShow?: boolean, width?: number) => Promise<void>;
}

// Create the context.
const MessageBoxContext = createContext<MessageBoxContextType | undefined>(undefined);

// Provider component.
export const MessageBoxProvider: React.FC = ({ children }: any) => {
    // Hold the current message box props.
    const [msgProps, setMsgProps] = useState<MessageBoxProps | null>(null);
    const [visible, setVisible] = useState(false);

    // showMessageBox returns a promise that resolves when the dialog is closed.
    const showMessageBox = useCallback((title: string, message: string, buttons: MessageButton[], showDoNotShow?: boolean, width?: number) => {
        return new Promise<void>((resolve) => {
            setVisible(true);
            const onClose = () => {
                setVisible(false);
                resolve();
            };
            setMsgProps({ title, message, buttons, onClose, showDoNotShow, width } as MessageBoxProps);
        });
    }, []);

    return (
        <MessageBoxContext.Provider value={{ showMessageBox }}>
            {children}
            {/* Render the MessageBox in a Modal when visible */}
            {visible && msgProps && (
                // <Modal transparent visible={visible} onRequestClose={msgProps.onClose}>
                    // <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: "absolute", left: 0, top: 0 }}>
                        <MessageBox {...msgProps} width={msgProps.width || 500} showDoNotShow={msgProps.showDoNotShow || false} />
                    // </View>
                // </Modal>
            )}
        </MessageBoxContext.Provider>
    );
};

// Hook to use the message box context.
export const useMessageBox = (): MessageBoxContextType => {
    const context = useContext(MessageBoxContext);
    if (!context) {
        throw new Error('useMessageBox must be used within a MessageBoxProvider');
    }
    return context;
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
        shadowColor: '#171717',
        shadowOffset: { width: 3, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 7,
        borderColor:"gray",
        borderWidth:1
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 10,
    },
    message: {
        padding: 10,
        fontSize: 24,
        marginBottom: 15,
        textAlign: "center",
        flexWrap: "wrap",
        width: "100%",
    },
    checkBoxHost: {
        flexDirection: "row",
        alignItems: "center",
        marginEnd: 15,
        width: "100%",
        position: "absolute",
        left: 20, bottom: 20,
    },

    checkbox: {
        fontSize: 22,
        width: "100%",
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
});