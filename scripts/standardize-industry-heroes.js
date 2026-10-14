const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, '..', 'industries');
const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dirPath, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove inline style="padding-top: 13rem;" from #dgs-ind-problems
  content = content.replace(
    /<section class="dgs-section dgs-section--light" id="dgs-ind-problems" style="padding-top: 13rem;">/g,
    '<section class="dgs-section dgs-section--light" id="dgs-ind-problems">'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Standardized hero section spacing in ${file}`);
});
