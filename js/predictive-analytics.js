/**
 * Predictive Analytics Engine - AI-Powered Business Intelligence
 * Forecasts revenue, analyzes trends, and provides actionable insights
 * Integrates with Smart Lead Router for comprehensive business intelligence
 */

class PredictiveAnalytics {
    constructor() {
        this.historicalData = new Map();
        this.forecastModels = new Map();
        this.trendAnalyzer = new TrendAnalyzer();
        this.riskAssessment = new RiskAssessment();
        this.performanceCoach = new PerformanceCoach();
        this.seasonalFactors = new SeasonalFactors();
        this.dataCollectionStartTime = Date.now();
        
        console.log('📊 Predictive Analytics Engine initialized');
        this.initializeHistoricalData();
        this.startRealTimeAnalysis();
    }

    /**
     * REVENUE FORECASTING
     */
    
    async forecastRevenue(timeframe = 'monthly', confidence = 0.95) {
        try {
            console.log(`💰 Generating ${timeframe} revenue forecast...`);
            
            const historicalRevenue = this.getHistoricalRevenue(timeframe);
            const currentTrends = await this.analyzeTrends('revenue');
            const seasonalAdjustments = this.seasonalFactors.getAdjustments(timeframe);
            const leadQualityTrends = await this.analyzeLeadQualityTrends();
            
            const forecast = await this.generateRevenueForecast({
                historical: historicalRevenue,
                trends: currentTrends,
                seasonal: seasonalAdjustments,
                leadQuality: leadQualityTrends,
                timeframe: timeframe,
                confidence: confidence
            });
            
            console.log('✅ Revenue forecast generated:', forecast);
            return forecast;
            
        } catch (error) {
            console.error('❌ Revenue forecasting failed:', error);
            return this.getFallbackForecast(timeframe);
        }
    }

    async generateRevenueForecast(params) {
        const { historical, trends, seasonal, leadQuality, timeframe, confidence } = params;
        
        // Base forecast using historical data
        const baseForecast = this.calculateBaseForecast(historical, timeframe);
        
        // Apply trend adjustments
        const trendAdjustedForecast = this.applyTrendAdjustments(baseForecast, trends);
        
        // Apply seasonal factors
        const seasonalAdjustedForecast = this.applySeasonalAdjustments(
            trendAdjustedForecast, 
            seasonal
        );
        
        // Apply lead quality impacts
        const qualityAdjustedForecast = this.applyLeadQualityAdjustments(
            seasonalAdjustedForecast,
            leadQuality
        );
        
        // Calculate confidence intervals
        const confidenceIntervals = this.calculateConfidenceIntervals(
            qualityAdjustedForecast,
            confidence,
            historical
        );
        
        // Generate insights and recommendations
        const insights = this.generateRevenueInsights(qualityAdjustedForecast, historical);
        
        return {
            timeframe: timeframe,
            forecast: qualityAdjustedForecast,
            confidence: confidence,
            intervals: confidenceIntervals,
            insights: insights,
            factors: {
                historical: baseForecast,
                trendImpact: trends.impact,
                seasonalImpact: seasonal.impact,
                qualityImpact: leadQuality.impact
            },
            generatedAt: new Date().toISOString(),
            accuracy: this.calculateForecastAccuracy(timeframe)
        };
    }

    /**
     * LEAD QUALITY INSIGHTS
     */
    
    async analyzeLeadQualityTrends() {
        console.log('🔍 Analyzing lead quality trends...');
        
        const leadData = await this.getLeadData();
        const qualityMetrics = this.calculateQualityMetrics(leadData);
        const sourceAnalysis = this.analyzeLeadSources(leadData);
        const conversionPredictions = this.predictConversionRates(leadData);
        const valueOptimization = this.identifyValueOptimization(leadData);
        
        return {
            overall: qualityMetrics,
            sources: sourceAnalysis,
            predictions: conversionPredictions,
            optimization: valueOptimization,
            trends: this.identifyQualityTrends(leadData),
            recommendations: this.generateQualityRecommendations(qualityMetrics, sourceAnalysis)
        };
    }

