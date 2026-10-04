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
            
            // Replace 'lime' with 'tomato' in classes
            content = content.replace(/lime-/g, 'tomato-');
            content = content.replace(/bg-lime/g, 'bg-tomato');
            content = content.replace(/text-lime/g, 'text-tomato');
            content = content.replace(/border-lime/g, 'border-tomato');
            content = content.replace(/shadow-lime/g, 'shadow-tomato');
            content = content.replace(/from-lime/g, 'from-tomato');
            content = content.replace(/to-lime/g, 'to-tomato');
            content = content.replace(/via-lime/g, 'via-tomato');
            
            // Button specific fixes
            content = content.replace(/lime-btn/g, 'tomato-btn');
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

replaceInFiles(path.join(__dirname, 'src'));
console.log("Done replacing lime with tomato.");
