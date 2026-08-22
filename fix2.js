const fs = require('fs');
const file = 'frontend/src/pages/TeacherDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix Mobile Header z-index
content = content.replace('p-4 sticky top-0 z-30 shadow-sm', 'p-4 sticky top-0 z-40 shadow-sm');
content = content.replace('p-4 sticky top-0 \r\nz-30 shadow-sm', 'p-4 sticky top-0 \r\nz-40 shadow-sm');
content = content.replace('p-4 sticky top-0 \nz-30 shadow-sm', 'p-4 sticky top-0 \nz-40 shadow-sm');

// 2. Hide Reload Data button on mobile
content = content.replace('className="tomato-btn-outline py-2 text-xs flex items-center gap-1.5 shrink-0"\r\n                >\r\n                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />\r\n                  <span>Reload data</span>', 'className="hidden md:flex tomato-btn-outline py-2 text-xs items-center gap-1.5 shrink-0"\r\n                >\r\n                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />\r\n                  <span>Reload data</span>');
content = content.replace('className="tomato-btn-outline py-2 text-xs flex items-center gap-1.5 shrink-0"\n                >\n                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />\n                  <span>Reload data</span>', 'className="hidden md:flex tomato-btn-outline py-2 text-xs items-center gap-1.5 shrink-0"\n                >\n                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />\n                  <span>Reload data</span>');

// 3. Add Close Icon to Sidebar
const sidebarOld = `<div className="p-6 border-b border-gray-150 flex items-center gap-3">\r
              <div className="w-10 h-10 rounded-xl bg-tomato-500 flex items-center justify-center text-white shadow-lg shadow-tomato-500/20">\r
                <BookOpen className="w-6 h-6" />\r
              </div>\r
              <div>\r
                <span className="font-extrabold text-lg tracking-tight text-black">\r
                  S-Exam<span className="text-tomato-500">.ai</span>\r
                </span>\r
                <span className="text-[10px] text-gray-400 block font-semibold tracking-widest uppercase">\r
                  Teacher Console\r
                </span>\r
              </div>\r
            </div>`;

const sidebarNew = `<div className="p-6 border-b border-gray-150 flex items-center justify-between">\r
              <div className="flex items-center gap-3">\r
                <div className="w-10 h-10 rounded-xl bg-tomato-500 flex items-center justify-center text-white shadow-lg shadow-tomato-500/20">\r
                  <BookOpen className="w-6 h-6" />\r
                </div>\r
                <div>\r
                  <span className="font-extrabold text-lg tracking-tight text-black">\r
                    S-Exam<span className="text-tomato-500">.ai</span>\r
                  </span>\r
                  <span className="text-[10px] text-gray-400 block font-semibold tracking-widest uppercase">\r
                    Teacher Console\r
                  </span>\r
                </div>\r
              </div>\r
              <button \r
                onClick={() => setIsSidebarOpen(false)}\r
                className="lg:hidden p-1.5 text-gray-400 hover:text-dark-900 hover:bg-gray-100 rounded-lg transition-colors"\r
              >\r
                <X size={20} />\r
              </button>\r
            </div>`;

content = content.replace(sidebarOld, sidebarNew);
content = content.replace(sidebarOld.replace(/\r\n/g, '\n'), sidebarNew.replace(/\r\n/g, '\n'));

// Ensure X is imported from lucide-react if not already
if (!content.includes('X,')) {
    content = content.replace('Users,', 'Users,\n  X,');
}

// 4. Add Footer
const footerOld = `        {/* POPUP MODALS */}`;
const footerNew = `        {/* Footer */}\n        <div className="mt-auto text-center text-gray-400 text-xs py-4 border-t border-gray-200">\n          Developed by MD Mehedi Hasan (232004048) and MST Onamika Jannat Ara (232005048) for the final Project\n        </div>\n      </div>\n\n      {/* POPUP MODALS */}`;
content = content.replace(footerOld, footerNew);

fs.writeFileSync(file, content);
