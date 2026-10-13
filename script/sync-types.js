// ZIP downloads turn the original _types symlink into a plain text file on Windows.
// Copy the shared types before compilation so no symlink privileges are required.
const fs = require('fs');
const path = require('path');
const source = path.resolve(__dirname, '../src/dashboard/runback/_types');
const target = path.resolve(__dirname, '../src/extension/runback/_types');
if (fs.existsSync(target) && !fs.lstatSync(target).isDirectory()) fs.unlinkSync(target);
fs.mkdirSync(target, { recursive: true });
for (const file of fs.readdirSync(source)) {
  if (file.endsWith('.ts')) fs.copyFileSync(path.join(source, file), path.join(target, file));
}
