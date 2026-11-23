import { trace } from "./log"
import { Settings } from "./new-settings"

export const VIEW = {
    name: 'viewStyle',
    list: 1,
    tiles: 2
}

export const FOLDERS_VIEW = {
    name: 'foldersViewStyle',
    column: 1,
    tree: 2
}


export const LANGUAGE = {
    name: 'language',
    default: 1,
    hebrew: 2,
    arabic: 3,
    english: 4
}

export const FEATURES = {
    name: 'features',
    ruler: 1,
    marker: 2,
    table: 3,
    image: 4,
    voice: 5,
    cut: 6,
    fill: 7,
}

// Features built but not yet released. Remove an entry to ship that feature.
export const UNRELEASED_FEATURES = [];

export function isFeatureReleased(feature) {
    return !UNRELEASED_FEATURES.includes(feature);
}


export const USE_COLOR = {
    name: 'useColor',
    yes: 1,
    no: 2
}
export const TEXT_BUTTON = {
    name: 'textButtons',
    yes: 1,
    no: 2
}

export const EDIT_TITLE = {
    name: 'editTitle',
    yes: 1,
    no: 2
}

export const SCROLL_BUTTONS = {
    name: 'scrollButtons',
    yes: 1,
    no: 2
}

export const KB_TOOLBAR = {
    name: 'kbToolbar',
    yes: 1,
    no: 2
}

export const KB_TEXT_TOOLS = {
    name: 'kbTextTools',
    yes: 1,
    no: 2
}

export const KB_SPEAK_DICTATE = {
    name: 'kbSpeakDictate',
    yes: 1,
    no: 2
}

export const SPEAK_DICTATE_MODE = {
    name: 'speakDictateMode',
    floating: 1,
    toolbar: 2
}

export const SPEECH_RATE = {
    name: 'speechRate',
    default: 0.5
}

export const LAST_COLORS = {
    name: 'lastColors',
    max: 4
}

export function getUseColorSetting() {
    return getSetting(USE_COLOR.name, USE_COLOR.yes);
}

export function getFeaturesSetting() {
    const features = getSetting(FEATURES.name)
    if (features && Array.isArray(features)) return features;
    return [FEATURES.image, FEATURES.marker, FEATURES.ruler, FEATURES.table, FEATURES.voice, FEATURES.cut, FEATURES.fill];
}

export function getUseTextSetting() {
    return getSetting(TEXT_BUTTON.name, TEXT_BUTTON.yes) === TEXT_BUTTON.yes;
}

export function getSpeechRateSetting() {
    const rate = getSetting(SPEECH_RATE.name, SPEECH_RATE.default);
    return typeof rate === 'number' ? rate : SPEECH_RATE.default;
}

export function getSetting(name, def) {
    let setting = Settings.get(name);
    if (isSettingEmpty(setting)) {
        setting = def;
    }
    return setting;
}

export function isSettingEmpty(val) {
    return val == undefined || val == null;
}

// Text styling: the bar next to the text being edited (it replaced the keyboard's text tools, and keeps their setting)
export function textStylingOn() {
    return getSetting(KB_TEXT_TOOLS.name, KB_TEXT_TOOLS.no) === KB_TEXT_TOOLS.yes;
}
