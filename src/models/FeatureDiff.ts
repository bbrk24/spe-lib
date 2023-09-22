export default class FeatureDiff<out T extends Iterable<string>> {
    readonly presentFeatures: T;
    readonly absentFeatures: T;

    constructor(presentFeatures: T, absentFeatures: T) {
        this.presentFeatures = presentFeatures;
        this.absentFeatures = absentFeatures;
    }

    toString(): string {
        const present = Array.from(this.presentFeatures, el => '+' + el);
        const absent = Array.from(this.absentFeatures, el => '-' + el);
        return `[${present.concat(absent).join(' ')}]`;
    }
};
