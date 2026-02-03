const fs = require('fs');
const path = require('path');
const posthtml = require('posthtml');
const include = require('posthtml-include');

const rootDir = path.resolve(__dirname, '..');
const templatePath = path.join(rootDir, 'index.template.html');
const outputPath = path.join(rootDir, 'index.html');

const html = fs.readFileSync(templatePath, 'utf8');

posthtml([include({ root: rootDir, encoding: 'utf8' })])
  .process(html)
  .then((result) => {
    fs.writeFileSync(outputPath, result.html, 'utf8');
    console.log('Built index.html from index.template.html');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
