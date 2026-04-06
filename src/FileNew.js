import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { MoreButton, PageImage } from "./elements"

import {
    AppText, colors, semanticColors, dimensions
} from './elements'
import { isRTL } from './lang';
import { MyIcon } from './common/icons.tsx';


const TILE_PADDING = 30
const TILE_TEXT_HEIGHT = 25
const TILE_BORDER_WIDTH = 1.5

export default function FileNew(props) {
    let imageSrc = props.page.thumbnail;
    const width = props.asTile ? dimensions.tileWidth : props.rowWidth;
    return (
        <TouchableOpacity
            key={props.name}
            onPress={props.onPress}
            activeOpacity={0.8}
            style={{ width, height: props.asTile ? dimensions.tileHeight : dimensions.lineHeight }}
        >
            {props.asTile ?
                <View style={{
                    alignContent: 'center', paddingEnd: TILE_PADDING,
                    height: '100%', width: '100%',
                }}>
                    <View
                        style={{
                            borderWidth: TILE_BORDER_WIDTH,
                            borderColor: "#D1CFCF",
                            height: '100%',
                            width: '100%',
                            margin: 10

                        }}>

                        <View style={{ flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>
                            <PageImage src={imageSrc} multiPage={props.count > 1} width={"100%"} height={"80%"} />
                            {props.page.isTemplate && (
                                <View style={{
                                    position: 'absolute', top: 4, right: 4,
                                    backgroundColor: '#4A90D9', borderRadius: 4,
                                    paddingHorizontal: 4, paddingVertical: 2,
                                }}>
                                    <MyIcon info={{ type: 'MDI', name: 'file-document-check', size: 16, color: 'white' }} />
                                </View>
                            )}
                            <View style={{ height: '20%', backgroundColor: '#a7a7a7', justifyContent: "space-between", alignItems: "center", width: '100%', flexDirection: props.rowDir }} >
                                <MoreButton onPress={props.onContextMenu} size={30} color={"white"} />
                                <AppText style={{
                                    paddingStart: 3,
                                    paddingEnd: 3,
                                    direction: isRTL() ? "rtl" : "ltr",
                                    textAlign: "left",
                                    maxWidth: dimensions.tileWidth - 30 - TILE_PADDING - 6,
                                    width: dimensions.tileWidth - 30 - TILE_PADDING - 6,
                                    fontSize: TILE_TEXT_HEIGHT, color: 'white', paddingEnd: 5, lineHeight: TILE_TEXT_HEIGHT + 2,

                                }}
                                    ellipsizeMode={true}
                                >
                                    {props.name}
                                </AppText>
                            </View>
                        </View>
                    </View>
                </View>
                :
                <View style={{ alignContent: 'center', height: dimensions.lineHeight, borderWidth: 1.5, borderColor: "#D1CFCF", width: '100%', paddingRight: 5, paddingLeft: 5 }}>
                    <View style={{ flexDirection: props.rowRevDir, alignItems: 'center', paddingTop: 3 }}>
                        <View style={{ borderWidth: .5, borderColor: colors.lightBlue }}>
                            <PageImage src={imageSrc} multiPage={props.count > 1} width={40} height={50} />
                            {props.page.isTemplate && (
                                <View style={{
                                    position: 'absolute', top: 2, right: 2,
                                    backgroundColor: '#4A90D9', borderRadius: 3,
                                    paddingHorizontal: 2, paddingVertical: 1,
                                }}>
                                    <MyIcon info={{ type: 'MDI', name: 'file-document-check', size: 12, color: 'white' }} />
                                </View>
                            )}
                        </View>
                        <AppText
                            style={{ paddingRight: 20, paddingLeft: 20, fontSize: 25, color: semanticColors.titleText ,
                                width: width - 80
                            }}
                            ellipsizeMode={true}
                        >
                            {props.name}
                        </AppText>
                        <View style={{
                            position: 'absolute', flexDirection: props.rowRevDir,
                            right: 0,
                            height: '100%', width: '100%', backgroundColor: 'transparent',
                            justifyContent: 'flex-end',
                            alignItems: 'center'
                        }}>
                            {/* {props.selected ? getActionButtons(props) : null} */}
                            <MoreButton onPress={props.onContextMenu} size={30} color={semanticColors.titleText} />
                        </View>
                    </View>
                </View>}
        </TouchableOpacity>
    );
}

