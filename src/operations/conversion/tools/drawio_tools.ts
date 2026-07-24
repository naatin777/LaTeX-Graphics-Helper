export type RunDrawio = (executable: string, args: string[], signal?: AbortSignal) => Promise<void>;

export interface DrawioTools {
  drawioPath: string;
  runDrawio?: RunDrawio;
}
