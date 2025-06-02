/**
 * Advanced Search Module
 * Provides enhanced search functionality with highlighting, fuzzy matching, and performance optimization
 */

class SearchManager {
    constructor() {
        this.searchTerm = '';
        this.searchIndex = new Map();
        this.highlightClass = 'search-highlight';
        this.minSearchLength = 2;
        this.searchHistory = [];
        this.maxHistorySize = 10;
        
        this.initializeSearchStyles();
    }
    
    initializeSearchStyles() {
        // Add search highlight styles if not already present
        if (!document.getElementById('search-styles')) {
            const style = document.createElement('style');
            style.id = 'search-styles';
            style.textContent = `
                .search-highlight {
                    background-color: #fff3cd;
                    color: #856404;
                    padding: 1px 2px;
                    border-radius: 2px;
                    font-weight: 500;
                    border: 1px solid #ffeaa7;
                }
                
                .search-input-enhanced {
                    position: relative;
                }
                
                .search-suggestions {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-top: none;
                    border-radius: 0 0 8px 8px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1000;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    display: none;
                }
                
                .search-suggestion {
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                    font-size: 14px;
                }
                
                .search-suggestion:hover {
                    background-color: #f8f9fa;
                }
                
                .search-suggestion:last-child {
                    border-bottom: none;
                }
                
                .suggestion-type {
                    font-size: 12px;
                    color: #666;
                    float: right;
                }
                
                .search-stats {
                    font-size: 12px;
                    color: #666;
                    margin-top: 5px;
                    text-align: right;
                }
                
                .no-search-results {
                    text-align: center;
                    padding: 20px;
                    color: #666;
                    font-style: italic;
                }
                
                .search-clear {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    font-size: 16px;
                    cursor: pointer;
                    color: #999;
                    display: none;
                }
                
                .search-clear:hover {
                    color: #666;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Build search index for faster searches
    buildSearchIndex(leads) {
        this.searchIndex.clear();
        
        leads.forEach(lead => {
            const searchableFields = [
                'lead_id',
                'first_name',
                'last_name', 
                'email',
                'phone_home',
                'city',
                'state',
                'zip_code',
                'vendor_code',
                'incident_type',
                'disposition',
                'accident_location',
                'notes'
            ];
            
            const searchableContent = searchableFields
                .map(field => lead[field] || '')
                .join(' ')
                .toLowerCase()
                .trim();
            
            // Store both the full content and individual words
            this.searchIndex.set(lead.lead_id, {
                content: searchableContent,
                words: searchableContent.split(/\s+/).filter(word => word.length > 1),
                lead: lead
            });
        });
    }
    
    // Enhanced search with fuzzy matching and ranking
    performSearch(query, leads) {
        if (!query || query.length < this.minSearchLength) {
            return { results: leads, stats: null };
        }
        
        const startTime = performance.now();
        const searchTerms = query.toLowerCase().trim().split(/\s+/);
        const results = [];
        
        // Update search history
        this.updateSearchHistory(query);
        
        this.searchIndex.forEach(indexed => {
            const score = this.calculateSearchScore(indexed, searchTerms);
            if (score > 0) {
                results.push({
                    lead: indexed.lead,
                    score: score,
                    matchedTerms: this.getMatchedTerms(indexed, searchTerms)
                });
            }
        });
        
        // Sort by relevance score
        results.sort((a, b) => b.score - a.score);
        
        const searchTime = performance.now() - startTime;
        const stats = {
            totalResults: results.length,
            searchTime: searchTime.toFixed(2),
            query: query
        };
        
        return {
            results: results.map(r => r.lead),
            stats: stats,
            matches: results
        };
    }
    
    calculateSearchScore(indexed, searchTerms) {
        let score = 0;
        const content = indexed.content;
        const words = indexed.words;
        
        searchTerms.forEach(term => {
            // Exact phrase match (highest score)
            if (content.includes(term)) {
                score += 10;
                
                // Bonus for exact word match
                if (words.includes(term)) {
                    score += 5;
                }
                
                // Bonus for matches at word boundaries
                const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(term)}`, 'i');
                if (wordBoundaryRegex.test(content)) {
                    score += 3;
                }
            }
            
            // Fuzzy match for typos
            const fuzzyMatches = this.findFuzzyMatches(term, words);
            score += fuzzyMatches.length * 2;
            
