// Font Registry for IssieDocs
// This global variable can be updated to add new fonts as they become available

export interface FontInfo {
    name: string | undefined;
    displayName: string;
    preview: string;
}

// https://alefalefalef.co.il/דנה-יד-פונט-חינמי/
// https://alefalefalef.co.il/גברת-לוין-פונט-כתב־יד-חינמי/



export const AVAILABLE_FONTS: FontInfo[] = [
    { name: undefined, displayName: 'ברירת מחדל', preview: 'אב Ab أب' },
    { name: "DanaYadAlefAlefAlef-Normal", displayName: 'כתב יד', preview: 'אב' },
    { name: "Molhim", displayName: 'Molhim', preview: 'أب'  },
    { name: "Satisfy", displayName: 'Satisfy', preview: 'Ab'  },
    { name: "Schoolbell", displayName: 'Schoolbell', preview: 'Ab'  },
];
