import Phoneme from './models/Phoneme';
import FeatureDiff from './models/FeatureDiff';

export default interface PhonemeMatcher {
    matches: (phoneme: Phoneme) => boolean;
    toString: () => string;
}

export class PhonemeSymbolMatcher implements PhonemeMatcher {
    constructor(private readonly symbol: string) {
        this.symbol = symbol;
    }
    
    matches(phoneme: Phoneme): boolean {
        return this.symbol === phoneme.symbol;
    }

    toString(): string {
        return this.symbol;
    }
}

export class FeatureMatcher extends FeatureDiff<Set<string>> implements PhonemeMatcher {
    matches(phoneme: Phoneme): boolean {
        // _.every only works for ArrayLikes, not Iterables
        return [...this.presentFeatures].every(el => phoneme.features.has(el))
            && [...this.absentFeatures].every(el => !phoneme.features.has(el));
    }
}
