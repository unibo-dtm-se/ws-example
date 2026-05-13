const dryRun = (process.env.RELEASE_DRY_RUN || "false").toLowerCase() === "true";
const testPypi = (process.env.RELEASE_TEST_PYPI || "false").toLowerCase() === "true";
const pypiToken = process.env.PYPI_TOKEN;
const npmToken = process.env.NPM_TOKEN;

const pythonRepository = testPypi ? "testpypi" : "pypi";
const shouldPublishToPypi = !dryRun && Boolean(pypiToken);
const shouldPublishToNpm = !dryRun && Boolean(npmToken);

let backendPrepareCmd = "cd ../backend && poetry version ${nextRelease.version}";
if (shouldPublishToPypi) {
    backendPrepareCmd += ` && poetry config pypi-token.${pythonRepository} ${pypiToken}`;
}

let backendPublishCmd = "cd ../backend && poetry publish --build";
if (testPypi) {
    backendPublishCmd += " --repository testpypi";
}
if (!shouldPublishToPypi) {
    backendPublishCmd += " --dry-run";
}

const config = {
    branches: ["main", "master"],
    dryRun,
    plugins: [
        [
            "@semantic-release/commit-analyzer",
            {
                preset: "conventionalcommits",
            },
        ],
        [
            "@semantic-release/release-notes-generator",
            {
                preset: "conventionalcommits",
            },
        ],
        [
            "@semantic-release/npm",
            {
                npmPublish: shouldPublishToNpm,
                tarballDir: "dist",
            },
        ],
        [
            "@semantic-release/exec",
            {
                prepareCmd: backendPrepareCmd,
                publishCmd: backendPublishCmd,
            },
        ],
    ],
};

if (!dryRun) {
    config.plugins.push(
        [
            "@semantic-release/github",
            {
                assets: [
                    { path: "dist/*.tgz" },
                    { path: "../backend/dist/*" },
                ],
            },
        ],
        [
            "@semantic-release/git",
            {
                assets: [
                    "package.json",
                    "package-lock.json",
                    "../backend/pyproject.toml",
                ],
                message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
            },
        ]
    );
}

export default config;