const generatePackage = async (req, res) => {
    try {
        const { sessionId, authorizedNumber, botPrefix } = req.body;

        if (!sessionId || !authorizedNumber || !botPrefix) {
            return res.status(400).json({ error: 'Missing information to generate script.' });
        }

        // This is the code that will be written INSIDE the downloaded index.js
        const generatedScript = `
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_URL = 'https://github.com/Dexxtiny/SAINt-MD';
const FOLDER_NAME = 'SAINt-MD';

async function setup() {
    try {
        console.log('--- Starting Setup ---');

        // 1. Clone the repository
        if (!fs.existsSync(FOLDER_NAME)) {
            console.log('Cloning repository...');
            execSync(\`git clone \${REPO_URL}\`, { stdio: 'inherit' });
        } else {
            console.log('Folder already exists, skipping clone.');
        }

        const projectPath = path.join(process.cwd(), FOLDER_NAME);

        // 2. Create the .env file
        console.log('Configuring .env file...');
        const envContent = \`SESSION_ID=\${'${sessionId}'}\\nPREFIX=\${'${botPrefix}'}\\nOWNER_NUMBER=\${'${authorizedNumber}'}\\n\`;
        fs.writeFileSync(path.join(projectPath, '.env'), envContent);

        // 3. Install packages
        console.log('Installing dependencies (this may take a minute)...');
        execSync('npm install', { cwd: projectPath, stdio: 'inherit' });

        // 4. Start the bot
        console.log('--- Setup Complete! Starting Bot ---');
        execSync('npm start', { cwd: projectPath, stdio: 'inherit' });

    } catch (error) {
        console.error('An error occurred during setup:', error.message);
    }
}

setup();
`;

        // Send the generated string as a text file
        res.setHeader('Content-Type', 'text/plain');
        return res.send(generatedScript);

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: 'Failed to generate the script.' });
    }
};
export default router;
