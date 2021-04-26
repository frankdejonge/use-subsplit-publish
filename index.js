import * as core from '@actions/core';
import { exec } from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';

function ensureDirExists(path) {
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
        fs.rmdirSync(path, { recursive: true, force: true });
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

async function downloadSplitsh(splitshPath, splitshVersion) {
    let splitshDir = path.dirname(splitshPath);
    ensureDirExists(splitshDir);
    ensureFileIsRemoved(splitshPath);
    ensureDirIsRemoved('/tmp/splitsh-download/');
    fs.mkdirSync('/tmp/splitsh-download/');
    let downloadDir = '/tmp/splitsh-download/';
    let downloadPath = `${downloadDir}split-lite.tar.gz`;
    let platform = process.platform === 'darwin' ? 'lite_darwin_amd64' : 'lite_linus_amd64';
    let url = `https://github.com/splitsh/lite/releases/download/${splitshVersion}/${platform}.tar.gz`;
    await exec(`wget -O ${downloadPath} ${url}`);
    await exec(`tar -zxpf ${downloadPath} --directory ${downloadDir}`);
    await exec(`chmod +x ${downloadPath}`);
    await exec(`mv ${downloadPath} ${splitshPath}`);
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

async function publishSubSplit(name, directory) {
    let hash = await exec()
}

(async () => {
    const configPath = './config.subsplit-publish.json'; // core.getInput('config-path');
    const splitshPath = './temp/splitsh-lite';// core.getInput('splitsh-path');
    const splitshVersion  = 'v1.0.1'; // core.getInput('splitsh-version');

    if ( ! fs.existsSync(splitshPath)) {
        await downloadSplitsh(splitshPath, splitshVersion);
    }

    let configOptions = JSON.parse(fs.readFileSync(configPath));
    let subSplits = configOptions['sub-splits'];
    console.log(subSplits);

    await Promise.all(subSplits.map(async (split) => {
        await ensureRemoteExists(split.name, split.target);
        await publishSubSplit(split.name, split.directory);
    }));
})().catch(error => {
    console.log('Something went wrong...');
    core.setFailed(error.message);
});
