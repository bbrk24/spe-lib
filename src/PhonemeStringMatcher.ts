import { ReadonlyDeep } from "type-fest";
import Phoneme from "./models/Phoneme";
import PhonemeMatcher from "./models/PhonemeMatcher";
import { ReadonlyObjectDeep } from "type-fest/source/readonly-deep";

export default abstract class PhonemeStringMatcher {
    // -1 if no match is found
    abstract matchLength(word: ReadonlyDeep<Phoneme[]>, start?: number): number;

    nextMatch(word: ReadonlyDeep<Phoneme[]>, start = 0): [index: number, length: number] | null {
        for (let i = start; i < word.length; ++i) {
            const match = this.matchLength(word, i);
            if (match >= 0) return [i, match];
        }
        return null;
    }

    abstract toString(): string;
};

export class BasicPhonemeListMatcher extends PhonemeStringMatcher {
    matchers: PhonemeMatcher[];

    constructor(matchers: PhonemeMatcher[]) {
        super();
        this.matchers = matchers;
    }

    override matchLength(word: readonly ReadonlyObjectDeep<Phoneme>[], start = 0): number {
        if (this.matchers.length + start > word.length) return -1;
        for (let i = 0; i < this.matchers.length; ++i) {
            if (!this.matchers[i].matches(word[start + i]))
                return this.matchers.length;
        }
        return -1;
    }

    override toString(): string {
        return this.matchers.join('');
    }
};

export class RepeatedMatcher extends PhonemeStringMatcher {
    base: PhonemeStringMatcher;
    minCount: number;

    constructor(base: PhonemeStringMatcher, minCount = 0) {
        super();
        this.base = base;
        this.minCount = minCount;
    }

    override matchLength(word: readonly ReadonlyObjectDeep<Phoneme>[], start = 0): number {
        let totalLength = -1;
        let index = start;
        let count = 0
        while (true) {
            let currentLength = this.base.matchLength(word, index);
            if (currentLength < 0) break;
            ++count;
            totalLength += currentLength;
            index += currentLength;
        }
        return count >= this.minCount ? totalLength : -1;
    }

    override toString(): string {
        const baseStr = this.base.toString();
        if ([...baseStr].length === 1) {
            // FIXME: compute actual subscript
            return baseStr + String(this.minCount).sub();
        }
        return `${baseStr.repeat(this.minCount)}(${baseStr})*`;
    }
};