    calculateQualityMetrics(leadData) {
        const metrics = {
            averageScore: 0,
            scoreDistribution: { hot: 0, warm: 0, cold: 0 },
            conversionRate: 0,
            timeToConversion: 0,
            valuePerLead: 0,
            completenessScore: 0
        };

        if (leadData.length === 0) return metrics;

        // Calculate average quality score
        metrics.averageScore = leadData.reduce((sum, lead) => sum + (lead.qualityScore || 0), 0) / leadData.length;

        // Score distribution
        leadData.forEach(lead => {
            const tier = lead.tier || this.scoreToTier(lead.qualityScore);
            metrics.scoreDistribution[tier]++;
        });

        // Convert to percentages
        Object.keys(metrics.scoreDistribution).forEach(tier => {
            metrics.scoreDistribution[tier] = Math.round(
                (metrics.scoreDistribution[tier] / leadData.length) * 100
            );
        });

        // Conversion metrics
        const convertedLeads = leadData.filter(lead => lead.status === 'converted');
        metrics.conversionRate = (convertedLeads.length / leadData.length) * 100;

        if (convertedLeads.length > 0) {
            metrics.timeToConversion = convertedLeads.reduce((sum, lead) => {
                const days = this.daysBetween(lead.createdAt, lead.convertedAt);
                return sum + days;
            }, 0) / convertedLeads.length;

            metrics.valuePerLead = convertedLeads.reduce((sum, lead) => 
                sum + (lead.value || 0), 0) / convertedLeads.length;
        }

        return metrics;
    }

    analyzeLeadSources(leadData) {
        const sources = {};
        
        leadData.forEach(lead => {
            const source = lead.source || 'unknown';
            if (!sources[source]) {
                sources[source] = {
                    count: 0,
                    qualityScore: 0,
                    conversionRate: 0,
                    averageValue: 0,
                    revenue: 0
                };
            }
            
            sources[source].count++;
            sources[source].qualityScore += (lead.qualityScore || 0);
            
            if (lead.status === 'converted') {
                sources[source].revenue += (lead.value || 0);
            }
        });

        // Calculate averages and rates
        Object.keys(sources).forEach(source => {
            const sourceData = sources[source];
            sourceData.qualityScore = Math.round(sourceData.qualityScore / sourceData.count);
            
            const convertedLeads = leadData.filter(lead => 
                lead.source === source && lead.status === 'converted'
            );
            
            sourceData.conversionRate = (convertedLeads.length / sourceData.count) * 100;
            sourceData.averageValue = convertedLeads.length > 0 ? 
                sourceData.revenue / convertedLeads.length : 0;
        });

        // Rank sources by performance
        const rankedSources = Object.entries(sources)
            .map(([name, data]) => ({
                name,
                ...data,
                performanceScore: this.calculateSourcePerformanceScore(data)
            }))
            .sort((a, b) => b.performanceScore - a.performanceScore);

        return {
            sources: sources,
            ranked: rankedSources,
            topPerformer: rankedSources[0],
            insights: this.generateSourceInsights(rankedSources)
        };
    }

    /**
     * AGENT PERFORMANCE COACHING
     */
    
    async generatePerformanceCoaching(agentId = null) {
        console.log('🎯 Generating performance coaching insights...');
        
        const agents = agentId ? [agentId] : await this.getAllAgentIds();
        const coachingInsights = [];

        for (const id of agents) {
            const agentData = await this.getAgentPerformanceData(id);
            const coaching = await this.analyzeAgentPerformance(agentData);
            coachingInsights.push(coaching);
        }

        return {
            individual: coachingInsights,
            teamInsights: this.generateTeamInsights(coachingInsights),
            benchmarks: this.calculatePerformanceBenchmarks(coachingInsights),
            actionItems: this.prioritizeActionItems(coachingInsights)
        };
    }

    async analyzeAgentPerformance(agentData) {
        const performance = {
            agentId: agentData.id,
            agentName: agentData.name,
            currentMetrics: this.calculateCurrentMetrics(agentData),
            trends: this.calculatePerformanceTrends(agentData),
            strengths: [],
            improvementAreas: [],
            recommendations: [],
            goals: [],
            priority: 'medium'
        };

        // Analyze strengths
        performance.strengths = this.identifyStrengths(agentData);
        
        // Identify improvement areas
        performance.improvementAreas = this.identifyImprovementAreas(agentData);
        
        // Generate specific recommendations
        performance.recommendations = this.generateRecommendations(agentData, performance.improvementAreas);
        
        // Set goals
        performance.goals = this.setPerformanceGoals(agentData, performance.trends);
        
        // Determine priority level
        performance.priority = this.calculateCoachingPriority(performance);

        return performance;
    }

    identifyStrengths(agentData) {
        const strengths = [];
        const metrics = agentData.metrics || {};
        
        if (metrics.conversionRate > 30) {
            strengths.push({
                area: 'Conversion Excellence',
                description: `Outstanding ${metrics.conversionRate}% conversion rate`,
                impact: 'high'
            });
        }
        
        if (metrics.responseTime < 10) {
            strengths.push({
                area: 'Quick Response',
                description: `Excellent ${metrics.responseTime}-minute average response time`,
                impact: 'medium'
            });
        }
        
        if (metrics.customerSatisfaction > 4.5) {
            strengths.push({
                area: 'Customer Relations',
                description: `High customer satisfaction score of ${metrics.customerSatisfaction}/5`,
                impact: 'high'
            });
        }

        return strengths;
    }

