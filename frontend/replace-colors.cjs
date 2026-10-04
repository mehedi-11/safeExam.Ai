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
            
            // Replace 'rose' with 'lime' in classes
            content = content.replace(/rose-/g, 'lime-');
            content = content.replace(/bg-rose/g, 'bg-lime');
            content = content.replace(/text-rose/g, 'text-lime');
            content = content.replace(/border-rose/g, 'border-lime');
            content = content.replace(/shadow-rose/g, 'shadow-lime');
            content = content.replace(/from-rose/g, 'from-lime');
            content = content.replace(/to-rose/g, 'to-lime');
            content = content.replace(/via-rose/g, 'via-lime');
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

replaceInFiles(path.join(__dirname, 'src'));
console.log("Done replacing rose with lime.");
