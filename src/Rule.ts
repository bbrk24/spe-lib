import { ReadonlyDeep } from "type-fest";
import Phoneme from "./models/Phoneme";
import PhonemeStringMatcher, { NullMatcher, RepeatedMatcher } from "./PhonemeStringMatcher";
import Language from "./models/Language";
import { ObjectMap } from "./models/misc";

export default class Rule {
    static arrow = '→';

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

    input: PhonemeStringMatcher;
    contextPrefix: PhonemeStringMatcher;
    contextSuffix: PhonemeStringMatcher;
    output: Phoneme | ObjectMap<string, boolean>;
    representation: string;
    language: Language;

    // Convenience properties for RuleSet. Not used in evaluation.
    requiresWordInitial: boolean;
    requiresWordFinal: boolean;

    constructor(str: string, language: Language) {
        this.representation = str;
        this.language = language;
        const arrowSplit = str.split(Rule.arrow);
        this.input = PhonemeStringMatcher.parse(arrowSplit[0]);
        const slashSplit = arrowSplit[1].split('/');
        const outputStr = slashSplit[0].trim();
        if (outputStr.startsWith('[') && outputStr.endsWith(']')) {
            this.output = Object.fromEntries(
                outputStr.substring(1, outputStr.length - 1)
                    .split(/\s+/gu)
                    .map(el => [el.substring(1), el[0] === '+'])
            );
        } else {
            const phoneme = language.phonemes.find(el => el.symbol === outputStr);
            if (!phoneme) throw new Error(`No phoneme for symbol '${phoneme}'`);
            this.output = phoneme;
        }
        const contextSplit = slashSplit[1].split('_').filter(Boolean);
        this.requiresWordInitial = contextSplit[0].includes('#');
        this.contextPrefix = PhonemeStringMatcher.parse(contextSplit[0]);
        this.requiresWordFinal = contextSplit[1].includes('#');
        this.contextSuffix = PhonemeStringMatcher.parse(contextSplit[1]);
    }

    private apply(input: ReadonlyDeep<Phoneme>[]) {
        if (input.length !== 1) throw new Error('Input match is too long');
        if (this.output instanceof Phoneme) return [this.output];
        return [this.language.applyChanges(input[0], this.output)];
    }

    processWord<T extends Phoneme | ReadonlyDeep<Phoneme>>(word: readonly T[]): { changed: boolean, segment: T[] }[] {
        let index = 0;
        const result: { changed: boolean, segment: T[] }[] = [];
        
        while(true) {
            const prevIdx = index; // save this for later
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
            // Advance the index since we know we have a match
            index = suffixIdx;
            // Add the sections to the result
            result.push({ changed: false, segment: word.slice(prevIdx, inputIdx) });
            const inputMatch = word.slice(inputIdx, suffixIdx);
            // Phoneme is not assignable to ReadonlyObjectDeep<Phoneme>, hence the cast
            result.push({ changed: true, segment: this.apply(inputMatch) as T[] });
        }

        result.push({ changed: false, segment: word.slice(index) });

        return result.filter(el => el.changed || el.segment.length);
    }

    toString(): string {
        return this.representation;
    }
};
