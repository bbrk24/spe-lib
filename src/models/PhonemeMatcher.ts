import { ReadonlyDeep } from 'type-fest';
import Phoneme from './Phoneme';
import _ from 'lodash';

export default interface PhonemeMatcher {
    matches(phoneme: ReadonlyDeep<Phoneme>): boolean;
    toString(): string;
};

export class ExactPhonemeMatcher implements PhonemeMatcher {
    private phoneme: Phoneme;

    constructor(phoneme: Phoneme) {
        this.phoneme = phoneme;
    }
    
    matches(phoneme: ReadonlyDeep<Phoneme>): boolean {
        return _.isEqual(phoneme, this.phoneme);
    }

    toString(): string {
        return this.phoneme.symbol;
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
        return _.every(phoneme.features, (el: string) => this.presentFeatures.has(el) && !this.absentFeatures.has(el));
    }

    toString(): string {
        const present = Array.from(this.presentFeatures, el => '+' + el);
        const absent = Array.from(this.absentFeatures, el => '-' + el);
        return `[${present.concat(absent).join(' ')}]`;
    }
};

export class PhonemeSetMatcher implements PhonemeMatcher {
    private matchers: PhonemeMatcher[];

    constructor(matchers: PhonemeMatcher[]) {
        this.matchers = matchers;
    }

    matches(phoneme: ReadonlyDeep<Phoneme>): boolean {
        return this.matchers.some(el => el.matches(phoneme));
    }

    toString(): string {
        return `\{${this.matchers}\}`;
    }
};
