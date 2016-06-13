'use strict';

const chai = require('chai');
const expect = chai.expect;

const testSource = require('./test-source');
const JsonMapper = require('../src/json-mapper');

const transformSource = {
  addX: value => `${value}x`,
  add: (value, param1, param2) => `${value}${param1}${param2}`,
  fail: () => {
    throw new Error('forced fail');
  },
  isEqual: (input, parameter) => input === parameter,
  returnTrue: () => true,
  returnFalse: () => false
};

describe('JsonMapper', function () {
  it('should throw error when no source object given', function () {
    expect(() => JsonMapper.map(null, {})).to.throw(Error);
  });

  it('should throw error when no mapping given', function () {
    expect(() => JsonMapper.map({}, null)).to.throw(Error);
  });

  it('should map simple value', function () {
    const mapping = {
      target: {
        _source: 'simpleKey'
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.equal('simple');
  });

  it('should map and preprocess simple value', function () {
    const mapping = {
      target: {
        _source: 'simpleKey'
      }
    };
    const preProcess = value => `${value}x`;
    expect(JsonMapper.map(testSource, mapping, null, preProcess).target).to.equal('simplex');
  });

  it('should map and preprocess single array source', function () {
    const mapping = {
      target: {
        _source: 'key1.array.*.number'
      }
    };
    const preProcess = value => value.concat(4);
    expect(JsonMapper.map(testSource, mapping, null, preProcess).target)
      .to.deep.equal([1, 2, 3, 4]);
  });

  it('should proprocess multiple sources', function () {
    const mapping = {
      target: {
        _source: ['simpleKey', 'key2.object.number']
      }
    };
    const preProcess = value => `${value}x`;
    expect(JsonMapper.map(testSource, mapping, null, preProcess).target).to.deep.equal([
      'simplex', '4x'
    ]);
  });

  it('should map deep value', function () {
    const mapping = {
      target: {
        _source: 'key2.object.number'
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.equal(4);
  });

  it('should map with wildcard', function () {
    const mapping = {
      target: {
        _source: 'key1.array.*.number'
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.deep.equal([1, 2, 3]);
  });

  it('should map single object when wildcard returns one result', function () {
    const mapping = {
      target: {
        _source: '*.*.0.number'
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.deep.equal(1);
  });

  it('should return undefined when wildcard returns no result', function () {
    const mapping = {
      target: {
        _source: '*.*.6.number'
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.deep.equal(undefined);
  });

  it('should return undefined when simple key not defiend', function () {
    const mapping = {
      target: {
        _source: 'notDefined'
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.deep.equal(undefined);
  });

  it('should map multiple sources', function () {
    const mapping = {
      target: {
        _source: ['simpleKey', 'key2.object.number']
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.deep.equal(['simple', 4]);
  });

  it('should map multiple sources when one or more is undefined', function () {
    const mapping = {
      target: {
        _source: ['simpleKey', 'notDefined', 'key2.object.number']
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.deep.equal(['simple', undefined,
      4
    ]);
  });

  it('should map multiple sources to undefined when all are undefiend', function () {
    const mapping = {
      target: {
        _source: ['notDefined1', 'notDefined2', 'notDefined3']
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.deep.equal(undefined);
  });

  it('should use default value for simple mapping', function () {
    const mapping = {
      target: {
        _sources: ['notDefined1'],
        _default: 'defaultValue'
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.deep.equal('defaultValue');
  });

  it('should use default value when all multiple mappings are undefined', function () {
    const mapping = {
      target: {
        _source: ['notDefined1', 'notDefined2', 'notDefined3'],
        _default: 'defaultValue'
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.deep.equal('defaultValue');
  });

  it('should use default value with _source for simple mapping', function () {
    const mapping = {
      target: {
        _source: ['notDefined1'],
        _default: { _source: 'simpleKey' }
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.deep.equal('simple');
  });

  it('should use default value with multiple _source for simple mapping', function () {
    const mapping = {
      target: {
        _source: ['notDefined1'],
        _default: { _source: ['simpleKey', 'key1.array.*.number'] }
      }
    };
    expect(JsonMapper.map(testSource, mapping).target).to.deep.equal(['simple', [1, 2, 3]]);
  });

  it('should transform mapped value', function () {
    const mapping = {
      target: {
        _source: ['simpleKey'],
        _transform: { addX: [] }
      }
    };
    expect(JsonMapper.map(testSource, mapping, transformSource).target).to.deep.equal(
      'simplex');
  });

  it('should transform mapped value with multiple parameters', function () {
    const mapping = {
      target: {
        _source: ['simpleKey'],
        _transform: { add: ['x', 'y'] }
      }
    };
    expect(JsonMapper.map(testSource, mapping, transformSource).target).to.deep.equal(
      'simplexy');
  });

  it('should transform mapped value with multiple mapped parameters', function () {
    const mapping = {
      target: {
        _source: ['simpleKey'],
        _transform: { add: [{ _source: 'key2.object.number' }, { _source: 'key1.array.0.number' }] }
      }
    };
    expect(JsonMapper.map(testSource, mapping, transformSource).target).to.deep.equal(
      'simple41');
  });

  it('should transform mapped value with multiple transform functions and parameters', function () {
    const mapping = {
      target: {
        _source: ['simpleKey'],
        _transform: [
          { add: ['a', 'b'] },
          { add: ['c', 'd'] },
          { add: ['e', 'f'] }
        ]
      }
    };
    expect(JsonMapper.map(testSource, mapping, transformSource).target).to.deep.equal(
      'simpleabcdef');
  });

  it('should transform mapped value with multiple transform functions and parameters', function () {
    const mapping = {
      target: {
        _source: ['simpleKey'],
        _transform: [
          { add: [{ _source: 'key2.object.number' }, { _source: 'key1.array.0.number' }] },
          {
            add: [{ _source: 'simpleKey' }, { _source: 'key1.array.1.number' }]
          }
        ]
      }
    };
    expect(JsonMapper.map(testSource, mapping, transformSource).target).to.deep.equal(
      'simple41simple2');
  });

  it('should transform source array with transformEach', function () {
    const mapping = {
      target: {
        _source: 'key1.array.*.number',
        _transformEach: [
          { addX: [] },
          { addX: [] }
        ]
      }
    };
    expect(JsonMapper.map(testSource, mapping, transformSource).target).to.deep.equal(
      ['1xx', '2xx', '3xx']);
  });

  it('should use default value when a transform fails', function () {
    const mapping = {
      target: {
        _source: ['simpleKey'],
        _transform: [
          { add: [{ _source: 'key2.object.number' }, { _source: 'key1.array.0.number' }] },
          { fail: [] },
          {
            add: [{ _source: 'key2.object.array.0.deepArray.0.arrayInArray.0.deepObject.string' },
              { _source: 'key1.array.1.number' }
            ]
          }
        ]
      }
    };
    expect(JsonMapper.map(testSource, mapping, transformSource).target).to.deep.equal(
      undefined);
  });

  it('should only map when condition is met', function () {
    const mapping = {
      target: {
        _source: 'simpleKey',
        _condition: { returnTrue: [] }
      }
    };
    expect(JsonMapper.map(testSource, mapping, transformSource).target).to.deep.equal(
      'simple');
  });

  it('should only map when condition is met (with parameters)', function () {
    const mapping = {
      target: {
        _source: 'simpleKey',
        _condition: { isEqual: [{ _source: 'simpleKey' }] }
      }
    };
    expect(JsonMapper.map(testSource, mapping, transformSource).target).to.deep.equal(
      'simple');
  });

  it('should only map when condition is met (with parameters and prefixes)', function () {
    const mapping = {
      target: {
        _source: 'simpleKey',
        _condition: [
          { '!isEqual': [123] },
          { '!@isEqual': [3, 2] },
          { '@!isEqual': [3, 2] },
          { isEqual: ['simple'] }
        ]
      }
    };
    expect(JsonMapper.map(testSource, mapping, transformSource).target).to.deep.equal(
      'simple');
  });

  it('should return default when condition fails', function () {
    const mapping = {
      target: {
        _source: 'simpleKey',
        _condition: { isEqual: [{ _source: 'key2.object.number' }, 3] },
        _default: 'defaultValue'
      }
    };
    expect(JsonMapper.map(testSource, mapping, transformSource).target).to.deep.equal(
      'defaultValue');
  });
});