    identifyImprovementAreas(agentData) {
        const areas = [];
        const metrics = agentData.metrics || {};
        const benchmarks = this.getPerformanceBenchmarks();
        
        if (metrics.conversionRate < benchmarks.conversionRate * 0.8) {
            areas.push({
                area: 'Conversion Rate',
                current: metrics.conversionRate,
                target: benchmarks.conversionRate,
                gap: benchmarks.conversionRate - metrics.conversionRate,
                priority: 'high'
            });
        }
        
        if (metrics.responseTime > benchmarks.responseTime * 1.5) {
            areas.push({
                area: 'Response Time',
                current: metrics.responseTime,
                target: benchmarks.responseTime,
                gap: metrics.responseTime - benchmarks.responseTime,
                priority: 'medium'
            });
        }
        
        if (metrics.followUpRate < benchmarks.followUpRate * 0.9) {
            areas.push({
                area: 'Follow-up Consistency',
                current: metrics.followUpRate,
                target: benchmarks.followUpRate,
                gap: benchmarks.followUpRate - metrics.followUpRate,
                priority: 'medium'
            });
        }

        return areas.sort((a, b) => 
            this.priorityWeight(b.priority) - this.priorityWeight(a.priority)
        );
    }

    generateRecommendations(agentData, improvementAreas) {
        const recommendations = [];
        
        improvementAreas.forEach(area => {
            switch (area.area) {
                case 'Conversion Rate':
                    recommendations.push({
                        category: 'Conversion Improvement',
                        action: 'Attend conversion optimization workshop',
                        timeframe: '2 weeks',
                        impact: 'high',
                        resources: ['Conversion best practices guide', 'Role-play sessions']
                    });
                    break;
                    
                case 'Response Time':
                    recommendations.push({
                        category: 'Efficiency',
                        action: 'Implement lead notification system',
                        timeframe: '1 week',
                        impact: 'medium',
                        resources: ['Mobile alerts setup', 'Time management training']
                    });
                    break;
                    
                case 'Follow-up Consistency':
                    recommendations.push({
                        category: 'Process',
                        action: 'Use automated follow-up reminders',
                        timeframe: '1 week',
                        impact: 'medium',
                        resources: ['CRM automation setup', 'Follow-up templates']
                    });
                    break;
            }
        });

        return recommendations;
    }

    /**
     * CHURN RISK ANALYSIS
     */
    
    async analyzeChurnRisk() {
        console.log('⚠️ Analyzing churn risk...');
        
        const activeLeads = await this.getActiveLeads();
        const riskAnalysis = [];

        for (const lead of activeLeads) {
            const riskScore = await this.calculateChurnRisk(lead);
            if (riskScore.level !== 'low') {
                riskAnalysis.push(riskScore);
            }
        }

        // Sort by risk score (highest first)
        riskAnalysis.sort((a, b) => b.score - a.score);

        return {
            highRiskLeads: riskAnalysis.filter(lead => lead.level === 'high'),
            mediumRiskLeads: riskAnalysis.filter(lead => lead.level === 'medium'),
            totalAtRisk: riskAnalysis.length,
            potentialLostRevenue: this.calculatePotentialLostRevenue(riskAnalysis),
            actionItems: this.generateChurnPreventionActions(riskAnalysis),
            insights: this.generateChurnInsights(riskAnalysis)
        };
    }

    async calculateChurnRisk(lead) {
        const factors = {
            // Time-based factors
            daysSinceContact: this.daysSinceLastContact(lead),
            stageStagnation: this.calculateStageStagnation(lead),
            
            // Engagement factors
            responseRate: this.calculateResponseRate(lead),
            communicationFrequency: this.calculateCommunicationFrequency(lead),
            
            // Quality factors
            leadQuality: lead.qualityScore || 0,
            agentMatch: await this.calculateAgentMatchScore(lead),
            
            // External factors
            seasonality: this.getSeasonalRiskFactor(),
            marketConditions: this.getMarketConditions()
        };

        // Calculate weighted risk score
        const weights = {
            daysSinceContact: 0.25,
            stageStagnation: 0.20,
            responseRate: 0.20,
            communicationFrequency: 0.15,
            leadQuality: 0.10,
            agentMatch: 0.05,
            seasonality: 0.03,
            marketConditions: 0.02
        };

        let riskScore = 0;
        Object.keys(factors).forEach(factor => {
            riskScore += (factors[factor] || 0) * (weights[factor] || 0);
        });

        const riskLevel = this.categorizeRiskLevel(riskScore);
        
        return {
            leadId: lead.id,
            leadName: `${lead.firstName} ${lead.lastName}`,
            agentId: lead.agentId,
            score: Math.round(riskScore),
            level: riskLevel,
            factors: factors,
            estimatedValue: lead.estimatedValue || 0,
            recommendations: this.generateRiskMitigationRecommendations(riskScore, factors),
            urgency: this.calculateUrgency(riskScore, lead.estimatedValue)
        };
    }

