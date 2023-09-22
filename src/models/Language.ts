import isEqual from 'lodash/isEqual';
import { ReadonlyDeep } from 'type-fest';
import Phoneme from './Phoneme';
import FeatureDiff from './FeatureDiff';

export default class Language {
    phonemes: Phoneme[];

    constructor(phonemes: Phoneme[]) {
        this.phonemes = phonemes;
    }

    applyChanges(base: ReadonlyDeep<Phoneme>, changes: FeatureDiff<Iterable<string>>): Phoneme {
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
};
