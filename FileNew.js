import React from 'react';
//import { Icon } from 'react-native-elements'
import { View, Alert, Image, Text, TouchableOpacity, CheckBox } from 'react-native';
import { Icon } from 'react-native-elements'

import {
    colors, semanticColors
} from './elements'
export default function FileNew(props) {
    let imageSrc = props.page.pages.length == 0 ? props.page.path : props.page.pages[0];
    //Alert.alert(imageSrc)
    return (
        <TouchableOpacity
            key={props.name}
            onPress={props.editMode ? props.onSelect : props.onPress}
            activeOpacity={0.8}
            style={{ width: '100%' }}
        >
            <View style={{ alignContent: 'center', height: 70, borderWidth: 1.5, borderColor: "#D1CFCF" }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                    {props.editMode ? 
                        <Icon name={props.selected?"check-box":"check-box-outline-blank"} size={35} /> 
                        : null}
                    <View style={{ borderWidth: 3, borderColor: colors.lightBlue }}>
                        <Image source={{ uri: imageSrc }} style={{ width: 50, height: 60 }} />
                    </View>
                    <Text style={{ paddingRight: 20, fontSize: 40 }}>
                        {props.name}
                        {props.count > 0 ? ' (' + props.count + ')' : ''}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

