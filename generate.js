const express = require('express');
const router = express.Router();

/**
 * POST /api/generate
 * Receives bot configuration and returns a bootstrap script as a file.
 */
router.post('/generate', async (req, res) => {
    try {
        const { sessionId, authorizedNumber, botPrefix } = req.body;

        // 1. Validation: Ensure the frontend actually sent the data
        if (!sessionId || !authorizedNumber || !botPrefix) {
            return res.status(400).json({ 
                error: 'Missing required fields: sessionId, authorizedNumber, and botPrefix are required.' 
            });
        }

        // 2. Define the script template
        // We use backticks and ${} to inject the user's specific data into the script
        const generatedScript = `
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_URL = 'https://github.com/Dexxtiny/SAINt-MD';
const FOLDER_NAME = 'SAINt-MD';

async function bootstrap() {
    try {
        console.log('\\n🚀 Starting SAINt-MD Setup...\\n');

        // Step 1: Clone the Repo
        if (!fs.existsSync(FOLDER_NAME)) {
            console.log('📦 Cloning repository...');
            execSync(\`git clone \${REPO_URL}\`, { stdio: 'inherit' });
        } else {
            console.log('✅ Folder already exists, skipping clone.');
        }

        const projectPath = path.join(process.cwd(), FOLDER_NAME);

        // Step 2: Create .env
        console.log('⚙️  Configuring variables...');
        const envContent = \`SESSION_ID=${sessionId}\\nPREFIX=${botPrefix}\\nOWNER_NUMBER=${authorizedNumber}\\n\`;
        fs.writeFileSync(path.join(projectPath, '.env'), envContent);

        // Step 3: Install Packages
        console.log('📥 Installing dependencies (this may take a minute)...');
        execSync('npm install', { cwd: projectPath, stdio: 'inherit' });

        // Step 4: Start the Bot
        console.log('\\n✨ Setup Complete! Launching Bot...\\n');
        execSync('npm start', { cwd: projectPath, stdio: 'inherit' });

    } catch (err) {
        console.error('\\n❌ Error during setup:', err.message);
        process.exit(1);
    }
}

bootstrap();
`.trim();

        // 3. Set headers so the browser knows it is receiving a file
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="index.js"');

        // 4. Send the script back to the frontend
        return res.status(200).send(generatedScript);

    } catch (error) {
        console.error('Route Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
