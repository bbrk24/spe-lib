import { Language, Phoneme, RuleSet } from './dist';

const a = new Phoneme('a', []);
const u = new Phoneme('u', ['high']);
const e = new Phoneme('e', ['front']);
const i = new Phoneme('i', ['front', 'high']);

const smolLang = new Language([a, u, e, i]);

const rule = new RuleSet(
    '[] → [αhigh] / _[αhigh]',
    smolLang
);

console.log(rule.process([i, a]).join(''));
console.log(rule.process([e, u]).join(''));
