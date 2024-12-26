import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DDProvider, DDView } from './dragdrop';
import { trace } from './log';


export function TestCmp() {
    const [dropHover, setDropHover] = useState(false)


    return (
        <DDProvider>
            <View style={{ flex: 1, margin:120, padding: 10 }}>
                {/* Draggable View */}
                <DDView
                    id="drag1"
                    dragState={{ payload: 'abc' }}
                    onStartDrag={() => console.log('Start draggin')}
                    onDrop={(state) => false}
                    style={{ width: 100, height: 100, backgroundColor: 'blue' }}
                >
                    <Text>Drag Me</Text>
                </DDView>

                {/* Drop Target */}
                <DDView
                    id="drop1"
                    isTarget
                    onDrop={(state) => {
                        console.log('Dropped onto me:', state)
                        return true;
                    }}
                    onDragEnter={()=>{
                        setDropHover(true)
                        trace("Drag enter")
                    }}
                    onDragExit={()=>{
                        setDropHover(false)
                        trace("Drag exit")
                    }}

                    style={{ width: 150, height: 150, backgroundColor: dropHover?'green':'gray' }}
                >
                    <Text>Drop Here</Text>
                </DDView>
            </View>
        </DDProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    box: {
        width: 100,
        height: 100,
        backgroundColor: 'blue',
        justifyContent: 'center',
        alignItems: 'center',
    },
    target: {
        width: 150,
        height: 150,
        backgroundColor: 'gray',
        justifyContent: 'center',
        alignItems: 'center',
    },
});