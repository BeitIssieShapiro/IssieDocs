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
    getIconButton,
    getFontFamily
} from './elements'


export default function TitleEdit(props) {
    const inputEl = useRef(null);
    const titleStyle = [globalStyles.headerTitleStyle, { color: 'white', textAlign: 'center' }, getFontFamily()];

    const [editedTitle, setEditedTitle] = useState(props.title);
    const [previousEditMode, setPreviousEditMode] = useState(false);
    const conditionalBlur = () => {
        if (inputEl && inputEl.current && !props.editMode && inputEl.current.isFocused()) {
            inputEl.current.blur();
        }
    }
    conditionalBlur();

    if (previousEditMode != props.editMode) {
        setPreviousEditMode(props.editMode);
        if (props.editMode && inputEl && inputEl.current) {
            inputEl.current.focus();
        }
    }

    return <View
        style={[{

            flexDirection: 'row', width: '70%',
            marginLeft: '15%',
            marginRight: '15%',
            marginBottom: 5,
            alignItems: 'center', justifyContent: 'center',
            alignContent: 'center',
            borderWidth:2,
            borderColor:'transparent'
        },
        props.editMode ? {
            //backgroundColor: '#6C89AF',
            //borderBottomColor: '#A1C7FC',
            borderColor:'#A1C7FC', 
            borderRadius: 3
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
            {props.editMode ? getIconButton(() => {
                setEditedTitle("")
                props.onSaveCallback.getTitleToSave = () => ""
            }, "white", "close", 30) : null}
        </View>
        
    </View>
}