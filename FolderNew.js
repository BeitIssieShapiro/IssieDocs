import React from 'react';
import { Icon } from 'react-native-elements'
import { View, Alert, Text, TouchableOpacity } from 'react-native';
import {getFolderAndIcon, normalizeTitle, semanticColors} from './elements'

export default function FolderNew(props) {
    let name = getFolderAndIcon(props.name);
    return (
        <TouchableOpacity
            key={props.id}
            onPress={props.onPress}
            activeOpacity={0.8}
            style={{width:'100%'}}
        >
            <View  style={{ alignContent: 'center', width:'100%', height: 70, backgroundColor: props.current ? semanticColors.selectedFolder :undefined}}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                    <Icon name="folder" size={70} color='#424242' />
                    <View style={{position:'absolute', left:22}}>
                        {name[1].length > 0?<Icon name={name[1]} size={30} color='white'  />:null}
                    </View>
                    <Text style={{ fontSize: 30 }}>{normalizeTitle(name[0])}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}