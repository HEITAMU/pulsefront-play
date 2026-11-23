import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const platform = process.argv[2];
if (!['web-mobile', 'wechatgame'].includes(platform)) {
  console.error('用法：node tools/build/creator-build.mjs web-mobile|wechatgame [Creator可执行文件路径]');
  process.exit(2);
}
const creator = process.argv[3] || process.env.COCOS_CREATOR;
if (!creator || !existsSync(creator)) {
  console.error('请把 COCOS_CREATOR 指向 Cocos Creator 3.8.8 可执行文件，或在命令最后传入其路径。');
  process.exit(2);
}
const config = path.join(root, 'tools', 'build', `${platform}.json`);
const options = JSON.parse(readFileSync(config, 'utf8'));
if (platform === 'wechatgame' && !/^wx[0-9a-f]{16}$/.test(options.packages.wechatgame.appid)) {
  console.error('请在 tools/build/wechatgame.json 中填写已发布小游戏的 AppID。');
  process.exit(2);
}
mkdirSync(path.join(root, 'build'), { recursive: true });
console.log(`构建 ${platform}，工程：${root}`);
const child = spawn(creator, ['--project', root, '--build', `configPath=${config}`], {
  cwd: root, stdio: 'inherit', shell: false,
});
child.on('error', (err) => {
  console.error(`Creator 启动失败：${err.message}`);
  process.exitCode = 2;
});
child.on('exit', (code, signal) => {
  const expected = platform === 'wechatgame'
    ? ['game.js', 'game.json', 'project.config.json'] : ['index.html'];
  const output = path.join(root, 'build', options.outputName);
  const missing = expected.filter((file) => !existsSync(path.join(output, file)));
  // Creator documents exit code 36 for a successful build.
  if ((code === 36 || code === 0) && !signal && missing.length === 0) {
    if (platform === 'wechatgame') {
      cpSync(path.join(root, 'runtime/wechat/openDataContext'), path.join(output, 'openDataContext'), { recursive: true });
      const gameConfig = JSON.parse(readFileSync(path.join(output, 'game.json'), 'utf8'));
      gameConfig.openDataContext = 'openDataContext';
      writeFileSync(path.join(output, 'game.json'), JSON.stringify(gameConfig, null, 2));
    }
    console.log(`构建完成：${output}`);
    process.exitCode = 0;
  } else {
    console.error(`构建未完成：exit=${code}, signal=${signal || 'none'}，缺少文件：${missing.join(', ') || '无'}。请检查上方 Creator 日志。`);
    process.exitCode = 1;
  }
});
