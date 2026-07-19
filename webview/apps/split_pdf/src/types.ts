export type Row = {
  id: number;
  pages: string;
  outputName: string;
  outputNameEdited: boolean;
};

export type InputKind = 'pages' | 'outputName';
export type PreviewMode = 'focused' | 'all';
