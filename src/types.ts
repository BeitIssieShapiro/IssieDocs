import { ElementTypes } from "./canvas/types";

export type RootStackParamList = {
    EditPhoto: {
        page: any;
        pageIndex?: number;
        folder: string;
        share: boolean;
        goHome: () => void;
        saveNewFolder:any,
        goHomeAndThenToEdit: (path: string, pageIndex: number) => void;
        returnFolderCallback:any;
    },
    SavePhoto: {
        sheet:any,
        folder:any,
        uri?: string;
        name?:string,
        isBlank?: boolean;
        imageSource: string;
        addToExistingPage?: any;
        goHomeAndThenToEdit?: any;
        pageIndex?: number;
        returnFolderCallback:any,
        saveNewFolder: any,
        title:string;
    };
    // Other routes...
};


export enum EditModes {
    Brush = ElementTypes.Sketch,
    Text = ElementTypes.Text,
    Ruler = ElementTypes.Line,
    Image = ElementTypes.Image,
    Table = ElementTypes.Table,
    Marker = "marker",
    Audio = "audio",
    Voice = "voice",
}
