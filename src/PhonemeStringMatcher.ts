import Phoneme from './models/Phoneme';
import PhonemeMatcher, { FeatureMatcher, PhonemeSymbolMatcher } from './PhonemeMatcher';

// Workaround for the fact that `protected` doesn't quite do what I want
const getCanonical = Symbol('getCanonical');

export default abstract class PhonemeStringMatcher {
    // Pseudo-regex that's dynamic for the subscript characters chosen. Matches repeatable segments.
    private static readonly fakeRegex = {
        *[Symbol.matchAll](str: string) {
            for (let index = 0; index < str.length; ++index) {
                let minCount: number;
                let endIdx = index;
                if (str[index] === '*') {
                    minCount = 0;
                    endIdx = index + 1;
                } else if (RepeatedMatcher.subscripts.includes(str[index])) {
                    const minCountArr: number[] = [];
                    let value: number;
                    while ((value = RepeatedMatcher.subscripts.indexOf(str[endIdx])) >= 0) {
                        minCountArr.push(value);
                        ++endIdx;
                    }
                    minCount = Number(minCountArr.join(''));
                } else {
                    continue;
                }
                const match = /(\[[^\]]*\]|\{[^}]*\}|\([^)]*\)|\S)\s*$/u.exec(
                    str.substring(0, index)
                );
                if (match === null)
                    throw new SyntaxError(`String starts with quantifier: ${str}`);
                match[0] += minCount;
                match.push(String(minCount));
                match.input = str;
                yield match;
                index = endIdx;
            }
        },
    };

    // -1 if no match is found
    abstract matchLength(word: readonly Phoneme[], start?: number): number;

    abstract toString(): string;

    static parse(str: string): PhonemeStringMatcher {
        return PhonemeStringMatcher.parseImpl(str)[getCanonical]();
    }
    
    private static readonly parseImpl = (str: string): PhonemeStringMatcher => {
        str = str.trim();
        if (str === NullMatcher.string || str === '') return NullMatcher.instance;
        if (str === '#') return WordBoundaryMatcher.instance;

        // @ts-expect-error Anything with the right Symbol.matchAll works
        const quantifiers = str.matchAll(PhonemeStringMatcher.fakeRegex);
        let lastEndIdx = 0;
        const items: PhonemeStringMatcher[] = [];
        for (const quantifier of quantifiers) {
            if (quantifier.index == undefined)
                throw new Error('Internal regex error: index is not defined');
            items.push(
                PhonemeStringMatcher.parseImpl(str.substring(lastEndIdx, quantifier.index)),
                new RepeatedMatcher(
                    PhonemeStringMatcher.parseImpl(quantifier[1]),
                    Number(quantifier[2])
                )
            );
            lastEndIdx = quantifier.index + quantifier[0].length;
        }
        if (lastEndIdx !== 0) {
            items.push(PhonemeStringMatcher.parseImpl(str.substring(lastEndIdx)));
            return new CompositePhonemeMatcher(items);
        }

        // Lack of nesting makes this easy to parse
        // TODO: verify that brackets are balanced

        const braceParts = str.split(/[{}]/gu);
        if (braceParts.length % 2 !== 1)
            throw new SyntaxError(`Odd number of braces in string: '${str}'`);
        if (braceParts.length > 1) {
            const parsedSections = braceParts.map((el, i) =>
                i % 2
                    ? PhonemeStringMatcher.parseBraceGroup(el)
                    : PhonemeStringMatcher.parseImpl(el)
            );
            return new CompositePhonemeMatcher(parsedSections);
        }

        const bracketParts = str.split(/[[\]]/gu);
        if (bracketParts.length % 2 !== 1)
            throw new SyntaxError(`Odd number of brackets in string: '${str}'`);
        if (bracketParts.length > 1) {
            const parsedSections = bracketParts.map((el, i) =>
                i % 2
                    ? PhonemeStringMatcher.parseFeatureSet(el)
                    : PhonemeStringMatcher.parseImpl(el)
            );
            return new CompositePhonemeMatcher(parsedSections);
        }

        // TODO: diacritics?
        return new CompositePhonemeMatcher(Array.from(str.replace(/\s+/gu, ''), el => {
            switch (el) {
                case '#': return WordBoundaryMatcher.instance;
                case NullMatcher.string: return NullMatcher.instance;
                default: return new SinglePhonemeStringMatcher(new PhonemeSymbolMatcher(el));
            }
        }));
    };

    private static parseBraceGroup(str: string) {
        return new PhonemeSetMatcher(str.split(',').map(PhonemeStringMatcher.parseImpl));
    }

    private static parseFeatureSet(str: string) {
        const features = str.trim().split(/\s+/gu);
        return new SinglePhonemeStringMatcher(
            new FeatureMatcher(
                new Set(features.flatMap(x => x.startsWith('+') ? [x.substring(1)] : [])),
                new Set(features.flatMap(x => x.startsWith('-') ? [x.substring(1)] : []))
            )
        );
    }

    nextMatch(word: readonly Phoneme[], start = 0): [index: number, length: number] | null {
        for (let i = start; i < word.length; ++i) {
            const match = this.matchLength(word, i);
            if (match >= 0) return [i, match];
        }
        return null;
    }

    // It's not going to return 'this' exactly in all subclasses
    // eslint-disable-next-line @typescript-eslint/prefer-return-this-type
    [getCanonical](): PhonemeStringMatcher {
        return this;
    }
}

