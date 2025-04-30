// Script to securely set up API key
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envFilePath = path.join(__dirname, '..', '.env.local');

// Create readline interface to get input from user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('This script will help you securely save your API key');
console.log('The API key will be stored in .env.local which is ignored by git');

// Ask for API key
rl.question('Enter your API key: ', (apiKey) => {
  if (!apiKey || apiKey.trim() === '') {
    console.error('Error: API key cannot be empty');
    rl.close();
    return;
  }

  // Write to .env.local file
  const content = `API_KEY=${apiKey.trim()}\n`;
  
  try {
    fs.writeFileSync(envFilePath, content, 'utf8');
    console.log('\nAPI key saved successfully!');
    console.log(`File created: ${envFilePath}`);
    console.log('\nNow you can run tests without exposing your API key in command line:');
    console.log('node scripts/simple-test.js');
  } catch (error) {
    console.error('Error saving API key:', error.message);
  }

  rl.close();
});

// Warn about security
console.log('\nIMPORTANT: Never commit .env.local to version control');
console.log('Make sure .env.local is in your .gitignore file\n'); 