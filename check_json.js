const fs = require('fs');
const path = require('path');

// Function to find all JSON files in a directory recursively
function findJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
      findJsonFiles(filePath, fileList);
    } else if (path.extname(file) === '.json') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to check if JSON is valid
function validateJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for BOM (Byte Order Mark)
    const hasBOM = content.charCodeAt(0) === 0xFEFF;
    if (hasBOM) {
      console.log(`WARNING: ${filePath} has a BOM character at the beginning`);
    }
    
    // Check for non-standard whitespace characters
    const hasNonStandardWhitespace = /[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/.test(content);
    if (hasNonStandardWhitespace) {
      console.log(`WARNING: ${filePath} contains non-standard whitespace characters`);
    }
    
    // Print the character at position 475 if the file is long enough
    if (content.length > 475) {
      console.log(`Character at position 475 in ${filePath}: '${content.charAt(475)}' (charCode: ${content.charCodeAt(475)})`);
    }
    
    // Check if JSON is valid
    JSON.parse(content);
    console.log(`✓ ${filePath} is valid JSON`);
    return true;
  } catch (error) {
    console.error(`✗ ${filePath} is NOT valid JSON:`, error.message);
    
    // Try to identify the problematic character
    if (error.message.includes('position')) {
      const posMatch = error.message.match(/position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const content = fs.readFileSync(filePath, 'utf8');
        console.error(`Character at position ${pos}: '${content.charAt(pos)}' (charCode: ${content.charCodeAt(pos)})`);
        console.error(`Context: "${content.substring(Math.max(0, pos - 10), pos)}→${content.charAt(pos)}←${content.substring(pos + 1, pos + 10)}"`);
      }
    }
    
    return false;
  }
}

// Main function
function main() {
  const jsonFiles = findJsonFiles('.');
  console.log(`Found ${jsonFiles.length} JSON files`);
  
  let validCount = 0;
  let invalidCount = 0;
  
  jsonFiles.forEach(file => {
    const isValid = validateJson(file);
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  });
  
  console.log(`\nSummary: ${validCount} valid, ${invalidCount} invalid JSON files`);
}

main(); 