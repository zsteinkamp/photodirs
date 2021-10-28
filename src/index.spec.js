const assert = require('assert');
const index = require('./index.js');

describe('index.js', function() {
  describe('#myMethod()', function() {
    it('should throw when passed undefined', function() {
      assert.throws(() => { index.myMethod(undefined); });
    });
    it('should return -1 when passed -1', function() {
      assert.equal(index.myMethod(-1), -1);
    });
  });
});
