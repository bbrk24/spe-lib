import { ReadonlyDeep } from 'type-fest';
import Phoneme from './models/Phoneme';

export default interface PhonemeMatcher {
    matches(phoneme: ReadonlyDeep<Phoneme>): boolean;
    toString(): string;
};

export class PhonemeSymbolMatcher implements PhonemeMatcher {
    private symbol: string;

    constructor(symbol: string) {
        this.symbol = symbol;
    }
    
    matches(phoneme: ReadonlyDeep<Phoneme>): boolean {
        return this.symbol === phoneme.symbol;
    }

    toString(): string {
        return this.symbol;
    }
};

export class FeatureMatcher implements PhonemeMatcher {
    private presentFeatures: Set<string>;
    private absentFeatures: Set<string>;

    constructor(presentFeatures: Set<string>, absentFeatures: Set<string>) {
        this.presentFeatures = presentFeatures;
        this.absentFeatures = absentFeatures;
    }

    matches(phoneme: ReadonlyDeep<Phoneme>): boolean {
        // _.every only works for ArrayLikes, not Iterables
        return [...this.presentFeatures].every(el => phoneme.features.has(el))
            && [...this.absentFeatures].every(el => !phoneme.features.has(el));
    }

    toString(): string {
        const present = Array.from(this.presentFeatures, el => '+' + el);
        const absent = Array.from(this.absentFeatures, el => '-' + el);
        return `[${present.concat(absent).join(' ')}]`;
    }
};
