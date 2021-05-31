#!/usr/bin/env node

import { registerPaths } from '@upradata/node-util';

try {
    // load and register tsconfig.json paths (mapping)
    registerPaths({
        fromDirectory: __dirname,
        transform: (path, tsconfig) => path.replace(/^src\//, `${tsconfig.compilerOptions.outDir}/`)
    });

} catch (e) {
    console.error(`Could not load tsconfig.json paths`);
    console.error(e);
    process.exit(1);
}


import { parseArgs } from './program.arguments';
import { Run } from './program.run';

(async function run() {
    new Run(await parseArgs()).run();
})();
