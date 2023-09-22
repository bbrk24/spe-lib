import { ReadonlyDeep } from 'type-fest';
import Phoneme from './models/Phoneme';
import FeatureDiff from './models/FeatureDiff';

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

export class FeatureMatcher extends FeatureDiff<Set<string>> implements PhonemeMatcher {
    matches(phoneme: ReadonlyDeep<Phoneme>): boolean {
        // _.every only works for ArrayLikes, not Iterables
        return [...this.presentFeatures].every(el => phoneme.features.has(el))
            && [...this.absentFeatures].every(el => !phoneme.features.has(el));
    }
};
