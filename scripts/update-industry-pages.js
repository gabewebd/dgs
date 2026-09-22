const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, '..', 'industries');
const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dirPath, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace dgs-section--darker with dgs-section--light on #dgs-ind-solutions-results
  content = content.replace(
    /<section class="dgs-section dgs-section--darker" id="dgs-ind-solutions-results">/g,
    '<section class="dgs-section dgs-section--light" id="dgs-ind-solutions-results">'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated section class in ${file}`);
});
