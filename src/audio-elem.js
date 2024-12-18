
import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { playRecording } from './recording'; // Ensure correct import path

const zeroPos = { x0: 0, y0: 0, dx: 0, dy: 0 }

export function AudioElement({
    basePath,
    audioElem,
    scaleRatio,
    zoom,
    xOffset,
    yOffset,
    UpdateQueue,
    size,
    isAudioMode
}) {
    const [moveState, setMoveState] = useState(zeroPos);


    const x = audioElem.normPosition.x * scaleRatio * zoom + xOffset;
    const y = audioElem.normPosition.y * scaleRatio * zoom + yOffset;
    console.log("render audio", x, y, moveState)

    const positionRef = useRef({ x, y });

    // Update the ref whenever x or y changes
    useEffect(() => {
        positionRef.current = { x, y };
        setMoveState(zeroPos);
    }, [audioElem.normPosition.x, audioElem.normPosition.y, scaleRatio, zoom, xOffset, yOffset]);

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
                        dx: newX - prev.x0, dy: newY - prev.y0, x0: prev.x0, y0: prev.y0,
                    }
                    //console.log("move audio", newState, newX, newY, prev)
                    return newState

                });
            },

            onPanResponderRelease: () => {
                setMoveState(ms => {
                    const { x: currentX, y: currentY } = positionRef.current;

                    // Calculate normalized position based on scaleRatio and zoom
                    const normalizedX = (currentX + ms.dx - xOffset) / (zoom * scaleRatio);
                    const normalizedY = (currentY + ms.dy - yOffset) / (zoom * scaleRatio);

                    UpdateQueue((queue) => {
                        queue.pushAudioPosition({ id: audioElem.id, normPosition: { x: normalizedX, y: normalizedY } })
                        return true;
                    });
                    return { ...ms }

                })
            },
        })
    ).current;

    return (
        <View
            {...panResponder.panHandlers}
            style={{
                position: 'absolute',
                left: x + moveState.dx,
                top: y + moveState.dy,
                width: size * zoom,
                height: size * zoom,
                zIndex: 1000, // Ensure it's above other elements
            }}
        >
            <View
                style={{
                    backgroundColor: "gray",

                    borderRadius: 10,
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}

            >
                {isAudioMode && <Icon name="trash" style={{ position: "absolute", left: 5, top: 5 }} color="white" size={25} onPress={() => {
                    UpdateQueue((queue) => {
                        queue.pushDeleteAudio({ id: audioElem.id });
                        return true;
                    });
                }} />}
                <Icon name="play" color="white" size={size * zoom * 0.4} onPress={() => playRecording(basePath + audioElem.file)} />
            </View>
        </View>
    );
}