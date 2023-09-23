import Phoneme from './models/Phoneme';
import PhonemeStringMatcher, { NullMatcher } from './PhonemeStringMatcher';
import Language from './models/Language';
import FeatureDiff from './models/FeatureDiff';
import zip from 'lodash/zip';

export default class Rule {
    static arrow = '→';

    private readonly input: PhonemeStringMatcher;
    private readonly contextPrefix: PhonemeStringMatcher;
    private readonly contextSuffix: PhonemeStringMatcher;
    private readonly output: readonly (FeatureDiff<string[]> | Phoneme | null)[];

    // Convenience properties for RuleSet. Not used in evaluation.
    readonly requiresWordInitial: boolean;
    readonly requiresWordFinal: boolean;

    constructor(str: string, private readonly language: Language) {
        const arrowSplit = str.split(Rule.arrow);
        this.input = PhonemeStringMatcher.parse(arrowSplit[0]);
        const slashSplit = arrowSplit[1].split('/');
        const contextSplit = slashSplit[1].split('_').filter(Boolean);
        this.requiresWordInitial = contextSplit[0].includes('#');
        this.contextPrefix = PhonemeStringMatcher.parse(contextSplit[0]);
        contextSplit[1] ??= '';
        this.requiresWordFinal = contextSplit[1].includes('#');
        this.contextSuffix = PhonemeStringMatcher.parse(contextSplit[1]);
        const outputStr = slashSplit[0].trim();
        this.output = this.parseOutputStr(outputStr);
    }

    private parseOutputStr(str: string): (FeatureDiff<string[]> | Phoneme | null)[] {
        // TODO: verify that brackets are balanced
        const parts = str.split(/[[\]]/gu);
        if (parts.length % 2 !== 1)
            throw new SyntaxError(`Odd number of brackets in string: '${str}'`);
        return parts.flatMap<FeatureDiff<string[]> | Phoneme | null>((el, i) => {
            el = el.trim();
            if (i % 2) {
                const features = str.substring(1, str.length - 1).trim().split(/\s+/gu);
                return [
                    new FeatureDiff(
                        features.flatMap(x => x.startsWith('+') ? [x.substring(1)] : []),
                        features.flatMap(x => x.startsWith('-') ? [x.substring(1)] : [])
                    ),
                ];
            }
            return Array.from(el.replace(/\s+/gu, ''), c => {
                if (c === NullMatcher.string) return null;
                if (PhonemeStringMatcher.phonemeClasses.has(el))
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    return PhonemeStringMatcher.phonemeClasses.get(el)!;
                const phoneme = this.language.phonemes.find(ph => ph.symbol === c);
                if (!phoneme) throw new Error(`No phoneme with symbol '${c}'`);
                return phoneme;
            });
        });
    }

    private apply(input: Phoneme[]) {
        if (!this.output.some(el => el instanceof FeatureDiff))
            return this.output.filter(Boolean) as Phoneme[];
        if (input.length !== this.output.length)
            throw new Error('Length mismatch');
        return zip(input, this.output)
            .flatMap(([i, o]) =>
                // It will only ever be undefined if the lengths are different
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                o == null ? [] : o instanceof Phoneme ? [o] : [this.language.applyChanges(i!, o)]
            );
    }

    processWord(word: readonly Phoneme[]): { changed: boolean, segment: Phoneme[] }[] {
        let index = 0;
        let lastMatchIdx = 0;
        const result: { changed: boolean, segment: Phoneme[] }[] = [];
        
        for (;;) {
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
            result.push({ changed: true, segment: this.apply(inputMatch) });
            // Advance the index since we know we have a match
            index = suffixIdx;
            lastMatchIdx = index;
        }

        result.push({ changed: false, segment: word.slice(lastMatchIdx) });

        return result.filter(el => el.changed || el.segment.length);
    }

    toString(): string {
        return `${this.input.toString()} ${Rule.arrow} ${this.output.join('')} / ${
            this.contextPrefix instanceof NullMatcher ? '' : this.contextPrefix.toString()
        }_${
            this.contextSuffix instanceof NullMatcher ? '' : this.contextSuffix.toString()
        }`;
    }
}
