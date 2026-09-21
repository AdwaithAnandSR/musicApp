const fs = require('fs');
let code = fs.readFileSync('utils/videoDownloader.js', 'utf8');

// Fix the array element `uploadPath,` back to `rawVideoPath,`
code = code.replace('uploadPath,\n            ...cookieArgs', 'rawVideoPath,\n            ...cookieArgs');

// Fix the Cloudinary upload: change `rawVideoPath,\n            {\n                resource_type: "video",` 
// to `uploadPath,\n            {\n                resource_type: "video",`
code = code.replace('rawVideoPath,\n            {\n                resource_type: "video"', 'uploadPath,\n            {\n                resource_type: "video"');

fs.writeFileSync('utils/videoDownloader.js', code);
console.log('Fixed uploadPath variables!');
