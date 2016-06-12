# map-json

Library to map objects into a given JSON structure

## Installation

Install via [npm](https://www.npmjs.com/):

```
$ npm install map-json
```

## Documentation

### Usage

`MapJson.map(sourceObject, mappingObject, functionSource?, preProcessFunction?)`

### Basic Mapping Object Syntax

The mapping object defines the structure of the created JSON object. All objects that contain a `_source` tag will be replaced with its respective data from the source object.

```javascript
{
  name: "John", // This will be kept as is
  data: {
    id: 123, // This will be kept as is
    username: {
      _source: "john.username" // will be replaced with the respective value from the source object
    }
  }
}
```

Example source object

```javascript
{
  john: {
    username: "johndoe"
  }
}
```

Mapping

```javascript
MapJson.map(sourceObject, mappingObject);
/*
{
  name: "John",
  data: {
    id: 123,
    username: "johndoe"
  }
}
*/
```

### Wildcards

The `_source` value can also contain wildcards:

```javascript
MapJson.map(
// Source
{
  users: [
    { name: "John" },
    { name: "Peter" }
  ]
},
// Mapping object
{
  usernames: {
    _source: "users.*.name"
  },
  firstUser: {
    _source: "*.0.name"
  }
});
/*
{
  usernames: ['John', 'Peter'],
  firstUser: 'John'
}
*/
```

### Default values

`_default` can be used to return default values when the referenced value is not defined in the source object

```javascript
MapJson.map(
// Source
{},
// Mapping object
{
  fruit: {
    _source: "fruits.apple.name",
    _default: "apple"
  }
});
/*
{
  fruit: "apple"
}
*/
```

### Transform functions

By defining `_transform`, values can be processed by one or more transform functions.

```javascript
MapJson.map(
// Source
{
  fruits: {
    apple: {
      name: "apple"
    }
  }
},
// Mapping object
{
  fruit: {
    _source: "fruits.apple.name",
    // toUpperCase is a reference to the function in the third parameter (see below)
    // The array represents the parameters passed to the transform function (see next example)
    _transform: { toUpperCase: [] }
  }
},
// Transform / condition functions
{
  toUpperCase: value => value.toUpperCase()
});
/*
{
  fruit: "APPLE"
}
*/
```

It is also possible to pass parameters to transform functions and chain them:

```javascript
MapJson.map(
// Source
{
  fruits: {
    apple: {
      name: "apple",
      id: 123
    }
  }
},
// Mapping object
{
  fruit: {
    _source: "fruits.apple.name",
    _transform: [
      { toUpperCase: [] },
      { append: ["_"] },
      // Parameters can also be referenced values
      { append: [ { _source: "fruits.apple.id" } ] }
    ]
  }
},
// Transform / condition functions
{
  append: (value, parameter) => `${value}${parameter}`,
  toUpperCase: value => value.toUpperCase()
});
/*
{
  fruit: "APPLE_123"
}
*/
```

### Conditions

`_condition` can be used to only map values when a certain condition is met. The syntax is identical to transform functions.

```javascript
MapJson.map(
// Source
{
  fruits: {
    apple: {
      name: "apple",
      id: 123
    },
    banana: {
      name: "banana"
    }
  }
},
// Mapping object
{
  fruitName: {
    _source: "fruits.apple.name",
    _condition: { trueCondition: [] }
  },
  fruitId: {
    _source: "fruits.apple.name",
    // All conditions have to be met
    _condition: [{ trueCondition: [] }, { falseCondition: [] }],
    // When the condition is false, the default value will be used
    _default: 0
  },
  otherFruit: {
    _source: "fruits.banana.name",
    // Conditions can also be inverted
    _condition: { "!falseCondition": [] }
  }
},
// Transform / condition functions
{
  falseCondition: () => false,
  trueCondition: () => true
});
/*
{
  fruitName: "apple",
  fruitId: 0,
  otherFruit: "banana"
}
*/
```

### Conditional transforms

```javascript
MapJson.map(
// Source
{
  fruits: {
    apple: {
      name: "apple"
    }
  }
},
// Mapping object
{
  fruitName: {
    _source: "fruits.apple.name",
    _transform: [
      {
        _condition: { falseCondition: [] },
        _transform: { toLowerCase: [] }
      },
      {
        _condition: { trueCondition: [] },
        _transform: { toUpperCase: [] }
      }
    ]
  }
},
// Transform / condition functions
{
  falseCondition: () => false,
  trueCondition: () => true,
  toLowerCase: value => value.toLowerCase(),
  toUpperCase: value => value.toUpperCase()
});
/*
{
  fruitName: "APPLE"
}
*/
```

Note: When multiple conditions are met, the first `_transform` will be used. Mixing of non-conditional and conditional transforms is not allowed.

### Preprocess values

It is possible to preprocess all mapped values, e.g. for type conversions:

```javascript
MapJson.map(
// Source
{
  userId: 123
},
// Mapping object
{
  id: {
    _source: "userId"
  },
},
// Transform / condition functions
null,
// Preprocess function
value => value.toString()
);
/*
{
  userId: "123"
}
*/
```
