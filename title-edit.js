import React, { useState, useRef } from 'react';
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
    const inputEl = useRef(null);
    const titleStyle = [globalStyles.headerTitleStyle, { color: 'white', textAlign: 'center' }];

    const [editedTitle, setEditedTitle] = useState(props.title);
    const conditionalBlur = () => {
        if (inputEl && inputEl.current && !props.editMode && inputEl.current.isFocused()) {
            inputEl.current.blur();
        }
    }
    conditionalBlur();

    return <View
        style={[{

            flexDirection: 'row', width: '70%',
            marginLeft: '15%',
            marginRight: '15%',
            alignItems: 'center', justifyContent: 'center',
            alignContent: 'center'
        },
        props.editMode ? {
            backgroundColor: '#225BAB',
            borderRadius: 25
        } : {}]}
    >

        <TextInput
            ref={inputEl}
            value={props.editMode ? editedTitle : props.title}
            style={titleStyle}
            readonly={props.editMode ? true : false}
            onChangeText={(txt) => {
                setEditedTitle(txt)
                props.onSaveCallback.getTitleToSave = () => txt

            }}
            onFocus={conditionalBlur}
        />
        <View style={{ position: 'absolute', left: '2%', flexDirection: 'row', alignItems: 'center' }}>
            {props.editMode && props.title != editedTitle ? getIconButton(() => {
                setEditedTitle(props.title)
                props.onSaveCallback.getTitleToSave = () => props.title
            }, "#010101", "close", 20) : null}
        </View>
        
    </View>
}