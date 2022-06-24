const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');


module.exports = {
    globals: {
        'ts-jest': {
            diagnostics: false
        }
    },
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    moduleFileExtensions: [
        'ts',
        'tsx',
        'js',
        'json'
    ],
    testEnvironment: './jest-custom-environment',
    setupFilesAfterEnv: [ 'jest-expect-message' ],
    automock: false,
    restoreMocks: true,
    collectCoverage: true,
    coverageReporters: [ 'json', 'html' ],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
    modulePaths: [
        '<rootDir>'
    ],
};