    /**
     * TREND ANALYSIS
     */
    
    async analyzeTrends(dataType = 'all', timeframe = '90d') {
        console.log(`📈 Analyzing ${dataType} trends over ${timeframe}...`);
        
        const trendData = await this.getTrendData(dataType, timeframe);
        const analysis = {
            dataType: dataType,
            timeframe: timeframe,
            trends: {},
            insights: [],
            predictions: {},
            recommendations: []
        };

        if (dataType === 'all' || dataType === 'revenue') {
            analysis.trends.revenue = this.calculateRevenueTrends(trendData.revenue);
        }
        
        if (dataType === 'all' || dataType === 'leads') {
            analysis.trends.leads = this.calculateLeadTrends(trendData.leads);
        }
        
        if (dataType === 'all' || dataType === 'conversion') {
            analysis.trends.conversion = this.calculateConversionTrends(trendData.conversion);
        }
        
        if (dataType === 'all' || dataType === 'agents') {
            analysis.trends.agents = this.calculateAgentTrends(trendData.agents);
        }

        // Generate insights and predictions
        analysis.insights = this.generateTrendInsights(analysis.trends);
        analysis.predictions = this.generateTrendPredictions(analysis.trends);
        analysis.recommendations = this.generateTrendRecommendations(analysis.trends, analysis.insights);

        return analysis;
    }

    /**
     * SEASONAL ANALYSIS
     */
    
    getSeasonalAdjustments(timeframe) {
        const month = new Date().getMonth() + 1;
        const quarter = Math.ceil(month / 3);
        
        // Legal services seasonal patterns
        const monthlyFactors = {
            1: 0.85,  // January - slow start
            2: 0.90,  // February
            3: 1.10,  // March - spring uptick
            4: 1.15,  // April
            5: 1.20,  // May - peak spring
            6: 1.10,  // June
            7: 0.95,  // July - summer slowdown
            8: 0.90,  // August
            9: 1.15,  // September - back to business
            10: 1.25, // October - peak fall
            11: 1.05, // November
            12: 0.80  // December - holiday slowdown
        };

        const weekdayFactors = {
            1: 1.10, // Monday
            2: 1.20, // Tuesday - peak
            3: 1.15, // Wednesday
            4: 1.05, // Thursday
            5: 0.95, // Friday
            6: 0.70, // Saturday
            0: 0.60  // Sunday
        };

        return {
            monthly: monthlyFactors[month],
            quarterly: this.getQuarterlyFactor(quarter),
            weekly: weekdayFactors[new Date().getDay()],
            impact: this.calculateSeasonalImpact(monthlyFactors[month])
        };
    }

    /**
     * HELPER METHODS
     */
    
    async initializeHistoricalData() {
        // Initialize with mock historical data
        // In production, this would load from database
        this.generateMockHistoricalData();
        console.log('📚 Historical data initialized');
    }

    generateMockHistoricalData() {
        const now = new Date();
        const months = 12;
        
        for (let i = months; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = date.toISOString().slice(0, 7);
            
            this.historicalData.set(month, {
                revenue: this.generateMockRevenue(date),
                leads: this.generateMockLeadData(date),
                conversions: this.generateMockConversionData(date),
                agents: this.generateMockAgentData(date)
            });
        }
    }

    generateMockRevenue(date) {
        const baseRevenue = 75000;
        const seasonal = this.getSeasonalFactor(date.getMonth() + 1);
        const trend = 1 + (Math.random() - 0.5) * 0.2; // ±10% variance
        
        return Math.round(baseRevenue * seasonal * trend);
    }

    getSeasonalFactor(month) {
        const factors = {
            1: 0.85, 2: 0.90, 3: 1.10, 4: 1.15, 5: 1.20, 6: 1.10,
            7: 0.95, 8: 0.90, 9: 1.15, 10: 1.25, 11: 1.05, 12: 0.80
        };
        return factors[month] || 1.0;
    }

    calculateBaseForecast(historical, timeframe) {
        if (historical.length < 3) {
            return this.getDefaultForecast(timeframe);
        }

        // Simple linear regression
        const values = historical.map(item => item.value);
        const trend = this.calculateLinearTrend(values);
        const lastValue = values[values.length - 1];
        
        return Math.round(lastValue * (1 + trend));
    }

    calculateLinearTrend(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const x = Array.from({length: n}, (_, i) => i);
        const y = values;
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope / (sumY / n); // Normalize by average
    }

    startRealTimeAnalysis() {
        // Update analytics every 10 minutes
        setInterval(() => {
            this.updateRealTimeMetrics();
        }, 600000);
        
        console.log('📊 Real-time analysis started');
    }

