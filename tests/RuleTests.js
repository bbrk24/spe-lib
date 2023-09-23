const testAssert = require('./testAssert');
const RuleSet = require('../dist/RuleSet').default;
const Phoneme = require('../dist/models/Phoneme').default;
const Language = require('../dist/models/Language').default;

const a = new Phoneme('a', ['syll']);
const u = new Phoneme('u', ['syll', 'high']);
const e = new Phoneme('e', ['syll', 'front']);
const i = new Phoneme('i', ['syll', 'front', 'high']);

const smolLang = new Language([a, u, e, i]);

const ruleSet = new RuleSet('[-high] → [+high] / _#', smolLang);

testAssert(
    ruleSet.process([a, a]),
    [a, u]
);
testAssert(
    ruleSet.process([u, e]),
    [u, i]
);

const ruleSet2 = new RuleSet('i → [-high] / _[-high]', smolLang);

testAssert(
    ruleSet2.process([i, a]),
    [e, a]
)

const ruleSet3 = new RuleSet('i₂ → i / _', smolLang);

testAssert(
    ruleSet3.process([i, i, i, i]),
    [i]
);

const p = new Phoneme('p', []);
const f = new Phoneme('f', ['continuant']);

const lessSmolLang = new Language([a, e, i, u, p, f]);

const ruleSet4 = new RuleSet('C → [+continuant] / V_V', lessSmolLang);

testAssert(
    ruleSet4.process([a, p, a]),
    [a, f, a]
);
