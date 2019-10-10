import React from 'react';
//import { Icon } from 'react-native-elements'
import { View, Alert, Image, Text, TouchableOpacity, CheckBox } from 'react-native';
import { Icon } from 'react-native-elements'

import {
    colors, semanticColors
} from './elements'

const titleHeight = 25;
const lineHeight = 70;
const tileHeight = 197;

export default function FileNew(props) {
    let imageSrc = props.page.pages.length == 0 ? props.page.path : props.page.pages[0];

    return (
        <TouchableOpacity
            key={props.name}
            onPress={props.editMode ? props.onSelect : props.onPress}
            activeOpacity={0.8}
            style={{ width: props.asTile ? 143 : props.rowWidth, height: props.asTile ? tileHeight : lineHeight }}
        >
            {props.asTile ?
                <View style={{ alignContent: 'center', padding: 12, height: '100%', width: '100%' }}>
                    <View style={{ borderWidth: 1.5, borderColor: "#D1CFCF", height: '100%', width: '100%' }}>
                        <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                            {props.editMode ?
                                <View style={{ position: 'absolute', top: -5, right: -6, width: 40, height: 40, zIndex: 5 }}>
                                    <Icon name={props.selected ? "check-box" : "check-box-outline-blank"} size={35} />
                                </View>
                                : null}
                            <View style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: tileHeight - titleHeight }}>
                                <Image source={{ uri: imageSrc }} style={{ width: '100%', height: '100%' }} />
                            </View>
                        </View>
                        <View style={{ position: 'absolute', bottom: 0, width: '100%', height: titleHeight, backgroundColor: '#a7a7a7', alignItems: 'flex-end' }} >
                            <Text style={{ fontSize: 20, textAlign: 'right', color: 'white', paddingRight: 15 }}>
                                {props.name}
                                {props.count > 0 ? ' (' + props.count + ')' : ''}
                            </Text>
                        </View>
                    </View>
                </View>
                :
                <View style={{ alignContent: 'center', height: lineHeight, borderWidth: 1.5, borderColor: "#D1CFCF", width: '100%' }}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                        {props.editMode ?
                            <Icon name={props.selected ? "check-box" : "check-box-outline-blank"} size={35} />
                            : null}
                        <View style={{ borderWidth: .5, borderColor: colors.lightBlue }}>
                            <Image source={{ uri: imageSrc }} style={{ width: 50, height: 60 }} />
                        </View>
                        <Text style={{ paddingRight: 20, fontSize: 25, color: semanticColors.titleText }}>
                            {props.name}
                            {props.count > 0 ? ' (' + props.count + ')' : ''}
                        </Text>
                    </View>
                </View>}
        </TouchableOpacity>
    );
}

