/**
 * Real-Time Notification System
 * Handles push notifications, notification center, and activity tracking
 */

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.soundEnabled = true;
        this.desktopEnabled = false;
        this.wsConnection = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.activityFeed = [];
        this.maxNotifications = 100;
        this.maxActivities = 500;
        
        // Notification types configuration
        this.notificationTypes = {
            lead_new: {
                icon: '📋',
                color: '#4299e1',
                sound: 'new-lead',
                priority: 'high',
                desktop: true
            },
            lead_assigned: {
                icon: '👤',
                color: '#10b981',
                sound: 'assign',
                priority: 'medium',
                desktop: true
            },
            lead_converted: {
                icon: '🎉',
                color: '#f59e0b',
                sound: 'success',
                priority: 'high',
                desktop: true
            },
            agent_online: {
                icon: '🟢',
                color: '#10b981',
                sound: null,
                priority: 'low',
                desktop: false
            },
            agent_offline: {
                icon: '🔴',
                color: '#ef4444',
                sound: null,
                priority: 'low',
                desktop: false
            },
            system_alert: {
                icon: '⚠️',
                color: '#ef4444',
                sound: 'alert',
                priority: 'critical',
                desktop: true
            },
            revenue_milestone: {
                icon: '💰',
                color: '#10b981',
                sound: 'milestone',
                priority: 'high',
                desktop: true
            },
            performance_update: {
                icon: '📊',
                color: '#3b82f6',
                sound: null,
                priority: 'medium',
                desktop: false
            }
        };
        
        this.init();
    }
    
    async init() {
        // Create notification UI
        this.createNotificationUI();
        
        // Load saved preferences
        this.loadPreferences();
        
        // Request notification permission
        await this.requestNotificationPermission();
        
        // Initialize WebSocket connection
        this.initializeWebSocket();
        
        // Load notification history
        this.loadNotificationHistory();
        
        // Start activity tracking
        this.startActivityTracking();
        
        // Preload notification sounds
        this.preloadSounds();
        
        console.log('🔔 Notification system initialized');
    }
    
    createNotificationUI() {
        // Create notification bell in header
        const header = document.querySelector('.header-right') || document.querySelector('.admin-header');
        if (header) {
            const notificationBell = document.createElement('div');
            notificationBell.className = 'notification-bell-container';
            notificationBell.innerHTML = `
                <button class="notification-bell" id="notification-bell" data-tooltip="Notifications">
                    <span class="bell-icon">🔔</span>
                    <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
                </button>
            `;
            header.insertBefore(notificationBell, header.firstChild);
        }
        
        // Create notification center
        const notificationCenter = document.createElement('div');
        notificationCenter.className = 'notification-center';
        notificationCenter.id = 'notification-center';
        notificationCenter.innerHTML = `
            <div class="notification-header">
                <h3>Notifications</h3>
                <div class="notification-actions">
                    <button class="btn-icon" id="mark-all-read" data-tooltip="Mark all as read">
                        ✓
                    </button>
                    <button class="btn-icon" id="notification-settings" data-tooltip="Settings">
                        ⚙️
                    </button>
                    <button class="btn-icon" id="close-notifications">
                        ✕
                    </button>
                </div>
            </div>
            <div class="notification-tabs">
                <button class="notification-tab active" data-tab="all">All</button>
                <button class="notification-tab" data-tab="unread">Unread</button>
                <button class="notification-tab" data-tab="leads">Leads</button>
                <button class="notification-tab" data-tab="system">System</button>
            </div>
            <div class="notification-list" id="notification-list">
                <div class="empty-notifications">
                    <span class="empty-icon">🔔</span>
                    <p>No notifications yet</p>
                </div>
            </div>
            <div class="notification-footer">
                <button class="btn-link" id="view-all-activities">View All Activities →</button>
            </div>
        `;
        document.body.appendChild(notificationCenter);
        
        // Create notification settings modal
        this.createSettingsModal();
        
        // Create activity timeline modal
        this.createActivityTimeline();
        
        // Add styles
        this.addStyles();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    createSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'notification-settings-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal glass-modal">
                <div class="modal-header">
                    <h3>Notification Settings</h3>
                    <button class="modal-close" onclick="notificationSystem.closeSettings()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="settings-section">
                        <h4>General Settings</h4>
                        <label class="setting-item">
                            <input type="checkbox" id="enable-sounds" ${this.soundEnabled ? 'checked' : ''}>
                            <span>Enable notification sounds</span>
                        </label>
                        <label class="setting-item">
                            <input type="checkbox" id="enable-desktop" ${this.desktopEnabled ? 'checked' : ''}>
                            <span>Enable desktop notifications</span>
                        </label>
                    </div>
                    
                    <div class="settings-section">
                        <h4>Notification Types</h4>
                        ${Object.entries(this.notificationTypes).map(([type, config]) => `
                            <div class="notification-type-setting">
                                <span class="type-icon">${config.icon}</span>
                                <span class="type-name">${this.formatTypeName(type)}</span>
                                <label class="toggle-switch small">
                                    <input type="checkbox" data-type="${type}" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="settings-section">
                        <h4>Quiet Hours</h4>
                        <label class="setting-item">
                            <input type="checkbox" id="enable-quiet-hours">
                            <span>Enable quiet hours</span>
                        </label>
                        <div class="quiet-hours-config" style="display: none;">
                            <label>
                                From: <input type="time" id="quiet-start" value="22:00">
                            </label>
                            <label>
                                To: <input type="time" id="quiet-end" value="08:00">
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="notificationSystem.closeSettings()">Cancel</button>
                    <button class="btn btn-primary" onclick="notificationSystem.saveSettings()">Save Settings</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    createActivityTimeline() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'activity-timeline-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal glass-modal large">
                <div class="modal-header">
                    <h3>Activity Timeline</h3>
                    <button class="modal-close" onclick="notificationSystem.closeActivityTimeline()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="timeline-filters">
                        <input type="text" id="activity-search" placeholder="Search activities..." class="search-input">
                        <select id="activity-type-filter" class="select-input">
                            <option value="all">All Activities</option>
                            <option value="leads">Lead Activities</option>
                            <option value="agents">Agent Activities</option>
                            <option value="system">System Events</option>
                        </select>
                        <input type="date" id="activity-date-filter" class="form-input">
                    </div>
                    <div class="activity-timeline" id="activity-timeline">
                        <!-- Timeline items will be added here -->
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Notification Bell */
            .notification-bell-container {
                position: relative;
                margin-right: 1rem;
            }
            
            .notification-bell {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                position: relative;
                padding: 0.5rem;
                border-radius: 8px;
                transition: all 0.2s ease;
            }
            
            .notification-bell:hover {
                background: var(--bg-secondary);
            }
            
            .notification-bell.has-unread .bell-icon {
                animation: bell-ring 1s ease-in-out;
            }
            
            @keyframes bell-ring {
                0%, 100% { transform: rotate(0); }
                10%, 30% { transform: rotate(-10deg); }
                20%, 40% { transform: rotate(10deg); }
            }
            
            .notification-badge {
                position: absolute;
                top: 0;
                right: 0;
                background: var(--danger);
                color: white;
                font-size: 0.75rem;
                font-weight: 600;
                padding: 0.125rem 0.375rem;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
            }
            
            /* Notification Center */
            .notification-center {
                position: fixed;
                top: 60px;
                right: 20px;
                width: 400px;
                max-height: 600px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                box-shadow: var(--shadow-xl);
                display: none;
                flex-direction: column;
                z-index: 1000;
                animation: slideDown 0.3s ease-out;
            }
            
            .notification-center.active {
                display: flex;
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .notification-header h3 {
                margin: 0;
                font-size: 1.125rem;
            }
            
            .notification-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            .btn-icon {
                background: none;
                border: none;
                font-size: 1.125rem;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 4px;
                color: var(--text-secondary);
                transition: all 0.2s ease;
            }
            
            .btn-icon:hover {
                background: var(--bg-primary);
                color: var(--text-primary);
            }
            
            .notification-tabs {
                display: flex;
                padding: 0 1rem;
                gap: 0.5rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .notification-tab {
                background: none;
                border: none;
                padding: 0.75rem 1rem;
                cursor: pointer;
                color: var(--text-secondary);
                border-bottom: 2px solid transparent;
                transition: all 0.2s ease;
            }
            
            .notification-tab.active {
                color: var(--primary);
                border-bottom-color: var(--primary);
            }
            
            .notification-list {
                flex: 1;
                overflow-y: auto;
                padding: 0.5rem;
                max-height: 400px;
            }
            
            .notification-item {
                display: flex;
                gap: 1rem;
                padding: 1rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                border: 1px solid transparent;
            }
            
            .notification-item:hover {
                background: var(--bg-primary);
                border-color: var(--border-color);
            }
            
            .notification-item.unread {
                background: rgba(66, 153, 225, 0.05);
                border-color: rgba(66, 153, 225, 0.2);
            }
            
            .notification-item.unread::before {
                content: '';
                position: absolute;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 4px;
                height: 60%;
                background: var(--primary);
                border-radius: 2px;
            }
            
            .notification-icon {
                font-size: 1.5rem;
                flex-shrink: 0;
            }
            
            .notification-content {
                flex: 1;
                min-width: 0;
            }
            
            .notification-title {
                font-weight: 600;
                margin-bottom: 0.25rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .notification-message {
                font-size: 0.875rem;
                color: var(--text-secondary);
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            
            .notification-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 0.5rem;
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .notification-time {
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }
            
            .notification-actions-inline {
                display: flex;
                gap: 0.5rem;
            }
            
            .notification-action {
                padding: 0.125rem 0.5rem;
                border-radius: 4px;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .notification-action.primary {
                background: var(--primary);
                color: white;
                border: none;
            }
            
            .notification-action.secondary {
                background: transparent;
                color: var(--primary);
                border: 1px solid var(--primary);
            }
            
            .empty-notifications {
                text-align: center;
                padding: 3rem;
                color: var(--text-secondary);
            }
            
            .empty-icon {
                font-size: 3rem;
                opacity: 0.3;
                display: block;
                margin-bottom: 1rem;
            }
            
            .notification-footer {
                padding: 1rem;
                border-top: 1px solid var(--border-color);
                text-align: center;
            }
            
            /* Settings Modal */
            .settings-section {
                margin-bottom: 1.5rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .settings-section:last-child {
                border-bottom: none;
            }
            
            .settings-section h4 {
                margin-bottom: 1rem;
                color: var(--text-primary);
            }
            
            .setting-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.5rem 0;
                cursor: pointer;
            }
            
            .notification-type-setting {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.5rem 0;
            }
            
            .type-icon {
                font-size: 1.25rem;
            }
            
            .type-name {
                flex: 1;
                text-transform: capitalize;
            }
            
            .toggle-switch.small {
                transform: scale(0.8);
            }
            
            .quiet-hours-config {
                display: flex;
                gap: 1rem;
                margin-top: 1rem;
                padding: 1rem;
                background: var(--bg-primary);
                border-radius: 8px;
            }
            
            .quiet-hours-config input[type="time"] {
                padding: 0.5rem;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                background: var(--bg-secondary);
                color: var(--text-primary);
            }
            
            /* Activity Timeline */
            .timeline-filters {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;
                flex-wrap: wrap;
            }
            
            .timeline-filters .search-input {
                flex: 1;
                min-width: 200px;
            }
            
            .activity-timeline {
                position: relative;
                padding-left: 2rem;
                max-height: 500px;
                overflow-y: auto;
            }
            
            .timeline-line {
                position: absolute;
                left: 0.75rem;
                top: 0;
                bottom: 0;
                width: 2px;
                background: var(--border-color);
            }
            
            .timeline-item {
                position: relative;
                padding-bottom: 1.5rem;
                padding-left: 1.5rem;
            }
            
            .timeline-marker {
                position: absolute;
                left: -1.5rem;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: var(--primary);
                border: 2px solid var(--bg-secondary);
                z-index: 1;
            }
            
            .timeline-content {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
            }
            
            .timeline-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .timeline-title {
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .timeline-time {
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .timeline-body {
                font-size: 0.875rem;
                color: var(--text-secondary);
            }
            
            /* Toast Notifications */
            .notification-toast {
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
                box-shadow: var(--shadow-lg);
                display: flex;
                align-items: center;
                gap: 1rem;
                min-width: 300px;
                max-width: 500px;
                animation: slideInLeft 0.3s ease-out;
                z-index: 10000;
            }
            
            @keyframes slideInLeft {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .notification-toast.hiding {
                animation: slideOutLeft 0.3s ease-out forwards;
            }
            
            @keyframes slideOutLeft {
                to {
                    transform: translateX(-100%);
                    opacity: 0;
                }
            }
            
            /* Real-time indicator */
            .realtime-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.75rem;
                padding: 0.25rem 0.75rem;
                background: var(--bg-primary);
                border-radius: 20px;
                border: 1px solid var(--border-color);
            }
            
            .realtime-status.connected {
                border-color: var(--success);
                color: var(--success);
            }
            
            .realtime-status.disconnected {
                border-color: var(--danger);
                color: var(--danger);
            }
            
            .realtime-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: currentColor;
                animation: pulse 2s infinite;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .notification-center {
                    width: calc(100vw - 40px);
                    right: 20px;
                    left: 20px;
                }
                
                .notification-list {
                    max-height: 300px;
                }
                
                .modal.large {
                    width: 95vw;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Notification bell
        const bell = document.getElementById('notification-bell');
        if (bell) {
            bell.addEventListener('click', () => this.toggleNotificationCenter());
        }
        
        // Close notifications
        document.getElementById('close-notifications')?.addEventListener('click', () => {
            this.closeNotificationCenter();
        });
        
        // Mark all as read
        document.getElementById('mark-all-read')?.addEventListener('click', () => {
            this.markAllAsRead();
        });
        
        // Settings
        document.getElementById('notification-settings')?.addEventListener('click', () => {
            this.openSettings();
        });
        
        // View all activities
        document.getElementById('view-all-activities')?.addEventListener('click', () => {
            this.openActivityTimeline();
        });
        
        // Notification tabs
        document.querySelectorAll('.notification-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Settings toggles
        document.getElementById('enable-sounds')?.addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
        });
        
        document.getElementById('enable-desktop')?.addEventListener('change', (e) => {
            this.desktopEnabled = e.target.checked;
        });
        
        document.getElementById('enable-quiet-hours')?.addEventListener('change', (e) => {
            document.querySelector('.quiet-hours-config').style.display = 
                e.target.checked ? 'flex' : 'none';
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            const center = document.getElementById('notification-center');
            const bell = document.getElementById('notification-bell');
            if (center && center.classList.contains('active') && 
                !center.contains(e.target) && !bell.contains(e.target)) {
                this.closeNotificationCenter();
            }
        });
        
        // Activity search
        document.getElementById('activity-search')?.addEventListener('input', (e) => {
            this.filterActivities(e.target.value);
        });
        
        // Activity type filter
        document.getElementById('activity-type-filter')?.addEventListener('change', (e) => {
            this.filterActivitiesByType(e.target.value);
        });
        
        // Activity date filter
        document.getElementById('activity-date-filter')?.addEventListener('change', (e) => {
            this.filterActivitiesByDate(e.target.value);
        });
    }
    
    // WebSocket Methods
    initializeWebSocket() {
        const wsUrl = window.APP_CONFIG?.wsEndpoint || 
                     'wss://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
        
        try {
            this.wsConnection = new WebSocket(wsUrl);
            
            this.wsConnection.onopen = () => {
                console.log('✅ WebSocket connected');
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
            };
            
            this.wsConnection.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            
            this.wsConnection.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            this.wsConnection.onclose = () => {
                console.log('❌ WebSocket disconnected');
                this.updateConnectionStatus(false);
                this.scheduleReconnect();
            };
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            // Fall back to polling
            this.startPolling();
        }
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'notification':
                this.addNotification(data.notification);
                break;
            case 'activity':
                this.addActivity(data.activity);
                break;
            case 'stats_update':
                this.handleStatsUpdate(data.stats);
                break;
            case 'agent_status':
                this.handleAgentStatus(data);
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached, falling back to polling');
            this.startPolling();
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.initializeWebSocket(), delay);
    }
    
    startPolling() {
        // Fallback polling mechanism
        setInterval(() => {
            this.fetchLatestNotifications();
        }, 30000); // Poll every 30 seconds
    }
    
    async fetchLatestNotifications() {
        try {
            const response = await fetch('/api/notifications/latest', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                data.notifications?.forEach(notification => {
                    if (!this.notifications.find(n => n.id === notification.id)) {
                        this.addNotification(notification);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }
    
    // Notification Methods
    addNotification(notification) {
        // Add timestamp if not present
        if (!notification.timestamp) {
            notification.timestamp = new Date().toISOString();
        }
        
        // Add to beginning of array
        this.notifications.unshift(notification);
        
        // Limit notifications
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }
        
        // Update unread count
        if (!notification.read) {
            this.unreadCount++;
            this.updateBadge();
        }
        
        // Show toast notification
        this.showToast(notification);
        
        // Play sound
        if (this.soundEnabled && !this.isQuietHours()) {
            this.playNotificationSound(notification.type);
        }
        
        // Show desktop notification
        if (this.desktopEnabled && this.notificationTypes[notification.type]?.desktop) {
            this.showDesktopNotification(notification);
        }
        
        // Update UI
        this.renderNotifications();
        
        // Save to localStorage
        this.saveNotifications();
    }
    
    showToast(notification) {
        const config = this.notificationTypes[notification.type] || {};
        
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `
            <span class="notification-icon" style="color: ${config.color}">${config.icon}</span>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
            </div>
            <button class="btn-icon" onclick="this.parentElement.classList.add('hiding')">✕</button>
        `;
        
        document.body.appendChild(toast);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        // Click to dismiss
        toast.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.handleNotificationClick(notification);
                toast.classList.add('hiding');
                setTimeout(() => toast.remove(), 300);
            }
        });
    }
    
    async showDesktopNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const config = this.notificationTypes[notification.type] || {};
            
            const desktopNotif = new Notification(notification.title, {
                body: notification.message,
                icon: '/images/notification-icon.png',
                badge: '/images/notification-badge.png',
                tag: notification.id,
                requireInteraction: config.priority === 'critical',
                silent: !this.soundEnabled
            });
            
            desktopNotif.onclick = () => {
                window.focus();
                this.handleNotificationClick(notification);
                desktopNotif.close();
            };
        }
    }
    
    playNotificationSound(type) {
        const config = this.notificationTypes[type];
        if (!config?.sound) return;
        
        const audio = new Audio(`/sounds/${config.sound}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Could not play notification sound:', e));
    }
    
    handleNotificationClick(notification) {
        // Mark as read
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.updateBadge();
        this.renderNotifications();
        this.saveNotifications();
        
        // Handle navigation based on type
        switch (notification.type) {
            case 'lead_new':
            case 'lead_assigned':
            case 'lead_converted':
                if (notification.data?.leadId) {
                    // Navigate to lead details
                    window.location.href = `/leads/${notification.data.leadId}`;
                }
                break;
            case 'agent_online':
            case 'agent_offline':
                if (notification.data?.agentId) {
                    // Navigate to agent profile
                    window.location.href = `/agents/${notification.data.agentId}`;
                }
                break;
            case 'revenue_milestone':
                // Navigate to analytics
                window.location.href = '/analytics';
                break;
        }
    }
    
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.unreadCount = 0;
        this.updateBadge();
        this.renderNotifications();
        this.saveNotifications();
        this.showToast({
            type: 'system_alert',
            title: 'All Marked as Read',
            message: 'All notifications have been marked as read'
        });
    }
    
    renderNotifications() {
        const list = document.getElementById('notification-list');
        if (!list) return;
        
        const activeTab = document.querySelector('.notification-tab.active')?.dataset.tab || 'all';
        let filteredNotifications = this.notifications;
        
        // Filter by tab
        switch (activeTab) {
            case 'unread':
                filteredNotifications = this.notifications.filter(n => !n.read);
                break;
            case 'leads':
                filteredNotifications = this.notifications.filter(n => 
                    ['lead_new', 'lead_assigned', 'lead_converted'].includes(n.type)
                );
                break;
            case 'system':
                filteredNotifications = this.notifications.filter(n => 
                    ['system_alert', 'performance_update'].includes(n.type)
                );
                break;
        }
        
        if (filteredNotifications.length === 0) {
            list.innerHTML = `
                <div class="empty-notifications">
                    <span class="empty-icon">🔔</span>
                    <p>No ${activeTab === 'all' ? '' : activeTab} notifications</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = filteredNotifications.map(notification => {
            const config = this.notificationTypes[notification.type] || {};
            const timeAgo = this.getTimeAgo(notification.timestamp);
            
            return `
                <div class="notification-item ${notification.read ? '' : 'unread'}" 
                     onclick="notificationSystem.handleNotificationClick('${notification.id}')">
                    <span class="notification-icon" style="color: ${config.color}">${config.icon}</span>
                    <div class="notification-content">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-meta">
                            <span class="notification-time">
                                <span>🕐</span> ${timeAgo}
                            </span>
                            ${notification.actions ? `
                                <div class="notification-actions-inline">
                                    ${notification.actions.map(action => `
                                        <button class="notification-action ${action.type}" 
                                                onclick="event.stopPropagation(); notificationSystem.handleAction('${notification.id}', '${action.id}')">
                                            ${action.label}
                                        </button>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Activity Methods
    addActivity(activity) {
        this.activityFeed.unshift(activity);
        
        // Limit activities
        if (this.activityFeed.length > this.maxActivities) {
            this.activityFeed = this.activityFeed.slice(0, this.maxActivities);
        }
        
        // Update activity feed if visible
        this.updateActivityFeed();
    }
    
    updateActivityFeed() {
        const feedElement = document.getElementById('activity-feed');
        if (!feedElement) return;
        
        const recentActivities = this.activityFeed.slice(0, 10);
        
        feedElement.innerHTML = recentActivities.map(activity => `
            <div class="activity-item">
                <span class="activity-icon">${activity.icon || '📌'}</span>
                <div class="activity-text">
                    <strong>${activity.user}</strong> ${activity.action}
                </div>
                <span class="activity-time">${this.getTimeAgo(activity.timestamp)}</span>
            </div>
        `).join('');
    }
    
    renderActivityTimeline() {
        const timeline = document.getElementById('activity-timeline');
        if (!timeline) return;
        
        timeline.innerHTML = `
            <div class="timeline-line"></div>
            ${this.activityFeed.map(activity => `
                <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <div class="timeline-title">
                                <span>${activity.icon || '📌'}</span>
                                <strong>${activity.user}</strong> ${activity.action}
                            </div>
                            <span class="timeline-time">${this.formatDateTime(activity.timestamp)}</span>
                        </div>
                        ${activity.details ? `
                            <div class="timeline-body">${activity.details}</div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        `;
    }
    
    // UI Methods
    toggleNotificationCenter() {
        const center = document.getElementById('notification-center');
        if (center.classList.contains('active')) {
            this.closeNotificationCenter();
        } else {
            center.classList.add('active');
            this.renderNotifications();
        }
    }
    
    closeNotificationCenter() {
        document.getElementById('notification-center')?.classList.remove('active');
    }
    
    openSettings() {
        document.getElementById('notification-settings-modal').style.display = 'block';
    }
    
    closeSettings() {
        document.getElementById('notification-settings-modal').style.display = 'none';
    }
    
    saveSettings() {
        const settings = {
            soundEnabled: document.getElementById('enable-sounds').checked,
            desktopEnabled: document.getElementById('enable-desktop').checked,
            quietHours: {
                enabled: document.getElementById('enable-quiet-hours').checked,
                start: document.getElementById('quiet-start').value,
                end: document.getElementById('quiet-end').value
            },
            typeSettings: {}
        };
        
        // Save type settings
        document.querySelectorAll('[data-type]').forEach(checkbox => {
            settings.typeSettings[checkbox.dataset.type] = checkbox.checked;
        });
        
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
        this.loadPreferences();
        this.closeSettings();
        
        this.showToast({
            type: 'system_alert',
            title: 'Settings Saved',
            message: 'Your notification preferences have been updated'
        });
    }
    
    openActivityTimeline() {
        document.getElementById('activity-timeline-modal').style.display = 'block';
        this.renderActivityTimeline();
    }
    
    closeActivityTimeline() {
        document.getElementById('activity-timeline-modal').style.display = 'none';
    }
    
    switchTab(tab) {
        document.querySelectorAll('.notification-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        this.renderNotifications();
    }
    
    updateBadge() {
        const badge = document.getElementById('notification-badge');
        const bell = document.getElementById('notification-bell');
        
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'block';
                bell?.classList.add('has-unread');
            } else {
                badge.style.display = 'none';
                bell?.classList.remove('has-unread');
            }
        }
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.querySelector('.realtime-status');
        if (statusElement) {
            statusElement.classList.toggle('connected', connected);
            statusElement.classList.toggle('disconnected', !connected);
            statusElement.querySelector('span').textContent = connected ? 'Connected' : 'Disconnected';
        }
    }
    
    // Helper Methods
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.desktopEnabled = true;
                console.log('Desktop notifications enabled');
            }
        }
    }
    
    loadPreferences() {
        const saved = localStorage.getItem('notificationSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.soundEnabled = settings.soundEnabled ?? true;
            this.desktopEnabled = settings.desktopEnabled ?? false;
        }
    }
    
    loadNotificationHistory() {
        const saved = localStorage.getItem('notifications');
        if (saved) {
            this.notifications = JSON.parse(saved);
            this.unreadCount = this.notifications.filter(n => !n.read).length;
            this.updateBadge();
        }
    }
    
    saveNotifications() {
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }
    
    startActivityTracking() {
        // Track user actions and add to activity feed
        document.addEventListener('click', (e) => {
            const action = e.target.closest('[data-track-action]');
            if (action) {
                this.trackAction(action.dataset.trackAction, action.dataset);
            }
        });
    }
    
    trackAction(action, data) {
        const activity = {
            id: `activity_${Date.now()}`,
            user: 'You',
            action: action,
            timestamp: new Date().toISOString(),
            icon: data.icon || '📌',
            details: data.details
        };
        
        this.addActivity(activity);
    }
    
    preloadSounds() {
        const sounds = new Set();
        Object.values(this.notificationTypes).forEach(config => {
            if (config.sound) sounds.add(config.sound);
        });
        
        sounds.forEach(sound => {
            const audio = new Audio(`/sounds/${sound}.mp3`);
            audio.preload = 'auto';
        });
    }
    
    isQuietHours() {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
        if (!settings.quietHours?.enabled) return false;
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
        const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        
        if (startTime <= endTime) {
            return currentTime >= startTime && currentTime <= endTime;
        } else {
            return currentTime >= startTime || currentTime <= endTime;
        }
    }
    
    formatTypeName(type) {
        return type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }
    
    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
    
    filterActivities(searchTerm) {
        // Implementation for activity search
        console.log('Filtering activities:', searchTerm);
    }
    
    filterActivitiesByType(type) {
        // Implementation for type filter
        console.log('Filtering by type:', type);
    }
    
    filterActivitiesByDate(date) {
        // Implementation for date filter
        console.log('Filtering by date:', date);
    }
    
    handleAction(notificationId, actionId) {
        // Handle notification actions
        console.log('Handling action:', notificationId, actionId);
    }
    
    handleStatsUpdate(stats) {
        // Update dashboard stats based on real-time data
        if (window.updateDashboardStats) {
            window.updateDashboardStats(stats);
        }
    }
    
    handleAgentStatus(data) {
        // Update agent status in UI
        const statusIndicator = document.querySelector(`[data-agent-id="${data.agentId}"] .status-dot`);
        if (statusIndicator) {
            statusIndicator.classList.toggle('offline', data.status === 'offline');
        }
    }
}

// Initialize notification system
window.notificationSystem = new NotificationSystem();

// Export for use in other modules
export default NotificationSystem; 