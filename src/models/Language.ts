import isEqual from 'lodash/isEqual';
import Phoneme from './Phoneme';
import FeatureDiff from './FeatureDiff';

/** A class representing a language, which consists of a group of phonemes. */
export default class Language {
    /**
     * All the phonemes present in the language, ordered from longest to shortest string
     * representation.
     */
    readonly phonemes: readonly Phoneme[];

    /**
     * @param phonemes The complete set of phonemes the language has.
     */
    constructor(phonemes: Phoneme[]) {
        this.phonemes = phonemes.sort(
            (a, b) =>
                // Sort first by symbol length descending...
                (b.symbol.length - a.symbol.length)
                // ...breaking ties by feature count ascending.
                || (a.features.size - b.features.size)
        );
    }

    /**
     * How to segment a string into phonemes. This property is intentionally mutable per-instance.
     * 
     * This may receive characters that do not correspond to a phoneme, such as `#` (word boundary
     * marker) or `V` (phoneme class abbreviation), so this function must handle those cases
     * gracefully.
     */
    segmentWord: (this: Language, word: string) => Iterable<string> = function*(word) {
        word = word.replace(/\s+/gu, '');
        while (word !== '') {
            const symbol = this.phonemes.find(ph => word.startsWith(ph.symbol))?.symbol ?? word[0];
            word = word.substring(symbol.length);
            yield symbol;
        }
    };

    /**
     * Apply a `FeatureDiff` to a `Phoneme`.
     * 
     * If the requested phoneme does not exist, a new one is created with the symbol '?', and a
     * warning is logged to the console.
     * @param base The starting phoneme
     * @param changes The features to apply and/or remove
     * @returns The phoneme with the necessary features.
     */
    applyChanges(base: Phoneme, changes: FeatureDiff<Iterable<string>>): Phoneme {
        const features = new Set(base.features);
        for (const feature of changes.presentFeatures)
            features.add(feature);
        for (const feature of changes.absentFeatures)
            features.delete(feature);
        const phoneme = this.phonemes.find(el => isEqual(el.features, features));
        if (phoneme) return phoneme;
        console.warn('No phoneme for feature set:', features);
        return new Phoneme('?', features);
    }
}
