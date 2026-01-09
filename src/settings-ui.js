import React, { useEffect, useRef, useState } from 'react';
import { getRoundedButton } from "./elements"
import {
    View, Alert, Text, TouchableOpacity, StyleSheet,
    ScrollView, TextInput, Modal, ActivityIndicator
} from 'react-native';
import { Settings } from "./new-settings"
import {
    semanticColors,
    getIcon, Spacer,
    getRoundedButtonInt,
    AppText
} from './elements'
import Share from 'react-native-share';
import * as Progress from 'react-native-progress';


import FadeInView from './FadeInView'
import { isRTL, translate } from './lang';

import {
    VIEW, EDIT_TITLE, LANGUAGE, TEXT_BUTTON,
    getSetting, getUseColorSetting, FOLDERS_VIEW,
    getFeaturesSetting,
    FEATURES,
    SCROLL_BUTTONS
} from './settings'
import { FileSystem } from './filesystem';
import { trace } from './log';
import { MyIcon } from './common/icons';
import { analyticEvent, categorizeCount, LocalAnalyticEvent } from './common/firebase';
import { AnalyticEvent, FeedbackDialog } from '@beitissieshapiro/issie-shared';


export default function SettingsMenu(props) {
    const [backupProgress, setBackupProgress] = useState(undefined);
    const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

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

    let scrollButtonsSetting = getSetting(SCROLL_BUTTONS.name, SCROLL_BUTTONS.yes);
    const [scrollButtons, setScrollButtons] = useState(scrollButtonsSetting);


    let useColorSetting = getUseColorSetting();
    const [useColor, setUseColor] = useState(useColorSetting);

    let _features = getFeaturesSetting();
    //trace("features", _features)
    const [features, setFeatures] = useState(_features);
    const featuresRef = useRef(_features);


    useEffect(() => {
        analyticEvent(AnalyticEvent.settings_open);
    }, [])

    useEffect(() => {
        featuresRef.current = features;
    }, [features]);

    const setView = (view) => {
        let obj = {}
        obj[VIEW.name] = view;
        Settings.set(obj)
        setViewStyle(view);
        props.onViewChange(view);

        analyticEvent(LocalAnalyticEvent.view_mode_changed, {
            view_mode: view === VIEW.list ? 'list' : 'tiles'
        });
    }

    const setFoldersView = (view) => {
        let obj = {}
        obj[FOLDERS_VIEW.name] = view;
        Settings.set(obj)
        setFoldersViewStyle(view);
        props.onFoldersViewChange(view);

        analyticEvent(LocalAnalyticEvent.folder_mode_change, {
            view_mode: view === FOLDERS_VIEW.tree ? 'tree' : 'column'
        });
    }

    const setLanguage = (lang) => {
        const langMap = {
            [LANGUAGE.hebrew]: 'he',
            [LANGUAGE.arabic]: 'ar',
            [LANGUAGE.english]: 'en',
            [LANGUAGE.default]: 'system'
        };

        let obj = {}
        obj[LANGUAGE.name] = lang;
        Settings.set(obj)
        setLang(lang);
        props.onLanguageChange(lang);

        analyticEvent(AnalyticEvent.language_changed, {
            to_language: langMap[lang] || 'unknown'
        });
    }
    const flipFeatureTougle = (feature) => {
        //Settings.set({ [FEATURES.name]: [] });return
        const item = featuresRef.current.find(f => f == feature);
        let newList = [...featuresRef.current];
        const enabled = item === undefined;

        if (enabled) {
            newList.push(feature);
            console.log("feature", feature, "on")
        } else {
            newList = newList.filter(f => f != feature)
            console.log("feature", feature, "off", newList)
        }
        setFeatures(newList);
        Settings.set({ [FEATURES.name]: newList })

        props.onFeaturesChange?.();

        analyticEvent(LocalAnalyticEvent.feature_toggled, {
            feature_name: feature,
            enabled
        });
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

    const setScrollButtonsHandler = (tb) => {
        let obj = {}
        obj[SCROLL_BUTTONS.name] = tb;
        Settings.set(obj)
        setScrollButtons(tb);
    }


    const backup = () => {
        analyticEvent(AnalyticEvent.backup_created);
        setBackupProgress(0);
        FileSystem.main.getRootFolders().then(rootFolders => FileSystem.main.getFoldersDeep(rootFolders).then(allFolders => {
            trace("all folders", allFolders);

            const folderCount = allFolders.length;
            const fileCount = allFolders.reduce((sum, folder) => sum + (folder.items?.length || 0), 0);

            FileSystem.main.exportAllWorksheets(allFolders, (percent) => setBackupProgress(percent))
                .then((backupZipPath) => {
                    analyticEvent(AnalyticEvent.backup_created, {
                        folder_count_category: categorizeCount(folderCount),
                        file_count_category: categorizeCount(fileCount)
                    });

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
            .finally(() => setBackupProgress(undefined));
    }

    const handleClose = () => {
        analyticEvent(AnalyticEvent.settings_close);
        props.onClose();
    }

    return <TouchableOpacity onPress={handleClose} style={{
        position: 'absolute',
        zIndex: 100, top: 0, width: '100%', height: '100%'
    }}>

        {backupProgress != null && <View style={{
            position: 'absolute', width: "100%", height: '100%', top: 0,
            zIndex: 1000, alignItems: "center", justifyContent: "center"
        }}>
            <AppText>{translate("BackupInProgress")}</AppText>
            <Progress.Bar
                radius={100}
                width={props.windowSize.width * .6}
                style={[isRTL() && { transform: [{ scaleX: -1 }] }]}
                progress={backupProgress}
            />

        </View>}

        <FadeInView

            duration={500}
            width={300}
            style={[{
                direction: isRTL() ? "rtl" : "ltr",
                zIndex: 101, position: 'absolute', height: '100%',

                backgroundColor: 'white', borderColor: 'gray', borderWidth: 1
            }, isRTL() ? { right: 0 } : { left: 0 }]}>
            <Spacer />

            <View style={{ flexDirection: "row-reverse", justifyContent: 'space-between', alignItems: 'center' }}>
                <MyIcon info={{ name: "close", size: 30 }} onPress={props.onClose} style={{ marginEnd: 10 }} />
                <AppText style={styles.SettingsHeaderText}>{translate("Settings")}</AppText>
            </View>
            <ScrollView style={{
                flex: 1,
                position: 'absolute', top: '10%',
                width: '100%', height: '90%'
            }}
            >
                <TouchableOpacity activeOpacity={1} style={{ alignItems: "flex-start" }} >
                    <TouchableOpacity onPress={props.onAbout} style={{ flexDirection: "row-reverse", paddingStart: 25 }}>
                        <AppText style={{ fontSize: 25 }}>{translate("About")}</AppText>
                        <Spacer />
                        <MyIcon info={{ name: "info", size: 35, color: semanticColors.titleText }} />
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

                    {getCheckbox(translate("ShowScrollButtons"),
                        () => {
                            let newValue = scrollButtons == SCROLL_BUTTONS.yes ? SCROLL_BUTTONS.no : SCROLL_BUTTONS.yes;
                            setScrollButtons(newValue);
                            setScrollButtonsHandler(newValue)
                        },
                        scrollButtons == SCROLL_BUTTONS.yes)}


                    {getCheckbox(translate("AllowEditTitle"),
                        () => {
                            let newValue = editTitle == EDIT_TITLE.yes ? EDIT_TITLE.no : EDIT_TITLE.yes;
                            setEditTitle(newValue);
                            setEditTitleHandler(newValue)
                        },
                        editTitle == EDIT_TITLE.yes)}


                    {/** Feature toggles */}
                    {getGroup(props, translate("ToolsSettings") + ":", [
                        {
                            icon: <AppText style={{ fontSize: 25 }}>{translate("Ruler")}</AppText>,
                            callback: () => { flipFeatureTougle(FEATURES.ruler) },
                            selected: features?.includes(FEATURES.ruler)
                        },
                        {
                            icon: <AppText style={{ fontSize: 25 }}>{translate("Marker")}</AppText>,
                            callback: () => { flipFeatureTougle(FEATURES.marker) },
                            selected: features?.includes(FEATURES.marker)
                        },
                        {
                            icon: <AppText style={{ fontSize: 25 }}>{translate("Image")}</AppText>,
                            callback: () => { flipFeatureTougle(FEATURES.image) },
                            selected: features?.includes(FEATURES.image)
                        },
                        {
                            icon: <AppText style={{ fontSize: 25 }}>{translate("Table")}</AppText>,
                            callback: () => { flipFeatureTougle(FEATURES.table) },
                            selected: features?.includes(FEATURES.table)
                        },
                        {
                            icon: <AppText style={{ fontSize: 25 }}>{translate("Voice")}</AppText>,
                            callback: () => { flipFeatureTougle(FEATURES.voice) },
                            selected: features?.includes(FEATURES.voice)
                        }
                    ], true)}

                    <View
                        style={{
                            width: "100%",
                            marginTop: 4,
                            borderBottomColor: 'gray',
                            borderBottomWidth: 1,
                        }}
                    />
                    <View style={{ width: '100%', paddingTop: 25, paddingStart: 25 }}>
                        {getRoundedButton(backup, undefined, translate("BackupBtn"), 30, 30, { width: 250, height: 40 }, "row", true, false, true)}
                    </View>

                    <View
                        style={{
                            width: "100%",
                            marginTop: 15,
                            borderBottomColor: 'gray',
                            borderBottomWidth: 1,
                        }}
                    />

                    <View style={{ width: '100%', paddingTop: 25, paddingStart: 25 }}>
                        {getRoundedButton(() => setShowFeedbackDialog(true), undefined, translate("UserFeedback"), 30, 30, { width: 250, height: 40 }, "row", true, false, true)}
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

        <FeedbackDialog
            appName='IssieDocs'
            visible={showFeedbackDialog}
            onClose={() => setShowFeedbackDialog(false)}
        />
    </TouchableOpacity>
}

function getButtonWithText() {
    return getRoundedButtonInt(() => { }, 'check-green', translate("BtnSave"), 30, 30, { width: 150, height: 40 })
}

function getButtonWithoutText() {
    return getRoundedButtonInt(() => { }, 'check-green', "", 30, 30, { width: 40, height: 40 })
}

function getGroup(props, name, items, isCheckboxes) {

    return <View style={{ width: '100%', paddingTop: 25, paddingStart: 25, alignItems: "flex-start" }}>
        <AppText style={styles.SettingsHeaderText}>{name}</AppText>

        {items.map((item, index) =>
            <TouchableOpacity
                key={index}
                style={{ flexDirection: "row-reverse", paddingStart: 35, paddingTop: 15, alignItems: 'center' }}
                onPress={item.callback}
            >
                {item.icon}
                <Spacer />
                <View style={isCheckboxes ? styles.box : styles.circle}>
                    {item.selected && <View style={isCheckboxes ? styles.checkedBox : styles.checkedCircle} />}
                </View>
            </TouchableOpacity>
        )}

    </View>
}

function getCheckbox(name, callback, selected) {
    return <View style={{
        width: '100%', paddingTop: 25,
        paddingStart: 15, alignItems: "flex-start"
    }}>
        <TouchableOpacity
            style={{ flexDirection: "row", paddingStart: 0, paddingTop: 15, alignItems: 'center' }}
            onPress={callback}
        >
            <Spacer />
            <View style={styles.box}>
                {selected && <View style={styles.checkedBox} />}
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
    box: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: '#ACACAC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkedBox: {
        width: 14,
        height: 14,
        backgroundColor: '#979797',
    },
    SettingsHeaderText: {
        fontSize: 25,
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