            // Partial matches
            words.forEach(word => {
                if (word.startsWith(term) && word !== term) {
                    score += 1;
                }
            });
        });
        
        return score;
    }
    
    findFuzzyMatches(term, words) {
        return words.filter(word => {
            if (Math.abs(word.length - term.length) > 2) return false;
            return this.levenshteinDistance(word, term) <= 2;
        });
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    getMatchedTerms(indexed, searchTerms) {
        const matches = [];
        const content = indexed.content;
        
        searchTerms.forEach(term => {
            if (content.includes(term)) {
                matches.push(term);
            }
        });
        
        return matches;
    }
    
    // Highlight search terms in text
    highlightText(text, searchTerms) {
        if (!text || !searchTerms || searchTerms.length === 0) {
            return Utils.escapeHtml(text);
        }
        
        let highlightedText = Utils.escapeHtml(text);
        
        searchTerms.forEach(term => {
            if (term.length >= this.minSearchLength) {
                const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
                highlightedText = highlightedText.replace(regex, 
                    `<span class="${this.highlightClass}">$1</span>`);
            }
        });
        
        return highlightedText;
    }
    
    // Enhanced search input with suggestions
    enhanceSearchInput(inputElement) {
        const container = inputElement.parentElement;
        container.classList.add('search-input-enhanced');
        
        // Add clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'search-clear';
        clearBtn.innerHTML = '×';
        clearBtn.title = 'Clear search';
        container.appendChild(clearBtn);
        
        // Add suggestions dropdown
        const suggestions = document.createElement('div');
        suggestions.className = 'search-suggestions';
        container.appendChild(suggestions);
        
        // Add search stats
        const stats = document.createElement('div');
        stats.className = 'search-stats';
        container.appendChild(stats);
        
        // Event listeners
        inputElement.addEventListener('input', (e) => {
            const query = e.target.value;
            clearBtn.style.display = query ? 'block' : 'none';
            this.showSuggestions(query, suggestions);
        });
        
        clearBtn.addEventListener('click', () => {
            inputElement.value = '';
            clearBtn.style.display = 'none';
            suggestions.style.display = 'none';
            inputElement.dispatchEvent(new Event('input'));
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });
        
        return { suggestions, stats, clearBtn };
    }
    
    showSuggestions(query, suggestionsElement) {
        if (!query || query.length < this.minSearchLength) {
            suggestionsElement.style.display = 'none';
            return;
        }
        
        const suggestions = this.generateSuggestions(query);
        
        if (suggestions.length === 0) {
            suggestionsElement.style.display = 'none';
            return;
        }
        
        suggestionsElement.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.className = 'search-suggestion';
            div.innerHTML = `
                ${Utils.escapeHtml(suggestion.text)}
                <span class="suggestion-type">${suggestion.type}</span>
            `;
            
            div.addEventListener('click', () => {
                const searchInput = document.getElementById('lead-search');
                if (searchInput) {
                    searchInput.value = suggestion.text;
                    searchInput.dispatchEvent(new Event('input'));
                }
                suggestionsElement.style.display = 'none';
            });
            
            suggestionsElement.appendChild(div);
        });
        
        suggestionsElement.style.display = 'block';
    }
    
    generateSuggestions(query) {
        const suggestions = [];
        const lowercaseQuery = query.toLowerCase();
        
        // Add search history suggestions
        this.searchHistory.forEach(term => {
            if (term.toLowerCase().includes(lowercaseQuery) && term !== query) {
                suggestions.push({
                    text: term,
                    type: 'Recent'
                });
            }
        });
        
        // Add field-specific suggestions
        const fieldSuggestions = this.getFieldSuggestions(lowercaseQuery);
        suggestions.push(...fieldSuggestions);
        
        // Limit suggestions
        return suggestions.slice(0, 8);
    }
    
    getFieldSuggestions(query) {
        const suggestions = [];
        const fields = ['email', 'phone', 'city', 'state', 'vendor'];
        
        fields.forEach(field => {
            if (field.includes(query)) {
                suggestions.push({
                    text: `${field}:`,
                    type: 'Field'
                });
            }
        });
        
        return suggestions;
    }
    
    updateSearchHistory(query) {
        // Remove if already exists
        const index = this.searchHistory.indexOf(query);
        if (index > -1) {
            this.searchHistory.splice(index, 1);
        }
        
        // Add to beginning
        this.searchHistory.unshift(query);
        
        // Limit size
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
    }
    
    updateSearchStats(statsElement, stats) {
        if (!statsElement || !stats) return;
        
        statsElement.innerHTML = `
            Found ${stats.totalResults} results in ${stats.searchTime}ms
        `;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    clearHighlights() {
        const highlights = document.querySelectorAll(`.${this.highlightClass}`);
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    }
    
    setSearchTerm(term) {
        this.searchTerm = term;
    }
    
    getSearchTerm() {
        return this.searchTerm;
    }
    
    getSearchHistory() {
        return [...this.searchHistory];
    }
}

// Export for use in main app
window.SearchManager = SearchManager; 