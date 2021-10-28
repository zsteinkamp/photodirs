'use strict';

module.exports = {
  myMethod: (e) => {
    if (typeof e === 'undefined') {
      throw new Error('e must be defined!');
    }
    return e;
  }
};
