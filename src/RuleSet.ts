import last from 'lodash/last';
import Rule from './Rule';
import Phoneme from './models/Phoneme';
import { NullMatcher, RepeatedMatcher } from './PhonemeStringMatcher';
import Language from './models/Language';

/**
 * A class representing a group of sound-change rules that do not feed into each other.
 * 
 * A group of non-feeding sound changes is represented by a single string, such as
 * `a → b / c<d>_<e>f`.
 */
export default class RuleSet {
    /**
     * The list of strings considered to be Greek letters for the purposes of feature sets like
     * `[αhigh]` (`[+high]` and `[-high]`). You may want to modify this if you have any phonemes
     * that are Greek letters, such as /β/ or /θ/.
     */
    static greekLetters = [...'αβγδεζηθικλμνξοπρσςτυφχψω'];
    
    // Intentionally omitting the /g flag -- all paren groups are independent
    private static readonly parenGroupRegex = /\(([^)]+)\)(?!\*)/u;

    private static readonly angleBracketRegex = /<([^>]+)>/gu;

    /**
     * The character used for the arrow in rules. Defaults to `→`.
     * 
     * Be wary setting this to `>` if you have rules with angle brackets!
     */
    static get arrow(): string {
        return Rule.arrow;
    }
    static set arrow(str: string) {
        Rule.arrow = str;
    }

    /**
     * The string used to represent no sounds. Defaults to `Ø`.
     */
    static get null(): string {
        return NullMatcher.string;
    }
    static set null(str: string) {
        NullMatcher.string = str;
    }

    /**
     * A 10-tuple of strings used to represent subscript digits 0-9. Defaults to
     * `₀,₁,₂,₃,₄,₅,₆,₇,₈,₉`.
     */
    static get subscripts(): typeof RepeatedMatcher.subscripts {
        return RepeatedMatcher.subscripts;
    }
    static set subscripts(strs: typeof RepeatedMatcher.subscripts) {
        RepeatedMatcher.subscripts = strs;
    }

    private readonly rules: Rule[];

    /**
     * Parse out a sound change for a given language.
     * @param str The sound change string to be parsed.
     * @param language The language for which the sound change is applied.s
     */
    constructor(str: string, language: Language) {
        this.rules = Array.from(RuleSet.makeRuleList(str, language));
    }

    private static *makeRuleList(str: string, language: Language): Generator<Rule, void> {
        // Handle parens
        if (RuleSet.parenGroupRegex.test(str)) {
            yield* RuleSet.makeRuleList(
                str.replace(RuleSet.parenGroupRegex, (_, contents: string) => contents),
                language
            );
            yield* RuleSet.makeRuleList(str.replace(RuleSet.parenGroupRegex, ''), language);
            return;
        }

        // Handle angle brackets
        if (RuleSet.angleBracketRegex.test(str)) {
            yield* RuleSet.makeRuleList(
                str.replace(RuleSet.angleBracketRegex, (_, contents: string) => contents),
                language
            );
            yield* RuleSet.makeRuleList(str.replace(RuleSet.angleBracketRegex, ''), language);
            return;
        }

        // Handle greek letters
        const greekLetter = RuleSet.greekLetters.find(letter => str.includes(letter));
        if (greekLetter) {
            yield* RuleSet.makeRuleList(str.replaceAll(greekLetter, '+'), language);
            yield* RuleSet.makeRuleList(str.replaceAll(greekLetter, '-'), language);
            return;
        }

        // Base case
        yield new Rule(str, language);
    }

    /**
     * Evaluate the sound changes for the particular word.
     * @param word The list of phonemes in the word to evaluate.
     * @returns The new word after the sound change is applied.
     */
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
