'use strict';

const _ = require('lodash');

class TransformUtil {
  constructor(transformSource) {
    this.transformSource = transformSource;
  }

  /**
   * Checks conditions for given condition functions objects
   *
   * @param sources value(s) passed to the condition functions (_source)
   * @param conditionFunctionObjects condition function object(s), e.g.
   *                                 [{ alwaysTrue: [] }, { someCondition: [1, 2] }]
   * @returns true if ALL conditions are met
   */
  checkCondition(sources, conditionFunctionObjects) {
    return [].concat(conditionFunctionObjects).map(conditionFunctionObject => {
      const conditionFunctionName = Object.keys(conditionFunctionObject)[0];
      try {
        return this._runFunction(conditionFunctionObject, sources);
      } catch (error) {
        console.warn(`Condition (${conditionFunctionName}): ${error.message}`);
        return false;
      }
    }).every(conditionResult => conditionResult === true);
  }

  /**
   * Checks conditional transform functions
   *
   * @param sources value(s) passed to the condition functions (_source)
   * @param transformFunctionObject function objects with or without conditions, e.g.
   *        With conditions:        [
   *                                  { _condition: { someCondition1: [] } }, _transform: [...] }
   *                                  { _condition: { someCondition2: [] } }, _transform: [...] }
   *                                ]
   *        Without conditions:     [
   *                                  { transform1: [] }
   *                                  { transform2: [] }
   *                                ]
   * @returns resolved transforms (for conditional transforms, the first match is returned)
   */
  resolveTransformConditions(sources, transformFunctionObject) {
    const transformFunctionObjects = [].concat(transformFunctionObject || []);
    const conditionalTransforms = transformFunctionObjects.filter(
      functionObject => !_.isUndefined(functionObject._condition));
    const normalTransforms = _.difference(transformFunctionObject, conditionalTransforms);
    if (conditionalTransforms.length > 0 && normalTransforms.length > 0) {
      /**
       * The following is not allowed (mixing of conditional and normal transforms)
       * [
       * { _condition: { someCondition1: [] } }, _transform: [...] },
       * { [{ transform1: [] }, { transform2: [] }] }
       * ]
       */
      throw new Error('Mixing of conditional transforms and normal transforms not allowed');
    }
    if (conditionalTransforms.length === 0) {
      return transformFunctionObjects;
    }
    // If multiple conditions are met, the first will be used
    return conditionalTransforms.map(functionObject => {
      const conditionMet = this.checkCondition(sources, functionObject._condition);
      return conditionMet ? functionObject._transform : undefined;
    }).filter(functionObject => functionObject !== undefined)[0];
  }

  /**
   * Transforms given value using the passed transform function objects
   */
  transformValue(value, transformFunctionObjects) {
    let transformedValue = value;
    try {
      [].concat(transformFunctionObjects).forEach(transformFunctionObject => {
        const transformFunctionName = Object.keys(transformFunctionObject)[0];
        try {
          transformedValue = this._runFunction(transformFunctionObject, transformedValue);
        } catch (transformError) {
          throw new Error(`Transform (${transformFunctionName}): ${transformError.message}`);
        }
      });
    } catch (error) {
      console.warn(error.message);
      // On any error, undefined is returned (this causes the default value to be used)
      transformedValue = undefined;
    }
    return transformedValue;
  }

  /**
   * Runs the given transform function object
   */
  _runFunction(functionObject, inputValue) {
    // { functionName: ['param1', 'param2'] }
    let functionName = Object.keys(functionObject)[0];
    const parameters = functionObject[functionName];
    // Check if function is inversed (starts with !)
    const isInversed = TransformUtil._checkInverseFunction(functionName).isInversed;
    functionName = TransformUtil._checkInverseFunction(functionName).functionName;
    // Transform functions are called with the transform source as their context
    // parameters: (previousTransformValue, param1, param2, ...)
    const transformedValue = this.transformSource[functionName].apply(
      this.transformSource, ([inputValue].concat(parameters)));
    // Inverse only applies when booleans are returned
    const shouldInverseTransformedValue = isInversed && _.isBoolean(transformedValue);
    return shouldInverseTransformedValue ? !transformedValue : transformedValue;
  }

  static _checkInverseFunction(functionName) {
    if (functionName.startsWith('!')) {
      // Note: replace only replaces first occurrence
      return { isInversed: true, functionName: functionName.replace('!', '') };
    }
    return { isInversed: false, functionName };
  }
}

module.exports = TransformUtil;
