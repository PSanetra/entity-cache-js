import {EventEmitter} from './utils/EventEmitter';
import {IllegalArgumentException} from "./exceptions/IllegalArgumentException";
import {EntityType} from "./EntityType";

export class EntityCache<T> {
  get entityType():EntityType<T>{
    return this._entityType;
  }

  get entities():Array<T> {
    return this._entities;
  }

  get identityFieldName():string {
    return this._identityFieldName;
  }

  get typeName():string {
    return this._typeName;
  }

  public getIdentityFieldName : (typeName : string) => string = (typeName : string) => typeName + "Id";

  private _entities:Array<T> = new Array<T>();
  private _entityType:EntityType<T>;
  private _typeName:string;
  private _identityFieldName:string;
  private _entityAddedEventEmitter:EventEmitter = new EventEmitter();
  private _entityRemovedEventEmitter:EventEmitter = new EventEmitter();

  protected _entityCacheDependencyMap : EntityCacheDependencyMap = new EntityCacheDependencyMap();
  private _entityCacheDependencyCallbacks : EntityCacheDependencyCallbacks = new EntityCacheDependencyCallbacks();


  constructor(typeName:string, entityType:EntityType<T>, identityFieldName:string = typeName + 'Id') {
    this._typeName = typeName;
    this._entityType = entityType;
    this._identityFieldName = identityFieldName;

    //console.log(this._entities[0]) //prints not undefined in the tests!?!?!?!
  }

  get(id: number) : T
  {
    let index = this.findEntitiesIndex(id);

    if(index < 0)
      return undefined;

    return this._entities[index];
  }

  updateOrInsert(entity : any) : void;
  updateOrInsert(entities : Array<any>) : void
  {
    if (!(entities instanceof Array))
      entities = [entities];

    for (let element of entities)
      this.update(<T>element);
  }

  private update(entity : T)
  {
    let entityId = entity[this._identityFieldName];

    (<any>entity).__proto__ = this._entityType.prototype;

    let index = this.findPotentialEntitiesIndex(entityId);

    if(entity === this._entities[index])
      return;

    //update properties
    let recursiveUpdate = (newData : any, oldData : any, isRoot : boolean)=> {

      if(!oldData)
        oldData = newData;

      //newData === oldData if there is no oldData

      for (let memberName in newData) {
        if (!newData.hasOwnProperty(memberName))
          continue;

        let newDataMember = newData[memberName];
        let oldDataMember = oldData[memberName];

        if (typeof(newDataMember) === "object") {

          if(!oldDataMember)
          {
            oldDataMember = oldData[memberName] = newDataMember
          }

          let oldDataMemberIsArray = oldDataMember instanceof Array;
          let newDataMemberIsArray = newDataMember instanceof Array;

          //update Array Elements
          if(oldDataMemberIsArray && newDataMemberIsArray)
          {
            if(oldDataMember !== newDataMember)
            {
              oldDataMember.length = 0;

              Array.prototype.push.apply(oldDataMember, newDataMember);
            }
          }
          else if(newDataMemberIsArray)
          {
            oldData[memberName] = newDataMember;
          }

          //update Array Dependencies
          if(newDataMemberIsArray && this._entityCacheDependencyMap[memberName] != null)
          {
            let entityCacheDependency = this._entityCacheDependencyMap[memberName];
            let cache = entityCacheDependency.cache;
            let oldDataArray : Array<any> = oldData[entityCacheDependency.propName];

            if(!oldDataArray)
              oldDataArray = oldData[entityCacheDependency.propName] = [];

            for(let depId of newDataMember)
            {
              let element = cache.get(depId);

              //element may be null and later resolved
              oldDataArray.push(element);

              if (element == null)
                entityCacheDependency.addWaitingObject(oldData, depId, oldDataArray.length - 1);
            }
          }
          else
          {
            //update child object
            recursiveUpdate(newDataMember, oldDataMember, false);
          }
        }
        //if newDataMember is not an object
        else {
          //resolve Dependency if member is fkId
          if (this._entityCacheDependencyMap[memberName] != null && (!isRoot || memberName !== this._identityFieldName)) {
            let newId = newDataMember;
            let oldId = oldDataMember;
            let entityCacheDependency = this._entityCacheDependencyMap[memberName];

            if (newId !== oldId || newData === oldData) {
              let cache = entityCacheDependency.cache;

              let element = cache.get(newId);

              oldData[entityCacheDependency.propName] = element;

              if (element == null)
                entityCacheDependency.addWaitingObject(oldData, newId);
            }
          }
          else
          {
            //update member
            oldData[memberName] = newDataMember;
          }
        }
      }
    };

    let oldData = this._entities[index] && this._entities[index][this._identityFieldName] === entityId? this._entities[index] : entity;

    recursiveUpdate(entity, oldData, true);

    if(oldData === entity)
    {
      //insert
      this._entities.splice(index, 0, entity);

      this.emitEntityAdded(entity);
    }
  }

