import Rule from './Rule';

export default class RuleSet {
    rules: Rule[];
    representation: string;

    constructor(str: string) {
        this.representation = str;
        // TODO: rules
        this.rules = [];
    }
};
