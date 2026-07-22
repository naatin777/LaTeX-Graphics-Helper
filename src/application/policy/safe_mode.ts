export const SAFE_MODE_STATE_KEY = 'safeMode.enabled';

export interface StateStorage {
  get<T>(key: string, defaultValue?: T): T | undefined;
  update(key: string, value: unknown): Thenable<void>;
}

export class SafeModeState {
  constructor(private readonly storage: StateStorage) {}

  isEnabled(): boolean {
    return this.storage.get<boolean>(SAFE_MODE_STATE_KEY, true) ?? true;
  }

  async toggle(): Promise<boolean> {
    const enabled = !this.isEnabled();
    await this.storage.update(SAFE_MODE_STATE_KEY, enabled);
    return enabled;
  }
}