  remove(entities : number | Array<T> | T){
    if (!entities)
      return;
    if(typeof(entities) === "number")
    {
      let id = entities;
      entities = new this._entityType();
      entities[this._identityFieldName] = id;
    }
    if(!(entities instanceof Array))
    {
      entities = new Array<T>(<T>entities);
    }

    for(let element of <Array<T>>entities)
    {
      let i = this.findEntitiesIndex(element);

      if (i < 0)
        continue;

      this._entityRemovedEventEmitter.emit(new EntityCacheElementEvent(this._entities.splice(i, 1)[0], this)) ;
    }
  };

  clear() {
    this._entities.length = 0;

    for (var memberName in this._entityCacheDependencyMap) {
      if (!this._entityCacheDependencyMap.hasOwnProperty(memberName))
        continue;

      this._entityCacheDependencyMap[memberName].clearMissingDependencies();
    }
  }

  addEntityCacheDependency(cache : EntityCache<any>, fkIdPropName : string = null, propName : string = null)
  {
    if(!fkIdPropName)
      fkIdPropName = this.getIdentityFieldName(cache.typeName);

    if(!propName)
      propName = cache.typeName;

    let dependency : EntityCacheDependency = new EntityCacheDependency(cache, fkIdPropName, propName);

    let callback = (event : EntityCacheElementEvent<any>) => {

      let addedEntity : any = event.entity;
      let addedEntityId : number = addedEntity[cache.identityFieldName];

      if (!(addedEntity instanceof cache._entityType))
        throw new IllegalArgumentException("event.entity", "is not of the correct type");

      let waitingObjects = this._entityCacheDependencyMap[fkIdPropName].removeWaitingObjects(addedEntity);

      for(let element of waitingObjects)
      {
        if(element.object[fkIdPropName] instanceof Array)
        {
          //better check if fkId is still the same
          if(element.object[fkIdPropName][element.arrayIndex] === addedEntityId)
            element.object[propName][element.arrayIndex] = addedEntity;
        }
        else
        {
          //better check if fkId is still the same
          if(element.object[fkIdPropName] === addedEntityId)
            element.object[propName] = addedEntity;
        }
      }
    };

    cache.onEntityAdded(callback);

    this._entityCacheDependencyMap[fkIdPropName] = dependency;
    this._entityCacheDependencyCallbacks[fkIdPropName] = callback;
  }

  removeEntityCacheDependency(cache : EntityCache<any>) : void;
  removeEntityCacheDependency(fkIdPropName : string) : void;
  removeEntityCacheDependency(fkIdPropName : any) : void
  {
    if(fkIdPropName instanceof EntityCache)
      fkIdPropName = this.getIdentityFieldName(fkIdPropName.typeName);

    this._entityCacheDependencyMap[fkIdPropName].cache.offEntityAdded(this._entityCacheDependencyCallbacks[fkIdPropName]);

    delete this._entityCacheDependencyMap[fkIdPropName];
    delete this._entityCacheDependencyCallbacks[fkIdPropName];
  }

  onEntityAdded(listener:(event:EntityCacheElementEvent<T>) => void) {
    this._entityAddedEventEmitter.subscribe(listener);
  }

