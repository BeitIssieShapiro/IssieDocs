import { Alert, TouchableOpacity, View } from "react-native";
import { DraxView } from "react-native-drax";
import { SvgIcon } from "./svg-icons";
import { SBDraxScrollView, dimensions } from "./elements";
import FolderNew from "./FolderNew";
import { FileSystem } from "./filesystem";
import { showMessage } from "react-native-flash-message";
import { useState } from "react";
import { getRowDirections, translate } from "./lang";
import { trace } from "./log";

export function FolderPanel({
    treeWidth,
    showHome,
    folders,
    currentFolder,
    isScreenLow,
    isLandscape,
    onUnselectFolder,
    onSelectFolder,
    onMoveFolderUp,
    onMoveFolderDown,
    onRef,
    useColor,
    editMode,
    allowDropFolders
}) {
    const [homeDragOver, setHomeDragOver] = useState(false)
    const { rtl } = getRowDirections();
    let foldersHeightSize = (folders.length + 1) * dimensions.folderHeight;
    let curFolderFullName = "", curFolderColor = "", curFolderIcon = "";
    if (currentFolder) {
        curFolderFullName = currentFolder.name;
        curFolderColor = currentFolder.color;
        curFolderIcon = currentFolder.icon;
    }

    return <View style={{

        flexDirection: "column",
        top: 0,
        width: treeWidth,
        right: 0,
        height: "100%",
        backgroundColor: 'white',
        borderLeftWidth: 1, borderLeftColor: "gray"

    }}>
        {showHome &&
            <DraxView
                onReceiveDragEnter={() => setHomeDragOver(true)}
                onReceiveDragExit={() => setHomeDragOver(false)}
                onReceiveDragDrop={({ dragged: { payload } }) => {
                    setHomeDragOver(false)
                    //trace(`received ${JSON.stringify(payload)}`);
                    trace("Drop on Folder", "from", payload.folder, "to", FileSystem.DEFAULT_FOLDER.name)
                    if (payload.folderID === FileSystem.DEFAULT_FOLDER.name) {
                        trace("drop on same folder")
                        return;
                    }

                    if (payload.isFolder) {
                        const parts = payload.folderID.split("/");
                        const targetFolderID = parts[parts.length - 1];

                        FileSystem.main.renameFolder(payload.folderID, targetFolderID, payload.icon, payload.color)
                            .then(() => showMessage({
                                message: translate("SuccessfulMoveFolderMsg"),
                                type: "success",
                                animated: true,
                                duration: 5000,
                            })).catch(e => Alert.alert(translate("ErrorMoveFolder"), e))
                    } else {
                        FileSystem.main.movePage(payload.item, FileSystem.DEFAULT_FOLDER.name)
                            .then(() => showMessage({
                                message: fTranslate("SuccessfulMovePageMsg", payload.item.name, translate("DefaultFolder")),
                                type: "success",
                                animated: true,
                                duration: 5000,

                            })
                            )
                    }
                }}
                style={{
                    height: isScreenLow ? '17%' : '10%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: homeDragOver ? "lightblue" : "transparent"
                }}>

                <TouchableOpacity onPress={() => onUnselectFolder()}>


                    <SvgIcon name="home" size={40} color={"gray"} />
                </TouchableOpacity>

            </DraxView>}


        <SBDraxScrollView
            rtl={rtl}
            myRef={onRef}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            style={{
                flex: 1,
                flexDirection: "column",
                backgroundColor: 'white',
                zIndex: 99999
            }}
            bounces={false}

            contentContainerStyle={{
                height: foldersHeightSize
            }}>

            {
                folders.map((f, i, arr) => <FolderNew
                    key={i}
                    index={i}
                    allowDropFolders={allowDropFolders}
                    isLast={i + 1 == arr.length}
                    useColors={useColor}
                    id={f.ID}
                    name={f.name}
                    color={f.color}
                    icon={f.icon}
                    editMode={editMode}
                    fixedFolder={f.name === FileSystem.DEFAULT_FOLDER.name}
                    current={currentFolder && (f.ID == currentFolder.ID || f.isParentOf(currentFolder.ID))}
                    onPress={() => onSelectFolder(f)}
                    // onLongPress={() => {
                    //     if (currentFolder && f.name == currentFolder.name)
                    //         onUnselectFolder()
                    // }}
                    onMoveUp={() => onMoveFolderUp(f)}
                    onMoveDown={() => onMoveFolderDown(f)}
                    isLandscape={isLandscape}
                />)

            }
        </SBDraxScrollView>
    </View>
}