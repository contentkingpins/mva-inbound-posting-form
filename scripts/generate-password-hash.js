#!/usr/bin/env node

/**
 * Password Hash Generator
 * 
 * This utility script generates a bcrypt hash for a password
 * Usage: node generate-password-hash.js <password>
 */

const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

// Check if password is provided as argument
if (process.argv.length < 3) {
  console.error('Error: Password is required');
  console.log('Usage: node generate-password-hash.js <password>');
  process.exit(1);
}

// Get password from command line argument
const password = process.argv[2];

// Generate salt and hash
bcrypt.genSalt(SALT_ROUNDS, (err, salt) => {
  if (err) {
    console.error('Error generating salt:', err);
    process.exit(1);
  }
  
  bcrypt.hash(password, salt, (err, hash) => {
    if (err) {
      console.error('Error generating hash:', err);
      process.exit(1);
    }
    
    console.log('\nHashed Password:');
    console.log('----------------');
    console.log(hash);
    console.log('\nCopy this hash value to use in your DynamoDB command');
    console.log('Make sure you keep the original password secure for the initial login');
  });
}); 