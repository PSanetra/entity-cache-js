# entity-cache.js

entity-cache.js manages your JavaScript objects in caches.

## Features

* Makes sure that there is only one instance of every unique entity (identified by an id property)
* Recursively updates existing entities with new data
  * Properties, which do not exist in the updated data object, will not be updated
* Automatically resolves entity dependencies by foreign keys using other entity-caches
  * If entity dependencies do not exists while an entity is added to the cache, the dependencies will be resolved as soon as these become available
* Provides events if new entities are added to a cache or entities are removed from a cache
* Supports and coded in TypeScript

## Installation

`npm install entity-cache-js --save`

## Examples

Initialize an entity-cache

```js
var entityCacheJs = require('entity-cache-js');

function Person(personId, motherId, fatherId, firstName, lastName, address)
{
  this.personId = personId;

  this.motherId = motherId;
  this.fatherId = fatherId;

  this.firstName = firstName;
  this.lastName = lastName;
  this.address = address;
}

var personCache = new EntityCache('person', Person, 'personId');

personCache.addEntityCacheDependency(personCache, 'motherId', 'mother');
personCache.addEntityCacheDependency(personCache, 'fatherId', 'father');
```

Add an entity instance to the cache

```js
personCache.updateOrInsert(new Person(1, 2, 3, 'John', 'Doe'), { zip : '12345' });
personCache.updateOrInsert(new Person(2, null, null, 'Julia', 'Joe'));
personCache.updateOrInsert(new Person(3, null, null, 'Johnson', 'Doe'));

console.log(personCache.get(1).mother.firstName); //prints Julia
```

Use entities

```js
var johnDoe = personCache.get(1);

//use mother reference
console.log(johnDoe.mother.firstName); //prints Julia

//iterate over all entities
for(var i in personCache.entities)
{
  console.log(personCache.entities[i].firstName);
}
```

Update existing entity

```js
personCache.updateOrInsert({
  personId: 1,
  address : {
    zip : '98765'
  }
});

console.log(johnDoe.address.zip); //prints 98765
```

## Bugs

There may be still a few bugs. Please report them!

## License
MIT