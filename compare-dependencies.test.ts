import { verifyDependencies } from './compare-dependencies';
import * as path from 'path';

let exampleSubSplitPath = path.join(__dirname, 'test-cases/example-subsplit');
let dependencyPaths = [exampleSubSplitPath];

describe('compare-dependencies', () => {
    it('should detect invalid dependencies', async function () {
        await expect(verifyDependencies(dependencyPaths, {"some/dependency": "1.0.0"}))
            .rejects.toEqual(new Error(`Split located at "${exampleSubSplitPath}" has a dependency "some/dependency" that does not match version "1.0.0"`));
    });

    it('should pass valid dependencies', async function () {
        await expect(verifyDependencies(dependencyPaths, {"some/dependency": "2.0.0"})).resolves.toBe(undefined);
    });
});
