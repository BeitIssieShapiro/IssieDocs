import { ElementTypes } from "./canvas/types";

export type RootStackParamList = {
    EditPhoto: {
        page: any;
        pageIndex?: number;
        folder: string;
        share: boolean;
        goHome: () => void;
        goHomeAndThenToEdit: (path: string, pageIndex: number) => void;
    },
    SavePhoto: {
        uri: string;
        isBlank: boolean;
        imageSource: string;
        addToExistingPage?: any;
        goHomeAndThenToEdit?: any;
        pageIndex?: number;
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
