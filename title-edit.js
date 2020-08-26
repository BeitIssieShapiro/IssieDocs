import React, { useState } from 'react';
import { Icon } from 'react-native-elements'
import {
    View, Alert, Text, TouchableOpacity, StyleSheet,
    Settings, ScrollView, TextInput
} from 'react-native';
import {
    globalStyles,
    AppText,
    getEmbeddedButton,
    Spacer,
    semanticColors,
    getMaterialCommunityIconButton,
    getIconButton
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
            <AppText style={titleStyle}>{props.title}</AppText>}


        <View style={{
            position: 'absolute', height: 45, width: 100,
            left: 0, flexDirection: 'row', justifyContent: 'flex-start',
             width: 150
        }}>

            {
            getIconButton(() => setEditMode(!editMode),
                                'white', editMode ? "close" : "edit", 40)
            }

            {/* {!editMode ?
                <Icon name={'edit'} size={40} color={'white'}
                    onPress={() => setEditMode(true)} /> : null}
            {editMode ?
                <Icon name={'close'} size={40} color={'white'}
                    onPress={() => setEditMode(false)} /> : null} */}
            {editMode ? 
                <Icon name={'check'} size={40} color={'white'}
                    onPress={() => {
                setEditMode(false);
                props.onSave(editedTitle);
            }} /> : null}

        </View>
    </View>
}