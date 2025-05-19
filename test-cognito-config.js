#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('MVA Lead Management - AWS Cognito Configuration Test');
console.log('==================================================');

// Step 1: Check if config.json exists
console.log('\n1. Checking configuration files...');
let rootConfig = null;
let dashboardConfig = null;

try {
  const rootConfigPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(rootConfigPath)) {
    rootConfig = JSON.parse(fs.readFileSync(rootConfigPath, 'utf8'));
    console.log('✅ Root config.json found');
  } else {
    console.log('❌ Root config.json not found');
  }
} catch (error) {
  console.error('❌ Error reading root config.json:', error.message);
}

try {
  const dashboardConfigPath = path.join(__dirname, 'dashboard', 'config.json');
  if (fs.existsSync(dashboardConfigPath)) {
    dashboardConfig = JSON.parse(fs.readFileSync(dashboardConfigPath, 'utf8'));
    console.log('✅ Dashboard config.json found');
  } else {
    console.log('❌ Dashboard config.json not found');
  }
} catch (error) {
  console.error('❌ Error reading dashboard config.json:', error.message);
}

// Step 2: Validate configuration values
console.log('\n2. Validating configuration values...');

// Function to validate config
const validateConfig = (config, name) => {
  if (!config) {
    console.log(`❌ ${name} config is missing`);
    return false;
  }
  
  let isValid = true;
  
  if (!config.region) {
    console.log(`❌ ${name} config: Missing 'region'`);
    isValid = false;
  }
  
  if (!config.userPoolId) {
    console.log(`❌ ${name} config: Missing 'userPoolId'`);
    isValid = false;
  } else if (!config.userPoolId.match(/^[a-z0-9-]+_[A-Za-z0-9]+$/)) {
    console.log(`⚠️  ${name} config: 'userPoolId' appears to be a placeholder value`);
    isValid = false;
  }
  
  if (!config.clientId) {
    console.log(`❌ ${name} config: Missing 'clientId'`);
    isValid = false;
  } else if (config.clientId === 'abcdefghijklmnopqrstuvwxyz') {
    console.log(`⚠️  ${name} config: 'clientId' appears to be a placeholder value`);
    isValid = false;
  }
  
  if (isValid) {
    console.log(`✅ ${name} config values are present`);
  }
  
  return isValid;
};

const rootConfigValid = validateConfig(rootConfig, 'Root');
const dashboardConfigValid = validateConfig(dashboardConfig, 'Dashboard');

// Step 3: Check if configs match
console.log('\n3. Checking if configurations match...');
if (rootConfigValid && dashboardConfigValid) {
  const keysToCompare = ['region', 'userPoolId', 'clientId'];
  const mismatchedKeys = keysToCompare.filter(key => rootConfig[key] !== dashboardConfig[key]);
  
  if (mismatchedKeys.length > 0) {
    console.log('❌ Configurations do not match:');
    mismatchedKeys.forEach(key => {
      console.log(`   - ${key}: Root = "${rootConfig[key]}", Dashboard = "${dashboardConfig[key]}"`);
    });
  } else {
    console.log('✅ Configurations match');
  }
} else {
  console.log('⚠️  Cannot compare configurations due to missing or invalid values');
}

// Step 4: Check for AWS Cognito SDK
console.log('\n4. Checking for AWS Cognito SDK...');
try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.dependencies && packageJson.dependencies['amazon-cognito-identity-js']) {
    console.log('✅ amazon-cognito-identity-js found in package.json dependencies');
    
    // Check version
    const version = packageJson.dependencies['amazon-cognito-identity-js'];
    if (version.startsWith('^6.')) {
      console.log(`✅ Using compatible version: ${version}`);
    } else {
      console.log(`⚠️  Using potentially incompatible version: ${version} (recommend ^6.x.x)`);
    }
  } else {
    console.log('❌ amazon-cognito-identity-js not found in package.json dependencies');
  }
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
}

