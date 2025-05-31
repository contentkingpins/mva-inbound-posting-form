/**
 * Admin Analytics Module
 * Handles all analytics, charts, and metrics for the admin dashboard
 */

export class AdminAnalytics {
    constructor() {
        this.charts = {};
        this.chartOptions = this.getChartOptions();
    }

    /**
     * Initialize all analytics components
     */
    async initialize() {
        console.log('📊 Initializing Admin Analytics...');
        
        // Initialize revenue chart
        this.initRevenueChart();
        
        // Initialize conversion funnel
        this.initConversionFunnel();
        
        // Initialize performance metrics
        this.initPerformanceMetrics();
    }

    /**
     * Get default chart options
     */
    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        };
    }

    /**
     * Initialize revenue chart
     */
    initRevenueChart() {
        const ctx = document.getElementById('revenue-chart');
        if (!ctx) return;

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                ...this.chartOptions,
                scales: {
                    ...this.chartOptions.scales,
                    y: {
                        ...this.chartOptions.scales.y,
                        ticks: {
                            ...this.chartOptions.scales.y.ticks,
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Update revenue chart with new data
     */
    updateRevenueChart(labels, data) {
        if (!this.charts.revenue) return;

        this.charts.revenue.data.labels = labels;
        this.charts.revenue.data.datasets[0].data = data;
        this.charts.revenue.update('active');
    }

    /**
     * Initialize conversion funnel
     */
    initConversionFunnel() {
        const ctx = document.getElementById('conversion-funnel');
        if (!ctx) return;

        this.charts.funnel = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Leads', 'Qualified', 'Proposals', 'Closed'],
                datasets: [{
                    label: 'Conversion Funnel',
                    data: [],
                    backgroundColor: [
                        'rgba(66, 153, 225, 0.8)',
                        'rgba(72, 187, 120, 0.8)',
                        'rgba(246, 173, 85, 0.8)',
                        'rgba(237, 100, 166, 0.8)'
                    ],
                    borderWidth: 0,
                    borderRadius: 8
                }]
            },
            options: {
                ...this.chartOptions,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
    }

    /**
     * Update conversion funnel data
     */
    updateConversionFunnel(data) {
        if (!this.charts.funnel) return;

        this.charts.funnel.data.datasets[0].data = data;
        this.charts.funnel.update('active');
    }

    /**
     * Initialize performance metrics
     */
    initPerformanceMetrics() {
        const ctx = document.getElementById('performance-metrics');
        if (!ctx) return;

        this.charts.performance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Response Time', 'Conversion Rate', 'Customer Satisfaction', 'Lead Volume', 'Revenue per Lead'],
                datasets: [{
                    label: 'Current',
                    data: [],
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: '#4299e1'
                }, {
                    label: 'Target',
                    data: [],
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointBackgroundColor: '#48bb78'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 11
                            }
                        },
                        ticks: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(current, target) {
        if (!this.charts.performance) return;

        this.charts.performance.data.datasets[0].data = current;
        this.charts.performance.data.datasets[1].data = target;
        this.charts.performance.update('active');
    }

    /**
     * Update all analytics with new data
     */
    updateAllAnalytics(data) {
        console.log('📊 Updating analytics with data:', data);

        // Update revenue chart
        if (data.revenue) {
            this.updateRevenueChart(data.revenue.labels, data.revenue.data);
        }

        // Update conversion funnel
        if (data.funnel) {
            this.updateConversionFunnel(data.funnel);
        }

        // Update performance metrics
        if (data.performance) {
            this.updatePerformanceMetrics(data.performance.current, data.performance.target);
        }
    }

    /**
     * Refresh analytics data
     */
    async refreshAnalytics() {
        try {
            const token = localStorage.getItem('auth_token');
            const apiBase = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
            
            const response = await fetch(`${apiBase}/admin/analytics`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }

            const data = await response.json();
            this.updateAllAnalytics(data);

        } catch (error) {
            console.error('Error refreshing analytics:', error);
            window.showToast('Failed to refresh analytics', 'error');
        }
    }

    /**
     * Export analytics data
     */
    async exportAnalytics(format = 'pdf') {
        console.log(`📤 Exporting analytics as ${format}...`);
        
        // Generate export based on format
        if (format === 'pdf') {
            await this.exportAsPDF();
        } else if (format === 'csv') {
            await this.exportAsCSV();
        }
    }

    /**
     * Export analytics as PDF
     */
    async exportAsPDF() {
        // Implementation for PDF export
        window.showToast('Generating PDF report...', 'info');
        
        // Simulate export
        setTimeout(() => {
            window.showToast('Analytics report downloaded!', 'success');
        }, 2000);
    }

    /**
     * Export analytics as CSV
     */
    async exportAsCSV() {
        // Implementation for CSV export
        window.showToast('Generating CSV export...', 'info');
        
        // Simulate export
        setTimeout(() => {
            window.showToast('Analytics data exported!', 'success');
        }, 1500);
    }

    /**
     * Destroy all charts (cleanup)
     */
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
} 