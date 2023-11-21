import {getLocales} from "react-native-localize";
import { Alert, Settings } from "react-native";
import { LANGUAGE } from "./settings";
import { isSimulator } from "./device";
import { trace } from "./log";

export var gCurrentLang = { languageTag: "he", isRTL: true }
const DEFAULT_LANG = "he";
let gPrefix = "";


var strings = {
    "he": {
        "StartHere": "הוספת דפים",
        "DesktopEmpty": "שולחן העבודה ריק",
        "Loading": "טוען...",
        "DefaultAppTitle": "{1} - שולחן העבודה שלי",
        "MissingFolderName": "חובה להזין שם תיקיה",
        "SaveFolderWithEmptyNameQuestion": "שמירת תיקייה ללא שם?",
        "MissingPageName": "חובה להזין שם לדף",
        "IllegalCharacterInFolderName": "שם תיקיה מכיל תווים לא חוקיים",
        "IllegalCharacterInPageName": "שם הקובץ מכיל תווים לא חוקיים",
        "FolderAlreadyExists": "תיקיה בשם זה כבר קיימת",
        "PageAlreadyExists": "קובץ בשם זה כבר קיים",
        "ShareSuccessful": "שיתוף הסתיים בהצלחה",
        "ActionCancelled": "הפעולה בוטלה",
        "PDFLoadFailed": "טעינת PDF נכשלה",
        "DefaultFolder": "שולחן העבודה",
        "Search": "חפש",

        "DeletePageTitle": "מחיקת דף",
        "DeleteFolderTitle": "מחיקת תיקייה",
        "BeforeDeletePageQuestion": "האם למחוק את הדף?",
        "BeforeDeleteSubPageTitle": "מחיקת עמוד",
        "BeforeDeleteSubPageMenu": "מחיקת עמוד {1} מתוך {2}",
        "BeforeDeleteSubPageQuestion": "האם למחוק עמוד נוכחי?",
        "DeleteImageTitle": "מחיקת תמונה",
        "BeforeDeleteImageQuestion": "האם למחוק את התמונה מהעמוד?",

        "DeleteFoldersAndPagesTitle": "מחיקת תיקיות ודפים",
        "BeforeDeleteFolderQuestion": "מחיקת תיקייה תגרום למחיקת כל הדפים בתוכה, האם למחוק?",
        //"BeforeDeleteFoldersAndPagesQuestion": "נבחרה מחיקת דפים ותיקיות. מחיקת התיקיות תמחק את כל הדפים שבתוכן. האם להמשיך?",

        "SuccessfulMovePageMsg": "דף '{1}' עבר בהצלחה לתיקית '{2}'",
        "NoPagesYet": "התיקיה ריקה",
        "ChooseFolder": "בחר תיקיה",

        "SearchResults": "תוצאות חיפוש",
        "NoSearchResults": "לא נמצאו תיקיות או דפים המתאימים לחיפוש",

        "SavePageFormTitle": "שמירת דף",
        "RenameFormTitle": "שינוי שם",
        "DuplicatePageFormTitle": "שיכפול דף",
        "MovePageFormTitle": "העברת דף",

        "EditFolderFormTitle": "עריכת שם תיקיה",
        "NewFolderFormTitle": "יצירת תיקיה חדשה",
        "ShareWithTitle": "'שיתוף בעזרת...'",
        "ShareEmailSubject": "דף עבודה",

        "CameraTitle": "צילום דף עבודה",
        "MediaPickerTitle": "בחירת תמונה",

        //buttons
        "A": "א",
        "A B C": "אבג",

        "SortA": "א",
        "SortZ": "ת",
        "Menu": "תפריט",
        "Settings": "הגדרות",
        "About": "עלינו",
        "Display": "תצוגה",
        "Language": "שפה",
        "AllowEditTitle": "עריכת כותרת",
        "TextInButtons": "עיצוב כפתורים",
        "FolderColors": "צבעי תיקיות",
        "Warning": "אזהרה",
        "BtnContinue": "המשך",
        "BtnCancel": "ביטול",
        "BtnNextPage": "הבא",
        "BtnPreviousPage": "הקודם",
        "BtnNewFolder": "תיקיה חדשה",
        "BtnAddPhoto": "בחר תמונה",
        "BtnAddPage": "דף נוסף",
        "BtnSave": "שמירה",
        "BtnShare": "שיתוף",
        "BtnShareIssieDocs":"שיתוף עם איזידוקס",
        "BtnChangeName": "שינוי שם",
        "BtnDelete": "מחיקה",
        "BtnDuplicate": "שיכפול",
        "BtnMove": "העברה",
        "AddPageMenuTitle": "הוספת עמוד",
        "MenuFromCamera": "מצלמה",
        "MenuFromMediaLib": "ספריית התמונות",
        "MenuNewPageEmpty": "חלק",
        "MenuNewPageLines": "שורות",
        "MenuNewPageMath": "משבצות",
        "EmptyPageName": "דף חדש",

        "CaptionPageName": "שם הדף",
        "OrientationCaption": "כיוון",
        "CaptionFolderNameList": "תיקיה",
        "CaptionFolderNameInput": "שם התיקיה",
        "CaptionFolderColor": "צבע התיקיה",
        "NoIcon": "ללא",
        "CaptionIcon": "סמל",

        "ImportProgress": "מייבא עמוד {1} מתוך {2}",
        "ExportProgress": "מייצא עמוד {1} מתוך {2}",

        "ImportSuccessful":"דף עבודה {1} התקבל בהצלחה",

        //todo: translate
        "MissingCameraPermission": `לא ניתנה רשות לשימוש במצלמה לאפליקציה
        למתן רשות יש לגשת להגדרות -> פרטיות -> מצלמה, ולאפשר שימוש עבור IssieDocs`,
        "EditPhotoTitle": "עריכת תמונה",
    },
    "ar": {
        "StartHere": "إضافة صفحات",
        "DesktopEmpty": "التطبيق الرئيسي فارغ",
        "Loading": "جار التحميل...",
        "DefaultAppTitle": "{1} - التطبيق الرئيسي",
        "MissingFolderName": "يجب إدخال اسم مجلد",
        "SaveFolderWithEmptyNameQuestion": "حفظ مجلد بدون اسم؟",
        "MissingPageName": "يجب إدخال اسم الصفحة",
        "IllegalCharacterInFolderName": "يحتوي اسم المجلد على أحرف غير صالحة",
        "IllegalCharacterInPageName": "يحتوي اسم الملف على أحرف غير صالحة",
        "FolderAlreadyExists": "يوجد مجلد بهذا الاسم",
        "PageAlreadyExists": "ملف بهذا الاسم موجود",
        "ShareSuccessful": "انتهت المشاركة بنجاح",
        "ActionCancelled": "تم إلغاء الإجراء",
        "PDFLoadFailed": "فشل في تحميل ملف PDF",
        "DefaultFolder": "التطبيق الرئيسي", //verify
        "Search": "بحث",
        "SearchResults": "نتائج البحث",

        "NoSearchResults": "لم يتم العثور على مجلدات أو أوراق عمل بحسب عملية البحث",

        "DeletePageTitle": "حذف الصفحة",
        "DeleteFolderTitle": "حذف المجلد",
        "BeforeDeletePageQuestion": "حذف الصفحة؟",
        "BeforeDeleteSubPageTitle": "حذف الصفحة", //todo

        "BeforeDeleteSubPageMenu": "احذف الصفحة {1} من {2}",
        "BeforeDeleteSubPageQuestion": "حذف الصفحة؟", //todo
        "DeleteFoldersAndPagesTitle": "حذف المجلدات والعناوين",
        "BeforeDeleteFolderQuestion": "حذف المجلد سيؤدي إلى مسح جميع الصفحات داخله, وحذفه",
        //"BeforeDeleteFoldersAndPagesQuestion": "اختير حذف الصفحات والمجلدات. حذف المجلدات سيؤدي إلى حذف جميع الصفحات والمحتويات. هل تريد المتابعة؟",

        "DeleteImageTitle": "حذف صورة", //verify
        "BeforeDeleteImageQuestion": "هل أنت واثق?", //verify


        "SuccessfulMovePageMsg": "الصفحة '{1}' تم نقلها بنجاح إلى المجلد '{2}'", //verify

        "NoPagesYet": "المجلد فارغ",
        "ChooseFolder": "اختار مجلد",
        "SavePageFormTitle": "حفظ الصفحة",
        "RenameFormTitle": "تغيير العنوان",
        "DuplicatePageFormTitle": "صفحة مكررة",
        "MovePageFormTitle": "نقل الصفحة",

        "EditFolderFormTitle": "تحرير المجلد",
        "NewFolderFormTitle": "إنشاء مجلد جديد",
        "ShareWithTitle": "المشاركة مع ...",
        "ShareEmailSubject": "مشاركة البريد الإلكتروني",

        "CameraTitle": "تصوير ورقة العمل",
        "MediaPickerTitle": "تحديد الصورة",

        "A": "أ",
        "A B C": "أبج",

        "SortA": "أ",
        "SortZ": "ي",
        "Settings": "الإعدادات",
        "Menu": "القائمة",
        "Display": "العرض",
        "About": "عنا",
        "Language": "اللغة",
        "AllowEditTitle": "تحرير العنوان",
        "TextInButtons": "تصميم الأزرار",
        "CaptionFolderColor": "لون المجلد",
        "FolderColors": "ألوان المجلد",
        "Warning": "تحذير",
        "BtnContinue": "متابعة",
        "BtnCancel": "إلغاء",
        "BtnNextPage": "التالى",
        "BtnPreviousPage": "السابق",
        "BtnNewFolder": "مجلد جديد",
        "BtnAddPhoto": "اختر صورة",
        "BtnAddPage": "صفحة أخرى",
        "BtnSave": "حفظ",
        "BtnShare": "مشاركة",
        "BtnChangeName": "إعادة تسمية",
        "BtnDelete": "حذف",
        "BtnDuplicate": "تكرير",
        "BtnMove": "يتحرك", //todo check
        "AddPageMenuTitle": "صفحة أخرى", //todo check

        "MenuFromCamera": "الة تصوير",
        "MenuFromMediaLib": "مكتبة الصور",
        "MenuNewPageEmpty": "صفحة فارغة جديدة",
        "MenuNewPageLines": "صفحة مسطرة جديدة",
        "MenuNewPageMath": "صفحة مشبكة جديدة",
        "EmptyPageName": "صفحة جديدة",

        "CaptionPageName": "اسم الصفحة",
        "OrientationCaption": "الاتجاه",
        "CaptionFolderNameList": "مجلد",
        "CaptionFolderNameInput": "اسم المجلد",
        "NoIcon": "بلا",
        "CaptionIcon": "رمز",

        "ImportProgress": "استيراد الصفحة {1} من {2}",
        "ExportProgress": "تصدير الصفحة {1} من {2}",
        "MissingCameraPermission": `Missing Permission to use Camera.
to allow, goto Settings->Privacy->Camera and allow IssieDocs`,
        "EditPhotoTitle": "تعديل الصورة",
    },
    "en": {
        "StartHere": "Add worksheets",
        "DesktopEmpty": "Empty Desktop",
        "Loading": "Loading...",
        "DefaultAppTitle": "{1} - My Desktop",
        "MissingFolderName": "Missing folder name",
        "SaveFolderWithEmptyNameQuestion": "Save a folder without a name?",
        "MissingPageName": "Missing worksheet name",
        "IllegalCharacterInFolderName": "Folder name contains illigal characters",
        "IllegalCharacterInPageName": "Worksheet name contains illigal characters",
        "FolderAlreadyExists": "Folder with this name already exists",
        "PageAlreadyExists": "Worksheet with this name already exists",
        "ShareSuccessful": "Share successfully done",
        "ActionCancelled": "Action cancelled",
        "PDFLoadFailed": "PDF loading failed",
        "DefaultFolder": "Desktop",
        "Search": "Search",

        "EditPhotoTitle": "Edit Photo",

        "DeletePageTitle": "Delete Worksheet",
        "DeleteFolderTitle": "Delete Folder",
        "BeforeDeletePageQuestion": "Are you sure you want to delete the worksheet?",
        "BeforeDeleteSubPageMenu": "Delete page {1} of {2}",
        "BeforeDeleteSubPageTitle": "Delete Page",
        "BeforeDeleteSubPageQuestion": "Are you sure you want to delete the current page?",

        "DeleteImageTitle": "Delete Image",
        "BeforeDeleteImageQuestion": "Are you sure you want to delete the image?",

        "DeleteFoldersAndPagesTitle": "Delete folders and worksheet",
        "BeforeDeleteFolderQuestion": "Deleteing a folder will delete all worksheets in it, are you sure?",
        //"BeforeDeleteFoldersAndPagesQuestion": "Deleting folder and pages,",

        "SuccessfulMovePageMsg": "Page '{1}' successfuly moved to folder '{2}'",
        "NoPagesYet": "Empty folder",
        "ChooseFolder": "Choose a folder",

        "SearchResults": "Search results",
        "NoSearchResults": "No worksheets or folders were found",

        "SavePageFormTitle": "Save Worksheet",
        "RenameFormTitle": "Rename",
        "DuplicatePageFormTitle": "Duplicate Worksheet",
        "MovePageFormTitle": "Move Worksheet",

        "EditFolderFormTitle": "Edit Folder Name",
        "NewFolderFormTitle": "Create New Folder",
        "ShareWithTitle": "'Share with...'",
        "ShareEmailSubject": "Worksheet",

        "CameraTitle": "Take a photo",
        "MediaPickerTitle": "Choose a photo",

        //buttons
        "A": "A",
        "A B C": "ABC",

        "SortA": "a",
        "SortZ": "z",
        "Menu": "Menu",
        "Settings": "Settings",
        "About": "About",
        "Display": "Display",
        "Language": "Language",
        "AllowEditTitle": "Edit Desktop name",
        "TextInButtons": "Button design",
        "FolderColors": "Folder colors",
        "Warning": "Warning",
        "BtnContinue": "Continue",
        "BtnCancel": "Cancel",
        "BtnNextPage": "Next",
        "BtnPreviousPage": "Prev",
        "BtnNewFolder": "New folder",
        "BtnAddPhoto": "Add a photo",
        "BtnAddPage": "Add",
        "BtnSave": "Save",
        "BtnShare": "Share",
        "BtnChangeName": "Rename",
        "BtnDelete": "Delete",
        "BtnDuplicate": "Duplicate",
        "BtnMove": "Move",
        "AddPageMenuTitle": "Add Page",
        "MenuFromCamera": "Camera",
        "MenuFromMediaLib": "Camera roll",
        "MenuNewPageEmpty": "Blank",
        "MenuNewPageLines": "Lined",
        "MenuNewPageMath": "Grid",
        "EmptyPageName": "Empty page",

        "CaptionPageName": "Name",
        "OrientationCaption": "Orientation",
        "CaptionFolderNameList": "Folder",
        "CaptionFolderNameInput": "Folder Name",
        "CaptionFolderColor": "Folder Color",
        "NoIcon": "None",
        "CaptionIcon": "Icon",

        "ImportProgress": "Import page {1} of {2}",
        "ExportProgress": "Export page {1} of {2}",

        "MissingCameraPermission": `Missing Permission to use Camera.
to allow, goto Settings->Privacy->Camera and allow IssieDocs`,

    },
}

