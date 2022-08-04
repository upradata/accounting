import('@upradata/node-util').then(async ({ registerPaths, fromRoot }) => {
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

    const { Run } = await import('./program.run');
    const { cliParserDate } = await import('./program.arguments');

    return new Run({
        exerciseStart: cliParserDate('01022018'),
        metadata: fromRoot('./metadata.json'),
        dataDirectory: fromRoot('data'),
        inputOds: 'comptabilite.new.ods',
        outputDir: fromRoot('./Output/CACA'),
        fec: true
    }).run();
});
