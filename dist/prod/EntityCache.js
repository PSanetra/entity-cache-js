"use strict";
var EventEmitter_1 = require('./utils/EventEmitter');
var IllegalArgumentException_1 = require("./exceptions/IllegalArgumentException");
var EntityCache = (function () {
    function EntityCache(typeName, entityType, identityFieldName) {
        if (identityFieldName === void 0) { identityFieldName = typeName + 'Id'; }
        this.getIdentityFieldName = function (typeName) { return typeName + "Id"; };
        this._entities = new Array();
        this._entityAddedEventEmitter = new EventEmitter_1.EventEmitter();
        this._entityRemovedEventEmitter = new EventEmitter_1.EventEmitter();
        this._entityCacheDependencyMap = new EntityCacheDependencyMap();
        this._entityCacheDependencyCallbacks = new EntityCacheDependencyCallbacks();
        this._typeName = typeName;
        this._entityType = entityType;
        this._identityFieldName = identityFieldName;
        //console.log(this._entities[0]) //prints not undefined in the tests!?!?!?!
    }
    Object.defineProperty(EntityCache.prototype, "entityType", {
        get: function () {
            return this._entityType;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EntityCache.prototype, "entities", {
        get: function () {
            return this._entities;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EntityCache.prototype, "identityFieldName", {
        get: function () {
            return this._identityFieldName;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EntityCache.prototype, "typeName", {
        get: function () {
            return this._typeName;
        },
        enumerable: true,
        configurable: true
    });
    EntityCache.prototype.get = function (id) {
        var index = this.findEntitiesIndex(id);
        if (index < 0)
            return undefined;
        return this._entities[index];
    };
    EntityCache.prototype.updateOrInsert = function (entities) {
        if (!(entities instanceof Array))
            entities = [entities];
        for (var _i = 0, entities_1 = entities; _i < entities_1.length; _i++) {
            var element = entities_1[_i];
            this.update(element);
        }
    };
    EntityCache.prototype.update = function (entity) {
        var _this = this;
        var entityId = entity[this._identityFieldName];
        entity.__proto__ = this._entityType.prototype;
        var index = this.findPotentialEntitiesIndex(entityId);
        if (entity === this._entities[index])
            return;
        //update properties
        var recursiveUpdate = function (newData, oldData, isRoot) {
            if (!oldData)
                oldData = newData;
            //newData === oldData if there is no oldData
            for (var memberName in newData) {
                if (!newData.hasOwnProperty(memberName))
                    continue;
                var newDataMember = newData[memberName];
                var oldDataMember = oldData[memberName];
                if (typeof (newDataMember) === "object") {
                    if (!oldDataMember) {
                        oldDataMember = oldData[memberName] = newDataMember;
                    }
                    var oldDataMemberIsArray = oldDataMember instanceof Array;
                    var newDataMemberIsArray = newDataMember instanceof Array;
                    //update Array Elements
                    if (oldDataMemberIsArray && newDataMemberIsArray) {
                        if (oldDataMember !== newDataMember) {
                            oldDataMember.length = 0;
                            Array.prototype.push.apply(oldDataMember, newDataMember);
                        }
                    }
                    else if (newDataMemberIsArray) {
                        oldData[memberName] = newDataMember;
                    }
                    //update Array Dependencies
                    if (newDataMemberIsArray && _this._entityCacheDependencyMap[memberName] != null) {
                        var entityCacheDependency = _this._entityCacheDependencyMap[memberName];
                        var cache = entityCacheDependency.cache;
                        var oldDataArray = oldData[entityCacheDependency.propName];
                        if (!oldDataArray)
                            oldDataArray = oldData[entityCacheDependency.propName] = [];
                        for (var _i = 0, newDataMember_1 = newDataMember; _i < newDataMember_1.length; _i++) {
                            var depId = newDataMember_1[_i];
                            var element = cache.get(depId);
                            //element may be null and later resolved
                            oldDataArray.push(element);
                            if (element == null)
                                entityCacheDependency.addWaitingObject(oldData, depId, oldDataArray.length - 1);
                        }
                    }
                    else {
                        //update child object
                        recursiveUpdate(newDataMember, oldDataMember, false);
                    }
                }
                else {
                    //resolve Dependency if member is fkId
                    if (_this._entityCacheDependencyMap[memberName] != null && (!isRoot || memberName !== _this._identityFieldName)) {
                        var newId = newDataMember;
                        var oldId = oldDataMember;
                        var entityCacheDependency = _this._entityCacheDependencyMap[memberName];
                        if (newId !== oldId || newData === oldData) {
                            var cache = entityCacheDependency.cache;
                            var element = cache.get(newId);
                            oldData[entityCacheDependency.propName] = element;
                            if (element == null)
                                entityCacheDependency.addWaitingObject(oldData, newId);
                        }
                    }
                    else {
                        //update member
                        oldData[memberName] = newDataMember;
                    }
                }
            }
        };
        var oldData = this._entities[index] && this._entities[index][this._identityFieldName] === entityId ? this._entities[index] : entity;
        recursiveUpdate(entity, oldData, true);
        if (oldData === entity) {
            //insert
            this._entities.splice(index, 0, entity);
            this.emitEntityAdded(entity);
        }
    };
    EntityCache.prototype.remove = function (entities) {
        if (!entities)
            return;
        if (typeof (entities) === "number") {
            var id = entities;
            entities = new this._entityType();
            entities[this._identityFieldName] = id;
        }
        if (!(entities instanceof Array)) {
            entities = new Array(entities);
        }
        for (var _i = 0, _a = entities; _i < _a.length; _i++) {
            var element = _a[_i];
            var i = this.findEntitiesIndex(element);
            if (i < 0)
                continue;
            this._entityRemovedEventEmitter.emit(new EntityCacheElementEvent(this._entities.splice(i, 1)[0], this));
        }
    };
    ;
    EntityCache.prototype.clear = function () {
        this._entities.length = 0;
        for (var memberName in this._entityCacheDependencyMap) {
            if (!this._entityCacheDependencyMap.hasOwnProperty(memberName))
                continue;
            this._entityCacheDependencyMap[memberName].clearMissingDependencies();
        }
    };
    EntityCache.prototype.addEntityCacheDependency = function (cache, fkIdPropName, propName) {
        var _this = this;
        if (fkIdPropName === void 0) { fkIdPropName = null; }
        if (propName === void 0) { propName = null; }
        if (!fkIdPropName)
            fkIdPropName = this.getIdentityFieldName(cache.typeName);
        if (!propName)
            propName = cache.typeName;
        var dependency = new EntityCacheDependency(cache, fkIdPropName, propName);
        var callback = function (event) {
            var addedEntity = event.entity;
            var addedEntityId = addedEntity[cache.identityFieldName];
            if (!(addedEntity instanceof cache._entityType))
                throw new IllegalArgumentException_1.IllegalArgumentException("event.entity", "is not of the correct type");
            var waitingObjects = _this._entityCacheDependencyMap[fkIdPropName].removeWaitingObjects(addedEntity);
            for (var _i = 0, waitingObjects_1 = waitingObjects; _i < waitingObjects_1.length; _i++) {
                var element = waitingObjects_1[_i];
                if (element.object[fkIdPropName] instanceof Array) {
                    //better check if fkId is still the same
                    if (element.object[fkIdPropName][element.arrayIndex] === addedEntityId)
                        element.object[propName][element.arrayIndex] = addedEntity;
                }
                else {
                    //better check if fkId is still the same
                    if (element.object[fkIdPropName] === addedEntityId)
                        element.object[propName] = addedEntity;
                }
            }
        };
        cache.onEntityAdded(callback);
        this._entityCacheDependencyMap[fkIdPropName] = dependency;
        this._entityCacheDependencyCallbacks[fkIdPropName] = callback;
    };
    EntityCache.prototype.removeEntityCacheDependency = function (fkIdPropName) {
        if (fkIdPropName instanceof EntityCache)
            fkIdPropName = this.getIdentityFieldName(fkIdPropName.typeName);
        this._entityCacheDependencyMap[fkIdPropName].cache.offEntityAdded(this._entityCacheDependencyCallbacks[fkIdPropName]);
        delete this._entityCacheDependencyMap[fkIdPropName];
        delete this._entityCacheDependencyCallbacks[fkIdPropName];
    };
    EntityCache.prototype.onEntityAdded = function (listener) {
        this._entityAddedEventEmitter.subscribe(listener);
    };
    EntityCache.prototype.offEntityAdded = function (listener) {
        this._entityAddedEventEmitter.unsubscribe(listener);
    };
    EntityCache.prototype.emitEntityAdded = function (element) {
        this._entityAddedEventEmitter.emit(new EntityCacheElementEvent(element, this));
    };
    EntityCache.prototype.onEntityRemoved = function (listener) {
        this._entityRemovedEventEmitter.subscribe(listener);
    };
    EntityCache.prototype.offEntityRemoved = function (listener) {
        this._entityRemovedEventEmitter.unsubscribe(listener);
    };
    EntityCache.prototype.emitEntityRemoved = function (element) {
        this._entityRemovedEventEmitter.emit(new EntityCacheElementEvent(element, this));
    };
    EntityCache.prototype.findEntitiesIndex = function (id) {
        if (id instanceof this._entityType) {
            id = id[this._identityFieldName];
        }
        var index = this.findPotentialEntitiesIndex(id);
        return (!this._entities[index] || this._entities[index][this._identityFieldName] !== id) ? -1 : index;
    };
    EntityCache.prototype.findPotentialEntitiesIndex = function (searchEntityId) {
        //similar to binarySearch
        var minIndex = 0;
        var maxIndex = this._entities.length - 1;
        var currentIndex;
        var currentElement;
        var currentElementId;
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
    };
    return EntityCache;
}());
exports.EntityCache = EntityCache;
var EntityCacheElementEvent = (function () {
    function EntityCacheElementEvent(entity, cache) {
        this.entity = entity;
        this.cache = cache;
    }
    return EntityCacheElementEvent;
}());
exports.EntityCacheElementEvent = EntityCacheElementEvent;
var EntityCacheDependencyMap = (function () {
    function EntityCacheDependencyMap() {
    }
    return EntityCacheDependencyMap;
}());
exports.EntityCacheDependencyMap = EntityCacheDependencyMap;
var EntityCacheDependencyCallbacks = (function () {
    function EntityCacheDependencyCallbacks() {
    }
    return EntityCacheDependencyCallbacks;
}());
var EntityCacheDependency = (function () {
    function EntityCacheDependency(cache, fkIdPropName, propName) {
        /**
         * contains objects, which have to wait for missing dependencies
         * @type {MissingDependency[]}
         * @private
         */
        this._waitingObjects = new Array();
        this._waitingObjectHashMap = {};
        this._cache = cache;
        this._fkIdPropName = fkIdPropName;
        this._propName = propName;
    }
    Object.defineProperty(EntityCacheDependency.prototype, "propName", {
        get: function () {
            return this._propName;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EntityCacheDependency.prototype, "fkIdPropName", {
        get: function () {
            return this._fkIdPropName;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EntityCacheDependency.prototype, "cache", {
        get: function () {
            return this._cache;
        },
        enumerable: true,
        configurable: true
    });
    EntityCacheDependency.prototype.addWaitingObject = function (object, id, arrayIndex) {
        if (arrayIndex === void 0) { arrayIndex = null; }
        this._waitingObjectHashMap[id] = true;
        this._waitingObjects.push(new WaitingObject(id, object, arrayIndex));
    };
    EntityCacheDependency.prototype.removeWaitingObjects = function (id) {
        if (typeof (id) === "object")
            id = id[this.cache.identityFieldName];
        var ret = new Array();
        for (var i = this._waitingObjects.length - 1; i >= 0; i--) {
            if (this._waitingObjects[i].id !== id)
                continue;
            //remove Item from _missingDependencies and push it to ret
            Array.prototype.push.apply(ret, this._waitingObjects.splice(i, 1));
        }
        delete this._waitingObjectHashMap[id];
        return ret;
    };
    EntityCacheDependency.prototype.clearMissingDependencies = function () {
        this._waitingObjects.length = 0;
    };
    return EntityCacheDependency;
}());
exports.EntityCacheDependency = EntityCacheDependency;
var WaitingObject = (function () {
    function WaitingObject(id, object, arrayIndex) {
        if (arrayIndex === void 0) { arrayIndex = null; }
        this.id = id;
        this.object = object;
        this.arrayIndex = arrayIndex;
    }
    return WaitingObject;
}());
exports.WaitingObject = WaitingObject;