export class NullMatcher extends PhonemeStringMatcher {
    static readonly instance = new NullMatcher();
    static string = 'Ø';

    private constructor() {
        super();
    }

    override matchLength(): number {
        return 0;
    }

    override toString(): string {
        return NullMatcher.string;
    }
}

class SinglePhonemeStringMatcher extends PhonemeStringMatcher {
    constructor(readonly base: PhonemeMatcher) {
        super();
    }

    override matchLength(word: readonly Phoneme[], start = 0): number {
        return start < word.length && this.base.matches(word[start]) ? 1 : -1;
    }

    override toString(): string {
        return this.base.toString();
    }
}

abstract class MultipleStringMatcher extends PhonemeStringMatcher {
    protected abstract get empty(): PhonemeStringMatcher;

    constructor(protected matchers: PhonemeStringMatcher[]) {
        super();
    }

    override [getCanonical](): PhonemeStringMatcher {
        let isModified = false as boolean;
        const canonArray = this.matchers.flatMap(el => {
            const c = el[getCanonical]();
            if (c === this.empty) {
                isModified = true;
                return [];
            }
            if (c.constructor === this.constructor) {
                isModified = true;
                return (c as MultipleStringMatcher).matchers;
            }
            isModified ||= (c !== el);
            return [c];
        });
        const base = isModified
            ? new (
                this.constructor as new(matchers: PhonemeStringMatcher[]) => MultipleStringMatcher
            )(canonArray)
            : this;
        switch (base.matchers.length) {
            case 0: return base.empty;
            case 1: return base.matchers[0];
            default: return base;
        }
    }
}

class CompositePhonemeMatcher extends MultipleStringMatcher {
    protected override get empty() {
        return NullMatcher.instance;
    }

    override matchLength(word: readonly Phoneme[], start = 0): number {
        let totalLength = 0;
        for (const matcher of this.matchers) {
            if (totalLength + start > word.length) return -1;
            const matchLength = matcher.matchLength(word, start + totalLength);
            if (matchLength < 0) return -1;
            totalLength += matchLength;
        }
        return totalLength;
    }

    override toString(): string {
        return this.matchers.join('');
    }
}

export class RepeatedMatcher extends PhonemeStringMatcher {
    static subscripts:
    [string, string, string, string, string, string, string, string, string, string]
        = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

    constructor(private readonly base: PhonemeStringMatcher, private readonly minCount = 0) {
        super();
    }

    override matchLength(word: readonly Phoneme[], start = 0): number {
        let totalLength = 0;
        let index = start;
        let count = 0;
        for (;;) {
            const currentLength = this.base.matchLength(word, index);
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
            return baseStr + Array.from(
                String(this.minCount), el => RepeatedMatcher.subscripts[el as `${number}`]
            ).join('');
        }
        return `${baseStr.repeat(this.minCount)}(${baseStr})*`;
    }

    override [getCanonical](): PhonemeStringMatcher {
        const c = this.base[getCanonical]();
        if (c instanceof RepeatedMatcher) {
            if (this.minCount === 0) return c;
            return new RepeatedMatcher(c.base, c.minCount + this.minCount);
        }
        if (this.base === c)
            return this;
        return new RepeatedMatcher(this.base, this.minCount);
    }
}

class PhonemeSetMatcher extends MultipleStringMatcher {
    static readonly empty = new PhonemeSetMatcher([]);

    protected override get empty() {
        return PhonemeSetMatcher.empty;
    }

    override matchLength(
        ...args: [readonly Phoneme[], number] | [readonly Phoneme[]]
    ): number {
        return Math.max(...this.matchers.map(el => el.matchLength.apply(el, args)));
    }

    override toString(): string {
        return `{${this.matchers.join(',')}}`;
    }
}

class WordBoundaryMatcher extends PhonemeStringMatcher {
    static readonly instance = new WordBoundaryMatcher();

    private constructor() {
        super();
    }

    override toString(): string {
        return '#';
    }

    override matchLength(word: readonly Phoneme[], start = 0): number {
        return (start === 0 || start === word.length) ? 0 : -1;
    }
}
