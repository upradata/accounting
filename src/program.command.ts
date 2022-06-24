#!/usr/bin/env node

import('@upradata/node-util').then(async ({ registerPaths }) => {
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


    const { parseArgs } = await import('./program.arguments');
    const { Run } = await import('./program.run');

    return new Run(await parseArgs()).run();
});
