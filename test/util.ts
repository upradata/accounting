import { promisify } from 'util';
import { exec } from 'child_process';
import { readFile, readdir, rmdir } from 'fs';
import rimraf from 'rimraf';


const execAsync = promisify(exec);

export const readdirAsync = promisify(readdir);

export const rmdirAsync = (p: string, opt: {} = {}) => new Promise((res, rej) => {
    rimraf(p, opt, err => {
        if (err) rej(err);
        res();
    });
});

export const readFileAsync = promisify(readFile);

export async function execAsyncCommand(command: string, verbose: boolean = false) {
    const { stdout, stderr } = await execAsync(command);

    if (verbose) {
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
    }
}
