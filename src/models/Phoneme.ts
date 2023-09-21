export default class Phoneme {
    symbol: string;
    features: Set<string>;

    constructor(symbol: string, features: Iterable<string>) {
        this.symbol = symbol;
        this.features = new Set(features);
    }
};
