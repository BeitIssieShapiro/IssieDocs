//import * as RNLocalize from "react-native-localize";

export var gCurrentLang = {languageTag: "he", isRTL: true}
const DEFAULT_LANG = "he";

var strings = {
    "he": {
        "DefaultAppTitle":"{1} - שולחן העבודה שלי",
        "MissingFolderName":"חובה להזין שם תיקיה",
        "SaveFolderWithEmptyNameQuestion":"שמירת תיקייה ללא שם?",
        "MissingPageName":"חובה להזין שם לדף",
        "IllegalCharacterInFolderName":"שם תיקיה מכיל תווים לא חוקיים",
        "IllegalCharacterInPageName":"שם הקובץ מכיל תווים לא חוקיים",
        "FolderAlreadyExists": "תיקיה בשם זה כבר קיימת",
        "ShareSuccessful":"שיתוף הסתיים בהצלחה",
        "ActionCancelled":"הפעולה בוטלה",
        "PDFLoadFailed":"טעינת PDF נכשלה",
        "DefaultFolderLanguage": "ללא נושא",

        "DeletePageTitle":"מחיקת דף",
        "DeleteFolderTitle":"מחיקת תיקייה",
        "BeforeDeletePageQuestion":"האם למחוק את הדף?",
        "DeleteFoldersAndPagesTitle":"מחיקת תיקיות ודפים",
        "BeforeDeleteFolderQuestion":"מחיקת תיקייה תגרום למחיקת כל הדפים בתוכה, האם למחוק?",
        "BeforeDeleteFoldersAndPagesQuestion":"נבחרה מחיקת דפים ותיקיות. מחיקת התיקיות תמחק את כל הדפים בתוכן. האם להמשיך?",

        "NoPagesYet":"אין עדיין דפים",
        "NoFoldersYet":"אין עדיין תיקיות",

        //buttons
        "A":"א",
        "A B C":"א ב ג",

        "Menu":"תפריט",
        "Display":"תצוגה",
        "Warning":"אזהרה",
        "BtnContinue":"המשך",
        "BtnCancel":"בטל",
    },
    "ar": {
        "SHALOM":"أهلاً بالعالم"
    }

}
var currStrings = strings[DEFAULT_LANG];


export function registerLangEvent() {
    //RNLocalize.addEventListener("change", initLanguage);

}

export function unregisterLangEvent() {
    //RNLocalize.removeEventListener("change", initLanguage)
}

function initLanguage() {
    //gCurrentLang = RNLocalize.findBestAvailableLanguage(["he", "en-US", "en", "ar"])
    currStrings = strings[gCurrentLang.languageTag];
    if (!currStrings) {
        //remove the specifics
        let tag = gCurrentLang.languageTag.split("-");
        if (tag.length == 2) {
            currStrings = strings[tag[0]];
        }
        //default
        if (!currStrings) {
            currStrings = strings[DEFAULT_LANG];
        }
    }
}

function isRTL() {
    return gCurrentLang.isRTL();
}

export function translate(id, ...args) {
    let s = currStrings[id];
    if (!s) {
        //not found, defaults to hebrew
        s = strings[DEFAULT_LANG][id];
        if (!s) {
            s = id;
        }
    }

    return "." + s;
}

export function fTranslate(id, ...args) {
    return replaceArgs(translate(id), args);
}

function replaceArgs(s, args) {
    return s.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number-1] != 'undefined'
            ? args[number-1] 
            : match
        ;
    });
}