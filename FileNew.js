import React from 'react';
//import { Icon } from 'react-native-elements'
import { View, Alert, Image, Text, TouchableOpacity, CheckBox } from 'react-native';
import { Icon } from 'react-native-elements'

import {
    AppText, colors, semanticColors, getEmbeddedButton, Spacer, dimensions, getEmbeddedSvgButton, getIconButton, getFileNameDialog
} from './elements'

const TILE_PADDING=12
const TILE_TEXT_HEIGHT=22
const TILE_BORDER_WIDTH=1.5

export default function FileNew(props) {
    let imageSrc = props.page.pages.length == 0 ? props.page.path : props.page.pages[0];

    return (
        <TouchableOpacity
            key={props.name}
            onPress={props.onPress}
            activeOpacity={0.8}
            style={{ width: props.asTile ? dimensions.tileWidth : props.rowWidth, height: props.asTile ? dimensions.tileHeight : dimensions.lineHeight}}
        >
            {props.asTile ?
                <View style={{ alignContent: 'center', padding: TILE_PADDING, height: '100%', width: '100%' }}>
                    <View style={{ borderWidth:TILE_BORDER_WIDTH, borderColor: "#D1CFCF", height: '100%', width: '100%' }}>

                        <View style={{
                            position: 'absolute', top: 0,
                            right: 35, width: '100%', height: '100%',
                            zIndex: 100, alignItems: 'flex-start'

                        }}>
                            <TouchableOpacity
                                onPress={props.onSelect} >
                                <Icon name={'more-vert'} size={35} />
                            </TouchableOpacity>
                            {props.selected ?
                            <View style={{position: 'absolute', top: 0,left: 35}}>
                                {getActionButtons(props)}
                                </View>
                                : null}
                        </View>

                        <View style={{ flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>


                            <Image source={{ uri: imageSrc }} style={{ height:'85%', width: '100%' }} />
                            <View style={{ height:'15%', backgroundColor: '#a7a7a7', alignItems: 'flex-end', width: '100%' }} >
                                <AppText style={{ fontSize: TILE_TEXT_HEIGHT, textAlign: 'right', color: 'white', paddingRight: 15 }}>
                                    {getFileName(props)}
                                    
                                </AppText>
                            </View>
                        </View>
                    </View>
                </View>
                :
                <View style={{ alignContent: 'center', height: dimensions.lineHeight, borderWidth: 1.5, borderColor: "#D1CFCF", width: '100%', paddingRight: 5 }}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingTop: 3 }}>
                        <View style={{ borderWidth: .5, borderColor: colors.lightBlue }}>
                            <Image source={{ uri: imageSrc }} style={{ width: 50, height: 60 }} />
                        </View>
                        <AppText style={{ paddingRight: 20, fontSize: 25, color: semanticColors.titleText }}>
                            {getFileName(props)}
                        </AppText>
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
                        </View>
                    </View>
                </View>}
        </TouchableOpacity>
    );
}
/*
function getActionButtons(props) {
    return <View style={{
        flexDirection: 'row',
        backgroundColor: semanticColors.mainAreaBG,
        alignItems: 'center'
    }}>
        {getEmbeddedButton(props.onRename, 'edit', 40, 3)}
        <Spacer width={7} key={4} />
        {getEmbeddedButton(props.onDelete, 'delete-forever', 40, 1)}
        <Spacer width={7} key={2} />
        {getEmbeddedButton(props.onMove, 'folder-move', 40, 5, 'material-community')}
        <Spacer width={7} key={6} />
        {getEmbeddedButton(props.onDuplicate, 'file-multiple', 40, 7, 'material-community')}
        <Spacer width={7} key={8} />
        {getEmbeddedButton(props.onShare, 'share', 40, 9)}
        <Spacer width={7} key={10} />
    </View>
}
*/

function getButton(index, props) {
    switch (index) {
        case 0: return getEmbeddedButton(props.onRename, 'edit', 40, 1);
        case 1: return getEmbeddedButton(props.onDelete, 'delete-forever', 40, 2);
        case 2: return getEmbeddedButton(props.onMove, 'folder-move', 40, 3, 'material-community');
        case 3: return getEmbeddedButton(props.onDuplicate, 'file-multiple', 30, 4, 'material-community');
        case 4: return getEmbeddedButton(props.onShare, 'share', 35, 5);
    }
}

function getFileName(props) {
    let limit = props.asTile? 12:35;
    let suffix = props.count > 0 ? ' (' + props.count + ')' : '';
    if (props.count > 1) {
        limit -= 4;
    }
    if (props.name.length > limit) {
        return props.name.substring(0,limit) + '...' + suffix;
    }
    return props.name + suffix;
}

function getActionButtons(props) {
    if (props.asTile) {
        return <View style={{
            width: '100%',
            flexDirection: 'column',
            backgroundColor: semanticColors.mainAreaBG,
            alignItems: 'center'
        }}>
            <View style={{
                flexDirection: 'row',
                backgroundColor: semanticColors.mainAreaBG,
                alignItems: 'center',
                justifyContent:'center',
                height: (dimensions.tileHeight - TILE_PADDING) *.4- TILE_BORDER_WIDTH,
                width: dimensions.tileWidth - 2*TILE_PADDING - TILE_BORDER_WIDTH*2
            }}>
                {getButton(0, props)}
                <Spacer width={15} key={10} />
                {getButton(1, props)}
            </View>
            <View style={{
                flexDirection: 'row',
                backgroundColor: semanticColors.mainAreaBG,
                height:(dimensions.tileHeight - TILE_PADDING) *.4 - TILE_BORDER_WIDTH,
                width: dimensions.tileWidth - 2*TILE_PADDING - 2*TILE_BORDER_WIDTH,
                justifyContent: 'space-between'
            }}>
                {getButton(2, props)}
                <Spacer width={9} key={12} />
                {getButton(3, props)}
                <Spacer width={9} key={13} />
                {getButton(4, props)}
            </View>
        </View>
    } else {
        return <View style={{
            flexDirection: 'row',
            backgroundColor: semanticColors.mainAreaBG,
            alignItems: 'center',
            alignContent:'center'
        }}>
            {[0, 1, 2, 3, 4].map((item, i) =>
                [getButton(item, props),
                <Spacer width={i == 2? 19: 15} key={i + 10} />]
            )}
        </View>
    }

}
