import isEqual from 'lodash/isEqual';
import { ReadonlyDeep } from 'type-fest';
import Phoneme from './Phoneme';
import { ObjectMap } from './misc';

export default class Language {
    phonemes: Phoneme[];

    constructor(phonemes: Phoneme[]) {
        this.phonemes = phonemes;
    }

    applyChanges(base: ReadonlyDeep<Phoneme>, changes: Readonly<ObjectMap<string, boolean>>): Phoneme {
        const features = new Set(base.features);
        for (const [feature, shouldApply] of Object.entries(changes)) {
            if (shouldApply) {
                features.add(feature);
            } else {
                features.delete(feature);
            }
        }
        const phoneme = this.phonemes.find(el => isEqual(el.features, features));
        if (phoneme) return phoneme;
        console.warn('No phoneme for feature set:', features);
        return new Phoneme('?', features);
    }
};
