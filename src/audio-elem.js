
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { playRecording, RecordButton } from './recording'; // Ensure correct import path
import { audioRecorderPlayer } from "./App";
import { AnimatedCircularProgress } from "react-native-circular-progress";

import { trace } from './log';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    Easing,
    useAnimatedReaction,
    interpolateColor,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';

const zeroPos = { x0: 0, y0: 0, dx: 0, dy: 0 }
export const BTN_BACK_COLOR = "#C8572A";

export function AudioElement({
    basePath,
    audioFile,
    scaleRatio,
    zoom,
    normX,
    normY,
    xOffset,
    yOffset,
    onDelete,
    onMove,
    onUpdateAudioFile,
    width,
    height,
    showDelete,
    editMode,
}) {
    const [moveState, setMoveState] = useState(zeroPos);
    const [recording, setRecording] = useState(false);
    const [recordingState, setRecordingState] = useState();


    const x = normX * scaleRatio / zoom + xOffset;
    const y = normY * scaleRatio / zoom + yOffset;

    const positionRef = useRef({ x, y, zoom, xOffset, yOffset, scaleRatio });

    // Update the ref whenever x or y changes
    useEffect(() => {
        const x = normX * scaleRatio / zoom + xOffset;
        const y = normY * scaleRatio / zoom + yOffset;

        positionRef.current = { x, y, zoom, xOffset, yOffset, scaleRatio }
        setMoveState(zeroPos);
    }, [normX, normY, scaleRatio, zoom, xOffset, yOffset]);

    // PanResponder to handle drag gestures
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true, // Allows the responder to handle touch
            onPanResponderGrant: (e) => {
                setMoveState({ x0: e.nativeEvent.pageX, y0: e.nativeEvent.pageY, dx: 0, dy: 0 })
            },
            onPanResponderMove: (e) => {
                const newX = e.nativeEvent.pageX;
                const newY = e.nativeEvent.pageY;

                setMoveState(prev => {
                    const newState = {
                        ...prev, dx: (newX - prev.x0), dy: (newY - prev.y0),
                    }
                    //console.log("move audio", newState, newX, newY, prev)
                    return newState

                });
            },

            onPanResponderRelease: () => {
                trace("onPanResponderRelease")
                setMoveState(ms => {
                    const { x: currentX, y: currentY, zoom, xOffset, yOffset, scaleRatio } = positionRef.current;
                    const x = currentX + ms.dx / zoom;
                    const y = currentY + ms.dy / zoom;
                    // Calculate normalized position based on scaleRatio and zoom
                    const normalizedX = ((x - xOffset)) * zoom / scaleRatio;
                    const normalizedY = ((y - yOffset)) * zoom / scaleRatio;

                    onMove(normalizedX, normalizedY);
                    positionRef.current = { x, y }
                    return zeroPos;
                })
            },
        })
    ).current;

    //const recordingProgress = ((recordingState?.currentPosition || 0) / 1000).toFixed(1);
    return (
        <View style={{
            position: 'absolute',
            left: x + moveState.dx / zoom - 25,
            top: y + moveState.dy / zoom,

            backgroundColor: "green"
        }}>
            <View
                {...panResponder.panHandlers}
                style={{
                    position: 'absolute',
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "#DCDCDC",
                    borderRadius: 15,
                    left: 25,
                    width: width / zoom,
                    height: height / zoom,
                    justifyContent: 'center',
                    alignItems: 'center',


                    zIndex: 1000, // Ensure it's above other elements
                }}
            >
                {showDelete && <Icon name="trash" style={{ position: "absolute", left: -15, top: -5, zIndex: 1000 }} color={styles.container.backgroundColor} size={25} onPress={() => {
                    if (onDelete) onDelete();
                }} />}
                {
                    editMode && !audioFile ?
                        <RecordButton2 
                            size={60}

                            recordingProgressCallback={(state) => {
                                console.log("recording state", state);
                                setRecordingState(state);
                            }}
                            onStartRecord={() => setRecording(true)}
                            onStopRecord={() => {
                                setRecording(false)
                                setRecordingState(undefined);
                            }}
                            onNewAudio={(filePath) => onUpdateAudioFile(filePath)}
                        /> :
                        <PlayButton 
                        size={60}
                        zoom={zoom}
                         audioFile={basePath + audioFile} />
                }

            </View >
        </View>

    );
}


