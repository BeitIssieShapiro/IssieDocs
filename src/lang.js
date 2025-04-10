import { getLocales } from "react-native-localize";
import { Alert } from "react-native";
import { isSettingEmpty, LANGUAGE } from "./settings";
import { isSimulator } from "./device";
import { trace } from "./log";
import { Settings } from "./new-settings"
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

        "DeletePageTitle": "מחיקת דף עבודה",
        "DeleteFolderTitle": "מחיקת תיקייה",
        "BeforeDeletePageQuestion": "האם למחוק את דף העבודה?",
        "BeforeDeleteSubPageTitle": "מחיקת עמוד",
        "BeforeDeleteSubPageMenu": "מחיקת עמוד {1} מתוך {2}",
        "BeforeDeleteSubPageQuestion": "האם למחוק עמוד נוכחי?",
        "DeleteImageTitle": "מחיקת תמונה",
        "BeforeDeleteImageQuestion": "האם למחוק את התמונה מהעמוד?",

        "DeleteFoldersAndPagesTitle": "מחיקת תיקיות ודפי עבודה",
        "BeforeDeleteFolderQuestion": "מחיקת תיקייה תגרום למחיקת כל דפי העבודה בתוכה, האם למחוק?",
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

        "ImportQuestionTitle": "קבלת דף עבודה חדשה {1}",
        "BtnPreserveImportFolder": "שמירה לתיקיה {1}",
        "BtnIgnoreImportFolder": "שמירה לתיקיית הבית",

        "ImportSuccessful": "Worksheet {1} saved succesfully",
        "RestoreSuccessful": "Backup file {1} restored successfully",

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
        "Display": "תצוגת פריטים",
        "Language": "שפה",
        "AllowEditTitle": "עריכת כותרת",
        "TextInButtons": "עיצוב כפתורים",
        "FolderColors": "צבעי תיקיות",
        "Warning": "אזהרה",
        "BtnContinue": "המשך",
        "BtnCancel": "ביטול",
        "BtnOK": "אישור",
        "BtnNextPage": "הבא",
        "BtnPreviousPage": "הקודם",
        "BtnNewFolder": "תיקיה חדשה",
        "BtnAddPhoto": "בחר תמונה",
        "BtnAddPage": "דף נוסף",
        "BtnSave": "שמירה",
        "BtnShare": "שיתוף כקובץ PDF",
        "BtnShareIssieDocs": "שיתוף כדף עבודה",
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
        "InFolderCaption": "בתוך תיקיה",

        "ImportProgress": "מייבא עמוד {1} מתוך {2}",
        "ExportProgress": "מייצא עמוד {1} מתוך {2}",

        "ImportSuccessful": "דף עבודה {1} התקבל בהצלחה",
        "RestoreSuccessful": "קובץ גיבוי {1} שוחזר בהצלחה",

        //todo: translate
        "MissingCameraPermission": `לא ניתנה רשות לשימוש במצלמה לאפליקציה
        למתן רשות יש לגשת להגדרות -> פרטיות -> מצלמה, ולאפשר שימוש עבור IssieDocs`,
        "EditPhotoTitle": "עריכת תמונה",

        "ShowTableCaption": "הוספה",
        "DeleteTableCaption": "מחיקה",
        "Yes": "כן",
        "No": "לא",
        "RowsCaption": "שורות",
        "ColsCaption": "עמודות",

        "BackupTitle": "גיבוי",
        "BackupBtn": "גיבוי האפליקציה",

        "ErrMoveIntoTwoLevelFolder": "לא ניתן להעביר תיקיה לתוך תיקיה שבעצמה בתוך תיקיה",
        "ErrMoveFolderCOntainingFolders": "לא ניתן להעביר תיקיה שבעצמה מכילה תיקיות",
        "SuccessfulMoveFolderMsg": "תיקיה עברה בהצלחה ",
        "ErrorMoveFolder": "שגיאה בהעברת תיקיה",
        "FoldersDisplay": "תצוגת תיקיות",
        "ReachedEndOfPage": "הגעת לסוף הדף",
        "TableOverflowsPage": "הטבלה גולשת מעבר לסוף הדף",
        "FontChangeOverflowsPage": "שינוי גופן גורם לגלישה מעבר לסוף הדף",
        "BackupSuccessful": "גיבוי הסתיים בהצלחה",

        "ToolsSettings": "כלים",
        "Ruler": "סרגל",
        "Image": "תמונה",
        "Marker": "מדגש",
        "Voice": "הקלטה",
        "Table": "טבלה",

        "ExportPDFWithAudioTitle": "שיתוף פ.ד.פ",
        "ExportPDFWithAudioWarning": "שיתוף כקובץ פדפ לא יכלול הקלטות ולא יאפשר עריכה, כדי לאפשר עריכה יש לשתף כדף עבודה. האם להמשיך בכל זאת?",
        "DoNotAskAgain":"אל תשאל שוב",

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
        "BtnOK": "موافق",
        "BtnNextPage": "التالى",
        "BtnPreviousPage": "السابق",
        "BtnNewFolder": "مجلد جديد",
        "BtnAddPhoto": "اختر صورة",
        "BtnAddPage": "صفحة أخرى",
        "BtnSave": "حفظ",
        "BtnShare": "مشاركة كملف PDF",
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


        "ImportQuestionTitle": "استيراد صفحة عمل جديدة {1}",
        "BtnPreserveImportFolder": "حفظ في المجلد {1}",
        "BtnIgnoreImportFolder": "حفظ في المجلد الرئيسي",
        "ImportSuccessful": "تم استيراد صفحة العمل {1} بنجاح",
        "RestoreSuccessful": "تم استعادة ملف النسخ الاحتياطي {1} بنجاح",
        "BtnShareIssieDocs": "مشاركة كصفحة عمل",
        "InFolderCaption": "داخل مجلد",
        "ShowTableCaption": "إضافة",
        "DeleteTableCaption": "حذف",
        "Yes": "نعم",
        "No": "لا",
        "RowsCaption": "صفوف",
        "ColsCaption": "أعمدة",
        "BackupTitle": "نسخ احتياطي",
        "BackupBtn": "نسخ احتياطي للتطبيق",
        "ErrMoveIntoTwoLevelFolder": "لا يمكن نقل مجلد إلى مجلد داخل مجلد آخر",
        "ErrMoveFolderCOntainingFolders": "لا يمكن نقل مجلد يحتوي على مجلدات",
        "SuccessfulMoveFolderMsg": "تم نقل المجلد بنجاح",
        "ErrorMoveFolder": "خطأ في نقل المجلد",
        "FoldersDisplay": "عرض المجلدات",
        "ReachedEndOfPage": "وصلت إلى نهاية الصفحة",
        "TableOverflowsPage": "الجدول يتجاوز نهاية الصفحة",
        "FontChangeOverflowsPage": "تغيير الخط يتسبب في تجاوز الصفحة",
        "BackupSuccessful": "تم النسخ الاحتياطي بنجاح",
        "ToolsSettings": "أدوات",
        "Ruler": "خط مستقيم", // or "مسطرة رسم"
        "Image": "صورة",
        "Marker": "محدد",
        "Voice": "تسجيل",
        "Table": "جدول",
        "ExportPDFWithAudioTitle": "شارك كملف PDF",
        "ExportPDFWithAudioWarning": "مشاركة كملف PDF لن تتضمن التسجيلات ولن تسمح بالتعديل. للسماح بالتعديل، فكر في المشاركة كملف ورقي. هل تريد المتابعة على أي حال",
        "DoNotAskAgain":"لا تسأل مرة أخرى",
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
        "Display": "Items Display",
        "Language": "Language",
        "AllowEditTitle": "Edit Desktop name",
        "TextInButtons": "Button design",
        "FolderColors": "Folder colors",
        "Warning": "Warning",
        "BtnContinue": "Continue",
        "BtnCancel": "Cancel",
        "BtnOK": "OK",
        "BtnNextPage": "Next",
        "BtnPreviousPage": "Prev",
        "BtnNewFolder": "New folder",
        "BtnAddPhoto": "Add a photo",
        "BtnAddPage": "Add",
        "BtnSave": "Save",
        "BtnShare": "Share as PDF",
        "BtnShareIssieDocs": "Share as Worksheet",
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
        "InFolderCaption": "In Folder",

        "ImportProgress": "Import page {1} of {2}",
        "ExportProgress": "Export page {1} of {2}",

        "ImportQuestionTitle": "Recieve a New Worksheet: {1}",
        "BtnPreserveImportFolder": "Save into {1} folder",
        "BtnIgnoreImportFolder": "Save into Home folder",

        "ImportSuccessful": "Worksheet {1} saved succesfully",
        "RestoreSuccessful": "Backup file {1} restored successfully",


        "MissingCameraPermission": `Missing Permission to use Camera.
to allow, goto Settings->Privacy->Camera and allow IssieDocs`,

        "ShowTableCaption": "Add",
        "DeleteTableCaption": "Delete",
        "Yes": "Yes",
        "No": "No",
        "RowsCaption": "Rows",
        "ColsCaption": "Cols",
        "BackupTitle": "Backup",
        "BackupBtn": "Backup App",

        "ErrMoveIntoTwoLevelFolder": "Cannot move forder into a folder which is in another folder",
        "ErrMoveFolderCOntainingFolders": "Cannot move folder containing other folders into another folder",
        "SuccessfulMoveFolderMsg": "Successfully moved folder",
        "ErrorMoveFolder": "Error Moving Folder",
        "FoldersDisplay": "Folders Display",
        "ReachedEndOfPage": "Reached End of Page",
        "TableOverflowsPage": "The table overflows beyond the end of the page",
        "FontChangeOverflowsPage": "Font change cause text to overflow beyond the end of the page",
        "BackupSuccessful": "Backup successful",
        "ToolsSettings": "Tools",
        "Ruler": "Ruler",
        "Image": "Image",
        "Marker": "Marker",
        "Voice": "Recording",
        "Table": "Table",
        "ExportPDFWithAudioTitle": "Share as PDF",
        "ExportPDFWithAudioWarning": "Sharing as a PDF will not include recordings nor allow editing.\nTo allow editing consider sharing as a worksheet. Proceed anyway?",
        "DoNotAskAgain":"Do not ask again"
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

function findMissing() {
    let missing = ""
    //English
    console.log("Missing in English:")
    Object.entries(strings.he).forEach(([key, value]) => {
        if (!strings.en[key]) {
            missing += "\"" + key + "\":" + "\"" + value + "\",\n";
        }
    })
    console.log(missing);
    missing = "";
    console.log("\n\nMissing in Arabic:")
    Object.entries(strings.he).forEach(([key, value]) => {
        if (!strings.ar[key]) {
            missing += "\"" + key + "\":" + "\"" + value + "\",\n";
        }
    })
    console.log(missing);

    missing = "";
    console.log("\n\nMissing in Hebrew:")
    Object.entries(strings.en).forEach(([key, value]) => {
        if (!strings.he[key]) {
            missing += "\"" + key + "\":" + "\"" + value + "\",\n";
        }
    })
    console.log(missing);

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
    let langSetting = Settings.get(LANGUAGE.name);
    trace("langauge loaded", langSetting, langSetting + "" === LANGUAGE.default + "")
    if (isSettingEmpty(langSetting) || langSetting === LANGUAGE.default) {
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
    //findMissing();

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