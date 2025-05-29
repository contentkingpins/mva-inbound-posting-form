// Aurora Glass Agent Dashboard - Futuristic JavaScript

// Global state
let availableLeads = [];
let myLeads = [];
let currentUser = null;
let particles = [];

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initAuroraEffects();
    initParticles();
    init3DTilt();
    initMagneticButtons();
    checkAuth();
    loadDashboardData();
    initEventListeners();
    animateNumbers();
});

// Initialize Aurora Effects
function initAuroraEffects() {
    // Add multiple aurora layers for depth
    const auroraBg = document.querySelector('.aurora-bg');
    for (let i = 0; i < 3; i++) {
        const layer = document.createElement('div');
        layer.className = 'aurora-layer';
        layer.style.cssText = `
            position: absolute;
            width: 150%;
            height: 150%;
            top: -25%;
            left: -25%;
            background: radial-gradient(circle at ${20 + i * 30}% ${80 - i * 20}%, 
                        var(--aurora-${(i % 3) + 1}) 0%, transparent 60%);
            animation: aurora-drift-${i} ${15 + i * 5}s ease-in-out infinite;
            opacity: ${0.3 - i * 0.1};
        `;
        auroraBg.appendChild(layer);
    }
    
    // Add CSS animations dynamically
    const style = document.createElement('style');
    style.textContent = `
        @keyframes aurora-drift-0 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(50px, -30px) rotate(120deg); }
            66% { transform: translate(-30px, 20px) rotate(240deg); }
        }
        @keyframes aurora-drift-1 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(-40px, 30px) rotate(-120deg); }
            66% { transform: translate(30px, -20px) rotate(-240deg); }
        }
        @keyframes aurora-drift-2 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(20px, 40px) rotate(180deg); }
        }
    `;
    document.head.appendChild(style);
}

// Initialize Floating Particles
function initParticles() {
    const container = document.getElementById('particles-container');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        createParticle(container, i);
    }
}

function createParticle(container, index) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = `
        left: ${Math.random() * 100}%;
        animation-delay: ${Math.random() * 20}s;
        animation-duration: ${15 + Math.random() * 10}s;
        width: ${2 + Math.random() * 4}px;
        height: ${2 + Math.random() * 4}px;
    `;
    container.appendChild(particle);
    
    // Recreate particle when animation ends
    particle.addEventListener('animationend', () => {
        particle.remove();
        createParticle(container, index);
    });
}

// 3D Tilt Effect
function init3DTilt() {
    const tiltElements = document.querySelectorAll('[data-tilt]');
    
    tiltElements.forEach(element => {
        element.addEventListener('mousemove', (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -10;
            const rotateY = ((x - centerX) / centerX) * 10;
            
            element.style.transform = `
                perspective(1000px) 
                rotateX(${rotateX}deg) 
                rotateY(${rotateY}deg) 
                translateZ(10px)
            `;
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        });
    });
}

// Magnetic Button Effect
function initMagneticButtons() {
    const magneticElements = document.querySelectorAll('.magnetic');
    
    magneticElements.forEach(element => {
        element.addEventListener('mousemove', (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            element.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = 'translate(0, 0)';
        });
    });
}

// Animated Number Counter
function animateNumbers() {
    const animateValue = (element, start, end, duration) => {
        const startTime = performance.now();
        const isPercentage = element.textContent.includes('%');
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (end - start) * easeOutQuart);
            
            element.textContent = current + (isPercentage ? '%' : '');
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    };
    
    // Will be called when data loads
    window.animateValue = animateValue;
}

// Authentication
function checkAuth() {
    // For demo purposes, using test user
    currentUser = {
        email: 'agent@example.com',
        name: 'Aurora Agent',
        role: 'agent'
    };
    
    document.getElementById('agent-name').textContent = currentUser.name;
}

// Load Dashboard Data
async function loadDashboardData() {
    // Show loading state with shimmer effect
    showLoadingState();
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate mock data
    availableLeads = generateMockAvailableLeads();
    myLeads = generateMockMyLeads();
    
    // Update UI
    renderAvailableLeads();
    renderMyLeads();
    updateStats();
    
    // Remove loading state
    hideLoadingState();
}

// Render Available Leads
function renderAvailableLeads() {
    const grid = document.getElementById('available-leads-grid');
    
    grid.innerHTML = availableLeads.map((lead, index) => `
        <div class="lead-card" data-lead-id="${lead.id}" style="animation-delay: ${index * 0.1}s">
            <div class="lead-header">
                <h4 style="color: var(--text-primary); margin: 0;">${lead.name}</h4>
                <span class="status-badge status-new">NEW</span>
            </div>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">${lead.email}</p>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">📱 ${lead.phone}</p>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">📍 ${lead.location}</p>
            <div style="display: flex; gap: 0.5rem; margin: 1rem 0; flex-wrap: wrap;">
                ${lead.services.map(service => `
                    <span style="
                        background: var(--glass-white);
                        color: var(--accent-neon);
                        padding: 0.25rem 0.75rem;
                        border-radius: 20px;
                        font-size: 0.75rem;
                        border: 1px solid var(--glass-border);
                    ">${service}</span>
                `).join('')}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                <span style="color: var(--text-secondary); font-size: 0.875rem;">
                    ${getTimeAgo(lead.createdAt)}
                </span>
                <button class="neon-btn magnetic" onclick="claimLead('${lead.id}')">
                    CLAIM
                </button>
            </div>
        </div>
    `).join('');
    
    // Re-init magnetic buttons for new elements
    initMagneticButtons();
    
    // Add hover sound effect (optional)
    document.querySelectorAll('.lead-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            // Play subtle hover sound
            playHoverSound();
        });
    });
}

