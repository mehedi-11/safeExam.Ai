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
            
            // Reversing Dark mode replacements (Dark to Light)
            content = content.replace(/bg-dark-850/g, 'bg-white');
            content = content.replace(/bg-dark-900\/50/g, 'bg-gray-50');
            content = content.replace(/bg-dark-900/g, 'bg-gray-50');
            content = content.replace(/bg-dark-800/g, 'bg-gray-100');
            content = content.replace(/bg-dark-700/g, 'bg-gray-200');
            
            content = content.replace(/text-gray-100/g, 'text-gray-900');
            content = content.replace(/text-gray-200/g, 'text-gray-800');
            content = content.replace(/text-gray-300/g, 'text-gray-700');
            content = content.replace(/text-gray-400/g, 'text-gray-500');
            
            content = content.replace(/border-dark-700/g, 'border-gray-200');
            content = content.replace(/border-dark-600/g, 'border-gray-300');
            
            // Also text colors like white -> gray-800 on buttons maybe, but we'll leave it as is or fix individually.
            // Some text-white may be fine for buttons. 

            // specific fixes:
            content = content.replace(/text-dark-900/g, 'text-white');
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

replaceInFiles(path.join(__dirname, 'src'));
console.log("Done replacing dark classes with light classes.");
