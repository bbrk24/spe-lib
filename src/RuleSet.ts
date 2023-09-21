import Rule from './Rule';
import Phoneme from './models/Phoneme';

export default class RuleSet {
    rules: Rule[];
    representation: string;

    constructor(str: string) {
        this.representation = str;
        // TODO: rules
        this.rules = [];
    }

    process(word: readonly Phoneme[]): Phoneme[] {
        let result = [{ changed: false, segment: word }];
        for (const rule of this.rules) {
            if (rule.requiresWordInitial && rule.requiresWordFinal && result.length > 1)
                continue;
            else if (rule.requiresWordFinal) {
                // FIXME: empty result?
                const { changed, segment } = result.pop()!;
                if (changed) continue;
                result.push(...rule.processWord(segment));
            } else if (rule.requiresWordInitial) {
                // FIXME: empty result?
                const { changed, segment } = result.shift()!;
                if (changed) continue;
                // @ts-expect-error wtf
                result = rule.processWord(segment).concat(result);
            }
        }
        return result.reduce<Phoneme[]>((prev, el) => prev.concat(el.segment), []);
    }
};