const foldersAndIcons = {
    "he_gib": [
        { icon: 'svg-math-course', text: 'חשבון' },
        { icon: 'svg-heb-course', text: 'עברית' },
        { icon: 'svg-eng-course', text: 'אנגלית' },
        { icon: 'svg-science-course', text: 'מדעים' },
        { icon: 'svg-torah-course', text: 'תורה' },
        { icon: 'svg-history-course', text: 'היסטוריה' },
        { icon: 'public', text: 'גיאוגרפיה' },
        { icon: 'music-note', text: 'מוזיקה' },
        { icon: 'svg-literature-course', text: 'ספרות' }
    ],
    "he": [
        { icon: 'svg-math-course', text: 'חשבון' },
        { icon: 'svg-heb-course', text: 'עברית' },
        { icon: 'svg-eng-course', text: 'אנגלית' },
        { icon: 'svg-science-course', text: 'מדעים' },
        { icon: 'svg-torah-course', text: 'תורה' },
        { icon: 'account-balance', text: 'היסטוריה' },
        { icon: 'public', text: 'גיאוגרפיה' },
        { icon: 'music-note', text: 'מוזיקה' },
        { icon: 'svg-history-course', text: 'ספרות' }
    ],
    "ar": [
        { icon: 'svg-math-course', text: 'حساب' },
        { icon: 'svg-arabic-course', text: 'عربي' },
        { icon: 'svg-eng-course', text: 'انجليزي' },
        { icon: 'svg-science-course', text: 'علوم' },
        { icon: 'svg-islam-course', text: 'دين' },
        { icon: 'svg-history-course', text: 'تاريخ' },
        { icon: 'public', text: 'جغرافيا' },
        { icon: 'music-note', text: 'موسيقى' },
        { icon: 'svg-literature-course', text: 'أدب' }
    ],
    "en": [ //todo list and icons
        { icon: 'svg-math-course', text: 'Math' },
        { icon: 'svg-eng-course', text: 'English' },
        { icon: 'svg-science-course', text: 'Science' },
        //{ icon: 'svg-religion-course', text: 'Religion' },
        { icon: 'svg-history-course', text: 'History' },
        { icon: 'public', text: 'Public' },
        { icon: 'music-note', text: 'Music' },
        { icon: 'svg-literature-course', text: 'Literature' }
    ]

}


