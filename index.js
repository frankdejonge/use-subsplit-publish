const core = require('@actions/core');
const exec = require('@actions/exec').exec;
const fs = require('fs');
const path = require('path');

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
                output += data.toString();
            }
        }
    });
    console.log('hash', hash);
    console.log('git', 'push', target, `${hash}:refs/heads/${branch}`, '-f');
    // await exec('git', ['push', target, `${hash}:refs/heads/${branch}`, '-f']);
}

(async () => {
    const configPath = './config.subsplit-publish.json'; // core.getInput('config-path');
    const splitshPath = './temp/splitsh-lite';// core.getInput('splitsh-path');
    const splitshVersion  = 'v1.0.1'; // core.getInput('splitsh-version');
    const origin = 'origin';
    const branch = 'main';

    if ( ! fs.existsSync(splitshPath)) {
        await downloadSplitsh(splitshPath, splitshVersion);
    }

    let configOptions = JSON.parse(fs.readFileSync(configPath));
    let subSplits = configOptions['sub-splits'];
    console.log(subSplits);

    await Promise.all(subSplits.map(async (split) => {
        await ensureRemoteExists(split.name, split.target);
        await publishSubSplit(splitshPath, origin, split.targetΩ, branch, split.name, split.directory);
    }));
})().catch(error => {
    console.log('Something went wrong...');
    core.setFailed(error.message);
});
