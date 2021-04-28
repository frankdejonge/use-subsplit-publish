import * as core from '@actions/core';
import * as github from '@actions/github';
import { exec } from '@actions/exec';
import { PushEvent, CreateEvent } from '@octokit/webhooks-types'
import * as fs from 'fs';
import * as path from 'path';

interface subsplit {
    name: string,
    directory: string,
    target: string,
}

type subsplits = subsplit[];

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
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}

async function downloadSplitsh(splitshPath, splitshVersion): Promise<void> {
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

async function ensureRemoteExists(name, target): Promise<void> {
    try {
        await exec('git', ['remote', 'add', name, target]);
    } catch (e) {
        if ( ! e.message.match(/failed with exit code 3$/g)) {
            throw e;
        }
    }
}

async function captureExecOutput(command: string, args: string[]): Promise<string> {
    let output = '';
    await exec(command, args, {
        listeners: {
            stdout: (data: Buffer) => {
                output += data.toString();
            }
        }
    });

    return output;
}

async function publishSubSplit(binary, origin, target, branch, name, directory): Promise<void> {
    let hash = await captureExecOutput(binary, [`--prefix=${directory}`, `--origin=${origin}/${branch}`]);
    console.log(name, directory, hash);
    await exec('git', ['push', target, `${hash.trim()}:refs/heads/${branch}`, '-f']);
}

async function commitHashForTag(tag: string): Promise<string> {
    return await captureExecOutput('git', ['show-ref', tag, '-s']);
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
    let subSplits = configOptions['sub-splits'] as subsplits;
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
        let tag = event.ref;

        if (event.ref_type !== "tag") {
            return;
        }

        await Promise.all(subSplits.map(async (split) => {
            let hash = await captureExecOutput(splitshPath, [`--prefix=${split.directory}`, `--origin=tags/${tag}`]);
            console.log('hash from commit hash origin', hash);
            let clonePath = `./.repos/${split.name}`;
            fs.mkdirSync(clonePath);

            await exec('git', ['clone', split.target, '.'], { cwd: clonePath});
            await exec('git', ['tag', '-a', tag, hash], { cwd: clonePath});
        }));

        // let hash = await captureExecOutput(binary, [`--prefix=${directory}`, `--origin=${origin}/${branch}`]);

        // git show-ref <tag> -s
    }
})().catch(error => {
    console.log('Something went wrong...');
    core.setFailed(error.message);
});
