import { spawn } from 'node-pty';
import { Pty } from '@replit/ruspty';
import { Bench } from 'tinybench';
import assert from 'assert';

const SHAKESPEARE_PATH = 'all-of-shakespeare.txt';
const bench = new Bench({
  warmupIterations: 5,
  iterations: 30,
});

bench.add('node-pty', () => {
  const pty = spawn('cat', [SHAKESPEARE_PATH], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: __dirname,
  });

  let buff = new Uint8Array();
  pty.onData(data => {
    buff = Buffer.concat([buff, Buffer.from(data)]);
  });

  return new Promise<void>(resolve => {
    pty.onExit((status) => {
      console.log(buff.toString());
      assert(status.exitCode === 0);
      resolve();
    });
  });
}, {
  beforeAll: () => console.log('Benchmarking node-pty'),
  afterAll: () => console.log('Done'),
});

bench.add('ruspty', () => {
  return new Promise<void>(resolve => {
    let buff = new Uint8Array();
    const pty = new Pty({
      command: 'cat',
      args: [SHAKESPEARE_PATH],
      envs: {},
      size: { cols: 80, rows: 30 },
      onExit: (err, exitCode) => {
        console.log(buff.toString());
        assert(exitCode === 0);
        assert(err === null);
        resolve();
      },
    })

    pty.read.on('data', (data: Uint8Array) => {
      buff = Buffer.concat([buff, data]);
    })
  })
}, {
  beforeAll: () => console.log('Benchmarking ruspty'),
  afterAll: () => console.log('Done'),
});

(async () => {
  console.log('Warming up...')
  await bench.warmup();
  console.log('\nRunning...');
  await bench.run();
  console.log(bench.table());
})();
