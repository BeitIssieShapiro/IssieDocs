import React, { useState } from 'react';
import { Icon, getRoundedButton } from "./elements"
import {
    View, Alert, Text, TouchableOpacity, StyleSheet,
    Settings, ScrollView
} from 'react-native';
import {
    semanticColors,
    getIcon, Spacer,
    getRoundedButtonInt,
    AppText
} from './elements'
import Share from 'react-native-share';
import ProgressCircle from 'react-native-progress-circle'


import FadeInView from './FadeInView'
import { getFlexEnd, getRowDirection, getRowDirections, getRowReverseDirection, isRTL, translate } from './lang';

import {
    VIEW, EDIT_TITLE, LANGUAGE, TEXT_BUTTON,
    getSetting, getUseColorSetting, FOLDERS_VIEW
} from './settings'
import { Button } from 'react-native-elements';
import { FileSystem } from './filesystem';
import { trace } from './log';


export default function SettingsMenu(props) {
    const [backupProgress, setBackupProgress] = useState(undefined);

    const { row, rowReverse, flexStart, flexEnd, textAlign, rtl } = getRowDirections();

    let viewStyleSetting = getSetting(VIEW.name, VIEW.list);
    const [viewStyle, setViewStyle] = useState(viewStyleSetting);

    let foldersViewStyleSetting = getSetting(FOLDERS_VIEW.name, FOLDERS_VIEW.column);
    const [foldersViewStyle, setFoldersViewStyle] = useState(foldersViewStyleSetting);

    let langSetting = getSetting(LANGUAGE.name, LANGUAGE.default);
    const [lang, setLang] = useState(langSetting);

    let editTitleSetting = getSetting(EDIT_TITLE.name, EDIT_TITLE.no);
    const [editTitle, setEditTitle] = useState(editTitleSetting);

    let textBtnSetting = getSetting(TEXT_BUTTON.name, TEXT_BUTTON.yes);
    const [textBtn, setTextBtn] = useState(textBtnSetting);

    let useColorSetting = getUseColorSetting();
    const [useColor, setUseColor] = useState(useColorSetting);

    const setView = (view) => {
        let obj = {}
        obj[VIEW.name] = view;
        Settings.set(obj)
        setViewStyle(view);
        props.onViewChange(view);
    }

    const setFoldersView = (view) => {
        let obj = {}
        obj[FOLDERS_VIEW.name] = view;
        Settings.set(obj)
        setFoldersViewStyle(view);
        props.onFoldersViewChange(view);
    }

    const setLanguage = (lang) => {
        let obj = {}
        obj[LANGUAGE.name] = lang;
        Settings.set(obj)
        setLang(lang);
        props.onLanguageChange(lang);
    }

    const setUseColorHandler = (use) => {
        let obj = {}
        obj[USE_COLOR.name] = use;
        Settings.set(obj)
        setUseColor(use);
        props.onFolderColorChange(use);
    }

    const setTextBtnHandler = (tb) => {
        let obj = {}
        obj[TEXT_BUTTON.name] = tb;
        Settings.set(obj)
        setTextBtn(tb);
        props.onTextBtnChange(tb);
    }

    const setEditTitleHandler = (tb) => {
        let obj = {}
        obj[EDIT_TITLE.name] = tb;
        Settings.set(obj)
        setTextBtn(tb);
    }


    const backup = () => {
        setBackupProgress(0);
        FileSystem.main.getRootFolders().then(rootFolders => FileSystem.main.getFoldersDeep(rootFolders).then(allFolders => {
            trace("all folders", allFolders);

            FileSystem.main.exportAllWorksheets(allFolders, (percent) => setBackupProgress(percent))
                .then((backupZipPath) => {
                    const shareOptions = {
                        title: translate("ShareWithTitle"),
                        subject: translate("ShareEmailSubject"),
                        urls: [backupZipPath],
                    };
                    Share.open(shareOptions).then(() => {
                        Alert.alert(translate("BackupSuccessful"));
                    }).catch(err => {
                        Alert.alert(translate("ActionCancelled"));
                    });
                })
                .catch((err) => Alert.alert("Backup failed: " + err))
                .finally(() => setBackupProgress(undefined));
        }))
    }

    return <TouchableOpacity onPress={props.onClose} style={{
        position: 'absolute',
        zIndex: 100, top: 0, width: '100%', height: '100%'
    }}>

        {backupProgress !== undefined && <View style={{
            position: 'absolute', width: "100%", height: '100%', top: 0,
            zIndex: 1000, alignItems: "center", justifyContent: "center"
        }}>
            <ProgressCircle
                radius={100}
                color="#3399FF"
                shadowColor="#999"
                bgColor="white"
                percent={backupProgress}
                borderWidth={5} >
            </ProgressCircle>
        </View>}

        <FadeInView
            duration={500}
            width={300}
            style={[{
                zIndex: 101, position: 'absolute', height: '100%',

                backgroundColor: 'white', borderColor: 'gray', borderWidth: 1
            }, isRTL() ? { right: 0 } : { left: 0 }]}>
            <Spacer />

            <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: row }}>
                    <Spacer />
                    <Icon name={'close'} onPress={props.onClose} size={30} />
                </View>
                <Spacer />
                <AppText style={styles.SettingsHeaderText}>{translate("Settings")}</AppText>
            </View>
            <ScrollView style={{
                flex: 1,
                position: 'absolute', top: '10%',
                width: '100%', height: '90%'
            }}
            >
                <TouchableOpacity activeOpacity={1} style={{ alignItems: flexEnd }} >
                    <TouchableOpacity onPress={props.onAbout} style={{ flexDirection: row, paddingRight: 25 }}>

                        <AppText style={{ fontSize: 25 }}>{translate("About")}</AppText>
                        <Spacer />
                        <Icon name={'info'} size={35} color={semanticColors.titleText} />
                    </TouchableOpacity>
                    {getGroup(props, translate("Language") + ":", [
                        /*{
                            icon: getSvgIcon('lang-system', 45), selected: langSetting == LANGUAGE.default,
                            callback: () => setLanguage(LANGUAGE.default)
                        },*/
                        {
                            icon: <AppText style={{ fontSize: 25 }}>עברית</AppText>,
                            //getSvgIcon('lang-he', 45), 
                            selected: langSetting == LANGUAGE.hebrew,
                            callback: () => setLanguage(LANGUAGE.hebrew)
                        },
                        {
                            icon: <AppText style={{ fontSize: 25 }}>عربيه</AppText>,
                            //getSvgIcon('lang-ar', 45), 
                            selected: langSetting == LANGUAGE.arabic,
                            callback: () => setLanguage(LANGUAGE.arabic)
                        },
                        {
                            icon: <AppText style={{ fontSize: 25 }}>English</AppText>,
                            selected: langSetting == LANGUAGE.english,
                            callback: () => setLanguage(LANGUAGE.english)
                        }
                    ])}

                    {getGroup(props, translate("FoldersDisplay") + ":", [
                        {
                            icon: getIcon('view-column', 45), selected: foldersViewStyle == FOLDERS_VIEW.column,
                            callback: () => setFoldersView(FOLDERS_VIEW.column)
                        },
                        {
                            icon: getIcon('account-tree', 45), selected: foldersViewStyle == FOLDERS_VIEW.tree,
                            callback: () => setFoldersView(FOLDERS_VIEW.tree)
                        },

                    ])}

                    {getGroup(props, translate("Display") + ":", [
                        {
                            icon: getIcon('view-list', 45), selected: viewStyleSetting == VIEW.list,
                            callback: () => setView(VIEW.list)
                        },
                        {
                            icon: getIcon('view-module', 45), selected: viewStyleSetting == VIEW.tiles,
                            callback: () => setView(VIEW.tiles)
                        },

                    ])}


                    {getGroup(props, translate("TextInButtons") + ":", [
                        {
                            icon: getButtonWithText(), selected: textBtnSetting === TEXT_BUTTON.yes,
                            callback: () => setTextBtnHandler(TEXT_BUTTON.yes)
                        },
                        {
                            icon: getButtonWithoutText(), selected: textBtnSetting === TEXT_BUTTON.no,
                            callback: () => setTextBtnHandler(TEXT_BUTTON.no)
                        }
                    ])}

                    {getCheckbox(translate("AllowEditTitle"),
                        () => {
                            let newValue = editTitle == EDIT_TITLE.yes ? EDIT_TITLE.no : EDIT_TITLE.yes;
                            setEditTitle(newValue);
                            setEditTitleHandler(newValue)
                        },
                        editTitle == EDIT_TITLE.yes)}


                    <View
                        style={{
                            width: "100%",
                            marginTop: 4,
                            borderBottomColor: 'gray',
                            borderBottomWidth: 1,
                        }}
                    />
                    <View style={{ width: '100%', paddingTop: 25, paddingRight: 25, alignItems: getFlexEnd() }}>
                        {getRoundedButton(backup, undefined, translate("BackupBtn"), 30, 30, { width: 250, height: 40 }, row, true)}
                    </View>


                    {
                        /*getGroup(props, translate("FolderColors") + ":", [
                            {
                                icon: getIcon("folder", 35, 'red'), selected: useColorSetting === USE_COLOR.yes,
                                callback: () => setUseColorHandler(USE_COLOR.yes)
                            },
                            {
                                icon: getIcon("folder", 35, 'gray'), selected: useColorSetting === USE_COLOR.no,
                                callback: () => setUseColorHandler(USE_COLOR.no)
                            }
                        ])*/
                    }
                </TouchableOpacity>
            </ScrollView>

        </FadeInView>
    </TouchableOpacity>
}

