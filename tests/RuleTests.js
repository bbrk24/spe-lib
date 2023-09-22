const testAssert = require('./testAssert');
const RuleSet = require('../dist/RuleSet').default;
const Rule = require('../dist/Rule').default;
const Phoneme = require('../dist/models/Phoneme').default;
const Language = require('../dist/models/Language').default;

const a = new Phoneme('a', []);
const u = new Phoneme('u', ['high']);
const e = new Phoneme('e', ['front']);
const i = new Phoneme('i', ['front', 'high']);

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
