import last from 'lodash/last';
import Rule from './Rule';
import Phoneme from './models/Phoneme';
import PhonemeStringMatcher, { NullMatcher, RepeatedMatcher } from './PhonemeStringMatcher';
import Language from './models/Language';
import FeatureDiff from './models/FeatureDiff';

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
        if (RuleSet.angleBracketRegex.test(str)) {
            throw new SyntaxError(
                `Arrow symbol ${str} could be mistaken for angle-bracketed group`
            ); 
        }
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
    
    /**
     * The phoneme classes abbreviated with a single letter, such as `C` for consonants. Each
     * entry's key is the letter used for it, and the value is the features that symbol stands for.
     * Default value: `{ C: '[-syll]', V: '[+syll]' }`
     */
    static get phonemeClasses(): Map<string, FeatureDiff<string[]>> {
        return PhonemeStringMatcher.phonemeClasses;
    }
    static set phonemeClasses(map: Map<string, FeatureDiff<string[]>>) {
        PhonemeStringMatcher.phonemeClasses = map;
    }

    private readonly rules: Rule[];

    /**
     * Parse out a sound change for a given language.
     * @param str The sound change string to be parsed.
     * @param language The language for which the sound change is applied.
     */
    constructor(str: string, private readonly language: Language) {
        // This should never happen in theory, but in untyped JS it may be easy to forget, and
        // doesn't surface as an error until surprisingly late.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!language)
            throw new TypeError('Missing language argument in RuleSet ctor');

        this.rules = Array.from(RuleSet.makeRuleList(str, language));
    }

    private static *makeRuleList(str: string, language: Language): Generator<Rule, void> {
        // Handle parens
        if (this.parenGroupRegex.test(str)) {
            yield* this.makeRuleList(
                str.replace(this.parenGroupRegex, (_, contents: string) => contents),
                language
            );
            yield* this.makeRuleList(str.replace(this.parenGroupRegex, ''), language);
            return;
        }

        // Handle angle brackets
        if (this.angleBracketRegex.test(str)) {
            yield* this.makeRuleList(
                str.replace(this.angleBracketRegex, (_, contents: string) => contents),
                language
            );
            yield* this.makeRuleList(str.replace(this.angleBracketRegex, ''), language);
            return;
        }

        // Handle greek letters
        const greekLetter = this.greekLetters.find(letter => str.includes(letter));
        if (greekLetter) {
            yield* this.makeRuleList(str.replaceAll(greekLetter, '+'), language);
            yield* this.makeRuleList(str.replaceAll(greekLetter, '-'), language);
            return;
        }

        // Base case
        yield new Rule(str, language);
    }

    /**
     * Evaluate the sound changes for the particular word.
     * @param word A string representing the word to evaluate.
     * @returns The new word after the sound change is applied.
     */
    processString(word: string): string {
        return this.processPhonemeArray(
            Array.from(this.language.segmentWord(word), symbol => {
                const phoneme = this.language.phonemes.find(ph => ph.symbol === symbol);
                if (!phoneme)
                    throw new SyntaxError(`Word '${word}' contains non-phoneme '${symbol}'`);
                return phoneme;
            })
        ).join('');
    }

    /**
     * Evaluate the sound changes for the particular word.
     * @param word The list of phonemes in the word to evaluate.
     * @returns The new word after the sound change is applied.
     */
    processPhonemeArray(word: Phoneme[]): Phoneme[] {
        let result = [{ changed: false, segment: word }];
        for (const rule of this.rules) {
            if (rule.requiresWordInitial && rule.requiresWordFinal && result.length > 1) 
                continue; 
            if (rule.requiresWordFinal) {
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
                if (lastSeg.changed === el.changed) 
                    lastSeg.segment.push(...el.segment);
                else
                    prev.push(el);
                return prev;
            }, []);
        }
        return result.reduce<Phoneme[]>((prev, el) => prev.concat(el.segment), []);
    }

    /**
     * Evaluate the sound changes for the particular word.
     * @param word The list of phonemes in the word to evaluate.
     * @returns The new word after the sound change is applied.
     */
    process(word: Phoneme[]): Phoneme[];
    /**
     * Evaluate the sound changes for the particular word.
     * @param word A string representing the word to evaluate.
     * @returns The new word after the sound change is applied.
     */
    process(word: string): string;

    process(word: Phoneme[] | string): Phoneme[] | string {
        if (Array.isArray(word)) return this.processPhonemeArray(word);
        if (typeof word == 'string') return this.processString(word);
        throw new TypeError('RuleSet#process must be given a string or array');
    }
}
