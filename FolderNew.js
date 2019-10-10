import React from 'react';
import { Icon } from 'react-native-elements'
import { View, Alert, Text, TouchableOpacity } from 'react-native';
import { getFolderAndIcon, normalizeTitle, semanticColors, FolderTextStyle, folderColors, Spacer } from './elements'




export default function FolderNew(props) {
    let folderColor = folderColors[props.index % folderColors.length];
    let folderAndIcon = getFolderAndIcon(props.name);
    let caption = normalizeTitle(folderAndIcon.name)
    if (props.editMode && caption.length > 9) {
        caption = caption.substring(0, 7) + '...';
    }


    return (
        <TouchableOpacity key={props.id} onPress={props.onPress}
            style={{
                alignContent: 'center',
                width: '92%', height: 76,
                paddingTop: 10, paddingBottom:10,

            }}>
            <View style={{
                flexDirection: 'row-reverse', justifyContent: 'space-between',
                backgroundColor: props.current ? semanticColors.selectedFolder : 'transparent',
                borderTopLeftRadius: 26,
                borderBottomLeftRadius: 26
            }}>

                <View style={{
                    flexDirection: 'row-reverse', alignItems: 'center', height: 56

                }}>
                    {props.editMode && !props.fixedFolder ?
                        <TouchableOpacity onPress={props.onSelect} >
                            <Icon name={props.selected ? "check-box" : "check-box-outline-blank"} size={35} />
                        </TouchableOpacity>
                        : null}

                    <View
                        style={{ flexDirection: 'row-reverse', alignItems: 'center' }}
                    >
                        {props.editMode ? null :
                            <View style={{ alignContent: 'center' , paddingRight:20}}>
                                <Icon name="folder" size={38} color={folderColor} />
                                <View style={{ position: 'absolute', left: 10, top: 11 }}>
                                    {folderAndIcon.icon.length > 0 ? <Icon name={folderAndIcon.icon} size={20} color='white' /> : null}
                                </View>
                            </View>
                        }
                        <Spacer width={8}/>
                        <Text style={FolderTextStyle}>{caption}</Text>
                    </View>

                </View>
                {
                    props.editMode && !props.fixedFolder ?
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name={"expand-less"} size={55} onPress={props.onMoveUp} />
                            <Icon name={"expand-more"} size={55} onPress={props.onMoveDown} />
                        </View> :
                        <View />
                }
            </View>

        </TouchableOpacity>
    );
}