  offEntityAdded(listener:(event:EntityCacheElementEvent<T>) => void) {
    this._entityAddedEventEmitter.unsubscribe(listener);
  }

  private emitEntityAdded(element:T) {
    this._entityAddedEventEmitter.emit(new EntityCacheElementEvent(element, this))
  }

  onEntityRemoved(listener:(event:EntityCacheElementEvent<T>) => void) {
    this._entityRemovedEventEmitter.subscribe(listener);
  }

  offEntityRemoved(listener:(event:EntityCacheElementEvent<T>) => void) {
    this._entityRemovedEventEmitter.unsubscribe(listener);
  }

  private emitEntityRemoved(element:T) {
    this._entityRemovedEventEmitter.emit(new EntityCacheElementEvent(element, this))
  }

  private findEntitiesIndex(id: number | T)
  {
    if(id instanceof this._entityType)
    {
      id = id[this._identityFieldName];
    }

    let index = this.findPotentialEntitiesIndex(<number>id);

    return (!this._entities[index] || this._entities[index][this._identityFieldName] !== id) ? -1 : index;
  }

  private findPotentialEntitiesIndex(searchEntityId : number) {
    //similar to binarySearch

    let minIndex : number = 0;
    let maxIndex :number = this._entities.length - 1;
    let currentIndex : number;
    let currentElement : T;
    let currentElementId : number;

    while (minIndex <= maxIndex) {
      currentIndex = (minIndex + maxIndex) / 2 | 0;
      currentElement = this._entities[currentIndex];
      currentElementId = currentElement[this._identityFieldName];

      if (currentElementId < searchEntityId) {
        minIndex = currentIndex + 1;
      }
      else if (currentElementId > searchEntityId) {
        maxIndex = currentIndex - 1;
      }
      else {
        return currentIndex;
      }
    }

    if (!currentElement)
      return 0;

    if (currentElementId < searchEntityId)
      currentIndex++;

    return currentIndex;
  }

}

export class EntityCacheElementEvent<T> {
  constructor(public entity : T, public cache : EntityCache<T>) {
  }
}

export class EntityCacheDependencyMap {
  [fkIdPropName: string] : EntityCacheDependency;
}

class EntityCacheDependencyCallbacks
{
  [fkIdPropName : string] : (event : EntityCacheElementEvent<any>) => void;
}

export class EntityCacheDependency {
  get propName():string{
    return this._propName;
  }

  get fkIdPropName():string{
    return this._fkIdPropName;
  }

  get cache():EntityCache<any> {
    return this._cache;
  }

  private _cache:EntityCache<any>;

  /**
   * contains objects, which have to wait for missing dependencies
   * @type {MissingDependency[]}
   * @private
   */
  private _waitingObjects:Array<WaitingObject> = new Array<WaitingObject>();
  private _waitingObjectHashMap:any = {};
  private _fkIdPropName:string;
  private _propName:string;

  constructor(cache:EntityCache<any>, fkIdPropName : string, propName : string) {
    this._cache = cache;
    this._fkIdPropName = fkIdPropName;
    this._propName = propName;
  }

  addWaitingObject(object:Object, id:number, arrayIndex : number = null) {

    this._waitingObjectHashMap[id] = true;

    this._waitingObjects.push(new WaitingObject(id, object, arrayIndex));

  }

  removeWaitingObjects(id:Object | number) : Array<WaitingObject> {
    if (typeof(id) === "object")
      id = <number>id[this.cache.identityFieldName];

    let ret : Array<WaitingObject> = new Array<WaitingObject>();

    for (var i = this._waitingObjects.length - 1; i >= 0; i--) {
      if (this._waitingObjects[i].id !== id)
        continue;

      //remove Item from _missingDependencies and push it to ret
      Array.prototype.push.apply(ret, this._waitingObjects.splice(i, 1));
    }

    delete this._waitingObjectHashMap[<number>id];

    return ret;
  }

  clearMissingDependencies() {
    this._waitingObjects.length = 0;
  }

}

export class WaitingObject {
  constructor(public id:number, public object:Object, public arrayIndex : number = null) {
  }
}
