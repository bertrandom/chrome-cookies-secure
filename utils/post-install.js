const { execSync } = require('child_process');

if (process.platform === 'darwin') {
  console.log('darwin operating system detected; installing operating system dependency keytar')
  execSync('npm i keytar@7.9.0')
} else if (process.platform === 'win32') {
  console.log('win32 operating system detected; installing operating system dependency win-dpapi')
  execSync('npm i win-dpapi@1.1.0')
}