const NodeEnvironment = require('jest-environment-node').default;
const { isUndefined } = require('util');

class JestCustomEnvironment extends NodeEnvironment {
    constructor(config) {
        super(config);
        this.jestErrorHasInstance = this.global.Error[ Symbol.hasInstance ];
    }

    async setup() {
        await super.setup();
        // Workaround for this bug https://github.com/facebook/jest/issues/2549
        this.jestErrorHasInstance = this.global.Error[ Symbol.hasInstance ];
        Object.defineProperty(this.global.Error, Symbol.hasInstance, {
            value: target => {
                // the workaround is not working. So I add an additional test
                // && target.message && target.stack
                return !isUndefined(target) && !isUndefined(target.constructor) && target.constructor.name === 'Error' ||
                    target instanceof Error || this.jestErrorHasInstance(target);
            }
        });
    }

    async tearDown() {
        await super.tearDown();
        Object.defineProperty(this.global.Error, Symbol.hasInstance, { value: this.jestErrorHasInstance });
    }
}

module.exports = JestCustomEnvironment;
