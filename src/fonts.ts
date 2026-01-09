// Font Registry for IssieDocs
// This global variable can be updated to add new fonts as they become available

export interface FontInfo {
    name: string | undefined;
    displayName: string;
    preview: string;
    supportedStyles: ("italic" | "bold" | "underline")[];
    supportedLanguages:string[];
}

// https://alefalefalef.co.il/דנה-יד-פונט-חינמי/
// https://alefalefalef.co.il/גברת-לוין-פונט-כתב־יד-חינמי/



export const AVAILABLE_FONTS: FontInfo[] = [
    { name: undefined, displayName: 'ברירת מחדל', preview: "DefaultFont", supportedStyles: ["underline", "bold", "italic"], supportedLanguages:["en", "he", "ar"] },
    { name: "DanaYadAlefAlefAlef-Normal", displayName: 'כתב יד', preview: 'אב' , supportedStyles:["underline"], supportedLanguages:["he"]},
    { name: "Molhim", displayName: 'Molhim', preview: 'أب' , supportedStyles:["underline"], supportedLanguages:["ar"]},
    { name: "Satisfy", displayName: 'Satisfy', preview: 'Ab' , supportedStyles:["underline"], supportedLanguages:["en"]},
    { name: "Schoolbell", displayName: 'Schoolbell', preview: 'Ab' , supportedStyles:["underline"], supportedLanguages:["en"]},
];
