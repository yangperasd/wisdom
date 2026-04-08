import {
  resolveWechatBuildConfigPath,
  writeWechatBuildConfig,
} from './wechat-build-utils.mjs';

const { configPath, config } = await writeWechatBuildConfig();

console.log(`[wechat-build] config generated at ${configPath}`);
console.log(`[wechat-build] start scene: ${config.startScene}`);
console.log(`[wechat-build] scenes: ${config.scenes.length}`);
console.log(`[wechat-build] appid: ${config.packages.wechatgame.appid}`);
