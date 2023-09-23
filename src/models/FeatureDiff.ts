/**
 * Class representing a set of features with specified values. May be applied as a "diff" to a
 * phoneme.
 */
export default class FeatureDiff<out T extends Iterable<string>> {
    /**
     * @param presentFeatures The features that must be present on the phoneme.
     * @param absentFeatures The features that must not be present on the phoneme.
     */
    constructor(readonly presentFeatures: T, readonly absentFeatures: T) {
    }

    /**
     * Create a string representation of the features.
     * @example
     * const features = new FeatureDiff(['high', 'front'], ['round']);
     * features.toString() // => '[+high +front -round]'
     */
    public toString(): string {
        const present = Array.from(this.presentFeatures, el => '+' + el);
        const absent = Array.from(this.absentFeatures, el => '-' + el);
        return `[${present.concat(absent).join(' ')}]`;
    }
}
