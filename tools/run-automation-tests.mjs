import path from 'node:path';
import { projectRoot, runCommand, runNodeScript } from './test-runner-helpers.mjs';

const testFiles = [
  path.join(projectRoot, 'tests', 'mechanics-lab.scene.test.mjs'),
  path.join(projectRoot, 'tests', 'content-scenes.test.mjs'),
  path.join(projectRoot, 'tests', 'dungeon-scenes.test.mjs'),
  path.join(projectRoot, 'tests', 'cocos-library-cache.test.mjs'),
  path.join(projectRoot, 'tests', 'control-plane-ownership.test.mjs'),
  path.join(projectRoot, 'tests', 'first-session-flow.test.mjs'),
  path.join(projectRoot, 'tests', 'echo-prefabs.test.mjs'),
  path.join(projectRoot, 'tests', 'gameplay-logic.test.mjs'),
  path.join(projectRoot, 'tests', 'save-logic.test.mjs'),
  path.join(projectRoot, 'tests', 'vertical-slice-flow.test.mjs'),
  path.join(projectRoot, 'tests', 'wechat-build-config.test.mjs'),
  path.join(projectRoot, 'tests', 'wechat-build-policy.test.mjs'),
  path.join(projectRoot, 'tests', 'style-resource-gate.test.mjs'),
  path.join(projectRoot, 'tests', 'health-logic.test.mjs'),
  path.join(projectRoot, 'tests', 'player-state-logic.test.mjs'),
  path.join(projectRoot, 'tests', 'boss-logic.test.mjs'),
  path.join(projectRoot, 'tests', 'echo-logic.test.mjs'),
  path.join(projectRoot, 'tests', 'puzzle-logic.test.mjs'),
  path.join(projectRoot, 'tests', 'checkpoint-logic.test.mjs'),
  path.join(projectRoot, 'tests', 'input-logic.test.mjs'),
  path.join(projectRoot, 'tests', 'save-corruption.test.mjs'),
  path.join(projectRoot, 'tests', 'wechat-build-output.test.mjs'),
  path.join(projectRoot, 'tests', 'wechat-runtime-settings.test.mjs'),
  path.join(projectRoot, 'tests', 'wechat-devtools-launch.test.mjs'),
  path.join(projectRoot, 'tests', 'ci-workflow.test.mjs'),
  path.join(projectRoot, 'tests', 'gate5-evidence-template.test.mjs'),
];

try {
  await runNodeScript(path.join(projectRoot, 'tools', 'run-typecheck.mjs'), projectRoot);
  await runCommand(process.execPath, ['--test', ...testFiles], { cwd: projectRoot });
} catch (error) {
  process.exitCode = 1;
  throw error;
}