export const RecordButton2 = ({
    size,
    onNewAudio,
    recordingProgressCallback,
    onStartRecord,
    onStopRecord,
}) => {
    // Shared value to track the button state (0: not recording, 1: recording)
    const progress = useSharedValue(0);

    // Shared value for blinking opacity
    const blinkOpacity = useSharedValue(1);

    // Define the initial and final sizes
    const INITIAL_SIZE = size - 15;
    const FINAL_SIZE = (size - 15) / 5;

    // Function to start recording
    const _startRecording = async () => {
        try {
            await audioRecorderPlayer.startRecorder();
            console.log("Recording started...");
            audioRecorderPlayer.addRecordBackListener(recordingProgressCallback);
        } catch (err) {
            console.log("Failed to start recording...", err);
            throw err;
        }
    };

    // Function to stop recording
    const _stopRecording = async () => {
        try {
            const fileName = await audioRecorderPlayer.stopRecorder();
            audioRecorderPlayer.removeRecordBackListener();
            return fileName;
        } catch (err) {
            console.log("Failed to stop recording...", err);
            throw err;
        }
    };

    // Function to handle button press
    const _onPress = async () => {
        if (progress.value === 0) {
            // Start recording
            progress.value = withTiming(1, {
                duration: 500,
                easing: Easing.out(Easing.ease),
            });
            _startRecording();
            onStartRecord();
        } else {
            // Stop recording
            progress.value = withTiming(0, {
                duration: 300,
                easing: Easing.out(Easing.ease),
            });
            try {
                const fileName = await _stopRecording();
                onNewAudio(fileName);
                onStopRecord();
            } catch (err) {
                // Handle error as needed
            }
        }
    };

    // Animated style for the outer circle
    const animatedCircleStyle = useAnimatedStyle(() => {
        const currentSize = INITIAL_SIZE - INITIAL_SIZE * progress.value;

        const backgroundColor = interpolateColor(
            progress.value,
            [0, 1],
            ['#FF0000', '#000000'] // Red to Black
        );

        return {
            width: currentSize,
            height: currentSize,
            borderRadius: currentSize / 2,
            backgroundColor: "red",
            justifyContent: 'center',
            alignItems: 'center',
        };
    });

    // Animated style for the square
    const animatedSquareStyle = useAnimatedStyle(() => {
        return {
            opacity: blinkOpacity.value,
        };
    });

    // React to changes in progress.value to start/stop blinking
    useAnimatedReaction(
        () => progress.value,
        (current, previous) => {
            if (current === 1 && previous !== 1) {
                // Start blinking
                blinkOpacity.value = withRepeat(
                    withTiming(0.4, {
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    -1, // Infinite repeats
                    true // Reverse each time (yoyo)
                );
            } else if (current === 0 && previous !== 0) {
                // Stop blinking and reset opacity
                blinkOpacity.value = withTiming(1, {
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                });
            }
        }
    );

    return (
        <Pressable
            onPress={_onPress}
            style={[
                styles.circle,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                },
            ]}
        >
            <Animated.View style={[animatedCircleStyle]}>
                <Animated.View
                    style={[
                        styles.square,
                        {
                            width: FINAL_SIZE * 2,
                            height: FINAL_SIZE * 2,
                        },
                        animatedSquareStyle,
                    ]}
                />
            </Animated.View>
        </Pressable>
    );
};

const progRate = 800;
export const PlayButton = ({
    size = 100,
    zoom = 1,
    audioFile,
    onPlaybackStart = () => { },
    onPlaybackEnd = () => { },
    onPlaybackProgress = () => { },
}) => {
    // Shared value to track the progress (0 to 1)
    //const progress = useSharedValue(0);
    const [progress, setProgress] = useState(0);
    const [pausing, setPausing] = useState(false);
    const [playing, setPlaying] = useState(false);


    // Function to start playback
    const startPlayback = async () => {
        console.log("playing file ", audioFile)
        await playRecording(audioFile, (e) => {
            console.log("playing", e)
            if (e.currentPosition === e.duration) {
                setProgress(1);
                setTimeout(() => stopPlayback(), progRate);
            } else {
                const currentProgress = e.currentPosition / e.duration;
                setProgress(currentProgress);
                onPlaybackProgress(e.currentPosition, e.duration);
            }
        })
        setPausing(false);
        setPlaying(true);
    };

    // Function to stop playback
    const stopPlayback = async () => {
        try {
            await audioRecorderPlayer.stopPlayer();
            audioRecorderPlayer.removePlayBackListener();
            setProgress(0);
            setPausing(false);
            setPlaying(false);
            onPlaybackEnd();
        } catch (err) {
            console.log('Failed to stop playback', err);
        }
    };

    const pausePlayback = () => {
        audioRecorderPlayer.pausePlayer();
        setPausing(true);
        setPlaying(false);
    }

    const resumePlayback = () => {
        audioRecorderPlayer.resumePlayer();
        setPausing(false);
        setPlaying(true);
    }

    // Function to handle button press
    const onPress = useCallback(() => {
        if (!pausing && !playing) {
            startPlayback();
        } else if (playing) {
            pausePlayback();
        } else {
            resumePlayback();
        }
    }, [pausing, playing]);

    console.log("play progress", progress)

    return (
        <Pressable onPress={onPress}>
            <View style={[styles.container, { width: size, height: size, transform:[{ scale: 1/zoom }] }]}>
                {(pausing || playing) && <AnimatedCircularProgress
                    style={{ position: "absolute", top: 0, left: 0, width: size, height: size }}
                    duration={progRate}
                    rotation={0}
                    size={size}
                    width={7}
                    fill={progress * 100}
                    tintColor={"white"}
                    onAnimationComplete={() => console.log('onAnimationComplete')}
                    backgroundColor={styles.container.backgroundColor}
                />}
                {/* <Icon
                    style={styles.playIcon}
                    name={isPlaying.value ? 'pause' : 'play'}
                    size={size / 3}
                    color="navyblue"
                />
                 */}
                {!playing && <View style={styles.triangle} />}
                {playing && <View style={styles.pause} />}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    circle: {
        // Static styles for the outer Pressable component
        backgroundColor: "black",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 5,
        borderColor: "white",
    },
    square: {
        backgroundColor: "red",
        borderRadius: 6,
    },
    triangle: {
        width: 0,
        height: 0,
        backgroundColor: "transparent",
        borderStyle: "solid",
        borderLeftWidth: 15,
        borderRightWidth: 15,
        borderBottomWidth: 25,
        left: 3,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "white",
        transform: [{ rotate: "90deg" }],
    },
    pause: {
        height: 25,
        width: 25,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderColor: "white",

    },
    playIcon: {
        position: 'absolute',
        fontSize: 30,
        color: "white"
    },
    container: {
        backgroundColor: "#173D73",
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: "50%",
    },
    animatedBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        borderColor: 'transparent',
        borderWidth: 5,
        borderRadius: 999, // Large radius to ensure it's circular
        width: '100%',
        height: '100%',
        borderTopColor: 'red', // Only top border visible for progress effect
    },
    iconContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
});