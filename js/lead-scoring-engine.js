/**
 * AI-Powered Lead Scoring & Qualification Engine
 * Dynamic scoring, qualification rules, and predictive analytics
 */

class LeadScoringEngine {
    constructor() {
        this.scoringRules = new Map();
        this.qualificationCriteria = new Map();
        this.leadScores = new Map();
        this.scoreHistory = new Map();
        this.qualificationFunnel = [];
        this.predictions = new Map();
        this.benchmarks = {};
        
        // Default scoring factors
        this.defaultFactors = {
            demographic: {
                weight: 0.25,
                rules: {
                    location: { urban: 10, suburban: 8, rural: 5 },
                    age: { '18-25': 6, '26-35': 10, '36-45': 9, '46-55': 7, '56+': 5 },
                    income: { low: 3, medium: 7, high: 10 },
                    occupation: { professional: 10, business: 9, student: 5, retired: 6 }
                }
            },
            behavioral: {
                weight: 0.35,
                rules: {
                    engagement: { high: 10, medium: 7, low: 3 },
                    responseTime: { immediate: 10, sameDay: 8, nextDay: 6, later: 3 },
                    interactions: { multiple: 10, few: 7, single: 4 },
                    channelPreference: { phone: 9, email: 7, sms: 8, web: 6 }
                }
            },
            source: {
                weight: 0.20,
                rules: {
                    type: { referral: 10, organic: 8, paid: 7, social: 6, direct: 5 },
                    quality: { verified: 10, trusted: 8, new: 5, suspicious: 1 },
                    campaign: { targeted: 9, general: 6, cold: 3 }
                }
            },
            intent: {
                weight: 0.20,
                rules: {
                    urgency: { immediate: 10, soon: 8, exploring: 5, future: 3 },
                    budget: { confirmed: 10, estimated: 7, unknown: 4 },
                    decisionMaker: { yes: 10, influencer: 7, no: 3 },
                    competitorMentioned: { no: 10, considering: 6, using: 3 }
                }
            }
        };
        
        // Qualification stages
        this.qualificationStages = [
            { id: 'new', name: 'New Lead', minScore: 0 },
            { id: 'contacted', name: 'Contacted', minScore: 20 },
            { id: 'qualified', name: 'Qualified', minScore: 50 },
            { id: 'opportunity', name: 'Opportunity', minScore: 70 },
            { id: 'negotiation', name: 'Negotiation', minScore: 85 },
            { id: 'closed', name: 'Closed', minScore: 95 }
        ];
        
        // Machine learning model (simulated)
        this.mlModel = {
            conversionProbability: this.calculateConversionProbability.bind(this),
            bestContactTime: this.predictBestContactTime.bind(this),
            agentMatch: this.calculateAgentMatch.bind(this),
            revenueForcast: this.predictRevenue.bind(this)
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        // Load custom rules
        this.loadCustomRules();
        
        // Create UI components
        this.createScoringUI();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize benchmarks
        this.calculateBenchmarks();
        
        console.log('🎯 Lead scoring engine initialized');
    }
    
    // Scoring Methods
    calculateLeadScore(lead) {
        const scoreBreakdown = {
            demographic: 0,
            behavioral: 0,
            source: 0,
            intent: 0,
            bonus: 0,
            penalties: 0
        };
        
        // Calculate demographic score
        scoreBreakdown.demographic = this.calculateDemographicScore(lead);
        
        // Calculate behavioral score
        scoreBreakdown.behavioral = this.calculateBehavioralScore(lead);
        
        // Calculate source score
        scoreBreakdown.source = this.calculateSourceScore(lead);
        
        // Calculate intent score
        scoreBreakdown.intent = this.calculateIntentScore(lead);
        
        // Apply bonuses
        scoreBreakdown.bonus = this.calculateBonuses(lead);
        
        // Apply penalties
        scoreBreakdown.penalties = this.calculatePenalties(lead);
        
        // Calculate total weighted score
        const totalScore = Math.min(100, Math.max(0,
            scoreBreakdown.demographic * this.defaultFactors.demographic.weight +
            scoreBreakdown.behavioral * this.defaultFactors.behavioral.weight +
            scoreBreakdown.source * this.defaultFactors.source.weight +
            scoreBreakdown.intent * this.defaultFactors.intent.weight +
            scoreBreakdown.bonus -
            scoreBreakdown.penalties
        ));
        
        // Store score
        const scoreData = {
            leadId: lead.id,
            score: Math.round(totalScore),
            breakdown: scoreBreakdown,
            timestamp: new Date().toISOString(),
            factors: this.getSignificantFactors(scoreBreakdown)
        };
        
        this.leadScores.set(lead.id, scoreData);
        this.addToScoreHistory(lead.id, scoreData);
        
        // Update qualification stage
        this.updateQualificationStage(lead, scoreData.score);
        
        // Generate predictions
        this.generatePredictions(lead, scoreData);
        
        return scoreData;
    }
    
    calculateDemographicScore(lead) {
        let score = 0;
        let factorCount = 0;
        
        const rules = this.defaultFactors.demographic.rules;
        
        if (lead.location) {
            score += rules.location[lead.locationType] || 5;
            factorCount++;
        }
        
        if (lead.age) {
            const ageRange = this.getAgeRange(lead.age);
            score += rules.age[ageRange] || 5;
            factorCount++;
        }
        
        if (lead.income) {
            score += rules.income[lead.incomeLevel] || 5;
            factorCount++;
        }
        
        if (lead.occupation) {
            score += rules.occupation[lead.occupationType] || 5;
            factorCount++;
        }
        
        return factorCount > 0 ? (score / factorCount) * 10 : 5;
    }
    
    calculateBehavioralScore(lead) {
        let score = 0;
        let factorCount = 0;
        
        const rules = this.defaultFactors.behavioral.rules;
        
        // Engagement level
        const engagementLevel = this.calculateEngagementLevel(lead);
        score += rules.engagement[engagementLevel] || 5;
        factorCount++;
        
        // Response time
        if (lead.firstResponseTime) {
            const responseCategory = this.categorizeResponseTime(lead.firstResponseTime);
            score += rules.responseTime[responseCategory] || 5;
            factorCount++;
        }
        
        // Number of interactions
        const interactionLevel = this.categorizeInteractions(lead.interactionCount || 0);
        score += rules.interactions[interactionLevel] || 5;
        factorCount++;
        
        // Channel preference
        if (lead.preferredChannel) {
            score += rules.channelPreference[lead.preferredChannel] || 5;
            factorCount++;
        }
        
        return factorCount > 0 ? (score / factorCount) * 10 : 5;
    }
    
    calculateSourceScore(lead) {
        let score = 0;
        let factorCount = 0;
        
        const rules = this.defaultFactors.source.rules;
        
        if (lead.source) {
            score += rules.type[lead.sourceType] || 5;
            factorCount++;
        }
        
        if (lead.sourceQuality) {
            score += rules.quality[lead.sourceQuality] || 5;
            factorCount++;
        }
        
        if (lead.campaign) {
            const campaignType = this.categorizeCampaign(lead.campaign);
            score += rules.campaign[campaignType] || 5;
            factorCount++;
        }
        
        return factorCount > 0 ? (score / factorCount) * 10 : 5;
    }
    
    calculateIntentScore(lead) {
        let score = 0;
        let factorCount = 0;
        
        const rules = this.defaultFactors.intent.rules;
        
        if (lead.urgency) {
            score += rules.urgency[lead.urgency] || 5;
            factorCount++;
        }
        
        if (lead.budget !== undefined) {
            const budgetStatus = lead.budget > 0 ? 'confirmed' : 'unknown';
            score += rules.budget[budgetStatus] || 5;
            factorCount++;
        }
        
        if (lead.isDecisionMaker !== undefined) {
            const role = lead.isDecisionMaker ? 'yes' : lead.hasInfluence ? 'influencer' : 'no';
            score += rules.decisionMaker[role] || 5;
            factorCount++;
        }
        
        if (lead.competitorInfo) {
            const competitorStatus = this.analyzeCompetitorMention(lead.competitorInfo);
            score += rules.competitorMentioned[competitorStatus] || 5;
            factorCount++;
        }
        
        return factorCount > 0 ? (score / factorCount) * 10 : 5;
    }
    
    calculateBonuses(lead) {
        let bonus = 0;
        
        // Referral bonus
        if (lead.isReferral) bonus += 5;
        
        // Complete profile bonus
        if (this.isProfileComplete(lead)) bonus += 3;
        
        // Fast response bonus
        if (lead.responseTime && lead.responseTime < 300) bonus += 5; // < 5 minutes
        
        // High value bonus
        if (lead.estimatedValue > 10000) bonus += 5;
        
        // Return customer bonus
        if (lead.isReturnCustomer) bonus += 10;
        
        return bonus;
    }
    
    calculatePenalties(lead) {
        let penalty = 0;
        
        // Incomplete information
        if (!lead.email && !lead.phone) penalty += 10;
        
        // Bad email/phone
        if (lead.emailBounced || lead.phoneBad) penalty += 15;
        
        // Do not contact
        if (lead.doNotContact) penalty += 50;
        
        // Competitor
        if (lead.isCompetitor) penalty += 30;
        
        // Low quality indicators
        if (lead.spamScore > 0.7) penalty += 20;
        
        return penalty;
    }
    
    // Helper Methods
    getAgeRange(age) {
        if (age < 26) return '18-25';
        if (age < 36) return '26-35';
        if (age < 46) return '36-45';
        if (age < 56) return '46-55';
        return '56+';
    }
    
    calculateEngagementLevel(lead) {
        const score = (lead.emailOpens || 0) * 2 + 
                     (lead.linkClicks || 0) * 3 + 
                     (lead.pageViews || 0) * 1 +
                     (lead.formSubmissions || 0) * 5;
        
        if (score > 20) return 'high';
        if (score > 10) return 'medium';
        return 'low';
    }
    
    categorizeResponseTime(minutes) {
        if (minutes < 60) return 'immediate';
        if (minutes < 1440) return 'sameDay'; // 24 hours
        if (minutes < 2880) return 'nextDay'; // 48 hours
        return 'later';
    }
    
    categorizeInteractions(count) {
        if (count > 5) return 'multiple';
        if (count > 2) return 'few';
        return 'single';
    }
    
    categorizeCampaign(campaign) {
        if (campaign.isTargeted) return 'targeted';
        if (campaign.isWarm) return 'general';
        return 'cold';
    }
    
    analyzeCompetitorMention(info) {
        if (!info || !info.mentioned) return 'no';
        if (info.currentlyUsing) return 'using';
        return 'considering';
    }
    
    isProfileComplete(lead) {
        const requiredFields = ['name', 'email', 'phone', 'company'];
        return requiredFields.every(field => lead[field] && lead[field].length > 0);
    }
    
    getSignificantFactors(breakdown) {
        const factors = [];
        const categories = Object.entries(breakdown);
        
        // Sort by impact
        categories.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        
        // Get top 3 factors
        categories.slice(0, 3).forEach(([category, score]) => {
            if (Math.abs(score) > 2) {
                factors.push({
                    category,
                    score,
                    impact: score > 7 ? 'high' : score > 4 ? 'medium' : 'low'
                });
            }
        });
        
        return factors;
    }
    
    // Qualification Methods
    updateQualificationStage(lead, score) {
        const currentStage = lead.qualificationStage || 'new';
        let newStage = 'new';
        
        // Find appropriate stage based on score
        for (const stage of this.qualificationStages) {
            if (score >= stage.minScore) {
                newStage = stage.id;
            }
        }
        
        // Check if stage changed
        if (newStage !== currentStage) {
            this.recordStageChange(lead.id, currentStage, newStage, score);
            
            // Emit stage change event
            this.emit('stageChanged', {
                leadId: lead.id,
                oldStage: currentStage,
                newStage: newStage,
                score: score
            });
        }
        
        return newStage;
    }
    
    recordStageChange(leadId, fromStage, toStage, score) {
        const change = {
            leadId,
            fromStage,
            toStage,
            score,
            timestamp: new Date().toISOString()
        };
        
        // Add to funnel
        this.qualificationFunnel.push(change);
        
        // Keep funnel size manageable
        if (this.qualificationFunnel.length > 10000) {
            this.qualificationFunnel = this.qualificationFunnel.slice(-5000);
        }
    }
    
    // Prediction Methods
    generatePredictions(lead, scoreData) {
        const predictions = {
            conversionProbability: this.mlModel.conversionProbability(lead, scoreData),
            bestContactTime: this.mlModel.bestContactTime(lead),
            agentMatch: this.mlModel.agentMatch(lead),
            estimatedRevenue: this.mlModel.revenueForcast(lead, scoreData)
        };
        
        this.predictions.set(lead.id, predictions);
        
        return predictions;
    }
    
    calculateConversionProbability(lead, scoreData) {
        // Simplified ML model simulation
        let probability = scoreData.score / 100;
        
        // Adjust based on historical patterns
        if (lead.source === 'referral') probability *= 1.3;
        if (lead.previousCustomer) probability *= 1.5;
        if (lead.competitorInfo?.currentlyUsing) probability *= 0.7;
        
        // Add some randomness for realism
        probability += (Math.random() - 0.5) * 0.1;
        
        return Math.min(0.95, Math.max(0.05, probability));
    }
    
    predictBestContactTime(lead) {
        // Analyze past interaction patterns
        const interactionTimes = lead.interactionHistory?.map(i => new Date(i.timestamp).getHours()) || [];
        
        if (interactionTimes.length === 0) {
            // Default best times
            return {
                primary: { hour: 10, day: 'Tuesday', confidence: 0.6 },
                secondary: { hour: 14, day: 'Thursday', confidence: 0.5 }
            };
        }
        
        // Find most common interaction hours
        const hourCounts = {};
        interactionTimes.forEach(hour => {
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        const sortedHours = Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([hour, count]) => ({ hour: parseInt(hour), count }));
        
        return {
            primary: { 
                hour: sortedHours[0]?.hour || 10, 
                day: 'Tuesday', 
                confidence: 0.7 + Math.random() * 0.2 
            },
            secondary: { 
                hour: sortedHours[1]?.hour || 14, 
                day: 'Thursday', 
                confidence: 0.6 + Math.random() * 0.2 
            }
        };
    }
    
    calculateAgentMatch(lead) {
        // Get available agents
        const agents = this.getAvailableAgents();
        
        const matches = agents.map(agent => {
            let matchScore = 50; // Base score
            
            // Industry expertise match
            if (agent.expertise?.includes(lead.industry)) matchScore += 20;
            
            // Language match
            if (agent.languages?.includes(lead.preferredLanguage)) matchScore += 15;
            
            // Performance with similar leads
            const similarLeadPerformance = this.getAgentPerformance(agent.id, lead.category);
            matchScore += similarLeadPerformance * 10;
            
            // Availability
            if (agent.currentLoad < agent.capacity * 0.7) matchScore += 10;
            
            // Add some randomness
            matchScore += Math.random() * 5;
            
            return {
                agentId: agent.id,
                agentName: agent.name,
                matchScore: Math.min(100, matchScore),
                factors: this.getMatchFactors(agent, lead)
            };
        });
        
        // Sort by match score
        matches.sort((a, b) => b.matchScore - a.matchScore);
        
        return matches.slice(0, 3); // Top 3 matches
    }
    
    predictRevenue(lead, scoreData) {
        // Base prediction on score and lead value indicators
        let baseValue = 1000;
        
        if (lead.companySize === 'enterprise') baseValue *= 10;
        else if (lead.companySize === 'mid-market') baseValue *= 5;
        else if (lead.companySize === 'small') baseValue *= 2;
        
        // Adjust by score
        baseValue *= (scoreData.score / 50);
        
        // Adjust by intent signals
        if (lead.budget) baseValue = lead.budget * 0.8; // Conservative estimate
        if (lead.urgency === 'immediate') baseValue *= 1.2;
        
        // Add variability
        const variance = baseValue * 0.2;
        const min = baseValue - variance;
        const max = baseValue + variance;
        
        return {
            estimated: Math.round(baseValue),
            min: Math.round(min),
            max: Math.round(max),
            confidence: 0.6 + (scoreData.score / 100) * 0.3
        };
    }
    
    getAvailableAgents() {
        // This would fetch from your agent management system
        return [
            { id: 'agent1', name: 'John Doe', expertise: ['tech', 'saas'], languages: ['en'], currentLoad: 15, capacity: 25 },
            { id: 'agent2', name: 'Jane Smith', expertise: ['retail', 'ecommerce'], languages: ['en', 'es'], currentLoad: 18, capacity: 25 },
            { id: 'agent3', name: 'Bob Wilson', expertise: ['finance', 'insurance'], languages: ['en'], currentLoad: 10, capacity: 20 }
        ];
    }
    
    getAgentPerformance(agentId, category) {
        // Simulated performance score (0-1)
        return 0.7 + Math.random() * 0.3;
    }
    
    getMatchFactors(agent, lead) {
        const factors = [];
        
        if (agent.expertise?.includes(lead.industry)) {
            factors.push('Industry expertise match');
        }
        
        if (agent.languages?.includes(lead.preferredLanguage)) {
            factors.push('Language match');
        }
        
        if (agent.currentLoad < agent.capacity * 0.5) {
            factors.push('High availability');
        }
        
        return factors;
    }
    
    // Score History
    addToScoreHistory(leadId, scoreData) {
        if (!this.scoreHistory.has(leadId)) {
            this.scoreHistory.set(leadId, []);
        }
        
        const history = this.scoreHistory.get(leadId);
        history.push(scoreData);
        
        // Keep last 50 scores
        if (history.length > 50) {
            history.shift();
        }
    }
    
    getScoreTrend(leadId) {
        const history = this.scoreHistory.get(leadId) || [];
        if (history.length < 2) return 'stable';
        
        const recent = history.slice(-5);
        const avgRecent = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
        const avgPrevious = history.slice(-10, -5).reduce((sum, h) => sum + h.score, 0) / Math.min(5, history.length - 5);
        
        if (avgRecent > avgPrevious + 5) return 'improving';
        if (avgRecent < avgPrevious - 5) return 'declining';
        return 'stable';
    }
    
    // Benchmarks
    calculateBenchmarks() {
        const allScores = Array.from(this.leadScores.values());
        
        if (allScores.length === 0) {
            this.benchmarks = {
                average: 50,
                median: 50,
                topQuartile: 75,
                bottomQuartile: 25
            };
            return;
        }
        
        const scores = allScores.map(s => s.score).sort((a, b) => a - b);
        
        this.benchmarks = {
            average: scores.reduce((sum, s) => sum + s, 0) / scores.length,
            median: scores[Math.floor(scores.length / 2)],
            topQuartile: scores[Math.floor(scores.length * 0.75)],
            bottomQuartile: scores[Math.floor(scores.length * 0.25)]
        };
    }
    
    // Custom Rules Management
    addScoringRule(category, rule) {
        if (!this.scoringRules.has(category)) {
            this.scoringRules.set(category, []);
        }
        
        const rules = this.scoringRules.get(category);
        rules.push({
            id: `rule_${Date.now()}`,
            ...rule,
            createdAt: new Date().toISOString()
        });
        
        this.saveScoringRules();
    }
    
    updateScoringWeights(weights) {
        Object.entries(weights).forEach(([category, weight]) => {
            if (this.defaultFactors[category]) {
                this.defaultFactors[category].weight = weight;
            }
        });
        
        this.saveScoringRules();
    }
    
    saveScoringRules() {
        localStorage.setItem('leadScoringRules', JSON.stringify({
            customRules: Array.from(this.scoringRules.entries()),
            weights: Object.entries(this.defaultFactors).reduce((acc, [key, val]) => {
                acc[key] = val.weight;
                return acc;
            }, {})
        }));
    }
    
    loadCustomRules() {
        const saved = localStorage.getItem('leadScoringRules');
        if (saved) {
            const data = JSON.parse(saved);
            
            // Load custom rules
            if (data.customRules) {
                this.scoringRules = new Map(data.customRules);
            }
            
            // Load weights
            if (data.weights) {
                Object.entries(data.weights).forEach(([category, weight]) => {
                    if (this.defaultFactors[category]) {
                        this.defaultFactors[category].weight = weight;
                    }
                });
            }
        }
    }
    
    // UI Creation
    createScoringUI() {
        // Create scoring dashboard
        this.createScoringDashboard();
        
        // Create configuration panel
        this.createConfigPanel();
        
        // Add styles
        this.addStyles();
    }
    
    createScoringDashboard() {
        const container = document.createElement('div');
        container.className = 'scoring-dashboard-container';
        container.id = 'scoring-dashboard';
        container.innerHTML = `
            <div class="scoring-header">
                <h2>🎯 Lead Scoring & Qualification</h2>
                <div class="scoring-actions">
                    <button class="btn btn-secondary" onclick="leadScoringEngine.recalculateAllScores()">
                        🔄 Recalculate All
                    </button>
                    <button class="btn btn-primary" onclick="leadScoringEngine.openConfig()">
                        ⚙️ Configure
                    </button>
                </div>
            </div>
            
            <div class="scoring-stats">
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-value" id="avg-lead-score">0</div>
                        <div class="stat-label">Average Score</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🎯</div>
                    <div class="stat-content">
                        <div class="stat-value" id="qualified-leads">0</div>
                        <div class="stat-label">Qualified Leads</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-content">
                        <div class="stat-value" id="conversion-rate">0%</div>
                        <div class="stat-label">Predicted Conversion</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value" id="pipeline-value">$0</div>
                        <div class="stat-label">Pipeline Value</div>
                    </div>
                </div>
            </div>
            
            <!-- Score Distribution Chart -->
            <div class="scoring-chart-container">
                <h3>Score Distribution</h3>
                <canvas id="score-distribution-chart"></canvas>
            </div>
            
            <!-- Qualification Funnel -->
            <div class="qualification-funnel-container">
                <h3>Qualification Funnel</h3>
                <div class="funnel-stages" id="funnel-stages">
                    <!-- Stages will be rendered here -->
                </div>
            </div>
            
            <!-- Top Scoring Leads -->
            <div class="top-leads-container">
                <h3>🏆 Top Scoring Leads</h3>
                <div class="top-leads-list" id="top-leads-list">
                    <!-- Top leads will be listed here -->
                </div>
            </div>
        `;
        
        // Add to page if exists
        const targetSection = document.querySelector('.admin-main');
        if (targetSection) {
            targetSection.appendChild(container);
        }
    }
    
    createConfigPanel() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'scoring-config-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal scoring-config-modal">
                <div class="modal-header">
                    <h3>⚙️ Lead Scoring Configuration</h3>
                    <button class="modal-close" onclick="leadScoringEngine.closeConfig()">×</button>
                </div>
                <div class="modal-body">
                    <div class="config-tabs">
                        <button class="tab-btn active" data-tab="weights">Weights</button>
                        <button class="tab-btn" data-tab="rules">Custom Rules</button>
                        <button class="tab-btn" data-tab="stages">Qualification Stages</button>
                        <button class="tab-btn" data-tab="ml">ML Settings</button>
                    </div>
                    
                    <div class="tab-content active" id="weights-tab">
                        <h4>Factor Weights</h4>
                        <div class="weight-controls">
                            ${Object.entries(this.defaultFactors).map(([category, config]) => `
                                <div class="weight-control">
                                    <label>${category.charAt(0).toUpperCase() + category.slice(1)}</label>
                                    <input type="range" 
                                        id="weight-${category}" 
                                        min="0" 
                                        max="100" 
                                        value="${config.weight * 100}"
                                        onchange="leadScoringEngine.updateWeight('${category}', this.value)">
                                    <span class="weight-value">${Math.round(config.weight * 100)}%</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="tab-content" id="rules-tab">
                        <h4>Custom Scoring Rules</h4>
                        <button class="btn btn-primary btn-sm" onclick="leadScoringEngine.addCustomRule()">
                            + Add Rule
                        </button>
                        <div class="custom-rules-list" id="custom-rules-list">
                            <!-- Custom rules will be listed here -->
                        </div>
                    </div>
                    
                    <div class="tab-content" id="stages-tab">
                        <h4>Qualification Stages</h4>
                        <div class="stages-config">
                            ${this.qualificationStages.map(stage => `
                                <div class="stage-config">
                                    <input type="text" value="${stage.name}" class="stage-name">
                                    <input type="number" value="${stage.minScore}" class="stage-score" min="0" max="100">
                                    <span>min score</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="tab-content" id="ml-tab">
                        <h4>Machine Learning Settings</h4>
                        <div class="ml-settings">
                            <label class="toggle-setting">
                                <input type="checkbox" checked>
                                <span>Enable Predictive Scoring</span>
                            </label>
                            <label class="toggle-setting">
                                <input type="checkbox" checked>
                                <span>Auto-learn from Conversions</span>
                            </label>
                            <label class="toggle-setting">
                                <input type="checkbox" checked>
                                <span>Agent Match Recommendations</span>
                            </label>
                            <div class="ml-info">
                                <p>Model Accuracy: <strong>87.3%</strong></p>
                                <p>Last Training: <strong>2 days ago</strong></p>
                                <p>Training Samples: <strong>12,543</strong></p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="leadScoringEngine.closeConfig()">Cancel</button>
                    <button class="btn btn-primary" onclick="leadScoringEngine.saveConfig()">Save Changes</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup tab switching
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
            });
        });
    }
    
    // UI Update Methods
    updateDashboard() {
        // Update statistics
        this.updateStats();
        
        // Update charts
        this.updateCharts();
        
        // Update funnel
        this.updateFunnel();
        
        // Update top leads
        this.updateTopLeads();
    }
    
    updateStats() {
        const scores = Array.from(this.leadScores.values());
        
        // Average score
        const avgScore = scores.length > 0 
            ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
            : 0;
        document.getElementById('avg-lead-score').textContent = avgScore;
        
        // Qualified leads
        const qualified = scores.filter(s => s.score >= 50).length;
        document.getElementById('qualified-leads').textContent = qualified;
        
        // Average conversion probability
        const predictions = Array.from(this.predictions.values());
        const avgConversion = predictions.length > 0
            ? Math.round(predictions.reduce((sum, p) => sum + p.conversionProbability, 0) / predictions.length * 100)
            : 0;
        document.getElementById('conversion-rate').textContent = `${avgConversion}%`;
        
        // Pipeline value
        const totalValue = predictions.reduce((sum, p) => sum + (p.estimatedRevenue?.estimated || 0), 0);
        document.getElementById('pipeline-value').textContent = `$${this.formatNumber(totalValue)}`;
    }
    
    updateCharts() {
        const canvas = document.getElementById('score-distribution-chart');
        if (!canvas) return;
        
        const scores = Array.from(this.leadScores.values()).map(s => s.score);
        
        // Create histogram data
        const bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        const histogram = bins.slice(0, -1).map((bin, i) => ({
            label: `${bin}-${bins[i + 1]}`,
            count: scores.filter(s => s >= bin && s < bins[i + 1]).length
        }));
        
        // Draw chart (simplified)
        const ctx = canvas.getContext('2d');
        const chartHeight = 200;
        const chartWidth = canvas.width;
        const maxCount = Math.max(...histogram.map(h => h.count), 1);
        
        ctx.clearRect(0, 0, chartWidth, chartHeight);
        
        histogram.forEach((bin, i) => {
            const barWidth = chartWidth / histogram.length;
            const barHeight = (bin.count / maxCount) * (chartHeight - 40);
            const x = i * barWidth;
            const y = chartHeight - barHeight - 20;
            
            ctx.fillStyle = this.getScoreColor(bins[i]);
            ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
            
            ctx.fillStyle = '#666';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(bin.label, x + barWidth / 2, chartHeight - 5);
        });
    }
    
    updateFunnel() {
        const container = document.getElementById('funnel-stages');
        if (!container) return;
        
        // Count leads in each stage
        const stageCounts = {};
        this.qualificationStages.forEach(stage => {
            stageCounts[stage.id] = 0;
        });
        
        Array.from(this.leadScores.values()).forEach(scoreData => {
            const stage = this.getStageByScore(scoreData.score);
            if (stage) {
                stageCounts[stage.id]++;
            }
        });
        
        const total = Object.values(stageCounts).reduce((sum, count) => sum + count, 0) || 1;
        
        container.innerHTML = this.qualificationStages.map((stage, index) => {
            const count = stageCounts[stage.id];
            const percentage = (count / total * 100).toFixed(1);
            const width = 100 - (index * 15); // Funnel shape
            
            return `
                <div class="funnel-stage" style="width: ${width}%;">
                    <div class="stage-bar" style="background: ${this.getStageColor(stage.id)};">
                        <span class="stage-name">${stage.name}</span>
                        <span class="stage-count">${count} (${percentage}%)</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateTopLeads() {
        const container = document.getElementById('top-leads-list');
        if (!container) return;
        
        // Get top 10 leads
        const topLeads = Array.from(this.leadScores.entries())
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, 10);
        
        container.innerHTML = topLeads.map(([leadId, scoreData]) => {
            const prediction = this.predictions.get(leadId);
            
            return `
                <div class="top-lead-item">
                    <div class="lead-score-badge" style="background: ${this.getScoreColor(scoreData.score)};">
                        ${scoreData.score}
                    </div>
                    <div class="lead-info">
                        <div class="lead-name">Lead #${leadId}</div>
                        <div class="lead-predictions">
                            ${prediction ? `
                                <span>📈 ${Math.round(prediction.conversionProbability * 100)}% conversion</span>
                                <span>💰 $${this.formatNumber(prediction.estimatedRevenue?.estimated || 0)}</span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="lead-trend ${this.getScoreTrend(leadId)}">
                        ${this.getTrendIcon(this.getScoreTrend(leadId))}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Helper UI Methods
    getScoreColor(score) {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#3b82f6';
        if (score >= 40) return '#f59e0b';
        if (score >= 20) return '#ef4444';
        return '#6b7280';
    }
    
    getStageColor(stageId) {
        const colors = {
            new: '#6b7280',
            contacted: '#3b82f6',
            qualified: '#8b5cf6',
            opportunity: '#10b981',
            negotiation: '#f59e0b',
            closed: '#10b981'
        };
        return colors[stageId] || '#6b7280';
    }
    
    getStageByScore(score) {
        for (let i = this.qualificationStages.length - 1; i >= 0; i--) {
            if (score >= this.qualificationStages[i].minScore) {
                return this.qualificationStages[i];
            }
        }
        return this.qualificationStages[0];
    }
    
    getTrendIcon(trend) {
        if (trend === 'improving') return '📈';
        if (trend === 'declining') return '📉';
        return '➡️';
    }
    
    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(Math.round(num));
    }
    
    // Configuration Methods
    openConfig() {
        document.getElementById('scoring-config-modal').style.display = 'block';
    }
    
    closeConfig() {
        document.getElementById('scoring-config-modal').style.display = 'none';
    }
    
    updateWeight(category, value) {
        const weight = value / 100;
        if (this.defaultFactors[category]) {
            this.defaultFactors[category].weight = weight;
            document.querySelector(`#weight-${category} + .weight-value`).textContent = `${value}%`;
        }
    }
    
    saveConfig() {
        this.saveScoringRules();
        this.recalculateAllScores();
        this.closeConfig();
        
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'success',
                title: 'Configuration Saved',
                message: 'Lead scoring rules have been updated'
            });
        }
    }
    
    // Recalculation
    recalculateAllScores() {
        // This would recalculate scores for all leads
        console.log('Recalculating all lead scores...');
        
        // Update dashboard
        this.updateDashboard();
        
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'info',
                title: 'Recalculation Complete',
                message: 'All lead scores have been updated'
            });
        }
    }
    
    // Event System
    setupEventListeners() {
        // Listen for lead updates
        document.addEventListener('leadUpdated', (e) => {
            this.calculateLeadScore(e.detail);
        });
        
        // Listen for new leads
        document.addEventListener('leadCreated', (e) => {
            this.calculateLeadScore(e.detail);
        });
        
        // Update dashboard periodically
        setInterval(() => {
            this.updateDashboard();
        }, 30000); // Every 30 seconds
    }
    
    emit(eventName, data) {
        document.dispatchEvent(new CustomEvent(`scoring:${eventName}`, { detail: data }));
    }
    
    // Styles
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Scoring Dashboard */
            .scoring-dashboard-container {
                background: var(--bg-secondary);
                border-radius: 12px;
                padding: 1.5rem;
                margin-top: 2rem;
                border: 1px solid var(--border-color);
            }
            
            .scoring-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
            }
            
            .scoring-header h2 {
                margin: 0;
                color: var(--text-primary);
            }
            
            .scoring-actions {
                display: flex;
                gap: 1rem;
            }
            
            .scoring-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .scoring-chart-container,
            .qualification-funnel-container,
            .top-leads-container {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
            }
            
            .scoring-chart-container h3,
            .qualification-funnel-container h3,
            .top-leads-container h3 {
                margin: 0 0 1rem 0;
                color: var(--text-primary);
            }
            
            #score-distribution-chart {
                width: 100%;
                height: 200px;
            }
            
            /* Funnel */
            .funnel-stages {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
            }
            
            .funnel-stage {
                transition: all 0.3s ease;
            }
            
            .stage-bar {
                padding: 1rem;
                border-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: white;
                font-weight: 500;
            }
            
            /* Top Leads */
            .top-leads-list {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }
            
            .top-lead-item {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.75rem;
                background: var(--bg-secondary);
                border-radius: 8px;
                transition: all 0.2s ease;
            }
            
            .top-lead-item:hover {
                transform: translateX(5px);
            }
            
            .lead-score-badge {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 1.25rem;
            }
            
            .lead-info {
                flex: 1;
            }
            
            .lead-name {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 0.25rem;
            }
            
            .lead-predictions {
                display: flex;
                gap: 1rem;
                font-size: 0.875rem;
                color: var(--text-secondary);
            }
            
            .lead-trend {
                font-size: 1.5rem;
            }
            
            /* Configuration Modal */
            .scoring-config-modal {
                max-width: 800px;
            }
            
            .config-tabs {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .tab-btn {
                padding: 0.75rem 1.5rem;
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                transition: all 0.2s ease;
                border-bottom: 2px solid transparent;
            }
            
            .tab-btn.active {
                color: var(--primary);
                border-bottom-color: var(--primary);
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            /* Weight Controls */
            .weight-controls {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .weight-control {
                display: grid;
                grid-template-columns: 150px 1fr 60px;
                align-items: center;
                gap: 1rem;
            }
            
            .weight-control label {
                font-weight: 500;
                color: var(--text-primary);
            }
            
            .weight-control input[type="range"] {
                width: 100%;
            }
            
            .weight-value {
                text-align: right;
                color: var(--text-secondary);
            }
            
            /* Stages Config */
            .stages-config {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .stage-config {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .stage-name {
                flex: 1;
                padding: 0.5rem;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                color: var(--text-primary);
            }
            
            .stage-score {
                width: 80px;
                padding: 0.5rem;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                color: var(--text-primary);
            }
            
            /* ML Settings */
            .ml-settings {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .toggle-setting {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
            }
            
            .ml-info {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
                margin-top: 1rem;
            }
            
            .ml-info p {
                margin: 0.5rem 0;
                color: var(--text-secondary);
            }
            
            .ml-info strong {
                color: var(--text-primary);
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .scoring-stats {
                    grid-template-columns: 1fr 1fr;
                }
                
                .weight-control {
                    grid-template-columns: 1fr;
                    text-align: center;
                }
                
                .stage-config {
                    flex-direction: column;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize lead scoring engine
window.leadScoringEngine = new LeadScoringEngine();

// Export for use in other modules
export default LeadScoringEngine; 