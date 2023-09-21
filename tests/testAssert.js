const isEqual = require('lodash/isEqual');

module.exports = function testAssert(first, second) {
    if (!isEqual(first, second))
        throw new Error(`Test failed: ${first} != ${second}`);
};
