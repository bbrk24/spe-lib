import _ from 'lodash';
import Rule from './Rule';
import Phoneme from './models/Phoneme';
import { NullMatcher, RepeatedMatcher } from './PhonemeStringMatcher';
import { Language } from '.';

export default class RuleSet {
    private rules: Rule[];
    representation: string;

    static get arrow() {
        return Rule.arrow;
    }
    static set arrow(str: string) {
        Rule.arrow = str;
    }

    static get null() {
        return NullMatcher.string;
    }
    static set null(str: string) {
        NullMatcher.string = str;
    }

    static get subscripts() {
        return RepeatedMatcher.subscripts;
    }
    static set subscripts(strs: string[]) {
        RepeatedMatcher.subscripts = strs;
    }

    constructor(str: string, language: Language) {
        this.representation = str;
        if (/[()<>]/gu.test(str))
            throw new Error('optional things not implemented')
        this.rules = [new Rule(str, language)];
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
            } else {
                for (let i = result.length - 1; i >= 0; --i) {
                    if (result[i].changed) continue;
                    const newSegments = rule.processWord(result[i].segment);
                    result.splice(i, 1, ...newSegments)
                }
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
