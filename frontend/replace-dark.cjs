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
            
            // Dark mode replacements
            content = content.replace(/bg-white/g, 'bg-dark-850');
            content = content.replace(/bg-gray-50/g, 'bg-dark-900');
            content = content.replace(/text-dark-900/g, 'text-gray-100');
            content = content.replace(/text-gray-900/g, 'text-gray-100');
            content = content.replace(/text-gray-800/g, 'text-gray-200');
            content = content.replace(/text-gray-700/g, 'text-gray-300');
            content = content.replace(/text-gray-600/g, 'text-gray-400');
            content = content.replace(/text-gray-500/g, 'text-gray-400');
            content = content.replace(/border-gray-150/g, 'border-dark-700');
            content = content.replace(/border-gray-200/g, 'border-dark-700');
            content = content.replace(/border-gray-300/g, 'border-dark-600');
            
            // Fix lime-btn text to dark
            content = content.replace(/text-lime-500/g, 'text-lime-400');
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

replaceInFiles(path.join(__dirname, 'src'));
console.log("Done replacing light classes with dark classes.");
