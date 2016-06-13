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
      // Syntax: { functionName: ['param1', 'param2'] }
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
   * Transforms given value using the passed transform function objects
   */
  transformValue(value, transformFunctionObjects) {
    let transformedValue = value;
    try {
      [].concat(transformFunctionObjects).forEach(transformFunctionObject => {
        // Syntax: { functionName: ['param1', 'param2'] }
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
    // Syntax: { functionName: ['param1', 'param2'] }
    let functionName = Object.keys(functionObject)[0];
    const parameters = functionObject[functionName];
    const prefix = TransformUtil._checkFunctionPrefix(functionName);
    functionName = prefix.functionNameWithoutPrefix;
    // Transform functions are called with the transform source as their context
    // parameters: (previousTransformValue, param1, param2, ...)
    // @ causes the first parameter to be left out: (param1, param2)
    const allParameters = [inputValue].concat(parameters);
    const transformedValue = this.transformSource[functionName].apply(this.transformSource,
      prefix.isAt ? _.slice(allParameters, 1) : allParameters);
    // Inverse only applies when booleans are returned
    const shouldInverseTransformedValue = prefix.isInversed && _.isBoolean(transformedValue);
    return shouldInverseTransformedValue ? !transformedValue : transformedValue;
  }


  /**
   * "@function" can be used to override the first parameter of a transform function / condition
   * "!function" can be used to invert a boolean result
   */
  static _checkFunctionPrefix(functionName) {
    let functionNameWithoutPrefix = functionName;
    let isAt = false;
    let isInversed = false;
    // Check if functionName starts with @ or !@
    if ((/^(@|!@)/).test(functionName)) {
      isAt = true;
      // Note: replace only replaces first occurrence
      functionNameWithoutPrefix = functionNameWithoutPrefix.replace('@', '');
    }
    // Check if functionName starts with ! or @!
    if ((/^(!|@!)/).test(functionName)) {
      isInversed = true;
      functionNameWithoutPrefix = functionNameWithoutPrefix.replace('!', '');
    }
    return { isAt, isInversed, functionNameWithoutPrefix };
  }
}

module.exports = TransformUtil;
