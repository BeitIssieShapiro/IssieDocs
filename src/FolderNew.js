import React, { useState } from 'react';
import { Icon } from "./elements"
import { View, TouchableOpacity, Alert } from 'react-native';
import {
    normalizeTitle, semanticColors, FolderTextStyle,
    getEmbeddedButton, AppText, Spacer, dimensions, FolderIcon
} from './elements'
import { DraxView } from 'react-native-drax';
import { trace } from './log';
import { FileSystem } from './filesystem';
import { showMessage } from 'react-native-flash-message';
import { fTranslate, getRowDirections, translate } from './lang';


const dragOverColor = 'lightblue'

export default function FolderNew(props) {
    const [dragOver, setDragOver] = useState(false);

    let caption = normalizeTitle(props.name);
    let captionLimit = props.isLandscape ? 12 : 9;


    if (!props.asTitle && caption.length > captionLimit) {
        caption = caption.substring(0, captionLimit) + '...';
    }

    const { row, rowReverse, rtl } = getRowDirections();

    return (
        <FolderDraxView
            index={props.index}
            id={props.id}
            icon={props.icon}
            color={props.color}
            setDragOver={(val) => setDragOver(val)}
            dragOver={dragOver}
            allowDropFolders={props.allowDropFolders}

            style={{
                alignContent: 'center',
                width: props.width || '100%',
                height: props.asTitle ? dimensions.folderAsTitleHeight : dimensions.folderHeight,
                borderRadius: 7,
            }}>

            {props.editMode && props.asTitle && !props.fixedFolder && props.name && props.name.length > 0 ?
                /**
                 * Buttons for editing in title mode
                 */
                <View style={[{
                    position: 'absolute', flexDirection: rowReverse,
                    top: 0,
                    height: '100%', width: '20%',
                    backgroundColor: semanticColors.mainAreaBG,
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    zIndex: 100
                }, rtl ? { left: 18 } : { right: 18 }]}>
                    {getEmbeddedButton(props.onDelete, 'delete-forever', 40)}
                    <Spacer width={17} />
                    {getEmbeddedButton(props.onRename, 'edit', 40)}
                </View> : null
            }

            <TouchableOpacity
                activeOpacity={props.asTitle ? 1 : 0.7}
                onPress={props.onPress ? (e) => props.onPress(e) : undefined}
                onLongPress={props.onLongPress ? (e) => props.onLongPress(e) : undefined}

                style={{
                    flexDirection: rowReverse,
                    backgroundColor: dragOver ? dragOverColor : (props.current ? semanticColors.selectedFolder : 'transparent'),
                    height: '100%'
                }}>

                <View style={{
                    flexDirection: rowReverse, alignItems: 'center'

                }}>
                    {props.asTitle ?
                        /**
                         * Title View
                         */
                        <View
                            style={{
                                flexDirection: rowReverse,
                            }}
                        >
                            <View style={[{
                                alignContent: 'center', alignItems: 'center', justifyContent: 'center',
                                paddingBottom: '5%', height: '100%'
                            }, rtl ? { paddingRight: 30 } : { paddingLeft: 30 }]}>
                                <Icon name="folder" size={45} color={props.color} />
                                <View style={[{ position: 'absolute', top: 0, width: '100%', height: '100%' }, rtl ? { left: 0 } : { right: 0 }]}>
                                    <View style={{
                                        width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', paddingTop: '7%',
                                        flexDirection: rowReverse
                                    }}>
                                        {props.icon && props.icon.length > 0 ? <FolderIcon name={props.icon} size={20} color={'white'} /> : null}
                                    </View>
                                </View>
                            </View>

                            <Spacer width={8} />
                            {props.hideTitle ? null : <AppText style={[FolderTextStyle, { fontSize: 32, lineHeight: 60 }]}>{caption}</AppText>}
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
                            <View style={{ flexDirection: row, justifyContent: 'center', width: '100%' }}>
                                <Icon name="folder" size={72} color={props.color} />

                                <View style={{ position: 'absolute', left: 0, top: 25, width: '100%', height: '100%' }}>
                                    <View style={{ width: '100%', justifyContent: 'center', flexDirection: rowReverse }}>
                                        {props.icon && props.icon.length ? <FolderIcon name={props.icon} size={30} color='white' /> : null}
                                    </View>
                                </View>

                            </View>
                            <View style={{ flexDirection: rowReverse, width: '100%' }}>
                                <AppText style={[FolderTextStyle,
                                    { width: '100%', lineHeight: 28, textAlign: 'center' }]} >{caption}</AppText>
                            </View>
                        </View>}
                </View>

            </TouchableOpacity>
            {
                props.editMode && !props.fixedFolder && !props.asTitle && !props.isOverview ?
                    <View style={[
                        { position: 'absolute', top: 0, flexDirection: 'column', alignItems: 'center', marginTop: 10 },
                        rtl ? { left: 0 } : { right: 0 }]}>
                        <Icon name={"expand-less"} size={55} color={props.index == 0 ? 'gray' : 'black'} onPress={props.index > 0 ? props.onMoveUp : undefined} />
                        <Icon name={"expand-more"} size={55} color={props.isLast ? 'gray' : 'black'} onPress={props.isLast ? undefined : props.onMoveDown} />
                    </View> :
                    <View />
            }
        </FolderDraxView>
    );
}

export function FolderDraxView(props) {
    return <DraxView
        key={props.index}
        longPressDelay={700}
        payload={{ folderID: props.id, isFolder: true, icon: props.icon, color: props.color }}

        onDragStart={() => {
            trace("start drag folder", props.id)
        }}
        onReceiveDragEnter={() => {
            trace("folder drag enter")
            if (props.allowDropFolders)
                props.setDragOver(true)
        }}
        onReceiveDragExit={() => props.setDragOver(false)}
        onReceiveDragDrop={({ dragged: { payload } }) => {
            props.setDragOver(false);
            trace("Drop on Folder:", payload.folderID, "into", props.id)
            if (payload.folderID === props.id) {
                trace("drop on the same folder")
                return;
            }

            if (payload.isFolder) {
                if (props.allowDropFolders) {
                    const parts = payload.folderID.split("/");
                    let targetFolderID = "";
                    if (props.id !== FileSystem.DEFAULT_FOLDER.name) {
                        targetFolderID += props.id + "/"
                    }

                    targetFolderID += parts[parts.length - 1];
                    if (targetFolderID === payload.folderID) {
                        trace("drop a folder on its parent")
                        return;
                    }

                    FileSystem.main.renameFolder(payload.folderID, targetFolderID, payload.icon, payload.color)
                        .then(() => showMessage({
                            message: translate("SuccessfulMoveFolderMsg"),
                            type: "success",
                            animated: true,
                            duration: 5000,
                        })).catch(e => Alert.alert(translate("ErrorMoveFolder"), e))
                }
            } else {
                FileSystem.main.movePage(payload.item, props.id)
                    .then(() => showMessage({
                        message: fTranslate("SuccessfulMovePageMsg", payload.item.name, props.name),
                        type: "success",
                        animated: true,
                        duration: 5000,
                    })
                    )
            }
        }}
        style={[props.style, {
            backgroundColor: props.dragOver ? dragOverColor : undefined
        }]}
    >{props.children}
    </DraxView>
}