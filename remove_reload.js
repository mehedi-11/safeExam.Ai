const fs = require('fs');

const studentFile = 'frontend/src/pages/StudentDashboard.jsx';
let studentContent = fs.readFileSync(studentFile, 'utf8');
studentContent = studentContent.replace(/<button onClick=\{fetchData\} className="hidden md:flex tomato-btn-outline py-2 text-xs items-center gap-1\.5">[\s\S]*?<\/button>/, '');
fs.writeFileSync(studentFile, studentContent);

const teacherFile = 'frontend/src/pages/TeacherDashboard.jsx';
let teacherContent = fs.readFileSync(teacherFile, 'utf8');
teacherContent = teacherContent.replace(/<button\s*onClick=\{fetchData\}\s*className="hidden md:flex tomato-btn-outline py-2 text-xs items-center gap-1\.5 shrink-0"\s*>[\s\S]*?<\/button>/, '');
fs.writeFileSync(teacherFile, teacherContent);

const adminFile = 'frontend/src/pages/AdminDashboard.jsx';
let adminContent = fs.readFileSync(adminFile, 'utf8');
adminContent = adminContent.replace(/<button\s*onClick=\{fetchData\}\s*className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1\.5 transition-colors shadow-sm"\s*>[\s\S]*?<\/button>/, '');
fs.writeFileSync(adminFile, adminContent);
