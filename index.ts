import * as core from '@actions/core';
import * as github from '@actions/github';
import { exec } from '@actions/exec';
import { PushEvent, CreateEvent } from '@octokit/webhooks-types'
import * as fs from 'fs';
import * as path from 'path';

function ensureDirExists(path): void {
    try {
        fs.mkdirSync(path);
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }
}

function ensureDirIsRemoved(path) {
    try {
        fs.rmdirSync(path, { recursive: true });
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}

function ensureFileIsRemoved(path) {
    try {
        fs.unlinkSync(path);
        console.log(`path was removed: ${path}`);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
        console.log(`path did not exist: ${path}`);
    }
}

async function downloadSplitsh(splitshPath, splitshVersion) {
    let splitshDir = path.dirname(splitshPath);
    ensureDirExists(splitshDir);
    ensureFileIsRemoved(splitshPath);
    ensureDirIsRemoved('/tmp/splitsh-download/');
    fs.mkdirSync('/tmp/splitsh-download/');
    let downloadDir = '/tmp/splitsh-download/';
    let downloadPath = `${downloadDir}split-lite.tar.gz`;
    let platform = process.platform === 'darwin' ? 'lite_darwin_amd64' : 'lite_linux_amd64';
    console.log(`downloading variant ${platform}`);
    let url = `https://github.com/splitsh/lite/releases/download/${splitshVersion}/${platform}.tar.gz`;
    await exec(`wget -O ${downloadPath} ${url}`);
    await exec(`tar -zxpf ${downloadPath} --directory ${downloadDir}`);
    await exec(`chmod +x ${downloadDir}splitsh-lite`);
    await exec(`mv ${downloadDir}splitsh-lite ${splitshPath}`);
    ensureDirIsRemoved(downloadDir);
}

async function ensureRemoteExists(name, target) {
    try {
        await exec('git', ['remote', 'add', name, target]);
    } catch (e) {
        if ( ! e.message.match(/failed with exit code 3$/g)) {
            throw e;
        }
    }
}

async function publishSubSplit(binary, origin, target, branch, name, directory) {
    let hash = '';
    await exec(binary, [`--prefix=${directory}`, `--origin=${origin}/${branch}`], {
        listeners: {
            stdout: (data) => {
                hash += data.toString();
            }
        }
    });
    await exec('git', ['push', target, `${hash.trim()}:refs/heads/${branch}`, '-f']);
}

(async () => {
    const context = github.context;
    const configPath = core.getInput('config-path');
    const splitshPath = path.resolve(process.cwd(), core.getInput('splitsh-path'));
    const splitshVersion = core.getInput('splitsh-version');
    const origin = core.getInput('origin-remote');
    const branch = core.getInput('source-branch');

    if ( ! fs.existsSync(splitshPath)) {
        await downloadSplitsh(splitshPath, splitshVersion);
    }

    let configOptions = JSON.parse(fs.readFileSync(configPath).toString());
    let subSplits = configOptions['sub-splits'];
    console.log(subSplits);

    if (context.eventName === "push") {
        let event = context.payload as PushEvent;
        console.log(event);
        await Promise.all(subSplits.map(async (split) => {
            await ensureRemoteExists(split.name, split.target);
            await publishSubSplit(splitshPath, origin, split.name, branch, split.name, split.directory);
        }));
    } else if (context.eventName === "create") {
        let event = context.payload as CreateEvent;

        if (event.ref_type === "tag") {
            console.log('tag event', event);
        }
    }
})().catch(error => {
    console.log('Something went wrong...');
    core.setFailed(error.message);
});