let currStrings = strings[DEFAULT_LANG];


export function registerLangEvent() {
    //RNLocalize.addEventListener("change", loadLanguage);
    loadLanguage();

}

export function unregisterLangEvent() {
    RNLocalize.removeEventListener("change", loadLanguage)
}

export function loadLanguage() {
    let langSetting = Settings.get('language');
    if (langSetting === undefined || langSetting === LANGUAGE.default) {
        const locales = getLocales();
        langSetting = LANGUAGE.english;

        for (let i = 0; i < locales.length; i++) {
            if (locales[i].languageCode === "en") {
                langSetting = LANGUAGE.english;
                break;
            } else if (locales[i].languageCode === "he") {
                langSetting = LANGUAGE.hebrew;
                break;
            } else if (locales[i].languageCode === "ar") {
                langSetting = LANGUAGE.arabic;
                break;
            }
        }
    }

    switch (langSetting) {
        case LANGUAGE.hebrew:
            gCurrentLang = { languageTag: "he", isRTL: true }
            break;
        case LANGUAGE.arabic:
            gCurrentLang = { languageTag: "ar", isRTL: true }
            break;
        case LANGUAGE.english:
            gCurrentLang = { languageTag: "en", isRTL: false }
            break;
        default:
            gCurrentLang = { languageTag: "he", isRTL: true }
            break;

    }

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
    trace("Lang set to ", currStrings["A"])

    if (isSimulator()) {
        //gPrefix = "."
    }
}

