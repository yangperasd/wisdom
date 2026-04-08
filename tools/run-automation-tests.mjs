import path from 'node:path';
import { projectRoot, runCommand, runNodeScript } from './test-runner-helpers.mjs';

const testFiles = [
  path.join(projectRoot, 'tests', 'mechanics-lab.scene.test.mjs'),
  path.join(projectRoot, 'tests', 'content-scenes.test.mjs'),
  path.join(projectRoot, 'tests', 'dungeon-scenes.test.mjs'),
  path.join(projectRoot, 'tests', 'echo-prefabs.test.mjs'),
  path.join(projectRoot, 'tests', 'gameplay-logic.test.mjs'),
  path.join(projectRoot, 'tests', 'save-logic.test.mjs'),
  path.join(projectRoot, 'tests', 'vertical-slice-flow.test.mjs'),
  path.join(projectRoot, 'tests', 'wechat-build-config.test.mjs'),
];

try {
  await runNodeScript(path.join(projectRoot, 'tools', 'run-typecheck.mjs'), projectRoot);
  await runCommand(process.execPath, ['--test', ...testFiles], { cwd: projectRoot });
} catch (error) {
  process.exitCode = 1;
  throw error;
}
