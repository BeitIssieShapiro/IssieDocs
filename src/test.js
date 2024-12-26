import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DDProvider, DDScrollView, DDView } from './dragdrop';
import { trace } from './log';
import { Touchable } from 'react-native';


export function TestCmp() {


    return (
        <DDProvider>
            <DDView
                id="drag0"
                dragState={{ payload: 'xyz' }}
                onStartDrag={() => console.log('Start draggin outer')}
                onDrop={(state) => false}
                style={{ width: 100, height: 100, backgroundColor: 'red' }}
            >
                <TouchableOpacity style={{ width: 100, height: 100, backgroundColor: 'brown' }}>
                    <Text>Drag Me</Text>
                </TouchableOpacity>
            </DDView>
            <DDScrollView style={{ flex: 1, margin: 120, padding: 10, backgroundColor: "yellow" }}>
                {/* Draggable View */}
                <DDView
                    id="drag1"
                    dragState={{ payload: 'abc' }}
                    onStartDrag={() => console.log('Start draggin')}
                    onDrop={(state) => false}
                    style={{ width: 100, height: 100, backgroundColor: 'blue' }}
                >
                    <TouchableOpacity style={{ width: 100, height: 100, backgroundColor: 'brown' }}
                    onPress={()=>console.log("onPress")}
                    
                    >
                        <Text>Drag Me</Text>
                    </TouchableOpacity>

                </DDView>


                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                    <TestDrop key={i} i={i} />
                ))}

            </DDScrollView>
        </DDProvider>
    );
}


function TestDrop({ i }) {
    const [dropHover, setDropHover] = useState(false)
    return <DDView
        key={i}
        isTarget
        onDrop={(state) => {
            console.log('Dropped onto me:', i, state)
            return true;
        }}
        onDragEnter={() => {
            setDropHover(true)
            trace("Drag enter")
        }}
        onDragExit={() => {
            setDropHover(false)
            trace("Drag exit")
        }}

        style={{ width: 150, height: 150, backgroundColor: dropHover ? 'green' : 'gray' }}
    >
        <Text>Drop Here {i}</Text>
    </DDView>
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