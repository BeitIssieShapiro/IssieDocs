import { Alert, TouchableOpacity, View } from "react-native";
import { SvgIcon } from "./svg-icons";
import {  dimensions } from "./elements";
import FolderNew, { FolderDraxView } from "./FolderNew";
import { FileSystem } from "./filesystem";
import { useState } from "react";
import { getRowDirections, translate } from "./lang";
import { trace } from "./log";
import { DDScrollView } from "./dragdrop";

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
    allowDropFolders,
    asTree,
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
            <FolderDraxView
                index={0}
                id={FileSystem.DEFAULT_FOLDER.name}
                icon={FileSystem.DEFAULT_FOLDER.icon}
                color={FileSystem.DEFAULT_FOLDER.color}
                setDragOver={(val) => setHomeDragOver(val)}
                dragOver={homeDragOver}
                allowDropFolders={true}
                style={{
                    height: isScreenLow ? '17%' : '10%',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>

                <TouchableOpacity onPress={() => onUnselectFolder()}>
                    <SvgIcon name="home" size={40} color={"gray"} />
                </TouchableOpacity>
            </FolderDraxView>}

        <DDScrollView
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
                    width={treeWidth}
                    key={i}
                    index={i}
                    allowDropFolders={allowDropFolders}
                    isLast={i + 1 == arr.length}
                    useColors={useColor}
                    id={f.ID}
                    asTree={asTree}
                    asTitle={false}
                    subFolders={f.folders}
                    hasChildren={f.hasChildren}
                    hideEditButtons={true}
                    fontSize={asTree ? 24 : 32}
                    name={f.name}
                    color={f.color}
                    icon={f.icon}
                    editMode={editMode}
                    fixedFolder={f.name === FileSystem.DEFAULT_FOLDER.name}
                    currentID={currentFolder.ID}
                    onPress={(id) => onSelectFolder(id)}
                    onMoveUp={() => onMoveFolderUp(f)}
                    onMoveDown={() => onMoveFolderDown(f)}
                    isLandscape={isLandscape}
                    onCollapseExpand={(isExpand) => {
                        if (isExpand) {
                            f.reloadedIfNeeded();
                        }
                    }}
                />)

            }
        </DDScrollView>
    </View>
}