import { EntityType } from "./EntityType";
export declare class EntityCache<T> {
    entityType: EntityType<T>;
    entities: Array<T>;
    identityFieldName: string;
    typeName: string;
    getIdentityFieldName: (typeName: string) => string;
    private _entities;
    private _entityType;
    private _typeName;
    private _identityFieldName;
    private _entityAddedEventEmitter;
    private _entityRemovedEventEmitter;
    protected _entityCacheDependencyMap: EntityCacheDependencyMap;
    private _entityCacheDependencyCallbacks;
    constructor(typeName: string, entityType: EntityType<T>, identityFieldName?: string);
    get(id: number): T;
    updateOrInsert(entity: any): void;
    private update(entity);
    remove(entities: number | Array<T> | T): void;
    clear(): void;
    addEntityCacheDependency(cache: EntityCache<any>, fkIdPropName?: string, propName?: string): void;
    removeEntityCacheDependency(cache: EntityCache<any>): void;
    removeEntityCacheDependency(fkIdPropName: string): void;
    onEntityAdded(listener: (event: EntityCacheElementEvent<T>) => void): void;
    offEntityAdded(listener: (event: EntityCacheElementEvent<T>) => void): void;
    private emitEntityAdded(element);
    onEntityRemoved(listener: (event: EntityCacheElementEvent<T>) => void): void;
    offEntityRemoved(listener: (event: EntityCacheElementEvent<T>) => void): void;
    private emitEntityRemoved(element);
    private findEntitiesIndex(id);
    private findPotentialEntitiesIndex(searchEntityId);
}
export declare class EntityCacheElementEvent<T> {
    entity: T;
    cache: EntityCache<T>;
    constructor(entity: T, cache: EntityCache<T>);
}
export declare class EntityCacheDependencyMap {
    [fkIdPropName: string]: EntityCacheDependency;
}
export declare class EntityCacheDependency {
    propName: string;
    fkIdPropName: string;
    cache: EntityCache<any>;
    private _cache;
    /**
     * contains objects, which have to wait for missing dependencies
     * @type {MissingDependency[]}
     * @private
     */
    private _waitingObjects;
    private _waitingObjectHashMap;
    private _fkIdPropName;
    private _propName;
    constructor(cache: EntityCache<any>, fkIdPropName: string, propName: string);
    addWaitingObject(object: Object, id: number, arrayIndex?: number): void;
    removeWaitingObjects(id: Object | number): Array<WaitingObject>;
    clearMissingDependencies(): void;
}
export declare class WaitingObject {
    id: number;
    object: Object;
    arrayIndex: number;
    constructor(id: number, object: Object, arrayIndex?: number);
}
