const assert = require('assert');
const utils = require('./utils.js');

describe('utils.js', function() {
  describe('#getOutputTypeForFile()', function() {
    it('should return jpg when passed a compatible filename', function() {
      assert.equal(utils.getOutputTypeForFile('foo/bar/baz.JPG'), 'jpg');
      assert.equal(utils.getOutputTypeForFile('foo/bar/baz.jpg'), 'jpg');
      assert.equal(utils.getOutputTypeForFile('foo/bar/baz.jpeg'), 'jpg');
      assert.equal(utils.getOutputTypeForFile('foo/bar/baz.JPEG'), 'jpg');
      assert.equal(utils.getOutputTypeForFile('foo/bar/baz.crw'), 'jpg');
      assert.equal(utils.getOutputTypeForFile('foo/bar/baz.cr2'), 'jpg');
      assert.equal(utils.getOutputTypeForFile('foo/bar/baz.dng'), 'jpg');
      assert.equal(utils.getOutputTypeForFile('foo/bar/baz.arw'), 'jpg');
      assert.equal(utils.getOutputTypeForFile('foo/bar/baz.heic'), 'jpg');
    });
  });
});
