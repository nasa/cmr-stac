interface Cache<T> {
  data: T;
  expiration: number;
}

/**
 * An in-memory cache that will live for the life of a warm lambda instance.
 * An optional TTL in seconds value may be used to expire items sooner.
 *
 *
 */
export class WarmCache<T> {
  ttl: number;
  store: { [key: string]: Cache<T> } = {};

  constructor(ttlInSeconds: number = -1) {
    this.ttl = ttlInSeconds;
  }

  private expireItems(): void {
    if (this.ttl <= 0) return;

    for (const key in this.store) {
      if (this.store[key].data < new Date().getTime()) {
        delete this.store[key];
      }
    }
  }

  public size(): number {
    this.expireItems();

    return Object.keys(this.store).length;
  }

  public isEmpty(): boolean {
    return this.size() === 0;
  }

  public get(key: string): T | undefined {
    this.expireItems();

    if (this.store[key] !== undefined) {
      return this.store[key].data;
    }
    return undefined;
  }

  public getAll(): T[] {
    this.expireItems();

    return Object.keys(this.store).reduce(
      (acc, key) => [...acc, this.store[key].data],
      [] as T[]
    );
  }

  public set(key: string, data: T): T {
    this.store[key] = {
      data,
      expiration: this.ttl > 0 ? new Date().getTime() + this.ttl * 1000 : -1,
    } as Cache<T>;
    return data;
  }

  public clear(): void {
    for (const key in this.store) {
      delete this.store[key];
    }
  }

  public unset(key: string): void {
    delete this.store[key];
  }
}
