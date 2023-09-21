import _ from 'lodash';
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
                const { changed, segment } = _.last(result) ?? { changed: true, segment: [] };
                if (changed) continue;
                result.pop();
                result.push(...rule.processWord(segment));
            } else if (rule.requiresWordInitial) {
                const { changed, segment } = result[0] ?? { changed: true, segment: [] };
                if (changed) continue;
                result.shift();
                // @ts-expect-error wtf
                result = rule.processWord(segment).concat(result);
            }
            // Merge adjacent sections with the same "changed" status
            result = result.reduce<typeof result>((prev, el) => {
                const lastSeg = _.last(prev);
                if (!lastSeg) return [el];
                if (lastSeg.changed === el.changed) {
                    // @ts-expect-error shut up
                    lastSeg.segment.push(...el.segment);
                } else {
                    prev.push(el);
                }
                return prev;
            }, [])
        }
        return result.reduce<Phoneme[]>((prev, el) => prev.concat(el.segment), []);
    }
};
