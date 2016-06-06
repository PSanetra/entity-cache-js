export interface EntityType<T> {
    new (...args: any[]): T;
}