// Render My Leads
function renderMyLeads() {
    const grid = document.getElementById('my-leads-grid');
    
    if (myLeads.length === 0) {
        grid.innerHTML = `
            <div style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 3rem;
                color: var(--text-secondary);
            ">
                <p style="font-size: 1.1rem;">No active leads yet</p>
                <p style="margin-top: 0.5rem;">Claim some from the available pool above!</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = myLeads.map((lead, index) => `
        <div class="lead-card" style="animation-delay: ${index * 0.1}s">
            <div class="lead-header">
                <h4 style="color: var(--text-primary); margin: 0;">${lead.name}</h4>
                <span class="status-badge status-${lead.status.toLowerCase()}">${lead.status}</span>
            </div>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">${lead.email}</p>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">📱 ${lead.phone}</p>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">
                Claimed: ${formatDate(lead.claimedAt)}
            </p>
            <div style="margin-top: 1rem;">
                <button class="neon-btn magnetic" onclick="updateStatus('${lead.id}')">
                    UPDATE STATUS
                </button>
            </div>
        </div>
    `).join('');
    
    initMagneticButtons();
}

// Update Stats with Animation
function updateStats() {
    const availableCount = availableLeads.length;
    const activeCount = myLeads.length;
    const completedCount = myLeads.filter(l => l.status === 'Completed').length;
    const conversionRate = activeCount > 0 ? Math.round((completedCount / activeCount) * 100) : 0;
    
    // Animate numbers
    window.animateValue(document.getElementById('available-count'), 0, availableCount, 2000);
    window.animateValue(document.getElementById('active-count'), 0, activeCount, 2000);
    window.animateValue(document.getElementById('completed-count'), 0, completedCount, 2000);
    window.animateValue(document.getElementById('conversion-rate'), 0, conversionRate, 2000);
}

// Claim Lead
async function claimLead(leadId) {
    const lead = availableLeads.find(l => l.id === leadId);
    if (!lead) return;
    
    // Show claiming animation
    showClaimAnimation(leadId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Move lead from available to my leads
    availableLeads = availableLeads.filter(l => l.id !== leadId);
    myLeads.unshift({
        ...lead,
        status: 'New',
        claimedAt: new Date().toISOString(),
        claimedBy: currentUser.email
    });
    
    // Re-render
    renderAvailableLeads();
    renderMyLeads();
    updateStats();
    
    // Show success notification
    showNotification(`Lead "${lead.name}" claimed successfully!`, 'success');
}

// Show Claim Animation
function showClaimAnimation(leadId) {
    const card = document.querySelector(`[data-lead-id="${leadId}"]`);
    if (!card) return;
    
    // Create particle explosion
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: var(--accent-neon);
            border-radius: 50%;
            left: ${centerX}px;
            top: ${centerY}px;
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(particle);
        
        const angle = (Math.PI * 2 * i) / 20;
        const velocity = 100 + Math.random() * 100;
        
        particle.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { 
                transform: `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(0)`,
                opacity: 0
            }
        ], {
            duration: 1000,
            easing: 'cubic-bezier(0, 0.9, 0.57, 1)'
        }).onfinish = () => particle.remove();
    }
    
    // Fade out the card
    card.style.transition = 'all 0.5s ease-out';
    card.style.transform = 'scale(0.9)';
    card.style.opacity = '0';
}

// Notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: var(--glass-white);
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        padding: 1rem 1.5rem;
        color: var(--text-primary);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Event Listeners
function initEventListeners() {
    // Search functionality
    document.getElementById('search-leads').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = availableLeads.filter(lead =>
            lead.name.toLowerCase().includes(searchTerm) ||
            lead.email.toLowerCase().includes(searchTerm) ||
            lead.location.toLowerCase().includes(searchTerm)
        );
        renderFilteredLeads(filtered);
    });
    
    // Status filter
    document.getElementById('filter-status').addEventListener('change', (e) => {
        const status = e.target.value;
        const filtered = status === 'all' 
            ? myLeads 
            : myLeads.filter(lead => lead.status.toLowerCase() === status);
        renderFilteredMyLeads(filtered);
    });
}

// Utility Functions
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Mock Data Generators
function generateMockAvailableLeads() {
    const names = ['Aurora Tech', 'Neon Digital', 'Quantum Solutions', 'Cyber Dynamics', 'Future Systems'];
    const locations = ['San Francisco, CA', 'Austin, TX', 'Seattle, WA', 'Miami, FL', 'Denver, CO'];
    const services = ['AI Integration', 'Blockchain', 'Cloud Migration', 'Cybersecurity', 'Data Analytics'];
    
    return Array.from({ length: 8 }, (_, i) => ({
        id: `lead-${Date.now()}-${i}`,
        name: names[Math.floor(Math.random() * names.length)] + ` ${i + 1}`,
        email: `contact${i + 1}@futurecorp.io`,
        phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        location: locations[Math.floor(Math.random() * locations.length)],
        services: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => 
            services[Math.floor(Math.random() * services.length)]
        ).filter((v, i, a) => a.indexOf(v) === i),
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
    }));
}

function generateMockMyLeads() {
    const leads = generateMockAvailableLeads().slice(0, 3);
    const statuses = ['New', 'Contacted', 'Interested', 'Negotiating', 'Completed'];
    
    return leads.map((lead, i) => ({
        ...lead,
        id: `my-lead-${Date.now()}-${i}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        claimedAt: new Date(Date.now() - Math.random() * 86400000 * 14).toISOString(),
        claimedBy: currentUser?.email || 'agent@example.com'
    }));
}

