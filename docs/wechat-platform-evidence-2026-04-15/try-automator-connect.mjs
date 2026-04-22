// Try connecting miniprogram-automator to each DevTools listening port.
// Report whichever responds with a usable handle.
import automator from 'miniprogram-automator';

const ports = [33350, 32123, 10686];

for (const port of ports) {
  const ws = `ws://127.0.0.1:${port}`;
  process.stdout.write(`[try] ${ws} ... `);
  try {
    const miniProgram = await automator.connect({ wsEndpoint: ws });
    console.log('CONNECTED');
    try {
      const page = await miniProgram.currentPage();
      console.log('  current page path:', page?.path ?? '(none)');
    } catch (e) {
      console.log('  currentPage() error:', e.message);
    }
    try {
      const sysInfo = await miniProgram.systemInfo();
      console.log('  systemInfo.platform:', sysInfo?.platform);
    } catch (e) {
      console.log('  systemInfo() error:', e.message);
    }
    try {
      await miniProgram.disconnect();
    } catch {}
    process.exit(0);
  } catch (e) {
    console.log('FAILED:', (e?.message || String(e)).slice(0, 180));
  }
}
console.log('[try] all ports failed');
process.exit(2);
