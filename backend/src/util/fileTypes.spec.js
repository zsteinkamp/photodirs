'use strict'

import { equal } from 'assert'
import { getOutputTypeForFile } from './fileTypes.js'

describe('fileTypes.js', function () {
  describe('#getOutputTypeForFile()', function () {
    it('should return jpg when passed a compatible filename', function () {
      equal(getOutputTypeForFile('foo/bar/baz.JPG'), 'jpg')
      equal(getOutputTypeForFile('foo/bar/baz.jpg'), 'jpg')
      equal(getOutputTypeForFile('foo/bar/baz.jpeg'), 'jpg')
      equal(getOutputTypeForFile('foo/bar/baz.JPEG'), 'jpg')
      equal(getOutputTypeForFile('foo/bar/baz.crw'), 'jpg')
      equal(getOutputTypeForFile('foo/bar/baz.cr2'), 'jpg')
      equal(getOutputTypeForFile('foo/bar/baz.dng'), 'jpg')
      equal(getOutputTypeForFile('foo/bar/baz.arw'), 'jpg')
      equal(getOutputTypeForFile('foo/bar/baz.heic'), 'jpg')
    })
  })
})
