import { ReadonlyDeep } from "type-fest";
import Phoneme from "./models/Phoneme";
import PhonemeStringMatcher, { BasicPhonemeListMatcher } from "./PhonemeStringMatcher";

export default class Rule {
    input: PhonemeStringMatcher;
    contextPrefix: PhonemeStringMatcher;
    requiresWordInitial: boolean;
    contextSuffix: PhonemeStringMatcher;
    requiresWordFinal;
    apply: (match: ReadonlyDeep<Phoneme[]>) => Phoneme[];
    representation: string;

    constructor(str: string) {
        this.representation = str;
        // TODO: parsing
        this.input = new BasicPhonemeListMatcher([]);
        this.contextPrefix = new BasicPhonemeListMatcher([]);
        this.requiresWordInitial = false;
        this.contextSuffix = new BasicPhonemeListMatcher([]);
        this.requiresWordFinal = false;
        this.apply = () => [];
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
            if (this.requiresWordInitial && prefixMatchIdx !== 0) break;
            // Increment the index in case this instance of the prefix fails
            index = prefixMatchIdx + 1;
            // See if the input matches too
            const inputIdx = prefixMatchIdx + prefixMatchLength;
            const inputLength = this.input.matchLength(word, inputIdx);
            if (inputLength < 0) continue;
            // See if the suffix matches as well
            const suffixIdx = inputIdx + inputLength;
            const suffixLength = this.contextSuffix.matchLength(word, suffixIdx);
            if (suffixLength < 0 || (this.requiresWordFinal && suffixIdx + suffixLength !== word.length)) continue;
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
