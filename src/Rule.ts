import { ReadonlyDeep } from "type-fest";
import Phoneme from "./models/Phoneme";
import PhonemeStringMatcher from "./PhonemeStringMatcher";
import Language from "./models/Language";
import FeatureDiff from "./models/FeatureDiff";
import zip from "lodash/zip";

export default class Rule {
    static arrow = '→';

    input: PhonemeStringMatcher;
    contextPrefix: PhonemeStringMatcher;
    contextSuffix: PhonemeStringMatcher;
    output: (Phoneme | FeatureDiff<string[]>)[];
    language: Language;

    // Convenience properties for RuleSet. Not used in evaluation.
    requiresWordInitial: boolean;
    requiresWordFinal: boolean;

    constructor(str: string, language: Language) {
        this.language = language;
        const arrowSplit = str.split(Rule.arrow);
        this.input = PhonemeStringMatcher.parse(arrowSplit[0]);
        const slashSplit = arrowSplit[1].split('/');
        const contextSplit = slashSplit[1].split('_').filter(Boolean);
        this.requiresWordInitial = contextSplit[0].includes('#');
        this.contextPrefix = PhonemeStringMatcher.parse(contextSplit[0]);
        this.requiresWordFinal = contextSplit[1].includes('#');
        this.contextSuffix = PhonemeStringMatcher.parse(contextSplit[1]);
        const outputStr = slashSplit[0].trim();
        this.output = this.parseOutputStr(outputStr);
    }

    private parseOutputStr(str: string): (Phoneme | FeatureDiff<string[]>)[] {
        // TODO: verify that brackets are balanced
        const parts = str.split(/[\[\]]/gu);
        if (parts.length % 2 !== 1)
            throw new SyntaxError(`Odd number of brackets in string: '${str}'`);
        return parts.flatMap<Phoneme | FeatureDiff<string[]>>((el, i) => {
            el = el.trim();
            if (i % 2) {
                const features = str.substring(1, str.length - 1).trim().split(/\s+/gu);
                return [
                    new FeatureDiff(
                        features.flatMap(x => x[0] === '+' ? [x.substring(1)] : []),
                        features.flatMap(x => x[0] === '-' ? [x.substring(1)] : [])
                    )
                    ]
            }
            return Array.from(el, c => {
                const phoneme = this.language.phonemes.find(ph => ph.symbol === c)
                if (!phoneme) throw new Error(`No phoneme with symbol '${c}'`);
                return phoneme;
            });
        });
    };

    private apply(input: ReadonlyDeep<Phoneme>[]) {
        if (input.length !== this.output.length)
            throw new Error('Length mismatch');
        return zip(input, this.output)
            .map(([i, o]) =>
                o instanceof Phoneme ? o : this.language.applyChanges(i!, o!)
            );
    }

    processWord<T extends Phoneme | ReadonlyDeep<Phoneme>>(word: readonly T[]): { changed: boolean, segment: T[] }[] {
        let index = 0;
        let lastMatchIdx = 0;
        const result: { changed: boolean, segment: T[] }[] = [];
        
        while(true) {
            // See if the context prefix has any matches
            const prefixMatch = this.contextPrefix.nextMatch(word, index);
            if (!prefixMatch) break;
            const [prefixMatchIdx, prefixMatchLength] = prefixMatch;
            // Increment the index in case this instance of the prefix fails
            index = prefixMatchIdx + 1;
            // See if the input matches too
            const inputIdx = prefixMatchIdx + prefixMatchLength;
            const inputLength = this.input.matchLength(word, inputIdx);
            if (inputLength < 0) continue;
            // See if the suffix matches as well
            const suffixIdx = inputIdx + inputLength;
            const suffixLength = this.contextSuffix.matchLength(word, suffixIdx);
            if (suffixLength < 0) continue;
            // Add the sections to the result
            result.push({ changed: false, segment: word.slice(lastMatchIdx, inputIdx) });
            const inputMatch = word.slice(inputIdx, suffixIdx);
            // Phoneme is not assignable to ReadonlyObjectDeep<Phoneme>, hence the cast
            result.push({ changed: true, segment: this.apply(inputMatch) as T[] });
            // Advance the index since we know we have a match
            index = suffixIdx;
            lastMatchIdx = index;
        }

        result.push({ changed: false, segment: word.slice(lastMatchIdx) });

        return result.filter(el => el.changed || el.segment.length);
    }

    toString(): string {
        return `${this.input} ${Rule.arrow} ${this.output.join('')} / ${this.contextPrefix}_${this.contextSuffix}`
    }
};