// Loading States
function showLoadingState() {
    document.querySelectorAll('.leads-grid').forEach(grid => {
        grid.innerHTML = `
            <div style="
                grid-column: 1 / -1;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 200px;
            ">
                <div class="loading-orb"></div>
            </div>
        `;
    });
}

function hideLoadingState() {
    // Loading state will be replaced by actual content
}

// Sound Effects (Optional)
function playHoverSound() {
    // Could add subtle hover sounds here
}

// Refresh Function
function refreshLeads() {
    showNotification('Refreshing leads...', 'info');
    loadDashboardData();
}

// Update Status
function updateStatus(leadId) {
    const lead = myLeads.find(l => l.id === leadId);
    if (!lead) return;
    
    const statuses = ['New', 'Contacted', 'Interested', 'Negotiating', 'Completed'];
    const currentIndex = statuses.indexOf(lead.status);
    lead.status = statuses[(currentIndex + 1) % statuses.length];
    
    renderMyLeads();
    updateStats();
    showNotification(`Status updated to "${lead.status}"`, 'success');
}

// Logout
function logout() {
    showNotification('Logging out...', 'info');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// Add necessary animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .loading-orb {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--primary), var(--accent-neon));
        animation: orb-pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes orb-pulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.2); opacity: 1; }
    }
    
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    
    .glass-modal {
        background: var(--glass-white);
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        border-radius: 24px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
`;
document.head.appendChild(style);

// Render Filtered Leads
function renderFilteredLeads(leads) {
    const grid = document.getElementById('available-leads-grid');
    
    if (leads.length === 0) {
        grid.innerHTML = `
            <div style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 3rem;
                color: var(--text-secondary);
            ">
                <p>No leads found matching your search</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = leads.map((lead, index) => `
        <div class="lead-card" data-lead-id="${lead.id}" style="animation-delay: ${index * 0.1}s">
            <div class="lead-header">
                <h4 style="color: var(--text-primary); margin: 0;">${lead.name}</h4>
                <span class="status-badge status-new">NEW</span>
            </div>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">${lead.email}</p>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">📱 ${lead.phone}</p>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">📍 ${lead.location}</p>
            <div style="display: flex; gap: 0.5rem; margin: 1rem 0; flex-wrap: wrap;">
                ${lead.services.map(service => `
                    <span style="
                        background: var(--glass-white);
                        color: var(--accent-neon);
                        padding: 0.25rem 0.75rem;
                        border-radius: 20px;
                        font-size: 0.75rem;
                        border: 1px solid var(--glass-border);
                    ">${service}</span>
                `).join('')}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                <span style="color: var(--text-secondary); font-size: 0.875rem;">
                    ${getTimeAgo(lead.createdAt)}
                </span>
                <button class="neon-btn magnetic" onclick="claimLead('${lead.id}')">
                    CLAIM
                </button>
            </div>
        </div>
    `).join('');
    
    initMagneticButtons();
}

// Render Filtered My Leads
function renderFilteredMyLeads(leads) {
    const grid = document.getElementById('my-leads-grid');
    
    if (leads.length === 0) {
        grid.innerHTML = `
            <div style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 3rem;
                color: var(--text-secondary);
            ">
                <p>No leads found with this status</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = leads.map((lead, index) => `
        <div class="lead-card" style="animation-delay: ${index * 0.1}s">
            <div class="lead-header">
                <h4 style="color: var(--text-primary); margin: 0;">${lead.name}</h4>
                <span class="status-badge status-${lead.status.toLowerCase()}">${lead.status}</span>
            </div>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">${lead.email}</p>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">📱 ${lead.phone}</p>
            <p style="color: var(--text-secondary); margin: 0.5rem 0;">
                Claimed: ${formatDate(lead.claimedAt)}
            </p>
            <div style="margin-top: 1rem;">
                <button class="neon-btn magnetic" onclick="updateStatus('${lead.id}')">
                    UPDATE STATUS
                </button>
            </div>
        </div>
    `).join('');
    
    initMagneticButtons();
} 