import React from 'react';
import { Icon } from 'react-native-elements'
import { View, Alert, Text, TouchableOpacity } from 'react-native';
import { getFolderAndIcon, normalizeTitle, semanticColors } from './elements'




export default function FolderNew(props) {
    let folderAndIcon = getFolderAndIcon(props.name);
    let caption = normalizeTitle(folderAndIcon.name)
    if (props.editMode && caption.length > 9) {
        caption = caption.substring(0,7) + '...';
    }
    return (

        <View key={props.id} style={{ alignContent: 'center', width: '100%', height: 70, backgroundColor: props.current ? semanticColors.selectedFolder : undefined }}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                    {props.editMode && !props.fixedFolder ?
                        <TouchableOpacity onPress={props.onSelect} >
                            <Icon name={props.selected ? "check-box" : "check-box-outline-blank"} size={35} />
                        </TouchableOpacity>
                        : null}
                    <TouchableOpacity
                        style={{ flexDirection:'row-reverse', alignItems: 'center'}}
                        onPress={props.onPress}
                        activeOpacity={0.8}
                         >
                        {props.editMode?null:
                        <View style={{ alignContent: 'center' }}>
                            <Icon name="folder" size={70} color='#424242' />
                            <View style={{ position: 'absolute', left: 22, top: 22 }}>
                                {folderAndIcon.icon.length > 0 ? <Icon name={folderAndIcon.icon} size={30} color='white' /> : null}
                            </View>
                        </View>
                        }
                        <Text style={{ fontSize: 30 }}>{caption}</Text>
                    </TouchableOpacity>

                </View>
                {
                    props.editMode && !props.fixedFolder ?
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name={"expand-less"} size={55} onPress={props.onMoveUp}/>
                            <Icon name={"expand-more"} size={55} onPress={props.onMoveDown}/>
                        </View> :
                        <View />
                }
            </View>
        </View>
    );
}