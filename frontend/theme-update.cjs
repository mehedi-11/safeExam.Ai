const fs = require('fs');
const path = require('path');

function replaceInFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInFiles(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            
            // 1. Button backgrounds: tomato to black + add shadows
            content = content.replace(/bg-tomato-500 hover:bg-tomato-600/g, 'bg-gray-900 hover:bg-black shadow-md hover:shadow-lg shadow-tomato-500/10 hover:shadow-tomato-500/30 transition-all');
            
            // 2. Any other remaining bg-tomato-500 (except text highlights) to black
            // We use gray-900 for a deep blackish color
            content = content.replace(/bg-tomato-500/g, 'bg-gray-900');
            content = content.replace(/bg-tomato-600/g, 'bg-black');
            
            // 3. System Backgrounds to white
            content = content.replace(/min-h-screen bg-gray-50/g, 'min-h-screen bg-white');
            content = content.replace(/bg-gray-50/g, 'bg-white'); // some cards might use gray-50, we can make them white
            
            // 4. Update the WelcomeHeader to use black instead of tomato
            content = content.replace(/from-tomato-600 to-tomato-400/g, 'from-gray-900 to-gray-800');
            content = content.replace(/border-tomato-500/g, 'border-gray-800');
            
            // 5. Enhance shadow in standard containers
            content = content.replace(/shadow-sm/g, 'shadow-md shadow-gray-200/50');
            
            fs.writeFileSync(fullPath, content, 'utf-8');
        }
    }
}

replaceInFiles('./src');
console.log('Theme updated successfully!');
