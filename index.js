// index.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pairRouter from './pair.js';
import generateRoute from './generate.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Use your pair.js as API route - this handles /api/pair
app.use('/api', pairRouter);

app.use('/api', generateRoute);

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve pairing page
app.get('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

app.get('/session', (req,res) => {
    res.sendFile(path.join(__dirname, 'public', 'session.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Savy DNI Pairing Service',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Savy DNI Pairing Server running on port ${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
    console.log(`🔗 Pairing API: http://localhost:${PORT}/api/pair`);
    console.log(`🌐 Main Page: http://localhost:${PORT}`);
    console.log(`📱 Pairing Page: http://localhost:${PORT}/pair`);
});
