import last from 'lodash/last';
import Rule from './Rule';
import Phoneme from './models/Phoneme';
import { NullMatcher, RepeatedMatcher } from './PhonemeStringMatcher';
import { Language } from '.';

export default class RuleSet {
    static greekLetters = [...'αβγδεζηθικλμνξοπρσςτυφχψω'];
    
    // Intentionally omitting the /g flag -- all paren groups are independent
    private static readonly parenGroupRegex = /\(([^)]+)\)(?!\*)/u;

    private static readonly angleBracketRegex = /<([^>]+)>/gu;

    static get arrow(): string {
        return Rule.arrow;
    }
    static set arrow(str: string) {
        Rule.arrow = str;
    }

    static get null(): string {
        return NullMatcher.string;
    }
    static set null(str: string) {
        NullMatcher.string = str;
    }

    static get subscripts(): string[] {
        return RepeatedMatcher.subscripts;
    }
    static set subscripts(strs: string[]) {
        RepeatedMatcher.subscripts = strs;
    }

    private readonly rules: Rule[];

    constructor(readonly representation: string, language: Language) {
        this.rules = RuleSet.makeRuleList(representation, language);
    }

    private static makeRuleList(str: string, language: Language): Rule[] {
        // Handle parens
        if (RuleSet.parenGroupRegex.test(str)) {
            return [
                ...RuleSet.makeRuleList(
                    str.replace(RuleSet.parenGroupRegex, (_, contents: string) => contents),
                    language
                ),
                ...RuleSet.makeRuleList(str.replace(RuleSet.parenGroupRegex, ''), language),
            ];
        }

        // Handle angle brackets
        if (RuleSet.angleBracketRegex.test(str)) {
            return [
                ...RuleSet.makeRuleList(
                    str.replace(RuleSet.angleBracketRegex, (_, contents: string) => contents),
                    language
                ),
                ...RuleSet.makeRuleList(str.replace(RuleSet.angleBracketRegex, ''), language),
            ];
        }

        // Handle greek letters
        const greekLetter = RuleSet.greekLetters.find(letter => str.includes(letter));
        if (greekLetter) {
            return [
                ...RuleSet.makeRuleList(str.replaceAll(greekLetter, '+'), language),
                ...RuleSet.makeRuleList(str.replaceAll(greekLetter, '-'), language),
            ];
        }

        // Base case
        return [new Rule(str, language)];
    }

    process(word: Phoneme[]): Phoneme[] {
        let result = [{ changed: false, segment: word }];
        for (const rule of this.rules) {
            if (rule.requiresWordInitial && rule.requiresWordFinal && result.length > 1)
                continue;
            else if (rule.requiresWordFinal) {
                const { changed, segment } = last(result) ?? { changed: true, segment: [] };
                if (changed) continue;
                result.pop();
                result.push(...rule.processWord(segment));
            } else if (rule.requiresWordInitial) {
                const { changed, segment } = result[0] ?? { changed: true, segment: [] };
                if (changed) continue;
                result.shift();
                result = rule.processWord(segment).concat(result);
            } else {
                for (let i = result.length - 1; i >= 0; --i) {
                    if (result[i].changed) continue;
                    const newSegments = rule.processWord(result[i].segment);
                    result.splice(i, 1, ...newSegments);
                }
            }
            // Merge adjacent sections with the same "changed" status
            result = result.reduce<typeof result>((prev, el) => {
                const lastSeg = last(prev);
                if (!lastSeg) return [el];
                if (lastSeg.changed === el.changed) {
                    lastSeg.segment.push(...el.segment);
                } else {
                    prev.push(el);
                }
                return prev;
            }, []);
        }
        return result.reduce<Phoneme[]>((prev, el) => prev.concat(el.segment), []);
    }
}
