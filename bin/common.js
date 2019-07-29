const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);


module.exports.checkRequiredArgs = (args, requiredArgNames) => {
    let message = '';

    for (const arg of requiredArgNames) {
        if (message) message += + '\n';

        if (typeof arg === 'string') {
            if (!args[arg])
                message += `${arg} is required`;
        } else
            message += oneOf(args, arg.oneOf);
    }

    return message;
}

function oneOf(args, oneOfArgs) {

    for (const arg of oneOfArgs) {
        if (args[arg])
            return '';
    }

    return `One of ${oneOfArgs.join(', ')} has to be specified`;
}

const abortProgram = message => {
    if (message) {
        console.error(message);
        console.log('Program Aborted.')
    }

    process.exit(1);
}

module.exports.abortProgram = abortProgram;


module.exports.xlsxToCsvAll = ({ filepath, outputDir }, nbRerun = 0) => {
    if (!outputDir)
        abortProgram('outputDir must be specified for --all-sheet');

    execAsync(`xlsx2csv --all -d ';' ${filepath} ${outputDir}`).then(() => console.log(`All sheets generated in ${outputDir}.`))
        .catch(e => {
            if (nbRerun < 10) // workaround: somehow we need to wait, but wait(ms) not working??
                return exportAll(nbRerun + 1);
            throw new Error(`An error occured while exporting all sheets of ${filepath} to csv: ${e}`);
        });
}
