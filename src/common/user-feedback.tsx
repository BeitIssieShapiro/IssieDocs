import React, { useState, useEffect } from 'react';
import {
    View,
    Alert,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { getRoundedButton } from "../elements";
import {
    semanticColors,
    Spacer,
    AppText
} from '../elements';
import { isRTL, translate } from '../lang';
import { addUserFeedback } from './firebase';
import { MyIcon } from './icons';

interface FeedbackDialogProps {
    visible: boolean;
    onClose: () => void;
}

export function FeedbackDialog(props: FeedbackDialogProps) {
    const [feedbackText, setFeedbackText] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height + 10); // Add 10px padding
            }
        );
        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, []);

    const validateEmail = (email: string): boolean => {
        if (!email.trim()) {
            return true; // Email is optional
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    };

    const handleSubmit = async () => {
        // Validate feedback length
        if (feedbackText.trim().length < 5) {
            setError(translate("FeedbackMinLength"));
            return;
        }
        if (feedbackText.trim().length > 1000) {
            setError(translate("FeedbackMaxLength"));
            return;
        }

        // Validate email if provided
        if (email.trim() && !validateEmail(email)) {
            setEmailError(translate("InvalidEmail"));
            return;
        }

        setIsSubmitting(true);
        setError('');
        setEmailError('');

        try {
            await addUserFeedback(feedbackText.trim(), email.trim() || undefined);
            Alert.alert(translate("FeedbackSubmitted"));
            setFeedbackText('');
            setEmail('');
            props.onClose();
        } catch (err) {
            console.error("Feedback submission error:", err);
            setError(translate("FeedbackError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFeedbackText('');
        setEmail('');
        setError('');
        setEmailError('');
        props.onClose();
    };

    return (
        <Modal
            visible={props.visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={handleClose}
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{
                        width: '85%',
                        maxWidth: 500,
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 10,
                            padding: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                        }}
                    >
                        <View style={{
                            flexDirection: isRTL() ? "row-reverse" : "row",
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 15
                        }}>
                            <AppText style={{
                                fontSize: 24,
                                fontWeight: 'bold',
                                color: semanticColors.titleText
                            }}>
                                {translate("UserFeedback")}
                            </AppText>
                            <MyIcon info={{ name: "close", size: 28 }} onPress={handleClose} />
                        </View>

                        <TextInput
                            style={{
                                borderWidth: 1,
                                borderColor: '#ccc',
                                borderRadius: 8,
                                padding: 12,
                                minHeight: 200,
                                maxHeight: 300,
                                fontSize: 18,
                                textAlignVertical: 'top',
                                writingDirection: isRTL() ? 'rtl' : 'ltr',
                                textAlign: isRTL() ? 'right' : 'left'
                            }}
                            multiline
                            placeholder={translate("FeedbackPlaceholder")}
                            value={feedbackText}
                            onChangeText={(text) => {
                                setFeedbackText(text);
                                setError('');
                            }}
                            editable={!isSubmitting}
                            maxLength={1000}
                        />

                        <View style={{
                            marginTop: 8,
                            flexDirection: 'row',
                            justifyContent: 'space-between'
                        }}>
                            <AppText style={{ fontSize: 14, color: error ? 'red' : '#666' }}>
                                {error || `${feedbackText.length}/1000`}
                            </AppText>
                        </View>

                        {/* Email Input Field */}
                        <View style={{ marginTop: 15 }}>
                            <AppText style={{ fontSize: 16, marginBottom: 5, color: semanticColors.titleText }}>
                                {translate("EmailTitle")}
                            </AppText>
                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: emailError ? 'red' : '#ccc',
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 16,
                                    textAlign: isRTL() ? 'right' : 'left'
                                }}
                                placeholder={translate("EmailPlaceholder")}
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    setEmailError('');
                                }}
                                editable={!isSubmitting}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={100}
                            />
                            {emailError ? (
                                <AppText style={{ fontSize: 14, color: 'red', marginTop: 4 }}>
                                    {emailError}
                                </AppText>
                            ) : null}
                        </View>

                        <View style={{
                            marginTop: 20,
                            flexDirection: 'row',
                            justifyContent: 'space-around'
                        }}>
                            {getRoundedButton(
                                handleClose,
                                'cancel-red',
                                translate("BtnCancel"),
                                30,
                                30,
                                { width: 120, height: 40 }
                            )}
                            <Spacer width={15} />
                            {isSubmitting ? (
                                <ActivityIndicator size="large" color={semanticColors.titleText} />
                            ) : (
                                getRoundedButton(
                                    handleSubmit,
                                    'check-green',
                                    translate("BtnSubmitFeedback"),
                                    30,
                                    30,
                                    { width: 180, height: 40 }
                                )
                            )}
                        </View>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </TouchableOpacity>
        </Modal>
    );
}
