const Language = require('../dist/models/Language').default;
const Phoneme = require('../dist/models/Phoneme').default;
const testAssert = require('./testAssert');

const a = new Phoneme('a', []);
const u = new Phoneme('u', ['high']);
const e = new Phoneme('e', ['front']);
const i = new Phoneme('i', ['front', 'high']);

const smolLang = new Language([a, u, e, i]);

testAssert(smolLang.applyChanges(a, { high: true }), u);
testAssert(smolLang.applyChanges(u, { front: true, high: false }), e);

