'use strict';

const chai = require('chai');
const expect = chai.expect;

const TransformUtil = require('../src/transform-util');

const transformSource = {
  add: (source, parameter) => source + parameter,
  addOne: source => source + 1,
  fail: () => {
    throw new Error('forced fail');
  },
  returnTrue: () => true,
  returnFalse: () => false,
  sum: (source, parameter1, parameter2) => source + parameter1 + parameter2,
  testCondition: (source, parameter) => parameter
};

const transformUtil = new TransformUtil(transformSource);

describe('TransformUtil', function () {
  it('should correctly check single condition', function () {
    const trueCondition = { returnTrue: [] };
    const falseCondition = { returnFalse: [] };
    expect(transformUtil.checkCondition({}, trueCondition, transformSource)).to.equal(true);
    expect(transformUtil.checkCondition({}, falseCondition, transformSource)).to.equal(
      false);
  });

  it('should correctly check multiple conditions', function () {
    const trueCondition = { returnTrue: [] };
    const falseCondition = { returnFalse: [] };
    expect(transformUtil.checkCondition({}, [trueCondition, trueCondition], transformSource))
      .to.equal(true);
    expect(transformUtil.checkCondition({}, [falseCondition, trueCondition],
      transformSource)).to.equal(false);
    expect(transformUtil.checkCondition({}, [falseCondition, falseCondition],
      transformSource)).to.equal(false);
  });

  it('should correctly check inverted conditions', function () {
    const invertedTrueCondition = { '!returnTrue': [] };
    const invertedFalseCondition = { '!returnFalse': [] };
    expect(transformUtil.checkCondition({}, invertedTrueCondition, transformSource)).to.equal(
      false);
    expect(transformUtil.checkCondition({}, invertedFalseCondition, transformSource)).to.equal(
      true);
    expect(transformUtil.checkCondition({}, [invertedTrueCondition, invertedTrueCondition],
      transformSource)).to.equal(false);
    expect(transformUtil.checkCondition({}, [invertedFalseCondition, invertedTrueCondition],
      transformSource)).to.equal(false);
    expect(transformUtil.checkCondition({}, [invertedFalseCondition, invertedFalseCondition],
      transformSource)).to.equal(true);
  });

  it('should correctly check conditions with parameters', function () {
    const trueCondition = { testCondition: [true] };
    const falseCondition = { testCondition: [false] };
    expect(transformUtil.checkCondition({}, [trueCondition, trueCondition], transformSource))
      .to.equal(true);
    expect(transformUtil.checkCondition({}, [falseCondition, trueCondition],
      transformSource)).to.equal(false);
    expect(transformUtil.checkCondition({}, [falseCondition, falseCondition],
      transformSource)).to.equal(false);
  });

  it('should return false when condition fails', function () {
    const failCondition = { fail: [] };
    expect(transformUtil.checkCondition({}, failCondition, transformSource)).to.equal(false);
  });

  it('should correctly transform value', function () {
    const addOne = { addOne: [] };
    expect(transformUtil.transformValue(1, addOne, transformSource)).to.equal(2);
  });

  it('should correctly transform value with parameter', function () {
    const add = { add: [4] };
    expect(transformUtil.transformValue(1, add, transformSource)).to.equal(5);
  });

  it('should correctly transform value with multiple parameters', function () {
    const sum = { sum: [4, 2] };
    expect(transformUtil.transformValue(1, sum, transformSource)).to.equal(7);
  });

  it('should return undefined when transform fails', function () {
    const fail = { fail: [] };
    expect(transformUtil.transformValue(1, fail, transformSource)).to.equal(undefined);
  });

  it('should invert bool results', function () {
    const returnTrue = { '!returnTrue': [] };
    expect(transformUtil.transformValue({}, returnTrue, transformSource)).to.equal(false);
  });

  it('should not pass value when function is prefixed with @', function () {
    const add = { '@add': [10, 10] };
    expect(transformUtil.transformValue(1, add, transformSource)).to.equal(20);
  });

  it('should run multiple transform functions', function () {
    const transforms = [
      { add: [1] },
      { add: [2] },
      { add: [3] }
    ];
    expect(transformUtil.transformValue(1, transforms, transformSource)).to.equal(7);
  });

  it('should return undefined when one of multiple transform functions fails', function () {
    const transforms = [
      { add: [1] },
      { fail: [] },
      { add: [3] }
    ];
    expect(transformUtil.transformValue(1, transforms, transformSource)).to.equal(undefined);
  });
});
