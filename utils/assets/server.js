const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.writeHead(204); // No Content
    res.end();
    return;
  }

  if (req.url === '/contour') {
    const filePath = path.join(__dirname, 'contour_test_image.nii.gz');

    // Set headers for gzipped file
    res.writeHead(200, {
      'Content-Type': 'application/gzip',
      'Content-Encoding': 'gzip',
      'Content-Disposition': 'attachment; filename="contour_test_image.nii.gz"',
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/contour`);
});
