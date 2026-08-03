const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/AdminDashboard.jsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// 1-indexed, so index is line - 1
// We want to delete lines 521 to 694 inclusive.
// Array splice: start at index 520, remove (694 - 521 + 1) = 174 lines
lines.splice(520, 174);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Fixed nested TAB: USERS');
