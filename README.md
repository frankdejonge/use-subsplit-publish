# Use Sub-split Publish Action

This action publishes a subsplit of the current repository
using the [splitsh-lite](https://github.com/splitsh/lite) tool.

## Inputs

### `config-path`

**Required** The path for the sub-split JSON [config](#configuration).

### `splitsh-path`

**Required** The path to install splitsh-lite. You should add this path to the cache.

### `source-branch`

**Required** The source branch to split from. Example: `main`

### `origin-remote`

**Optional** The origin remote name. Default: `origin`

### `splitsh-version`

**Optional** Version of the splitsh-lite binary. Default `v1.0.1`

## Configuration

Sub-splits are configured using a JSON file. The location of the file
should match the path configured at `config-path`.

Example:

```json
{
    "sub-splits": [
        {
            "name": "workflows",
            "directory": ".github/workflows",
            "target": "git@github.com:frankdejonge/example-subsplit-publish.git"
        }
    ]
}
```

Each entry contains 3 keys:

* `name`: The name of the remote. Must be unique.
* `directory`: The directory to publish to the sub-split.
* `target`: The git URL to publish the sub-split to.

## Example Workflow

```yaml
on:
  push:
    branches:
      - main

jobs:
  use_ssh_agent:
    runs-on: ubuntu-latest
    name: Publish Sub-split
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: '0'
          persist-credentials: 'false'
      - uses: frankdejonge/use-github-token@1.0.1
        with:
          authentication: 'username:${{ secrets.PERSONAL_GITHUB_TOKEN }}'
          user_name: 'Your Name'
          user_email: 'your@email.com'
      - name: Cache splitsh-lite
        id: splitsh-cache
        uses: actions/cache@v2
        with:
          path: './.splitsh'
          key: '${{ runner.os }}-splitsh-d-101'
      - uses: ./
        with:
          source-branch: 'main'
          config-path: './config.subsplit-publish.json'
          splitsh-path: './.splitsh/splitsh-lite'
          splitsh-version: 'v1.0.1'
```