// Step 5: Check for CDN reference in HTML
console.log('\n5. Checking for CDN references in HTML...');
try {
  const loginHtmlPath = path.join(__dirname, 'dashboard', 'login.html');
  if (fs.existsSync(loginHtmlPath)) {
    const loginHtml = fs.readFileSync(loginHtmlPath, 'utf8');
    if (loginHtml.includes('amazon-cognito-identity')) {
      console.log('✅ Amazon Cognito reference found in login.html');
    } else {
      console.log('❌ Amazon Cognito reference not found in login.html');
    }
  } else {
    console.log('❌ login.html not found');
  }
  
  const indexHtmlPath = path.join(__dirname, 'dashboard', 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    if (indexHtml.includes('amazon-cognito-identity')) {
      console.log('✅ Amazon Cognito reference found in index.html');
    } else {
      console.log('❌ Amazon Cognito reference not found in index.html');
    }
  } else {
    console.log('❌ index.html not found');
  }
} catch (error) {
  console.error('❌ Error reading HTML files:', error.message);
}

// Step 6: Test Cognito User Pool accessibility
console.log('\n6. Testing Cognito User Pool accessibility...');
if (rootConfigValid) {
  try {
    const url = `https://cognito-idp.${rootConfig.region}.amazonaws.com/${rootConfig.userPoolId}/.well-known/jwks.json`;
    console.log(`   Requesting: ${url}`);
    
    // Make the request to the JWKS endpoint
    await axios.get(url)
      .then(response => {
        if (response.status === 200 && response.data && response.data.keys) {
          console.log(`✅ Successfully connected to Cognito User Pool and retrieved JWKS`);
          console.log(`   Found ${response.data.keys.length} keys in the response`);
        } else {
          console.log(`❌ Connected to Cognito, but received an unexpected response format`);
        }
      })
      .catch(error => {
        if (error.response) {
          console.log(`❌ Received HTTP ${error.response.status} from Cognito: ${error.response.data.message || error.message}`);
        } else if (error.request) {
          console.log(`❌ No response received from Cognito. Network issue or invalid User Pool ID?`);
        } else {
          console.log(`❌ Error setting up request: ${error.message}`);
        }
        
        if (rootConfig.userPoolId.includes('XXXXXXXX')) {
          console.log(`   Note: Your userPoolId "${rootConfig.userPoolId}" appears to be a placeholder.`);
          console.log(`   Replace it with your actual Cognito User Pool ID from the AWS Console.`);
        }
      });
  } catch (error) {
    console.error('❌ Error testing Cognito User Pool:', error.message);
  }
} else {
  console.log('⚠️  Skipping Cognito User Pool test due to invalid configuration');
}

// Step 7: Validate auth-service.js and auth-routes.js
console.log('\n7. Validating auth service files...');
try {
  const authServicePath = path.join(__dirname, 'auth-service.js');
  if (fs.existsSync(authServicePath)) {
    const authService = fs.readFileSync(authServicePath, 'utf8');
    console.log('✅ auth-service.js found');
    
    // Check for encoding issues (look for invalid UTF-8 characters)
    const hasEncodingIssues = /���/.test(authService);
    if (hasEncodingIssues) {
      console.log('❌ auth-service.js has encoding issues (contains invalid UTF-8 characters)');
    } else {
      console.log('✅ auth-service.js encoding looks good');
    }
  } else {
    console.log('❌ auth-service.js not found');
  }
  
  const authRoutesPath = path.join(__dirname, 'auth-routes.js');
  if (fs.existsSync(authRoutesPath)) {
    const authRoutes = fs.readFileSync(authRoutesPath, 'utf8');
    console.log('✅ auth-routes.js found');
    
    // Check for encoding issues
    const hasEncodingIssues = /���/.test(authRoutes);
    if (hasEncodingIssues) {
      console.log('❌ auth-routes.js has encoding issues (contains invalid UTF-8 characters)');
    } else {
      console.log('✅ auth-routes.js encoding looks good');
    }
  } else {
    console.log('❌ auth-routes.js not found');
  }
} catch (error) {
  console.error('❌ Error validating auth service files:', error.message);
}

console.log('\n==================================================');
console.log('Configuration test complete!');
console.log('=================================================='); 