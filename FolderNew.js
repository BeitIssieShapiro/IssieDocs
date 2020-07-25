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
    let folderColor = folderAndIcon.color.length > 0? folderAndIcon.color : 'gray';
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
                width: '100%', height: props.asTitle?dimensions.folderAsTitleHeight:dimensions.folderHeight,
                paddingTop: 10, paddingBottom: 10
            }}>

            {props.editMode && props.asTitle && !props.fixedFolder && props.name && props.name.length > 0 ?
                <View style={{
                    position: 'absolute', flexDirection: 'row-reverse',
                    left: 0,
                    top: 10,
                    height: '100%', width: '50%', 
                    backgroundColor: 'transparent',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    zIndex:100
                }}>
                    {getEmbeddedButton(props.onDelete, 'delete-forever', 40)}
                    <Spacer width={7} />
                    {getEmbeddedButton(props.onRename, 'edit', 40)}
                </View> : null
            }

            <TouchableOpacity
                activeOpacity={props.asTitle ? 1 : 0.7}
                onPress={props.onPress ? (e) => props.onPress(e, folderColor) : undefined}
                onLongPress={props.onLongPress ? (e) => props.onLongPress(e) : undefined}

                style={{
                    flexDirection: 'row-reverse', justifyContent: 'space-between',
                    backgroundColor: props.current ? semanticColors.selectedFolder : 'transparent',
                    // borderTopLeftRadius: 26,
                    // borderBottomLeftRadius: 26,

                }}>

                <View style={{
                    flexDirection: 'row-reverse', alignItems: 'center'

                }}>
                    {props.asTitle? 
                    <View
                        style={{
                            flexDirection: 'row-reverse', alignItems: 'center'
                        }}
                    >
                        <View style={{ alignContent: 'center', paddingRight: 20 }}>
                            <Icon name="folder" size={38} color={folderColor} />
                            <View style={{ position: 'absolute', left: 10, top: 11 }}>
                                {folderAndIcon.icon.length > 0 ? <FolderIcon name={folderAndIcon.icon} size={20} color={'white'} /> : null}
                            </View>
                        </View>

                        <Spacer width={8} />
                        <AppText style={[FolderTextStyle, { fontSize: 32, lineHeight: 39 }]}>{caption}</AppText>
                    </View> :
                    <View
                        style={{
                            flexDirection: 'column', alignItems: 'flex-end', 
                            marginRight:45, marginTop:15,

                        }}
                    >
                        <View style={{ alignContent: 'center' }}>
                            <Icon name="folder" size={72} color={folderColor} />
                            <View style={{ position: 'absolute', left: 23, top: 23 }}>
                                {folderAndIcon.icon.length > 0 ? <FolderIcon name={folderAndIcon.icon} size={30} color='white' /> : null}
                            </View>
                        </View>

                        <AppText style={[FolderTextStyle,  
                            {width:'100%', lineHeight:28, textAlign:'right'}] } >{caption}</AppText>
                    </View>}
                </View>

            </TouchableOpacity>
            {
                props.editMode && !props.fixedFolder && !props.asTitle ?
                    <View style={{ position: 'absolute', left: 0, top: 10, flexDirection: 'column', alignItems: 'center', marginTop:15 }}>
                        <Icon name={"expand-less"} size={55} color={props.index == 1 ? 'gray' : 'black'} onPress={props.index > 1 ? props.onMoveUp : undefined} />
                        <Icon name={"expand-more"} size={55} color={props.isLast ? 'gray' : 'black'} onPress={props.isLast ? undefined : props.onMoveDown} />
                    </View> :
                    <View />
            }
        </View>
    );
}