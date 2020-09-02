import React from 'react';
import { Icon } from 'react-native-elements'
import { View, Alert, Text, TouchableOpacity } from 'react-native';
import {
    getFolderAndIcon, normalizeTitle, semanticColors, FolderTextStyle,
    getEmbeddedButton, AppText, folderColors, Spacer, dimensions, FolderIcon
} from './elements'




export default function FolderNew(props) {
    //let folderColor = props.useColors?folderColors[props.index % folderColors.length]: 'gray';
    let folderAndIcon = getFolderAndIcon(props.name);
    let folderColor = folderAndIcon.color.length > 0 ? folderAndIcon.color : 'gray';
    let caption = normalizeTitle(folderAndIcon.name);
    let captionLimit = props.isLandscape ? 12 : 9;

    // if (props.editMode) {
    //     captionLimit -= 3;
    // }

    if (!props.asTitle && caption.length > captionLimit) {
        caption = caption.substring(0, captionLimit) + '...';
    }

    return (
        <View
            key={props.id}
            style={{
                alignContent: 'center',
                width: props.width || '100%',
                height: props.asTitle ? dimensions.folderAsTitleHeight : dimensions.folderHeight,
                //paddingTop: 10, paddingBottom: 10
            }}>

            {props.editMode && props.asTitle && !props.fixedFolder && props.name && props.name.length > 0 ?
                /**
                 * Buttons for editing in title mode
                 */
                <View style={{
                    position: 'absolute', flexDirection: 'row-reverse',
                    left: 18,
                        top: 0,
                    height: '100%', width: '20%',
                    backgroundColor: semanticColors.mainAreaBG,
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    zIndex: 100
                }}>
                    {getEmbeddedButton(props.onDelete, 'delete-forever', 40)}
                    <Spacer width={17} />
                    {getEmbeddedButton(props.onRename, 'edit', 40)}
                </View> : null
            }

            <TouchableOpacity
                activeOpacity={props.asTitle ? 1 : 0.7}
                onPress={props.onPress ? (e) => props.onPress(e, folderColor) : undefined}
                onLongPress={props.onLongPress ? (e) => props.onLongPress(e) : undefined}

                style={{
                    flexDirection: 'row-reverse',
                    backgroundColor: props.current ? semanticColors.selectedFolder : 'transparent',
                    height: '100%'
                }}>

                <View style={{
                    flexDirection: 'row-reverse', alignItems: 'center'

                }}>
                    {props.asTitle ?
                        /**
                         * Title View
                         */
                        <View
                            style={{
                                flexDirection: 'row-reverse'
                            }}
                        >
                            <View style={{ alignContent: 'center', alignItems: 'center', justifyContent: 'center', paddingRight: 30, paddingBottom:'5%', height: '100%'}}>
                                <Icon name="folder" size={45} color={folderColor} />
                                <View style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}>
                                    <View style={{ width: '100%', height:'100%', justifyContent: 'center',alignItems: 'center', paddingTop:'7%', flexDirection: 'row-reverse' }}>
                                        {folderAndIcon.icon.length > 0 ? <FolderIcon name={folderAndIcon.icon} size={20} color={'white'} /> : null}
                                    </View>
                                </View>
                            </View>

                            <Spacer width={8} />
                            {props.hideTitle ? null : <AppText style={[FolderTextStyle, { fontSize: 32, lineHeight: 44 }]}>{caption}</AppText>}
                        </View> :
                        /**
                         * Side Panel View or overview
                         */
                        <View
                            style={{
                                flexDirection: 'column',
                                width: '100%'
                            }}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%' }}>
                                <Icon name="folder" size={72} color={folderColor} />

                                <View style={{ position: 'absolute', left: 0, top: 25, width: '100%', height: '100%' }}>
                                    <View style={{ width: '100%', justifyContent: 'center', flexDirection: 'row-reverse' }}>
                                        {folderAndIcon.icon.length > 0 ? <FolderIcon name={folderAndIcon.icon} size={30} color='white' /> : null}
                                    </View>
                                </View>

                            </View>
                            <View style={{ flexDirection: 'row-reverse', width: '100%' }}>
                                <AppText style={[FolderTextStyle,
                                    { width: '100%', lineHeight: 28, textAlign: 'center' }]} >{caption}</AppText>
                            </View>
                        </View>}
                </View>

            </TouchableOpacity>
            {
                props.editMode && !props.fixedFolder && !props.asTitle && !props.isOverview ?
                    <View style={{ position: 'absolute', left: 0, top: 0, flexDirection: 'column', alignItems: 'center', marginTop: 0, }}>
                        <Icon name={"expand-less"} size={55} color={props.index == 1 ? 'gray' : 'black'} onPress={props.index > 1 ? props.onMoveUp : undefined} />
                        <Icon name={"expand-more"} size={55} color={props.isLast ? 'gray' : 'black'} onPress={props.isLast ? undefined : props.onMoveDown} />
                    </View> :
                    <View />
            }
        </View>
    );
}