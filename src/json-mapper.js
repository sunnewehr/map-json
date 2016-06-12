'use strict';

const _ = require('lodash');
const dotty = require('dotty');
const traverse = require('traverse');
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
    this.transformSource = transformSource || {};
    this.preProcess = preProcess;
    this.transformUtil = new TransformUtil(transformSource);
  }

  /**
   * @returns new JSON object based on the given mapping structure
   */
  map() {
    // Traverse has a different context
    const self = this;
    const replaceWithMappedValue = function (value) {
      const valueIsObject = _.isObject(value);
      const valueHasStringSource = valueIsObject && _.isString(value._source || value._sources);
      const valueHasArraySource = valueIsObject && _.isArray(value._source || value._sources);
      if (valueHasStringSource || valueHasArraySource) {
        this.update(self._mapValue(value));
      }
    };
    // First step: replace all _source tags in parameters/conditions/defaults
    // This is necessary so the function parameters are resolved, e.g.
    // { _source: "key1", _transform: { func: [{ _source: "key2" }] } }
    // In this case _source for key2 has to be replaced before transforming key1
    const mappingObjectWithResolvedParameters = traverse.map(this.mappingObject, function (value) {
      if (this.path.indexOf('_condition') !== -1 || this.path.indexOf('_conditions') !== -1 ||
        this.path.indexOf('_transform') !== -1 || this.path.indexOf('_transforms') !== -1 ||
        this.path.indexOf('_default') !== -1) {
        replaceWithMappedValue.bind(this)(value);
      }
    });
    return traverse.map(mappingObjectWithResolvedParameters, function (value) {
      replaceWithMappedValue.bind(this)(value);
    });
  }

  _mapValue(valueMapping) {
    const conditionFunctions = valueMapping._condition || valueMapping._conditions;
    const defaultValue = valueMapping._default;
    const sourceValues = this._resolveSource(valueMapping._source || valueMapping._sources);
    const transformFunctions = this.transformUtil.resolveTransformConditions(sourceValues,
      valueMapping._transform || valueMapping._transforms);

    // Condition not met -> ignore transforms and return default immediately
    if (conditionFunctions && !this.transformUtil.checkCondition(sourceValues,
        conditionFunctions)) {
      return defaultValue;
    }

    let mappedValue = sourceValues;
    if (_.isFunction(this.preProcess)) {
      // For multiple source values, preprocess all independently
      if (_.isArray(sourceValues)) {
        mappedValue = sourceValues.map(sourceValue => this.preProcess(sourceValue));
      } else {
        mappedValue = this.preProcess(sourceValues);
      }
    }
    // If source value (or preprocessed value) is undefined, ignore transforms
    if (transformFunctions && !_.isUndefined(mappedValue)) {
      mappedValue = this.transformUtil.transformValue(mappedValue, transformFunctions);
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
    // Use dotty.search is the path contains wildcards
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
