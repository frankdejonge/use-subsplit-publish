import { verifyDependencies } from './compare-dependencies';
import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';

let exampleSubSplitPath = path.join(__dirname, 'test-cases/example-subsplit');
let dependencyPaths = [exampleSubSplitPath];

describe('compare-dependencies', () => {
    it('should detect invalid dependencies', async () => {
        await assert.rejects(
            verifyDependencies(dependencyPaths, {"some/dependency": "1.0.0"}),
            new Error(`Split located at "${exampleSubSplitPath}" has a dependency "some/dependency" that does not match version "1.0.0"`),
        );
    });

    it('should pass valid dependencies', async () => {
        await assert.doesNotReject(
            verifyDependencies(dependencyPaths, {"some/dependency": "2.0.0"}),
        );
    });
});
