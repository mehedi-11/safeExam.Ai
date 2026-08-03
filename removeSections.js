const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/AdminDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove states
content = content.replace(/const \[exams, setExams\] = useState\(\[\]\);\n\s*/, '');
content = content.replace(/const \[settings, setSettings\] = useState\(\{\}\);\n\s*/, '');

// 2. Remove api calls in fetchData
content = content.replace(/\s*api\.get\('\/admin\/all-exams'\),/, '');
content = content.replace(/\s*api\.get\('\/admin\/settings'\),/, '');

// 3. Remove setExams and setSettings
content = content.replace(/\s*setExams\(eRes\.data\);/, '');
content = content.replace(/\s*setSettings\(setRes\.data\);/, '');

// 4. Remove handleUpdateSettings function
const handleUpdateSettingsRegex = /const handleUpdateSettings = async \(e\) => \{[\s\S]*?finally \{\s*setLoading\(false\);\s*\}\s*\};\s*/;
content = content.replace(handleUpdateSettingsRegex, '');

// 5. Remove navigation tabs
content = content.replace(/\s*\{\s*id:\s*'exams',\s*label:\s*'Manage Exams',\s*icon:\s*FileText\s*\},/, '');
content = content.replace(/\s*\{\s*id:\s*'settings',\s*label:\s*'Settings & Security',\s*icon:\s*Settings\s*\}/, '');

// 6. Remove activeTab === 'exams' block
const examsTabStart = content.indexOf("{/* TAB: EXAMS */}");
if (examsTabStart !== -1) {
  // Find the closing brace of the exams tab block
  let nextTab = content.indexOf("{/* TAB: SYSTEM SETTINGS */}", examsTabStart);
  if (nextTab !== -1) {
    content = content.substring(0, examsTabStart) + content.substring(nextTab);
  }
}

// 7. Remove activeTab === 'settings' block
const settingsTabStart = content.indexOf("{/* TAB: SYSTEM SETTINGS */}");
if (settingsTabStart !== -1) {
  // Find the closing brace of the settings tab block (before {/* MODALS */})
  let modalsStart = content.indexOf("{/* MODALS */}");
  if (modalsStart !== -1) {
    content = content.substring(0, settingsTabStart) + content.substring(modalsStart);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Removed exams and settings from AdminDashboard');