function getButtonWithText() {
    return getRoundedButtonInt(this.OK, 'check-green', translate("BtnSave"), 30, 30, { width: 150, height: 40 })
}

function getButtonWithoutText() {
    return getRoundedButtonInt(this.OK, 'check-green', "", 30, 30, { width: 40, height: 40 })
}

function getGroup(props, name, items) {
    return <View style={{ width: '100%', paddingTop: 25, paddingRight: 25, alignItems: getFlexEnd() }}>
        <AppText style={styles.SettingsHeaderText}>{name}</AppText>

        {items.map((item, index) =>
            <TouchableOpacity
                key={index}
                style={{ flexDirection: getRowDirection(), paddingRight: 35, paddingTop: 15, alignItems: 'center' }}
                onPress={item.callback}
            >
                {item.icon}
                <Spacer />
                <View style={styles.circle}>
                    {item.selected && <View style={styles.checkedCircle} />}
                </View>
            </TouchableOpacity>
        )}

    </View>
}

function getCheckbox(name, callback, selected) {
    return <View style={{
        width: '100%', paddingTop: 25,
        paddingRight: 25, alignItems: getFlexEnd()
    }}>
        <TouchableOpacity
            style={{ flexDirection: getRowReverseDirection(), paddingRight: 35, paddingTop: 15, alignItems: 'center' }}
            onPress={callback}
        >
            <Spacer />
            <View style={styles.circle}>
                {selected && <View style={styles.checkedCircle} />}
            </View>
            <AppText style={styles.SettingsHeaderText}>{name}</AppText>
        </TouchableOpacity>
    </View>
}


const styles = StyleSheet.create({
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    circle: {
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ACACAC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkedCircle: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#979797',
    },
    SettingsHeaderText: {
        fontSize: 27,
        color: semanticColors.titleText,
        fontWeight: 'bold',
        paddingRight: 10,
        paddingLeft: 10
    },
    radioText: {
        fontSize: 25,
        color: semanticColors.titleText
    }
})