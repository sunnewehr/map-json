'use strict';

const _ = require('lodash');
const dotty = require('dotty');
const TransformUtil = require('./transform-util');

class JsonMapper {
  /**
   * @param sourceObject Object for source data
   * @param mappingObject Object that defines new object structure
   * @param transformSource Source for transform and conditional functions
   * @param preProcess (optional) Function that preprocesses all mapped values
   */
  constructor(sourceObject, mappingObject, transformSource, preProcess) {
    if (!_.isObject(sourceObject)) {
      throw new Error('No source object provided');
    }
    if (!_.isObject(mappingObject)) {
      throw new Error('No mapping provided');
    }
    this.sourceObject = sourceObject;
    this.mappingObject = mappingObject;
    this.preProcess = preProcess;
    this.transformUtil = new TransformUtil(transformSource);
  }

  /**
   * @returns new JSON object based on the given mapping structure
   */
  map() {
    return this._traverseMap(this.mappingObject, value => {
      const valueIsObject = _.isObject(value);
      const valueHasStringSource = valueIsObject && _.isString(value._source || value._sources);
      const valueHasArraySource = valueIsObject && _.isArray(value._source || value._sources);
      if (valueHasStringSource || valueHasArraySource) {
        return this._mapValue(value);
      }
      return value;
    });
  }

  /**
   * Traverses an object/array, starting with the deepest values
   */
  _traverseMap(value, iterator) {
    if (_.isArray(value)) {
      return iterator(value.map(arrayValue => this._traverseMap(arrayValue, iterator)));
    } else if (_.isObject(value)) {
      return iterator(_.mapValues(value, objectValue => this._traverseMap(objectValue, iterator)));
    }
    return iterator(value);
  }

  _mapValue(valueMapping) {
    const conditionFunctions = valueMapping._condition || valueMapping._conditions;
    const defaultValue = valueMapping._default;
    const sourcesValues = valueMapping._source || valueMapping._sources;
    const resolvedSourceValues = this._resolveSource(sourcesValues);
    const transformFunctions = valueMapping._transform || valueMapping._transforms;
    const transformEachFunction = valueMapping._transformEach;

    // Condition not met -> ignore transforms and return default immediately
    if (conditionFunctions && !this.transformUtil.checkCondition(resolvedSourceValues,
        conditionFunctions)) {
      return defaultValue;
    }

    let mappedValue = resolvedSourceValues;
    if (_.isFunction(this.preProcess)) {
      // For multiple source values, preprocess all independently
      if (_.isArray(sourcesValues)) {
        mappedValue = resolvedSourceValues.map(sourceValue => this.preProcess(sourceValue));
      } else {
        mappedValue = this.preProcess(resolvedSourceValues);
      }
    }
    // If source value (or preprocessed value) is undefined, ignore transforms
    if (transformFunctions && !_.isUndefined(mappedValue)) {
      mappedValue = this.transformUtil.transformValue(mappedValue, transformFunctions);
    }
    if (transformEachFunction && _.isArray(mappedValue)) {
      mappedValue = mappedValue.map(value =>
        this.transformUtil.transformValue(value, transformEachFunction));
    }
    // Default value is returned when ->
    // 1) source value is undefined and no preprocess is defined
    // 2) preprocessed value is undefined
    // 3) result of transforms is undefined or throws error
    return _.isUndefined(mappedValue) ? defaultValue : mappedValue;
  }

  _resolveSource(sourceKeyPath) {
    if (_.isArray(sourceKeyPath)) {
      const sourceValues = sourceKeyPath.map(keyPath => this._resolveKeyPath(keyPath));
      // Undefined values are kept in the array (to match indexes of source array)
      // If all array values are undefined, undefined is returned (and the default value is used)
      return sourceValues.every(_.isUndefined) ? undefined : sourceValues;
    }
    return this._resolveKeyPath(sourceKeyPath);
  }

  _resolveKeyPath(keyPath) {
    // Use dotty.search if the path contains wildcards
    if (keyPath.indexOf('*') !== -1) {
      const result = dotty
        .search(this.sourceObject, keyPath)
        .filter(searchResult => searchResult !== undefined);
      if (result.length === 0) return undefined;
      // If there is only a single result, return it directly
      if (result.length === 1) return result[0];
      return result;
    }
    return dotty.get(this.sourceObject, keyPath);
  }
}

module.exports.map = (sourceObject, mappingObject, transformSource, preProcess) => {
  const jsonMapper = new JsonMapper(sourceObject, mappingObject, transformSource, preProcess);
  return jsonMapper.map();
};
