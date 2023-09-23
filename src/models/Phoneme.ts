export default class Phoneme {
    /** The features present on the phoneme. */
    readonly features: ReadonlySet<string>;

    /**
     * @param symbol The text used to represent the phoneme. Should be one character.
     * @param features The features the phoneme consists of. Automatically converted to a `Set`.
     */
    constructor(readonly symbol: string, features: Iterable<string>) {
        this.features = new Set(features);
    }

    /**
     * @returns {string} {@linkcode symbol}
     */
    toString(): string {
        return this.symbol;
    }
}
