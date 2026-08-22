const fs = require('fs');
const file = 'frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('p-4 sticky top-0 z-30 shadow-sm', 'p-4 sticky top-0 z-40 shadow-sm');
content = content.replace('        </div>\n      </div>\n\n      {/* MODALS */}', '        </div>\n        {/* Footer */}\n        <div className="mt-auto text-center text-gray-400 text-xs py-4 border-t border-gray-200">\n          Developed by MD Mehedi Hasan (232004048) and MST Onamika Jannat Ara (232005048) for the final Project\n        </div>\n      </div>\n\n      {/* MODALS */}');
content = content.replace('        </div>\r\n      </div>\r\n\r\n      {/* MODALS */}', '        </div>\r\n        {/* Footer */}\r\n        <div className="mt-auto text-center text-gray-400 text-xs py-4 border-t border-gray-200">\r\n          Developed by MD Mehedi Hasan (232004048) and MST Onamika Jannat Ara (232005048) for the final Project\r\n        </div>\r\n      </div>\r\n\r\n      {/* MODALS */}');
fs.writeFileSync(file, content);
