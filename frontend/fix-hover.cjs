const fs = require('fs');
const path = require('path');

function replaceInFiles(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInFiles(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.css') || fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            const originalContent = content;
            
            // Fix hover backgrounds that are still light gray
            content = content.replace(/hover:bg-gray-50/g, 'hover:bg-dark-800');
            content = content.replace(/hover:bg-gray-55/g, 'hover:bg-dark-800');
            content = content.replace(/hover:bg-gray-100/g, 'hover:bg-dark-700');
            content = content.replace(/hover:bg-gray-200/g, 'hover:bg-dark-600');
            
            // Also fix plain bg-gray-100/200 that might have been missed
            content = content.replace(/bg-gray-100/g, 'bg-dark-800');
            content = content.replace(/bg-gray-200/g, 'bg-dark-700');
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

replaceInFiles(path.join(__dirname, 'src'));
console.log("Done fixing hover colors.");
