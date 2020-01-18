import React from 'react';
//import { Icon } from 'react-native-elements'
import { View, Alert, Image, Text, TouchableOpacity, CheckBox } from 'react-native';
import { Icon } from 'react-native-elements'

import {
    colors, semanticColors, getEmbeddedButton, Spacer
} from './elements'

const titleHeight = 25;
const lineHeight = 70;
const tileHeight = 197;

export default function FileNew(props) {
    let imageSrc = props.page.pages.length == 0 ? props.page.path : props.page.pages[0];

    return (
        <TouchableOpacity
            key={props.name}
            onPress={props.onPress}
            activeOpacity={0.8}
            style={{ width: props.asTile ? 143 : props.rowWidth, height: props.asTile ? tileHeight : lineHeight }}
        >
            {props.asTile ?
                <View style={{ alignContent: 'center', padding: 12, height: '100%', width: '100%' }}>
                    <View style={{ borderWidth: 1.5, borderColor: "#D1CFCF", height: '100%', width: '100%' }}>
                        {props.editMode ?
                            <View style={{
                                position: 'absolute', top: 0,
                                right: 0, width: '100%', height: '100%',
                                zIndex: 100,
                                flexDirection: 'row',
                                flexWrap: 'wrap'
                            }}>
                                <TouchableOpacity
                                    onPress={props.onSelect} >
                                    <Icon name={'more-vert'} size={35} />
                                </TouchableOpacity>
                                {props.selected ? getActionButtons(props) : null}
                            </View>
                            : null}
                        <View style={{ flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>


                            <Image source={{ uri: imageSrc }} style={{ flex: 10, width: '100%' }} />
                            <View style={{ flex: 2, backgroundColor: '#a7a7a7', alignItems: 'flex-end', width:'100%' }} >
                                <Text style={{ fontSize: 20, textAlign: 'right', color: 'white', paddingRight: 15 }}>
                                    {props.name}
                                    {props.count > 0 ? ' (' + props.count + ')' : ''}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
                :
                <View style={{ alignContent: 'center', height: lineHeight, borderWidth: 1.5, borderColor: "#D1CFCF", width: '100%', paddingRight: 5 }}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingTop: 3 }}>
                        <View style={{ borderWidth: .5, borderColor: colors.lightBlue }}>
                            <Image source={{ uri: imageSrc }} style={{ width: 50, height: 60 }} />
                        </View>
                        <Text style={{ paddingRight: 20, fontSize: 25, color: semanticColors.titleText }}>
                            {props.name}
                            {props.count > 0 ? ' (' + props.count + ')' : ''}
                        </Text>
                        {props.editMode ?
                            <View style={{
                                position: 'absolute', flexDirection: 'row-reverse',
                                right: 0,
                                height: '100%', width: '100%', backgroundColor: 'transparent',
                                justifyContent: 'flex-end',
                                alignItems: 'center'
                            }}>
                                {props.selected ? getActionButtons(props) : null}
                                <TouchableOpacity

                                    onPress={props.onSelect} >
                                    <Icon name={'more-vert'} size={35} />
                                </TouchableOpacity>
                            </View> : null
                        }
                    </View>
                </View>}
        </TouchableOpacity>
    );
}

function getActionButtons(props) {
    return [
        getEmbeddedButton(props.onDelete, 'delete-forever', 30, 1),
        <Spacer width={7} key={2} />,
        getEmbeddedButton(props.onRename, 'save', 30, 3),
        <Spacer width={7} key={4} />,
        getEmbeddedButton(props.onDuplicate, 'collections', 30, 5),
        <Spacer width={7} key={6} />,
        getEmbeddedButton(props.onShare, 'share', 30, 7),
        <Spacer width={7} key={8} />,
    ];
}