export function isRTL() {
    return gCurrentLang.isRTL;
}

export function getRowDirection() {
    return isRTL() ? "row" : "row-reverse";
}

export function getRowReverseDirection() {
    return isRTL() ? "row-reverse" : "row";
}

export function getRowDirections() {
    return isRTL() ?
        {
            row: 'row', rowReverse: 'row-reverse', flexStart: 'flex-start',
            flexEnd: 'flex-end', textAlign: 'right', rtl: true, direction: 'rtl'
        } :
        {
            row: 'row-reverse', rowReverse: 'row', flexStart: 'flex-end',
            flexEnd: 'flex-start', textAlign: 'left', rtl: false, direction: 'ltr'
        };
}

export function getFlexStart() {
    return isRTL() ? "flex-start" : "flex-end";
}

export function getFlexEnd() {
    return isRTL() ? "flex-end" : "flex-start";
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

    return gPrefix + s;
}

export function fTranslate(id, ...args) {
    return replaceArgs(translate(id), args);
}

export function getLocalizedFoldersAndIcons() {
    let currFoldersAndIcon = foldersAndIcons[gCurrentLang.languageTag];
    if (!currFoldersAndIcon) {
        //remove the specifics
        //Alert.alert(gCurrentLang.languageTag)
        let tag = gCurrentLang.languageTag.split("-");
        if (tag.length == 2) {
            currFoldersAndIcon = foldersAndIcons[tag[0]];
        }
        //default
        if (!currFoldersAndIcon) {
            currFoldersAndIcon = strings[DEFAULT_LANG];
        }
    }
    return currFoldersAndIcon;
}

function replaceArgs(s, args) {
    return s.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number - 1] != 'undefined'
            ? args[number - 1]
            : match
            ;
    });
}