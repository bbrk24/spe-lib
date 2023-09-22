export default class Phoneme {
    readonly features: ReadonlySet<string>;

    constructor(public readonly symbol: string, features: Iterable<string>) {
        this.features = new Set(features);
    }

    toString(): string {
        return this.symbol;
    }
}
