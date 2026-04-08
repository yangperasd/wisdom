import { access, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  projectRoot,
  resolveConfiguredWechatBuildOutputDir,
  resolveWechatDevToolsCli,
  wechatDevToolsPort,
} from './wechat-build-utils.mjs';

const cliPath = await resolveWechatDevToolsCli();
const projectPath = await resolveConfiguredWechatBuildOutputDir(projectRoot);
const port = process.env.WECHAT_DEVTOOLS_PORT || `${wechatDevToolsPort}`;
const lang = process.env.WECHAT_DEVTOOLS_LANG || 'zh';
const projectConfigPath = path.join(projectPath, 'project.config.json');
const projectConfig = JSON.parse(await readFile(projectConfigPath, 'utf8'));
const devtoolsExeCandidates = [
  process.env.WECHAT_DEVTOOLS_EXE,
  path.join(path.dirname(cliPath), '微信开发者工具.exe'),
  path.join(path.dirname(cliPath), 'wechatwebdevtools.exe'),
].filter(Boolean);

let devtoolsExePath = null;

for (const candidate of devtoolsExeCandidates) {
  try {
    await access(candidate, fsConstants.F_OK);
    devtoolsExePath = candidate;
    break;
  } catch {
    continue;
  }
}

if (!devtoolsExePath) {
  throw new Error(
    'Cannot find the WeChat DevTools executable. Set WECHAT_DEVTOOLS_EXE to the full 微信开发者工具.exe path.',
  );
}

console.log(`[wechat-devtools] cli: ${cliPath}`);
console.log(`[wechat-devtools] exe: ${devtoolsExePath}`);
console.log(`[wechat-devtools] project: ${projectPath}`);
console.log(`[wechat-devtools] port: ${port}`);
console.log(`[wechat-devtools] compileType: ${projectConfig.compileType}`);
console.log(`[wechat-devtools] appid: ${projectConfig.appid}`);
console.log(
  '[wechat-devtools] the logged-in WeChat account must have developer access to this appid, otherwise the IDE can open the project but will refuse game services and test capabilities.',
);

const child = spawn(
  devtoolsExePath,
  [projectPath],
  {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore',
  },
);

child.on('error', (error) => {
  throw error;
});

child.unref();

console.log('[wechat-devtools] launch requested successfully.');
