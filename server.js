const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4567;
const HTML = path.join(__dirname, 'index.html');

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(HTML).pipe(res);
}).listen(PORT, () => {
  console.log('Server running: http://localhost:' + PORT);
});
