const assert = require('node:assert');
const { SCHOOL_LEVELS, getLevelByCode, getLevelByModuleNumber } = require('./levelConstants');

function testLevelConstants() {
    console.log('Running tests for levelConstants.js...');

    // Test SCHOOL_LEVELS array
    assert.strictEqual(SCHOOL_LEVELS.length, 6, 'Should have 6 levels');
    assert.strictEqual(SCHOOL_LEVELS[0].name, 'Pastoreados en su amor', 'First level name mismatch');

    // Test getLevelByCode
    const level1A = getLevelByCode('N1A');
    assert.ok(level1A, 'Should find level N1A');
    assert.strictEqual(level1A.name, 'Pastoreados en su amor');

    const levelNull = getLevelByCode('XX');
    assert.strictEqual(levelNull, undefined, 'Should return undefined for invalid code');

    // Test getLevelByModuleNumber
    const level2 = getLevelByModuleNumber(2);
    assert.ok(level2, 'Should find module number 2');
    assert.strictEqual(level2.code, 'N1B');

    console.log('All tests passed for levelConstants.js!');
}

try {
    testLevelConstants();
} catch (error) {
    console.error('Tests failed:', error.message);
    process.exit(1);
}
