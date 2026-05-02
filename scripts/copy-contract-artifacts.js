const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'truffle_project', 'build', 'contracts');
const targetDir = path.join(root, 'src', 'contracts');
const files = ['Projects.json', 'RequestManager.json'];

const args = process.argv.slice(2);
const deploy = args.includes('--deploy');
const networkIndex = args.indexOf('--network');
const network = networkIndex !== -1 && args[networkIndex + 1] ? args[networkIndex + 1] : 'development';
const reset = args.includes('--reset');

function runTruffleMigrate() {
  const truffleCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const truffleArgs = ['truffle', 'migrate', '--network', network];

  if (reset) {
    truffleArgs.push('--reset');
  }

  console.log(`Running Truffle migrate on network '${network}'${reset ? ' with --reset' : ''}...`);
  const result = spawnSync(truffleCmd, truffleArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    console.error('Failed to run Truffle migrate:', result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Truffle migrate exited with code ${result.status}`);
    process.exit(result.status);
  }
}

if (deploy) {
  runTruffleMigrate();
}

if (!fs.existsSync(sourceDir)) {
  console.error(`Source directory not found: ${sourceDir}`);
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

let failed = false;

for (const fileName of files) {
  const sourcePath = path.join(sourceDir, fileName);
  const targetPath = path.join(targetDir, fileName);

  if (!fs.existsSync(sourcePath)) {
    console.error(`Contract artifact not found: ${sourcePath}`);
    failed = true;
    continue;
  }

  try {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied ${fileName} to src/contracts/`);
  } catch (error) {
    console.error(`Failed to copy ${fileName}:`, error);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('Contract artifacts copied successfully.');