    async updateRealTimeMetrics() {
        // Update real-time metrics for live dashboard
        if (window.smartLeadRouter) {
            const metrics = await window.smartLeadRouter.getPerformanceMetrics();
            this.processRealTimeMetrics(metrics);
        }
    }

    /**
     * PUBLIC API METHODS
     */
    
    async getDashboardInsights() {
        const [revenue, quality, performance, risk] = await Promise.all([
            this.forecastRevenue('monthly'),
            this.analyzeLeadQualityTrends(),
            this.generatePerformanceCoaching(),
            this.analyzeChurnRisk()
        ]);

        return {
            revenue: revenue,
            leadQuality: quality,
            performance: performance,
            churnRisk: risk,
            generatedAt: new Date().toISOString()
        };
    }

    async getExecutiveSummary() {
        const insights = await this.getDashboardInsights();
        
        return {
            keyMetrics: {
                projectedRevenue: insights.revenue.forecast,
                riskLevel: insights.churnRisk.totalAtRisk,
                topOpportunity: insights.leadQuality.optimization?.top || 'Optimize lead sources',
                coachingPriority: insights.performance.actionItems?.[0] || 'Review agent performance'
            },
            alerts: this.generateExecutiveAlerts(insights),
            recommendations: this.generateExecutiveRecommendations(insights)
        };
    }

    // Additional helper methods would be implemented here...
    
    calculateSourcePerformanceScore(sourceData) {
        return (sourceData.qualityScore * 0.3) + 
               (sourceData.conversionRate * 0.4) + 
               (Math.log(sourceData.averageValue + 1) * 0.3);
    }

    scoreToTier(score) {
        if (score >= 80) return 'hot';
        if (score >= 60) return 'warm';
        return 'cold';
    }

    daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay));
    }

    categorizeRiskLevel(score) {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    priorityWeight(priority) {
        const weights = { high: 3, medium: 2, low: 1 };
        return weights[priority] || 0;
    }

    getHistoricalRevenue(timeframe) {
        const data = [];
        const now = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = date.toISOString().slice(0, 7);
            const historicalData = this.historicalData.get(month);
            
            if (historicalData) {
                data.push({
                    period: month,
                    value: historicalData.revenue
                });
            }
        }
        
        return data;
    }

    getFallbackForecast(timeframe) {
        return {
            timeframe: timeframe,
            forecast: 85000,
            confidence: 0.75,
            intervals: { low: 75000, high: 95000 },
            insights: ['Using fallback forecast due to insufficient data'],
            generatedAt: new Date().toISOString()
        };
    }

    applyTrendAdjustments(baseForecast, trends) {
        const trendImpact = trends.impact || 0.02;
        return Math.round(baseForecast * (1 + trendImpact));
    }

    applySeasonalAdjustments(forecast, seasonal) {
        return Math.round(forecast * seasonal.factor);
    }

    applyLeadQualityAdjustments(forecast, leadQuality) {
        const qualityImpact = leadQuality.impact || 0.01;
        return Math.round(forecast * (1 + qualityImpact));
    }

    calculateConfidenceIntervals(forecast, confidence, historical) {
        const variance = this.calculateVariance(historical);
        const margin = variance * (1 - confidence);
        
        return {
            low: Math.round(forecast * (1 - margin)),
            high: Math.round(forecast * (1 + margin))
        };
    }

    calculateVariance(historical) {
        if (historical.length < 2) return 0.15;
        
        const values = historical.map(item => item.value);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        
        return Math.sqrt(variance) / mean;
    }

    generateRevenueInsights(forecast, historical) {
        const insights = [];
        
        if (historical.length > 0) {
            const lastRevenue = historical[historical.length - 1]?.value || 0;
            const growth = ((forecast - lastRevenue) / lastRevenue) * 100;
            
            if (growth > 10) {
                insights.push(`Strong growth expected: ${growth.toFixed(1)}% increase`);
            } else if (growth < -5) {
                insights.push(`Revenue decline warning: ${Math.abs(growth).toFixed(1)}% decrease`);
            } else {
                insights.push(`Stable revenue expected: ${growth.toFixed(1)}% change`);
            }
        }
        
        return insights;
    }

    calculateForecastAccuracy(timeframe) {
        // Mock accuracy - in production would calculate based on historical forecasts
        return Math.round(85 + Math.random() * 10);
    }

    async getLeadData() {
        // Mock lead data - in production would fetch from database
        return [
            { 
                id: 'lead-001', 
                qualityScore: 85, 
                tier: 'hot', 
                source: 'referral', 
                status: 'converted',
                value: 5000,
                createdAt: '2024-01-15',
                convertedAt: '2024-01-20'
            },
            { 
                id: 'lead-002', 
                qualityScore: 70, 
                tier: 'warm', 
                source: 'website', 
                status: 'active',
                value: 3500,
                createdAt: '2024-01-18'
            },
            { 
                id: 'lead-003', 
                qualityScore: 55, 
                tier: 'cold', 
                source: 'google_ads', 
                status: 'converted',
                value: 2500,
                createdAt: '2024-01-10',
                convertedAt: '2024-01-25'
            }
        ];
    }

    predictConversionRates(leadData) {
        const sourceRates = {};
        const sources = [...new Set(leadData.map(lead => lead.source))];
        
        sources.forEach(source => {
            const sourceLeads = leadData.filter(lead => lead.source === source);
            const converted = sourceLeads.filter(lead => lead.status === 'converted').length;
            sourceRates[source] = sourceLeads.length > 0 ? (converted / sourceLeads.length) * 100 : 0;
        });
        
        return sourceRates;
    }

    identifyValueOptimization(leadData) {
        const optimizations = [];
        
        const avgValue = leadData.reduce((sum, lead) => sum + (lead.value || 0), 0) / leadData.length;
        
        const sourceValues = {};
        leadData.forEach(lead => {
            if (!sourceValues[lead.source]) sourceValues[lead.source] = [];
            sourceValues[lead.source].push(lead.value || 0);
        });
        
        Object.entries(sourceValues).forEach(([source, values]) => {
            const sourceAvg = values.reduce((sum, val) => sum + val, 0) / values.length;
            if (sourceAvg > avgValue * 1.2) {
                optimizations.push({
                    type: 'high_value_source',
                    source: source,
                    recommendation: `Increase investment in ${source} - ${((sourceAvg / avgValue - 1) * 100).toFixed(1)}% above average value`
                });
            }
        });
        
        return optimizations;
    }

    identifyQualityTrends(leadData) {
        // Simplified trend analysis
        const recent = leadData.slice(-30); // Last 30 leads
        const older = leadData.slice(-60, -30); // Previous 30 leads
        
        if (recent.length === 0 || older.length === 0) {
            return { trend: 'insufficient_data' };
        }
        
        const recentAvg = recent.reduce((sum, lead) => sum + (lead.qualityScore || 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, lead) => sum + (lead.qualityScore || 0), 0) / older.length;
        
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        return {
            trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
            change: change,
            recentAverage: recentAvg,
            previousAverage: olderAvg
        };
    }

    generateQualityRecommendations(qualityMetrics, sourceAnalysis) {
        const recommendations = [];
        
        if (qualityMetrics.conversionRate < 25) {
            recommendations.push({
                priority: 'high',
                action: 'Improve lead qualification process',
                impact: 'Increase conversion rate'
            });
        }
        
        if (sourceAnalysis.ranked.length > 0) {
            const topSource = sourceAnalysis.ranked[0];
            recommendations.push({
                priority: 'medium',
                action: `Increase investment in ${topSource.name}`,
                impact: `Leverage highest performing source (${topSource.conversionRate.toFixed(1)}% conversion)`
            });
        }
        
        return recommendations;
    }

    generateSourceInsights(rankedSources) {
        const insights = [];
        
        if (rankedSources.length > 0) {
            const best = rankedSources[0];
            const worst = rankedSources[rankedSources.length - 1];
            
            insights.push(`Top source: ${best.name} (${best.conversionRate.toFixed(1)}% conversion)`);
            
            if (rankedSources.length > 1) {
                insights.push(`Performance gap: ${(best.conversionRate - worst.conversionRate).toFixed(1)}% between best and worst sources`);
            }
        }
        
        return insights;
    }

    async getAllAgentIds() {
        // Mock agent IDs - in production would fetch from database
        return ['agent-001', 'agent-002', 'agent-003'];
    }

    async getAgentPerformanceData(agentId) {
        // Mock agent data - in production would fetch from database
        const mockAgents = {
            'agent-001': {
                id: 'agent-001',
                name: 'Sarah Johnson',
                metrics: {
                    conversionRate: 32.5,
                    responseTime: 12,
                    customerSatisfaction: 4.7,
                    followUpRate: 85
                }
            },
            'agent-002': {
                id: 'agent-002',
                name: 'Michael Chen',
                metrics: {
                    conversionRate: 28.3,
                    responseTime: 8,
                    customerSatisfaction: 4.5,
                    followUpRate: 90
                }
            },
            'agent-003': {
                id: 'agent-003',
                name: 'Emily Rodriguez',
                metrics: {
                    conversionRate: 35.8,
                    responseTime: 15,
                    customerSatisfaction: 4.9,
                    followUpRate: 88
                }
            }
        };
        
        return mockAgents[agentId] || mockAgents['agent-001'];
    }

    getPerformanceBenchmarks() {
        return {
            conversionRate: 30,
            responseTime: 15,
            customerSatisfaction: 4.5,
            followUpRate: 85
        };
    }

    calculateCurrentMetrics(agentData) {
        return agentData.metrics || {};
    }

    calculatePerformanceTrends(agentData) {
        // Mock trend data - in production would calculate from historical data
        return {
            conversionRate: { change: 2.5, trend: 'improving' },
            responseTime: { change: -1.2, trend: 'improving' },
            customerSatisfaction: { change: 0.1, trend: 'stable' }
        };
    }

    setPerformanceGoals(agentData, trends) {
        const goals = [];
        const metrics = agentData.metrics || {};
        
        if (metrics.conversionRate < 30) {
            goals.push({
                metric: 'conversionRate',
                current: metrics.conversionRate,
                target: 30,
                timeframe: '30 days'
            });
        }
        
        if (metrics.responseTime > 15) {
            goals.push({
                metric: 'responseTime',
                current: metrics.responseTime,
                target: 15,
                timeframe: '14 days'
            });
        }
        
        return goals;
    }

    calculateCoachingPriority(performance) {
        const highPriorityAreas = performance.improvementAreas.filter(area => area.priority === 'high');
        
        if (highPriorityAreas.length > 2) return 'urgent';
        if (highPriorityAreas.length > 0) return 'high';
        return 'medium';
    }

    generateTeamInsights(coachingInsights) {
        const teamMetrics = {
            averageConversion: 0,
            topPerformer: null,
            improvementOpportunities: []
        };
        
        if (coachingInsights.length > 0) {
            teamMetrics.averageConversion = coachingInsights.reduce((sum, insight) => 
                sum + (insight.currentMetrics.conversionRate || 0), 0) / coachingInsights.length;
            
            teamMetrics.topPerformer = coachingInsights.reduce((best, current) => 
                (current.currentMetrics.conversionRate || 0) > (best.currentMetrics.conversionRate || 0) ? current : best
            );
        }
        
        return teamMetrics;
    }

    calculatePerformanceBenchmarks(coachingInsights) {
        // Calculate team benchmarks
        return this.getPerformanceBenchmarks();
    }

    prioritizeActionItems(coachingInsights) {
        const actionItems = [];
        
        coachingInsights.forEach(insight => {
            insight.recommendations.forEach(rec => {
                actionItems.push({
                    agentName: insight.agentName,
                    action: rec.action,
                    priority: rec.impact === 'high' ? 'urgent' : 'normal',
                    timeframe: rec.timeframe
                });
            });
        });
        
        return actionItems.sort((a, b) => a.priority === 'urgent' ? -1 : 1);
    }

    async getActiveLeads() {
        const allLeads = await this.getLeadData();
        return allLeads.filter(lead => lead.status === 'active' || lead.status === 'contacted');
    }

    calculatePotentialLostRevenue(riskAnalysis) {
        return riskAnalysis.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);
    }

    generateChurnPreventionActions(riskAnalysis) {
        const actions = [];
        
        riskAnalysis.forEach(lead => {
            if (lead.level === 'high') {
                actions.push({
                    leadId: lead.leadId,
                    action: 'Immediate agent contact required',
                    urgency: 'urgent',
                    estimatedValue: lead.estimatedValue
                });
            }
        });
        
        return actions;
    }

    generateChurnInsights(riskAnalysis) {
        const insights = [];
        
        const highRisk = riskAnalysis.filter(lead => lead.level === 'high').length;
        
        if (highRisk > 0) {
            insights.push(`${highRisk} leads at high risk of churning`);
        }
        
        return insights;
    }

    daysSinceLastContact(lead) {
        // Mock calculation - in production would use actual last contact date
        return Math.floor(Math.random() * 10) + 1;
    }

    calculateStageStagnation(lead) {
        // Mock calculation - in production would calculate actual stage duration
        return Math.floor(Math.random() * 30);
    }

    calculateResponseRate(lead) {
        // Mock calculation - in production would calculate from interaction history
        return Math.floor(Math.random() * 100);
    }

    calculateCommunicationFrequency(lead) {
        // Mock calculation
        return Math.floor(Math.random() * 50) + 25;
    }

    async calculateAgentMatchScore(lead) {
        // Mock calculation
        return Math.floor(Math.random() * 40) + 60;
    }

    getSeasonalRiskFactor() {
        const month = new Date().getMonth() + 1;
        const riskFactors = {
            12: 30, 1: 25, 2: 20, // Winter - higher risk
            3: 15, 4: 10, 5: 10,  // Spring - lower risk
            6: 15, 7: 20, 8: 25,  // Summer - medium risk
            9: 10, 10: 15, 11: 20  // Fall - mixed
        };
        return riskFactors[month] || 15;
    }

    getMarketConditions() {
        // Mock market conditions
        return Math.floor(Math.random() * 20) + 10;
    }

    generateRiskMitigationRecommendations(riskScore, factors) {
        const recommendations = [];
        
        if (factors.daysSinceContact > 7) {
            recommendations.push('Schedule immediate follow-up call');
        }
        
        if (factors.responseRate < 50) {
            recommendations.push('Try alternative communication methods');
        }
        
        return recommendations;
    }

    calculateUrgency(riskScore, estimatedValue) {
        if (riskScore > 70 && estimatedValue > 5000) return 'critical';
        if (riskScore > 50) return 'high';
        return 'medium';
    }

    async getTrendData(dataType, timeframe) {
        // Mock trend data
        return {
            revenue: Array.from({length: 12}, () => ({ value: Math.random() * 100000 })),
            leads: Array.from({length: 12}, () => ({ count: Math.random() * 100 })),
            conversion: Array.from({length: 12}, () => ({ rate: Math.random() * 50 })),
            agents: Array.from({length: 12}, () => ({ performance: Math.random() * 100 }))
        };
    }

    calculateRevenueTrends(data) {
        return { trend: 'increasing', rate: 5.2 };
    }

    calculateLeadTrends(data) {
        return { trend: 'stable', rate: 1.1 };
    }

    calculateConversionTrends(data) {
        return { trend: 'improving', rate: 3.4 };
    }

    calculateAgentTrends(data) {
        return { trend: 'stable', rate: 0.8 };
    }

    generateTrendInsights(trends) {
        const insights = [];
        
        Object.entries(trends).forEach(([type, trend]) => {
            insights.push(`${type}: ${trend.trend} at ${trend.rate}% rate`);
        });
        
        return insights;
    }

    generateTrendPredictions(trends) {
        return {
            nextMonth: 'positive growth expected',
            nextQuarter: 'continued improvement likely'
        };
    }

    generateTrendRecommendations(trends, insights) {
        return [
            'Continue current growth strategies',
            'Monitor conversion rate improvements',
            'Invest in top-performing lead sources'
        ];
    }

    getQuarterlyFactor(quarter) {
        const factors = { 1: 0.95, 2: 1.15, 3: 0.90, 4: 1.20 };
        return factors[quarter] || 1.0;
    }

    calculateSeasonalImpact(factor) {
        return Math.abs(factor - 1.0);
    }

    getDefaultForecast(timeframe) {
        return timeframe === 'monthly' ? 85000 : 
               timeframe === 'quarterly' ? 255000 : 1020000;
    }

    generateMockLeadData(date) {
        return { count: Math.floor(Math.random() * 100) + 50 };
    }

    generateMockConversionData(date) {
        return { rate: Math.random() * 20 + 25 };
    }

    generateMockAgentData(date) {
        return { performance: Math.random() * 40 + 60 };
    }

    processRealTimeMetrics(metrics) {
        // Process incoming real-time metrics
        console.log('📊 Processing real-time metrics:', metrics);
    }

    generateExecutiveAlerts(insights) {
        const alerts = [];
        
        if (insights.churnRisk.totalAtRisk > 10) {
            alerts.push({
                type: 'warning',
                message: `${insights.churnRisk.totalAtRisk} leads at risk of churning`,
                priority: 'high'
            });
        }
        
        return alerts;
    }

    generateExecutiveRecommendations(insights) {
        return [
            'Focus on high-risk lead retention',
            'Optimize top-performing lead sources',
            'Implement agent coaching recommendations'
        ];
    }
}

