import isEqual from 'lodash/isEqual';
import Phoneme from './Phoneme';
import FeatureDiff from './FeatureDiff';

/** A class representing a language, which consists of a group of phonemes. */
export default class Language {
    /**
     * @param phonemes The complete set of phonemes the language has.
     */
    constructor(public phonemes: Phoneme[]) {
    }

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
