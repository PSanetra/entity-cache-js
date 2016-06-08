/// <reference path="../typings/index" />
import { EntityCache } from './EntityCache'
import {EntityCacheElementEvent} from "./EntityCache";

let testTypeName = 'testType';
let dependendTestTypeName = 'dependendTestType';

class TestType {

  testTypeId : number;

  strProp : string = 'strPropValue';
  numProp : number = 7357;
  objProp : any;
  arrayProp : Array<string>;

  get strPropGetter() : string
  {
    return this.strProp
  }

  constructor(id : number)
  {
    this.testTypeId = id;

    this.objProp = {};
    this.objProp.someProp = 'somePropValue';
  }

  someMethod()
  {
  }
}

class DependedTestType {

  testTypeReferenceId : number;
  testTypeObject : TestType;
  testTypeReferenceArray : Array<number>;
  testTypeObjects : Array<TestType>;

  constructor(public id : number)
  {
  }
}

describe('EntityCache', ()=>{

  let cache : EntityCache<TestType>;

  beforeEach(()=>{
    cache = new EntityCache<TestType>(testTypeName, TestType);
  });

  describe('.constructor', ()=>{

    it(' sets identityFieldName by default to typeName + "Id" ', ()=>{

      expect(cache.identityFieldName).toEqual(testTypeName + 'Id');

    });

  });

  describe('.updateOrInsert', ()=>{

    let dependendCache : EntityCache<DependedTestType>;

    beforeEach(()=>{
      cache = new EntityCache<TestType>(testTypeName, TestType);

      dependendCache = new EntityCache<DependedTestType>(dependendTestTypeName, DependedTestType);
      dependendCache.addEntityCacheDependency(cache, 'testTypeReferenceId', 'testTypeObject');
      dependendCache.addEntityCacheDependency(cache, 'testTypeReferenceArray', 'testTypeObjects');
    });

    it('insert works ', ()=>{

      let entity = new TestType(1);

      cache.updateOrInsert(entity);

      expect(cache.entities[0]).toBe(entity);

    });

    it('sets prototype ', ()=>{

      let element : any = {};

      element[cache.identityFieldName] = 1;

      cache.updateOrInsert(element);

      expect(element instanceof TestType).toBe(true);
      expect(element.someMethod).toBeTruthy();

    });

    it('updates original entity property ', ()=>{

      let element = new TestType(1);

      cache.updateOrInsert(element);

      let updatedElement :any = {};

      updatedElement[cache.identityFieldName] = 1;
      updatedElement.strProp = 'strPropUpdated';

      cache.updateOrInsert(updatedElement);

      expect(cache.entities[0]).toBe(element);
      expect(element.strProp).toEqual('strPropUpdated');

    });

    it('updates original entity object property ', ()=>{

      let element = new TestType(1);
      element.objProp = undefined;

      cache.updateOrInsert(element);

      let updatedElement :any = {};

      updatedElement[cache.identityFieldName] = 1;
      updatedElement.objProp = {
        someProp : 'somePropValue'
      };

      cache.updateOrInsert(updatedElement);

      expect(cache.entities[0]).toBe(element);
      expect(element.objProp.someProp).toEqual('somePropValue');

    });

    it('updates original entity array property ', ()=>{

      let testElement1 = 'testElement1';
      let testElement2_1 = 'testElement2.1';
      let testElement2_2 = 'testElement2.2';
      let testElement3 = 'testElement3';

      let element = new TestType(1);
      element.arrayProp = undefined;

      cache.updateOrInsert(element);

      let updatedElement :any = {};

      //Add new array
      updatedElement[cache.identityFieldName] = 1;
      let testArray = updatedElement.arrayProp = new Array<string>(testElement1);

      cache.updateOrInsert(updatedElement);

      expect(cache.entities[0].arrayProp).toBe(testArray);
      expect(cache.entities[0].arrayProp[0]).toEqual(testElement1);

      //Add additional element
      updatedElement.arrayProp = new Array<string>(testElement2_1, testElement2_2);

      cache.updateOrInsert(updatedElement);

      expect(cache.entities[0].arrayProp).toBe(testArray);
      expect(cache.entities[0].arrayProp.length).toEqual(2);
      expect(cache.entities[0].arrayProp[0]).toEqual(testElement2_1);
      expect(cache.entities[0].arrayProp[1]).toEqual(testElement2_2);

      //Remove an element
      updatedElement.arrayProp = new Array<string>(testElement3);

      cache.updateOrInsert(updatedElement);

      expect(cache.entities[0].arrayProp).toBe(testArray);
      expect(cache.entities[0].arrayProp.length).toEqual(1);
      expect(cache.entities[0].arrayProp[0]).toEqual(testElement3);
    });

    it('updates original entity child property', ()=>{

      let element = new TestType(1);

      cache.updateOrInsert(element);

      let updatedElement :any = {};

      updatedElement[cache.identityFieldName] = 1;
      updatedElement.objProp = {};
      updatedElement.objProp.someProp = 'objProp.somePropUpdated';

      cache.updateOrInsert(updatedElement);

      expect(element.objProp.someProp).toEqual('objProp.somePropUpdated');

    });

    it('does not delete properties of entity, if property of update Object is not set', ()=>{

      let element = new TestType(1);

      cache.updateOrInsert(element);

      let updatedElement :any = {};

      updatedElement[cache.identityFieldName] = 1;
      updatedElement.objProp = {};

      cache.updateOrInsert(updatedElement);

      expect(element.strProp).toEqual(new TestType(1).strProp)
      expect(element.objProp.someProp).toEqual(new TestType(1).objProp.someProp)

    });

    it('resolves single dependency', ()=>{

      let dependendElement = new DependedTestType(1);
      dependendElement.testTypeReferenceId = 1;

      let element = new TestType(1);

      cache.updateOrInsert(element);

      dependendCache.updateOrInsert(dependendElement);

      expect(dependendElement.testTypeObject).toBe(element);

    });

    it('resolves single dependency later', ()=>{

      let dependendElement = new DependedTestType(1);
      dependendElement.testTypeReferenceId = 1;

      let element = new TestType(1);

      dependendCache.updateOrInsert(dependendElement);

      expect(dependendElement.testTypeObject).toBeUndefined();

      cache.updateOrInsert(element);

      expect(dependendElement.testTypeObject).toBe(element);

    });

    it('resolves array of dependencies', ()=>{

      let dependendElement = new DependedTestType(1);
      dependendElement.testTypeReferenceArray = new Array<number>(1,2);

      let element = new TestType(1);
      let element2 = new TestType(2);

      cache.updateOrInsert(element);
      cache.updateOrInsert(element2);

      dependendCache.updateOrInsert(dependendElement);

      expect(dependendElement.testTypeObjects[0]).toBe(element);
      expect(dependendElement.testTypeObjects[1]).toBe(element2);

    });

    it('resolves array of dependencies later', ()=>{

      let dependendElement = new DependedTestType(1);
      dependendElement.testTypeReferenceArray = new Array<number>(1,2);

      let element = new TestType(1);
      let element2 = new TestType(2);

      dependendCache.updateOrInsert(dependendElement);

      expect(dependendElement.testTypeObjects[0]).toBeUndefined();
      expect(dependendElement.testTypeObjects[1]).toBeUndefined();

      cache.updateOrInsert(element);

      expect(dependendElement.testTypeObjects[0]).toBe(element);
      expect(dependendElement.testTypeObjects[1]).toBeUndefined();

      cache.updateOrInsert(element2);

      expect(dependendElement.testTypeObjects[0]).toBe(element);
      expect(dependendElement.testTypeObjects[1]).toBe(element2);

    });

  });

  describe('.remove', ()=>{

    it('removes by Id', ()=>{

      let element = new TestType(1);

      cache.updateOrInsert(element);

      expect(cache.entities.length).toEqual(1);

      cache.remove(1);

      expect(cache.entities.length).toEqual(0);

    });

    it('removes by object', ()=>{

      let element = new TestType(1);

      cache.updateOrInsert(element);

      expect(cache.entities.length).toEqual(1);

      cache.remove(new TestType(1));

      expect(cache.entities.length).toEqual(0);

    });

    it('removes a range of objects', ()=>{

      let element = new TestType(1);
      let element2 = new TestType(2);
      let element3 = new TestType(3);

      cache.updateOrInsert(element);
      cache.updateOrInsert(element2);
      cache.updateOrInsert(element3);

      expect(cache.entities.length).toEqual(3);

      cache.remove(new Array<TestType>(element, element3));

      expect(cache.entities.length).toEqual(1);
      expect(cache.entities[0]).toBe(element2);

    });

  });

  describe('.onEntityAdded', ()=>{

    it('adds listener, which is called, if an entity is added', ()=>{

      let listenerCallCount = 0;
      let element = new TestType(1);

      cache.onEntityAdded((event: EntityCacheElementEvent<TestType>)=>{

        listenerCallCount++;

        expect(event.cache).toBe(cache);
        expect(event.entity).toBe(element);

      });

      cache.updateOrInsert(element);

      expect(listenerCallCount).toEqual(1);

      //listener should not be called, if the entity is updated
      cache.updateOrInsert(new TestType(1));

      expect(listenerCallCount).toEqual(1);

    });

  });

  describe('.offEntityAdded', ()=>{

    it('removes listener', ()=>{

      let listenerCallCount = 0;
      let element = new TestType(1);

      let callback = (event: EntityCacheElementEvent<TestType>)=>{

        listenerCallCount++;

      };

      cache.onEntityAdded(callback);
      cache.offEntityAdded(callback);

      cache.updateOrInsert(element);

      expect(listenerCallCount).toEqual(0);

    });

  });

  describe('.onEntityRemoved', ()=>{

    it('adds listener, which is called, if an entity is removed', ()=>{

      let listenerCallCount = 0;
      let element = new TestType(1);

      cache.onEntityRemoved((event: EntityCacheElementEvent<TestType>)=>{

        listenerCallCount++;

        expect(event.cache).toBe(cache);
        expect(event.entity).toBe(element);

      });

      cache.updateOrInsert(element);

      expect(listenerCallCount).toEqual(0);

      cache.remove(element);

      expect(listenerCallCount).toEqual(1);

    });

  });

  describe('.offEntityRemoved', ()=>{

    it('removes listener', ()=>{

      let listenerCallCount = 0;
      let element = new TestType(1);

      let callback = (event: EntityCacheElementEvent<TestType>)=>{

        listenerCallCount++;

      };

      cache.onEntityRemoved(callback);
      cache.offEntityRemoved(callback);

      cache.updateOrInsert(element);
      cache.remove(element);

      expect(listenerCallCount).toEqual(0);

    });

  });

});
