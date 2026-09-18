require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const searchRoutes = require('./routes/search');
const pushRoutes = require('./routes/push');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 7773;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', pushRoutes);
app.use('/api/chat', chatRoutes);

const PID_FILE = path.join(__dirname, 'scripts', 'confluence.pid');

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Confluence corriendo en http://localhost:${PORT}`);
  try {
    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
    fs.writeFileSync(PID_FILE, String(process.pid));
  } catch {
    // no bloqueante - solo se usa para que el script de auto-stop encuentre el proceso
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Puerto ${PORT} ya esta en uso - probablemente Confluence ya esta corriendo. Saliendo.`);
    process.exit(0);
  }
  throw err;
});
