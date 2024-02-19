'use strict'

const assert = require('assert')
const fileTypes = require('./fileTypes.js')

describe('fileTypes.js', function () {
  describe('#getOutputTypeForFile()', function () {
    it('should return jpg when passed a compatible filename', function () {
      assert.equal(fileTypes.getOutputTypeForFile('foo/bar/baz.JPG'), 'jpg')
      assert.equal(fileTypes.getOutputTypeForFile('foo/bar/baz.jpg'), 'jpg')
      assert.equal(fileTypes.getOutputTypeForFile('foo/bar/baz.jpeg'), 'jpg')
      assert.equal(fileTypes.getOutputTypeForFile('foo/bar/baz.JPEG'), 'jpg')
      assert.equal(fileTypes.getOutputTypeForFile('foo/bar/baz.crw'), 'jpg')
      assert.equal(fileTypes.getOutputTypeForFile('foo/bar/baz.cr2'), 'jpg')
      assert.equal(fileTypes.getOutputTypeForFile('foo/bar/baz.dng'), 'jpg')
      assert.equal(fileTypes.getOutputTypeForFile('foo/bar/baz.arw'), 'jpg')
      assert.equal(fileTypes.getOutputTypeForFile('foo/bar/baz.heic'), 'jpg')
    })
  })
})
