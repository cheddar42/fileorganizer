import commandLineArgs from 'command-line-args';
import { cwd } from 'process';
import fs from 'fs';
import dir from 'node-dir';
import path from 'path';

// usage:
// node app.js --dryRun --verbose --inputPaths /mnt/c/_Files/_Inbox/_input --outputPath /mnt/c/_Files/_Inbox/_output

// parse arguments (https://www.npmjs.com/package/command-line-args)
const { inputPaths, outputPath, verbose, dryRun } = commandLineArgs([
    { name: 'inputPaths', type: String, multiple: true, defaultOption: true, defaultValue: [cwd()] },
    { name: 'outputPath', type: String, defaultValue: `${cwd()}/Output` },
    { name: 'verbose', alias: 'v', type: Boolean },
    { name: 'dryRun', alias: 'd', type: Boolean },
]);

const log = (message) => {
    if (verbose) {
        console.log(message);
    }
};

const createDirectoryIfDoesNotExist = (directoryPath) => {
    // does it alrady exist? (https://nodejs.org/api/fs.html)
    if (!fs.existsSync(directoryPath)){
        log(`Creating ${directoryPath}...`);
        fs.mkdirSync(directoryPath);
    }
    else {
        log(`${directoryPath} already exists`);
    }
};

log({ inputPaths, outputPath, verbose, dryRun });

// create the output directory if needed
if (!dryRun) {
    createDirectoryIfDoesNotExist(outputPath);
}

// process each input directory
const fileNames = new Map();
inputPaths.forEach(inputPath => {
    log(`Processing input path ${inputPath}...`);
    // synchronously iterate the files of the input directory and its subdirectories (https://github.com/fshost/node-dir), then process each input file
    dir.files(inputPath, { sync:true }).forEach(file => {
        log(`Processing file ${file}`);
        // retrieve the modified date
        const { mtime: modifiedAt } = fs.statSync(file);
        // determine the path to move the file to, including date-based filename and the suffix if there is a collision
        const prefix = modifiedAt.toISOString().replace(/[.:]/ig, '-');
        const suffix = (fileNames.get(prefix) || 0) + 1;
        fileNames.set(prefix, suffix);
        //  (https://nodejs.dev/learn/nodejs-file-paths)
        const extension = path.extname(file);
        let movePath = `${outputPath}/`;
        let moveName = prefix;
        if (suffix == 1) {
            movePath += modifiedAt.getFullYear();
        }
        else {
            movePath += 'collisions';
            moveName += `-${suffix}`;
        }
        moveName += extension;
        // create the move path directory if needed
        if (!dryRun) {
            createDirectoryIfDoesNotExist(movePath);
        }
        // move/rename the file
        movePath += `/${moveName}`;
        log(`moving to ${movePath}`);
        if (!dryRun) {
            fs.rename(file, movePath, (error) => {
                if (error) throw error
            });
        }
    });
});
