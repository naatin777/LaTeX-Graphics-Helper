function installMapGetOrInsertComputed(): void {
  const mapPrototype = Map.prototype as Map<unknown, unknown> & {
    getOrInsertComputed?: (key: unknown, callback: (key: unknown) => unknown) => unknown;
  };

  if (!mapPrototype.getOrInsertComputed) {
    Object.defineProperty(mapPrototype, 'getOrInsertComputed', {
      configurable: true,
      writable: true,
      value(this: Map<unknown, unknown>, key: unknown, callback: (key: unknown) => unknown) {
        if (this.has(key)) {
          return this.get(key);
        }

        const value = callback(key);
        this.set(key, value);
        return value;
      },
    });
  }
}

installMapGetOrInsertComputed();
