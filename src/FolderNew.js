import React, { useState } from 'react';
import { Icon } from "./elements"
import { View, TouchableOpacity } from 'react-native';
import {
    normalizeTitle, semanticColors, FolderTextStyle,
    getEmbeddedButton, AppText, Spacer, dimensions, FolderIcon
} from './elements'
import { DraxView } from 'react-native-drax';
import { trace } from './log';
import { FileSystem } from './filesystem';
import { showMessage } from 'react-native-flash-message';
import { fTranslate, getRowDirections } from './lang';


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
        <DraxView
            key={props.index}
            longPressDelay={100000}
            onReceiveDragEnter={() => {
                trace("drag enter")
                if (!props.asTitle)
                    setDragOver(true)
            }}
            onReceiveDragExit={() => setDragOver(false)}
            onReceiveDragDrop={({ dragged: { payload } }) => {
                setDragOver(false);
                //trace(`received ${JSON.stringify(payload)}`);
                trace("Drop on Folder", "from", payload.folder, "to", props.name)
                if (payload.folderID === props.id) {
                    trace("drop on same folder")
                    return;
                }
                FileSystem.main.movePage(payload.item, props.id)
                    .then(() => showMessage({
                        message: fTranslate("SuccessfulMovePageMsg", payload.item.name, props.name),
                        type: "success",
                        animated: true,
                        duration: 5000,
                    })
                    )
            }}
            style={{
                alignContent: 'center',
                width: props.width || '100%',
                height: props.asTitle ? dimensions.folderAsTitleHeight : dimensions.folderHeight,
                //paddingTop: 10, paddingBottom: 10
                borderRadius: 7,
                backgroundColor: dragOver ? dragOverColor : undefined

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
                            <View style={[{ alignContent: 'center', alignItems: 'center', justifyContent: 'center', 
                            paddingBottom: '5%', height: '100%'}, rtl? {paddingRight: 30}:{paddingLeft: 30}]}>
                                <Icon name="folder" size={45} color={props.color} />
                                <View style={[{ position: 'absolute', top: 0, width: '100%', height: '100%' }, rtl?{left: 0}:{right:0}]}>
                                    <View style={{
                                        width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', paddingTop: '7%',
                                        flexDirection: rowReverse
                                    }}>
                                        {props.icon && props.icon.length > 0 ? <FolderIcon name={props.icon} size={20} color={'white'} /> : null}
                                    </View>
                                </View>
                            </View>

                            <Spacer width={8} />
                            {props.hideTitle ? null : <AppText style={[FolderTextStyle, { fontSize: 32, lineHeight: 60}]}>{caption}</AppText>}
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
                        { position: 'absolute',  top: 0, flexDirection: 'column', alignItems: 'center', marginTop: 10},
                        rtl ? { left: 0 } : { right: 0 }]}>
                        <Icon name={"expand-less"} size={55} color={props.index == 0 ? 'gray' : 'black'} onPress={props.index > 0 ? props.onMoveUp : undefined} />
                        <Icon name={"expand-more"} size={55} color={props.isLast ? 'gray' : 'black'} onPress={props.isLast ? undefined : props.onMoveDown} />
                    </View> :
                    <View />
            }
        </DraxView>
    );
}