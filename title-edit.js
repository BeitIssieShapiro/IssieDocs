import React, { useState } from 'react';
import { Icon } from 'react-native-elements'
import {
    View, Alert, Text, TouchableOpacity, StyleSheet,
    Settings, ScrollView, TextInput
} from 'react-native';
import {
    globalStyles,
    getIconButton,
    getEmbeddedButton,
    Spacer,
    semanticColors
} from './elements'


export default function TitleEdit(props) {
    const titleStyle = [globalStyles.headerTitleStyle, { color: 'white', textAlign: 'center' }];
    const [editMode, setEditMode] = useState(false);
    const [editedTitle, setEditedTitle] = useState(props.title);

    return <View
        style={{
            flexDirection: 'row', width: '100%',
            alignItems: 'center', justifyContent: 'center', 
            alignContent: 'center'
        }}
    >
        {editMode ?
            <TextInput
                value={editedTitle}
                style={titleStyle}
                autoFocus
                onChangeText={(txt) => {
                    setEditedTitle(txt)
                }}
            /> :
            <Text style={titleStyle}>{props.title}</Text>}


        <View style={{
            position: 'absolute', height: 45, width: 100,
            left: 30, flexDirection: 'row', justifyContent: 'flex-end',
            justifyContent: 'center', width: 150
        }}>
            {!editMode ?
                <Icon name={'edit'} size={40} color={'white'}
                    onPress={() => setEditMode(true)} /> : null}
            {editMode ?
                <Icon name={'close'} size={40} color={'white'}
                    onPress={() => setEditMode(false)} /> : null}
            {editMode ? 
                <Icon name={'check'} size={40} color={'white'}
                    onPress={() => {
                setEditMode(true);
                props.onSave(editedTitle);
            }} /> : null}

        </View>
    </View>
}