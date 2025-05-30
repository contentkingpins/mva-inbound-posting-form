#!/usr/bin/env node

/**
 * CSS Optimization Script
 * Minifies, combines, and optimizes CSS files for production
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 Starting CSS optimization...');

// CSS files to optimize
const cssFiles = [
    { 
        input: 'styles.css', 
        output: 'css/styles.min.css',
        critical: false
    },
    { 
        input: 'admin.css', 
        output: 'css/admin.min.css',
        critical: false
    },
    { 
        input: 'agent-aurora.css', 
        output: 'css/agent-aurora.min.css',
        critical: false
    },
    { 
        input: 'analytics-dashboard.css', 
        output: 'css/analytics-dashboard.min.css',
        critical: false
    },
    { 
        input: 'css/critical.css', 
        output: 'css/critical.min.css',
        critical: true
    }
];

// Simple CSS minification function
function minifyCSS(css) {
    return css
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove spaces around certain characters
        .replace(/\s*{\s*/g, '{')
        .replace(/;\s*/g, ';')
        .replace(/\s*}\s*/g, '}')
        .replace(/\s*,\s*/g, ',')
        .replace(/\s*:\s*/g, ':')
        .replace(/\s*>\s*/g, '>')
        .replace(/\s*\+\s*/g, '+')
        .replace(/\s*~\s*/g, '~')
        // Remove trailing semicolons
        .replace(/;}/g, '}')
        // Remove leading/trailing whitespace
        .trim();
}

// Remove unused CSS rules (basic implementation)
function removeUnusedCSS(css) {
    // This is a simplified version - in production you'd use tools like PurgeCSS
    const unusedRules = [
        // Example unused rules patterns
        /\.unused-[^{]*{[^}]*}/g,
        /\.old-[^{]*{[^}]*}/g,
    ];
    
    let optimized = css;
    unusedRules.forEach(rule => {
        optimized = optimized.replace(rule, '');
    });
    
    return optimized;
}

// Analyze CSS for optimization opportunities
function analyzeCSS(css, filename) {
    const stats = {
        originalSize: css.length,
        rules: (css.match(/{[^}]*}/g) || []).length,
        selectors: (css.match(/[^{}]+(?={)/g) || []).length,
        properties: (css.match(/[^:{}]+:[^;{}]+/g) || []).length,
        mediaQueries: (css.match(/@media[^{]*{[^{}]*({[^}]*}[^{}]*)*}/g) || []).length,
        comments: (css.match(/\/\*[\s\S]*?\*\//g) || []).length
    };
    
    console.log(`📊 ${filename} analysis:`);
    console.log(`   - Size: ${(stats.originalSize / 1024).toFixed(2)}KB`);
    console.log(`   - Rules: ${stats.rules}`);
    console.log(`   - Selectors: ${stats.selectors}`);
    console.log(`   - Properties: ${stats.properties}`);
    console.log(`   - Media queries: ${stats.mediaQueries}`);
    console.log(`   - Comments: ${stats.comments}`);
    
    return stats;
}

// Create optimized CSS
function optimizeCSS(css, options = {}) {
    let optimized = css;
    
    // Remove unused CSS if enabled
    if (options.removeUnused) {
        optimized = removeUnusedCSS(optimized);
    }
    
    // Minify
    optimized = minifyCSS(optimized);
    
    return optimized;
}

// Create CSS directory if it doesn't exist
if (!fs.existsSync('css')) {
    fs.mkdirSync('css', { recursive: true });
}

// Process each CSS file
const results = [];

cssFiles.forEach(({ input, output, critical }) => {
    console.log(`\n🔧 Processing ${input}...`);
    
    try {
        // Read original file
        const originalCSS = fs.readFileSync(input, 'utf8');
        
        // Analyze original
        const originalStats = analyzeCSS(originalCSS, input);
        
        // Optimize CSS
        const optimizedCSS = optimizeCSS(originalCSS, {
            removeUnused: !critical // Don't remove "unused" from critical CSS
        });
        
        // Ensure output directory exists
        const outputDir = path.dirname(output);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Write optimized file
        fs.writeFileSync(output, optimizedCSS);
        
        // Calculate savings
        const originalSize = originalCSS.length;
        const optimizedSize = optimizedCSS.length;
        const savings = originalSize - optimizedSize;
        const percentSaved = ((savings / originalSize) * 100).toFixed(1);
        
        const result = {
            input,
            output,
            critical,
            originalSize,
            optimizedSize,
            savings,
            percentSaved
        };
        
        results.push(result);
        
        console.log(`✅ ${input} → ${output}`);
        console.log(`   - Original: ${(originalSize / 1024).toFixed(2)}KB`);
        console.log(`   - Optimized: ${(optimizedSize / 1024).toFixed(2)}KB`);
        console.log(`   - Saved: ${(savings / 1024).toFixed(2)}KB (${percentSaved}%)`);
        
    } catch (error) {
        console.error(`❌ Error processing ${input}:`, error.message);
    }
});

// Create combined CSS files
console.log('\n🔗 Creating combined CSS files...');

try {
    // Combine all non-critical CSS
    const nonCriticalCSS = results
        .filter(r => !r.critical && r.optimizedSize)
        .map(r => {
            const css = fs.readFileSync(r.output, 'utf8');
            return `/* ${r.input} */\n${css}`;
        })
        .join('\n\n');
    
    if (nonCriticalCSS) {
        fs.writeFileSync('css/combined.min.css', nonCriticalCSS);
        console.log(`✅ Combined CSS: css/combined.min.css (${(nonCriticalCSS.length / 1024).toFixed(2)}KB)`);
    }
    
    // Create critical CSS inline version
    const criticalResult = results.find(r => r.critical);
    if (criticalResult) {
        const criticalCSS = fs.readFileSync(criticalResult.output, 'utf8');
        const inlineCSS = `<style>${criticalCSS}</style>`;
        fs.writeFileSync('css/critical-inline.html', inlineCSS);
        console.log(`✅ Inline critical CSS: css/critical-inline.html`);
    }
    
} catch (error) {
    console.error('❌ Error creating combined files:', error.message);
}

// Generate optimization report
console.log('\n📊 CSS Optimization Report');
console.log('=' * 50);

const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
const totalOptimized = results.reduce((sum, r) => sum + r.optimizedSize, 0);
const totalSavings = totalOriginal - totalOptimized;
const totalPercentSaved = ((totalSavings / totalOriginal) * 100).toFixed(1);

console.log(`Total original size: ${(totalOriginal / 1024).toFixed(2)}KB`);
console.log(`Total optimized size: ${(totalOptimized / 1024).toFixed(2)}KB`);
console.log(`Total savings: ${(totalSavings / 1024).toFixed(2)}KB (${totalPercentSaved}%)`);

// Create optimization summary
const summary = {
    timestamp: new Date().toISOString(),
    results,
    totals: {
        originalSize: totalOriginal,
        optimizedSize: totalOptimized,
        savings: totalSavings,
        percentSaved: totalPercentSaved
    }
};

fs.writeFileSync('css/optimization-report.json', JSON.stringify(summary, null, 2));
console.log('✅ Optimization report saved: css/optimization-report.json');

console.log('\n🎨 CSS optimization complete!');

// Exit with error code if no savings achieved
if (totalSavings <= 0) {
    console.error('⚠️ Warning: No CSS optimization savings achieved');
    process.exit(1);
}

process.exit(0); 