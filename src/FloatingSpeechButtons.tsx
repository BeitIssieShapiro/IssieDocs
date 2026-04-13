import React from 'react';
import { View, Pressable, StyleSheet, Platform, ImageSize } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedReaction,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { MyIcon } from './common/icons';
import { isRTL } from './lang';
import { getSetting, KB_TEXT_TOOLS } from './settings';

const BUTTON_WIDTH = 44;
const BUTTON_HEIGHT = 44;
const BORDER_RADIUS = 12;
const GAP = 10;

interface FloatingSpeechButtonsProps {
    visible: boolean;
    isRecording: boolean;
    isSpeaking: boolean;
    onMicPress: () => void;
    onSpeakPress: () => void;
    keyboardHeight: number;
    windowSize: ImageSize;
    sideMargin: number;
}

function SpeechButton({
    active,
    onPress,
    iconName,
    activeIconName,
    defaultColor,
    activeColor,
}: {
    active: boolean;
    onPress: () => void;
    iconName: string;
    activeIconName: string;
    defaultColor: string;
    activeColor: string;
}) {
    const blinkOpacity = useSharedValue(1);

    useAnimatedReaction(
        () => active,
        (isActive, wasActive) => {
            if (isActive && !wasActive) {
                blinkOpacity.value = withRepeat(
                    withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    -1,
                    true,
                );
            } else if (!isActive && wasActive) {
                blinkOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
            }
        },
    );

    const innerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: blinkOpacity.value,
    }));

    const color = active ? activeColor : defaultColor;

    return (
        <Pressable onPress={onPress} hitSlop={8}>
            <Animated.View style={[styles.button, { backgroundColor: color }, innerAnimatedStyle]}>
                <MyIcon
                    info={{
                        type: 'Ionicons',
                        name: active ? activeIconName : iconName,
                        size: 22,
                        color: 'white',
                    }}
                />
            </Animated.View>
        </Pressable>
    );
}

export default function FloatingSpeechButtons({
    visible,
    isRecording,
    isSpeaking,
    onMicPress,
    onSpeakPress,
    keyboardHeight,
    windowSize,
    sideMargin,
}: FloatingSpeechButtonsProps) {
    if (Platform.OS !== 'ios' || !visible) return null;

    const rtl = isRTL();

    // Vertical: 3/4 of screen height or above keyboard+rounded frame padding, whichever is higher
    // keyboardHeight already includes native toolbar when text tools are on
    const totalHeight = BUTTON_HEIGHT * 2 + GAP;
    const threeQuarterY = windowSize.height * 0.25 - totalHeight / 2;
    let bottom = threeQuarterY;
    if (keyboardHeight > 0) {
        const textToolbarOn = getSetting(KB_TEXT_TOOLS.name, KB_TEXT_TOOLS.no) === KB_TEXT_TOOLS.yes;
        bottom = keyboardHeight + 20
        if (textToolbarOn) {
            console.log("[floating buttons - toolbar on")
            //bottom += 70;
        }
    }

    // Horizontal: in the side margin area
    const horizontalOffset = 30 //Math.max(4, (sideMargin - BUTTON_WIDTH) / 2);
    const positionStyle = rtl
        ? { right: horizontalOffset }
        : { left: horizontalOffset };

    return (
        <View style={[styles.container, { bottom, }, positionStyle]}>
            <SpeechButton
                active={isRecording}
                onPress={onMicPress}
                iconName="mic"
                activeIconName="mic"
                defaultColor="#007AFF"
                activeColor="#FF3B30"
            />
            <View style={{ height: GAP }} />
            <SpeechButton
                active={isSpeaking}
                onPress={onSpeakPress}
                iconName="volume-high"
                activeIconName="volume-high"
                defaultColor="#34C759"
                activeColor="#FF9500"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 100,
        alignItems: 'center',
    },
    button: {
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        borderRadius: BORDER_RADIUS,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 6,
    },
});