/**
 * Supporting Classes
 */

class TrendAnalyzer {
    constructor() {
        this.analysisWindow = 30; // days
    }

    calculateTrend(data, type = 'linear') {
        if (type === 'linear') {
            return this.linearTrend(data);
        }
        return this.exponentialTrend(data);
    }

    linearTrend(data) {
        // Implementation of linear trend calculation
        return { slope: 0.05, confidence: 0.85 };
    }

    exponentialTrend(data) {
        // Implementation of exponential trend calculation
        return { growth: 0.03, confidence: 0.78 };
    }
}

class RiskAssessment {
    constructor() {
        this.riskFactors = new Map();
    }

    assessRisk(entity, factors) {
        // Risk assessment logic
        return { score: 25, level: 'low' };
    }
}

class PerformanceCoach {
    constructor() {
        this.benchmarks = new Map();
    }

    generateCoaching(agentData) {
        // Performance coaching logic
        return { recommendations: [], goals: [] };
    }
}

class SeasonalFactors {
    constructor() {
        this.patterns = new Map();
    }

    getAdjustments(timeframe) {
        // Seasonal adjustment logic
        return { factor: 1.0, impact: 0.05 };
    }
}

// Global instance
window.predictiveAnalytics = new PredictiveAnalytics();

console.log('📊 Predictive Analytics Engine loaded and ready!'); 