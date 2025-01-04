export type RootStackParamList = {
    EditPhoto: {
      page: any;
      pageIndex? :number;
      folder: string;
      share: boolean;
      goHome: () => void;
    };
    // Other routes...
  };


  export enum EditModes {
    Brush = "sketch",
    Text = "text",
    Ruler = "line",
    Image = "image",
    Table = "table",
    Marker = "marker",
    Audio = "audio",
    Voice = "voice",
}
