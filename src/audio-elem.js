
import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { playRecording, RecordButton } from './recording'; // Ensure correct import path
import { trace } from './log';

const zeroPos = { x0: 0, y0: 0, dx: 0, dy: 0 }

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
    size,
    showDelete,
    editMode,
}) {
    const [moveState, setMoveState] = useState(zeroPos);

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

    return (
        <View
            {...panResponder.panHandlers}
            style={{
                position: 'absolute',
                left: x + moveState.dx / zoom,
                top: y + moveState.dy / zoom,
                width: size/zoom,
                height: size/zoom,
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
                {showDelete && <Icon name="trash" style={{ position: "absolute", left: 5, top: 5 }} color="white" size={25} onPress={() => {
                    if (onDelete) onDelete();
                    // UpdateQueue((queue) => {
                    //     queue.pushDeleteAudio({ id: audioElem.id });
                    //     return true;
                    // });
                }} />}
                {
                    editMode ?
                        <RecordButton audioFile={audioFile} size={45} backgroundColor="red" height={55} revision={1} onNewAudioFile={(filePath) => {
                            //audioElem.file = filePath;
                            //setRevision(prev=>prev+1);
                            //onAddAudio(filePath);
                            onUpdateAudioFile(filePath)
                        }} /> :
                        <Icon name="play" color="white" size={size * zoom * 0.4} onPress={() => playRecording(basePath + audioFile)} />
                }

            </View>
        </View>
    );
}