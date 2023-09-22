import isEqual from 'lodash/isEqual';
import Phoneme from './Phoneme';
import FeatureDiff from './FeatureDiff';

export default class Language {
    constructor(public phonemes: Phoneme[]) {
    }

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
