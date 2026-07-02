const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'smart-ride-frontend', 'src');

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      findFiles(path.join(dir, file), fileList);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const allFiles = findFiles(srcDir);
const toastConfigPath = path.join(srcDir, 'utils', 'toastConfig');

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("import toast from 'react-hot-toast'") || content.includes('import toast from "react-hot-toast"')) {
    let relPath = path.relative(path.dirname(file), toastConfigPath);
    // Convert Windows backslashes to forward slashes
    relPath = relPath.replace(/\\/g, '/');
    if (!relPath.startsWith('.')) {
      relPath = './' + relPath;
    }
    
    content = content.replace(
      /import toast from ['"]react-hot-toast['"];?/g,
      `import toast from '${relPath}';`
    );
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
