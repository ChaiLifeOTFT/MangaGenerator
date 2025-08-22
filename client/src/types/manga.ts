export interface MangaCharacter {
  name: string;
  role: string;
  age: string;
  appearance: string;
  costume: string;
  poses: string[];
  expressions: string[];
}

export interface StyleBible {
  setting: string;
  themes: string[];
  visual_motifs: string[];
  characters: MangaCharacter[];
}

export interface Panel {
  id: string;
  description: string;
  dialogue: string[];
  sfx: string[];
  notes: string;
}

export interface Page {
  number: number;
  panels: Panel[];
}

export interface MangaScript {
  title: string;
  style_bible: StyleBible;
  pages: Page[];
}

export interface GenerationSettings {
  chatModel: string;
  imageSize: string;
  useIllustratorPass: boolean;
  desiredPages: number;
}
