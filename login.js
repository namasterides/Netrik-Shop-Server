const { spawn } = require('child_process');

const login2 = spawn('cmd.exe', ['/c', 'npx expo login'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

login2.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(str);
  
  if (str.toLowerCase().includes('email')) {
    login2.stdin.write('bidyadhar.sahu.cse.2022@nist.edu\n');
  } else if (str.toLowerCase().includes('password')) {
    login2.stdin.write('Bidyadhar1!@\n');
  }
});

login2.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

login2.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
