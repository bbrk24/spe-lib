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

Rule.arrow = '>';
const rule1 = new Rule('[-high] > [+high] / _#', smolLang);
const rule2 = new Rule('[+high] > [-high] / _#', smolLang);

const ruleSet = new RuleSet('');
ruleSet.rules = [rule1, rule2];

testAssert(
    ruleSet.process([a, a]),
    [a, u]
);
testAssert(
    ruleSet.process([u, e]),
    [u, i]
);
testAssert(
    ruleSet.process([i, i]),
    [i, e]
);
