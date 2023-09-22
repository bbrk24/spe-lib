const Language = require('../dist/models/Language').default;
const Phoneme = require('../dist/models/Phoneme').default;
const FeatureDiff = require('../dist/models/FeatureDiff').default;
const testAssert = require('./testAssert');

const a = new Phoneme('a', []);
const u = new Phoneme('u', ['high']);
const e = new Phoneme('e', ['front']);
const i = new Phoneme('i', ['front', 'high']);

const smolLang = new Language([a, u, e, i]);

testAssert(smolLang.applyChanges(a, new FeatureDiff(['high'], [])), u);
testAssert(smolLang.applyChanges(u, new FeatureDiff(['front'], ['high'])), e);

