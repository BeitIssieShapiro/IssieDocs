import { useEffect, useState } from "react";
//import { AnimatedButton } from "./animatedButton";
import Icon from 'react-native-vector-icons/FontAwesome';

import { TouchableOpacity, View, Text } from "react-native";
import { AudioWaveForm } from "./audio-progress";

import { isRTL } from "./lang";
import { audioRecorderPlayer } from "./App";



export async function playRecording(audioFile, playbackListener) {

    try {
        // const filePath = `file://${RNFS.DocumentDirectoryPath}/tmp.m4a`;
        // await RNFS.writeFile(filePath, b64, "base64");

        // Start player and handle potential errors
        await audioRecorderPlayer.stopPlayer();
        await audioRecorderPlayer.startPlayer("file://" + audioFile);
        console.log('Player started', audioFile);

        // Add playback listener if provided
        if (playbackListener) {
            console.log('Adding playback listener');
            audioRecorderPlayer.addPlayBackListener(playbackListener);
        }

        return true;
    } catch (error) {
        console.error("Error in playRecording:", error);
        return false;
    }
}


export function RecordButton({ audioFile, backgroundColor, size, height, revision, onNewAudioFile }) {
    const [recordProgress, setRecordProgress] = useState(0);
    const [_, setRecordProgressInterval] = useState(undefined);
    const [state, setState] = useState({ recordSecs: 0 })
    const [recording, setRecording] = useState(false);
    const [log, setLog] = useState("");
    const [playing, setPlaying] = useState(false);
    const [paused, setPaused] = useState(false);

    const [recordingExists, setRecordingExists] = useState(false);




    useEffect(() => {
        setRecordingExists(audioFile?.length > 0);
    }, [revision, audioFile])

    const onStartRecord = async () => {
        console.log("about to start recording")
        const result = await audioRecorderPlayer.startRecorder()
            .then(() => {
                setLog(prev => prev + "\nRecording started...");
                setRecording(true);
                console.log("Recording started...");
            })

            .catch((err) => {
                setLog(prev => prev + "\nerr start record" + err)
                console.log("Failed to start recording...", err);
            });



        setRecordProgressInterval((prevInterval) => {
            if (prevInterval) clearInterval(prevInterval);
            return setInterval(() => setRecordProgress(old => old + 1), 100);
        });
        audioRecorderPlayer.addRecordBackListener((e) => {
            console.log("recordBack")
            setState({
                recordSecs: e.currentPosition,
                recordTime: audioRecorderPlayer.mmssss(
                    Math.floor(e.currentPosition),
                ),
            });
            return;
        });

    };

    const onStopRecord = async () => {
        console.log("stop rec")
        await audioRecorderPlayer.stopRecorder()
            .then(async (filePath) => {
                try {
                    console.log("save audio file", filePath)
                    //const b64 = await RNFS.readFile(filePath, "base64")
                    onNewAudioFile(filePath);
                } catch (e) {
                    console.log("error reading audio file", e)
                }
            })
            .catch((err) => {
                setLog(prev => prev + "\nerr stop record: " + err)
            })
            .finally(() => audioRecorderPlayer.removeRecordBackListener())


        setRecordProgressInterval((prev) => {
            if (prev) clearInterval(prev);
            setRecordProgress(0);
            return undefined;
        })

        setRecording(false);
        setState({
            recordSecs: 0,
        });

        setLog(prev => prev + "\nRecording Ended...")
    };

    const playbackListener = (e) => {
        console.log("Playback listener event:", e);

        const newState = {
            currentPositionSec: e.currentPosition,
            currentDurationSec: e.duration,
            playTime: audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)),
            duration: audioRecorderPlayer.mmssss(Math.floor(e.duration)),
        };

        // Update playback state
        if (e.isFinished) {
            setPlaying(false);
            audioRecorderPlayer.removePlayBackListener();
            console.log("Playback ended");
        } else {
            // Optionally, update progress if you have a progress bar
            console.log("Playback progress:", newState.playTime, "/", newState.duration);
        }
    };

    return <View style={{ flexDirection: "column", width: size * 4, height }}>
        <View style={{ flexDirection: isRTL() ? "row" : "row-reverse", justifyContent: "flex-start", alignItems: "center" }}>
            <TouchableOpacity style={{

                width: size,
                height: size,
                borderRadius: size / 2,
                alignItems: "center",
                backgroundColor: backgroundColor,
                justifyContent: "center",
                marginBottom: 10

            }}
                onPress={() => {
                    if (!recording) {
                        if (playing || paused) {
                            audioRecorderPlayer.stopPlayer();
                            setPlaying(false);
                            setPaused(false);
                        }
                        onStartRecord();
                        return;
                    }

                    onStopRecord().then((res) => {

                    });
                }}

            >
                <Icon
                    name={recording ? "stop" : "microphone"}
                    color={"white"}
                    size={size / 2}
                />

            </TouchableOpacity>

            <TouchableOpacity style={[{

                width: size / 2,
                height: size / 2,
                borderRadius: size / 4,
                alignItems: "center",
                backgroundColor: recordingExists ? backgroundColor : "lightgray",
                justifyContent: "center",
                marginLeft: size / 2,
                marginBottom: 10
            }, isRTL() ? { marginLeft: size / 2 } : { marginRight: size / 2 }]}
                onPress={async () => {
                    console.log("Play button pressed. Recording:", recording, "Playing:", playing,);

                    if (recording) {
                        console.log("Currently recording. Cannot play.");
                        return;
                    }

                    if (paused) {
                        console.log("Resuming playback...");
                        audioRecorderPlayer.resumePlayer()
                            .then(() => {
                                setPlaying(true);
                                setPaused(false);
                                console.log("Playback resumed");
                            })
                            .catch(error => {
                                console.error("Error resuming playback:", error);
                            });
                        return;
                    }

                    if (playing) {
                        console.log("Pausing playback...");
                        audioRecorderPlayer.pausePlayer()
                            .then(() => {
                                setPlaying(false);
                                setPaused(true);
                                console.log("Playback paused");
                            })
                            .catch(error => {
                                console.error("Error pausing playback:", error);
                            });
                        return;
                    }

                    console.log("Starting new playback...");
                    const success = await playRecording(audioFile, playbackListener);
                    if (success) {
                        setPlaying(true);
                        console.log("Playback started successfully");
                    } else {
                        console.warn("Failed to start playback");
                    }
                }}
            >

                <Icon
                    name={!playing ? "play" : "pause"}
                    color={"white"}
                    size={size / 4}
                    style={{ marginLeft: 6, marginRight: 3 }}
                />
            </TouchableOpacity>
            <View style={{ flexDirection: "column", height: 70, width: size * 2 }}>
                {recording && <AudioWaveForm width={size * 2} height={40} infiniteProgress={recordProgress} color={BTN_BACK_COLOR} baseColor={"lightgray"} />}
                {recording && <Text allowFontScaling={false} style={{ fontSize: 16, width: size * 2, height: 30, textAlign: "center" }}>{state.recordTime?.substring(0, 5) || ""}</Text>}
            </View>

        </View>

    </View>
}
