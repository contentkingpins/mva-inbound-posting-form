/**
 * Charts and Animations Module
 * Handles all Chart.js charts and stat animations
 */

class ChartsManager {
    constructor() {
        this.charts = {};
        this.animatedElements = new Set();
    }
    
    initializeStatsAnimation() {
        // Animate stat cards on page load
        const statCards = document.querySelectorAll('.stat-card');
        
        statCards.forEach((card, index) => {
            // Add delay based on index
            setTimeout(() => {
                card.classList.add('animate__animated', 'animate__fadeInUp');
            }, index * 200);
        });
        
        // Animate numbers
        this.animateStatNumbers();
    }
    
    animateStatNumbers() {
        const totalLeadsElement = document.getElementById('total-leads-count');
        const conversionRateElement = document.getElementById('conversion-rate');
        const activeLeadsElement = document.getElementById('active-leads-count');
        const revenuePotentialElement = document.getElementById('revenue-potential');
        
        // Get current leads data
        const leads = JSON.parse(localStorage.getItem('leads') || '[]');
        
        if (totalLeadsElement && !this.animatedElements.has('total-leads')) {
            this.animateNumber(totalLeadsElement, 0, leads.length, 2000);
            this.animatedElements.add('total-leads');
        }
        
        if (conversionRateElement && !this.animatedElements.has('conversion-rate')) {
            const retainedLeads = leads.filter(lead => lead.disposition === 'Retained for Firm').length;
            const conversionRate = leads.length > 0 ? Math.round((retainedLeads / leads.length) * 100) : 0;
            this.animateNumber(conversionRateElement, 0, conversionRate, 2000);
            this.animatedElements.add('conversion-rate');
        }
        
        if (activeLeadsElement && !this.animatedElements.has('active-leads')) {
            const activeLeads = leads.filter(lead => 
                ['New', 'Contacted', 'Qualified', 'Proposal'].includes(lead.disposition)
            ).length;
            this.animateNumber(activeLeadsElement, 0, activeLeads, 2000);
            this.animatedElements.add('active-leads');
        }
        
        if (revenuePotentialElement && !this.animatedElements.has('revenue-potential')) {
            const avgCaseValue = 15000; // Estimated average case value
            const potential = leads.filter(lead => 
                ['New', 'Contacted', 'Qualified', 'Proposal'].includes(lead.disposition)
            ).length * avgCaseValue;
            this.animateNumber(revenuePotentialElement, 0, potential, 2500, true);
            this.animatedElements.add('revenue-potential');
        }
    }
    
    animateNumber(element, start, end, duration, isChain = false) {
        const startTime = performance.now();
        const range = end - start;
        
        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + range * easeOutCubic);
            
            if (isChain) {
                element.textContent = current.toLocaleString();
            } else {
                element.textContent = current;
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            } else {
                element.textContent = isChain ? end.toLocaleString() : end;
            }
        };
        
        requestAnimationFrame(updateNumber);
    }
    
    initializeCharts() {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, skipping charts initialization');
            return;
        }
        
        const leads = JSON.parse(localStorage.getItem('leads') || '[]');
        
        this.createLeadFlowChart(leads);
        this.createStatusChart(leads);
        this.createVendorChart(leads);
    }
    
    createLeadFlowChart(leads) {
        const leadFlowCtx = document.getElementById('leadFlowChart');
        if (!leadFlowCtx) return;
        
        // Destroy existing chart if it exists
        if (this.charts.leadFlow) {
            this.charts.leadFlow.destroy();
        }
        
        // Group leads by date
        const leadsByDate = {};
        leads.forEach(lead => {
            const date = new Date(lead.timestamp).toDateString();
            leadsByDate[date] = (leadsByDate[date] || 0) + 1;
        });
        
        // Get last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toDateString());
        }
        
        const chartData = last7Days.map(date => leadsByDate[date] || 0);
        const chartLabels = last7Days.map(date => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        
        this.charts.leadFlow = new Chart(leadFlowCtx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Leads',
                    data: chartData,
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4299e1',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            borderDash: [5, 5]
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    createStatusChart(leads) {
        const statusCtx = document.getElementById('statusChart');
        if (!statusCtx) return;
        
        // Destroy existing chart if it exists
        if (this.charts.status) {
            this.charts.status.destroy();
        }
        
        // Count leads by status
        const statusCounts = {};
        leads.forEach(lead => {
            const status = lead.disposition || 'New';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        this.charts.status = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        '#4299e1',
                        '#48bb78',
                        '#f6ad55',
                        '#fc8181',
                        '#9f7aea',
                        '#68d391'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    createVendorChart(leads) {
        const vendorCtx = document.getElementById('vendorChart');
        if (!vendorCtx) return;
        
        // Destroy existing chart if it exists
        if (this.charts.vendor) {
            this.charts.vendor.destroy();
        }
        
        // Count leads by vendor
        const vendorCounts = {};
        leads.forEach(lead => {
            const vendor = lead.vendor_code || 'Unknown';
            vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
        });
        
        this.charts.vendor = new Chart(vendorCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(vendorCounts),
                datasets: [{
                    label: 'Total Leads',
                    data: Object.values(vendorCounts),
                    backgroundColor: '#667eea',
                    borderRadius: 8,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            borderDash: [5, 5]
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    updateCharts() {
        // Update all charts with new data
        this.initializeCharts();
    }
    
    destroyCharts() {
        // Clean up all charts
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        this.charts = {};
        this.animatedElements.clear();
    }
}

// Export for use in main app
window.ChartsManager = ChartsManager; 