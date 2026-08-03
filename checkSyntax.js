const fs = require('fs');
const parser = require('@babel/parser');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, 'frontend/src/pages/AdminDashboard.jsx'), 'utf8');

try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log("No syntax error found by babel.");
} catch (e) {
  console.log(`Syntax Error at line ${e.loc.line}, column ${e.loc.column}: ${e.message}`);
}
