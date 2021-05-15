import * as fs from 'fs/promises';
import * as semver from 'semver';

interface DependencyExtractor {
    (path: string): Promise<DependencyMap>
}

interface DependencyMap {
    [index: string]: string
}

interface ComposerJson {
    require: DependencyMap,
    'require-dev': DependencyMap,
}

export const extractDependencies: DependencyExtractor = async (path: string): Promise<DependencyMap> => {
    if ( ! path.endsWith('composer.json')) {
        path = path + "/composer.json";
    }

    let fileContents = await fs.readFile(path);
    let composerPayload = JSON.parse(fileContents.toString()) as ComposerJson;

    return {
        ...composerPayload['require'],
        ...composerPayload['require-dev'],
    };
};

interface ComparisonOptions {
    releaseVersion: string,
}

async function verifyDependency(splitDirectory: string, satisfyDependencies: DependencyMap) {
    let dependencies = await extractDependencies(splitDirectory);

    Object.entries(satisfyDependencies).forEach(([pkg, version]) => {
        if ( ! (pkg in dependencies)) {
            return;
        }

        if (semver.satisfies(version, dependencies[pkg]) === false) {
            throw new Error(`Split located at "${splitDirectory}" has a dependency "${pkg}" that does not match version "${version}"`);
        }
    });
}

export async function verifyDependencies(splitDirectories: string[], satisfyDependencies: {[index: string]: string}) {
    await Promise.all(splitDirectories.map(splitDirectory => verifyDependency(splitDirectory, satisfyDependencies)));
}
