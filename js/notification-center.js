/**
 * Notification Center Module
 * Comprehensive notification system with toasts, drawer, and preferences
 */

class NotificationCenter {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.preferences = {
            sound: true,
            desktop: false,
            autoHide: true,
            autoHideDelay: 5000,
            position: 'top-right'
        };
        this.isDrawerOpen = false;
        this.maxNotifications = 100;
        this.observers = new Set();
        
        // Notification types configuration
        this.notificationTypes = {
            success: {
                icon: 'fas fa-check-circle',
                color: '#10b981',
                sound: 'success'
            },
            error: {
                icon: 'fas fa-exclamation-circle',
                color: '#ef4444',
                sound: 'error'
            },
            warning: {
                icon: 'fas fa-exclamation-triangle',
                color: '#f59e0b',
                sound: 'warning'
            },
            info: {
                icon: 'fas fa-info-circle',
                color: '#3b82f6',
                sound: 'info'
            },
            message: {
                icon: 'fas fa-envelope',
                color: '#8b5cf6',
                sound: 'message'
            }
        };
        
        this.init();
    }

    init() {
        this.createNotificationUI();
        this.loadPreferences();
        this.loadNotifications();
        this.registerEventListeners();
        this.checkDesktopPermission();
        this.initializeSounds();
        
        // Start checking for notifications (will work when backend is ready)
        this.startNotificationPolling();
    }

    createNotificationUI() {
        // Create toast container
        const toastContainer = document.createElement('div');
        toastContainer.id = 'notification-toast-container';
        toastContainer.className = `notification-toast-container ${this.preferences.position}`;
        document.body.appendChild(toastContainer);
        
        // Create notification drawer
        const drawer = document.createElement('div');
        drawer.id = 'notification-drawer';
        drawer.className = 'notification-drawer';
        drawer.innerHTML = `
            <div class="notification-drawer-header">
                <h3>Notifications</h3>
                <div class="notification-header-actions">
                    <button class="notification-action-btn" onclick="notificationCenter.markAllAsRead()" title="Mark all as read">
                        <i class="fas fa-check-double"></i>
                    </button>
                    <button class="notification-action-btn" onclick="notificationCenter.openPreferences()" title="Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="notification-action-btn" onclick="notificationCenter.clearAll()" title="Clear all">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="notification-action-btn" onclick="notificationCenter.closeDrawer()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="notification-drawer-tabs">
                <button class="notification-tab active" data-tab="all">All</button>
                <button class="notification-tab" data-tab="unread">Unread</button>
                <button class="notification-tab" data-tab="important">Important</button>
            </div>
            <div class="notification-drawer-content" id="notification-list">
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                </div>
            </div>
        `;
        document.body.appendChild(drawer);
        
        // Create notification bell (floating action button)
        const bell = document.createElement('div');
        bell.id = 'notification-bell';
        bell.className = 'notification-bell';
        bell.innerHTML = `
            <button class="notification-bell-btn" onclick="notificationCenter.toggleDrawer()">
                <i class="fas fa-bell"></i>
                <span class="notification-badge" style="display: none;">0</span>
            </button>
        `;
        document.body.appendChild(bell);
        
        // Store references
        this.toastContainer = toastContainer;
        this.drawer = drawer;
        this.notificationList = document.getElementById('notification-list');
        this.badge = bell.querySelector('.notification-badge');
    }

    // Initialize notification sounds
    initializeSounds() {
        this.sounds = {};
        
        // Create audio elements for each notification type
        Object.entries(this.notificationTypes).forEach(([type, config]) => {
            const audio = new Audio();
            audio.volume = 0.5;
            // In a real implementation, you'd load actual sound files
            // audio.src = `/sounds/${config.sound}.mp3`;
            this.sounds[type] = audio;
        });
    }

    // Check and request desktop notification permission
    checkDesktopPermission() {
        if ('Notification' in window && this.preferences.desktop) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }

    // Create a new notification
    notify(options) {
        const notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: options.type || 'info',
            title: options.title || 'Notification',
            message: options.message || '',
            timestamp: new Date(),
            read: false,
            important: options.important || false,
            actions: options.actions || [],
            data: options.data || {},
            persistent: options.persistent || false
        };

        // Add to notifications array
        this.notifications.unshift(notification);
        if (!notification.read) {
            this.unreadCount++;
        }

        // Limit stored notifications
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }

        // Update UI
        this.updateNotificationList();
        this.updateBadge();

        // Show toast
        if (!this.isDrawerOpen) {
            this.showToast(notification);
        }

        // Play sound
        if (this.preferences.sound && this.sounds[notification.type]) {
            this.sounds[notification.type].play().catch(() => {});
        }

        // Show desktop notification
        if (this.preferences.desktop && Notification.permission === 'granted') {
            this.showDesktopNotification(notification);
        }

        // Save to localStorage
        this.saveNotifications();

        // Notify observers
        this.notifyObservers('notification-added', notification);

        return notification;
    }

    // Show toast notification
    showToast(notification) {
        const typeConfig = this.notificationTypes[notification.type];
        
        const toast = document.createElement('div');
        toast.className = `notification-toast ${notification.type}`;
        toast.dataset.id = notification.id;
        
        toast.innerHTML = `
            <div class="notification-toast-icon" style="color: ${typeConfig.color}">
                <i class="${typeConfig.icon}"></i>
            </div>
            <div class="notification-toast-content">
                <div class="notification-toast-title">${notification.title}</div>
                ${notification.message ? `<div class="notification-toast-message">${notification.message}</div>` : ''}
                ${notification.actions.length > 0 ? `
                    <div class="notification-toast-actions">
                        ${notification.actions.map(action => `
                            <button class="notification-toast-action" 
                                    onclick="notificationCenter.handleAction('${notification.id}', '${action.id}')">
                                ${action.label}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <button class="notification-toast-close" onclick="notificationCenter.dismissToast('${notification.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add click handler for the toast
        toast.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-toast-close') && 
                !e.target.closest('.notification-toast-action')) {
                this.openDrawer();
                this.markAsRead(notification.id);
            }
        });

        this.toastContainer.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto hide
        if (this.preferences.autoHide && !notification.persistent) {
            setTimeout(() => {
                this.dismissToast(notification.id);
            }, this.preferences.autoHideDelay);
        }
    }

    // Dismiss toast
    dismissToast(notificationId) {
        const toast = this.toastContainer.querySelector(`[data-id="${notificationId}"]`);
        if (toast) {
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }

    // Show desktop notification
    showDesktopNotification(notification) {
        const typeConfig = this.notificationTypes[notification.type];
        
        const desktopNotif = new Notification(notification.title, {
            body: notification.message,
            icon: '/images/notification-icon.png', // You'd use actual icon
            badge: '/images/notification-badge.png',
            tag: notification.id,
            requireInteraction: notification.persistent
        });

        desktopNotif.onclick = () => {
            window.focus();
            this.openDrawer();
            this.markAsRead(notification.id);
            desktopNotif.close();
        };
    }

    // Update notification list in drawer
    updateNotificationList() {
        const activeTab = this.drawer.querySelector('.notification-tab.active').dataset.tab;
        let filteredNotifications = this.notifications;

        // Filter based on active tab
        switch (activeTab) {
            case 'unread':
                filteredNotifications = this.notifications.filter(n => !n.read);
                break;
            case 'important':
                filteredNotifications = this.notifications.filter(n => n.important);
                break;
        }

        if (filteredNotifications.length === 0) {
            this.notificationList.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No ${activeTab === 'all' ? '' : activeTab} notifications</p>
                </div>
            `;
            return;
        }

        // Group notifications by date
        const grouped = this.groupNotificationsByDate(filteredNotifications);
        
        let html = '';
        for (const [date, notifications] of Object.entries(grouped)) {
            html += `
                <div class="notification-date-group">
                    <div class="notification-date-header">${date}</div>
                    ${notifications.map(notif => this.renderNotificationItem(notif)).join('')}
                </div>
            `;
        }

        this.notificationList.innerHTML = html;
    }

    // Render single notification item
    renderNotificationItem(notification) {
        const typeConfig = this.notificationTypes[notification.type];
        const timeAgo = this.getTimeAgo(notification.timestamp);

        return `
            <div class="notification-item ${notification.read ? 'read' : 'unread'} ${notification.important ? 'important' : ''}"
                 data-id="${notification.id}">
                <div class="notification-item-icon" style="color: ${typeConfig.color}">
                    <i class="${typeConfig.icon}"></i>
                </div>
                <div class="notification-item-content">
                    <div class="notification-item-header">
                        <div class="notification-item-title">${notification.title}</div>
                        <div class="notification-item-time">${timeAgo}</div>
                    </div>
                    ${notification.message ? `<div class="notification-item-message">${notification.message}</div>` : ''}
                    ${notification.actions.length > 0 ? `
                        <div class="notification-item-actions">
                            ${notification.actions.map(action => `
                                <button class="notification-action" 
                                        onclick="notificationCenter.handleAction('${notification.id}', '${action.id}')">
                                    ${action.label}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="notification-item-menu">
                    <button class="notification-menu-btn" onclick="notificationCenter.toggleItemMenu('${notification.id}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="notification-menu-dropdown">
                        <button onclick="notificationCenter.markAsRead('${notification.id}')">
                            <i class="fas fa-check"></i> Mark as read
                        </button>
                        <button onclick="notificationCenter.toggleImportant('${notification.id}')">
                            <i class="fas fa-star"></i> ${notification.important ? 'Unmark' : 'Mark'} important
                        </button>
                        <button onclick="notificationCenter.deleteNotification('${notification.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Group notifications by date
    groupNotificationsByDate(notifications) {
        const groups = {};
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        notifications.forEach(notif => {
            const date = new Date(notif.timestamp);
            let dateKey;

            if (this.isSameDay(date, today)) {
                dateKey = 'Today';
            } else if (this.isSameDay(date, yesterday)) {
                dateKey = 'Yesterday';
            } else {
                dateKey = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                });
            }

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(notif);
        });

        return groups;
    }

    // Utility functions
    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Actions
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.unreadCount--;
            this.updateNotificationList();
            this.updateBadge();
            this.saveNotifications();
            this.notifyObservers('notification-read', notification);
        }
    }

    markAllAsRead() {
        this.notifications.forEach(n => {
            if (!n.read) n.read = true;
        });
        this.unreadCount = 0;
        this.updateNotificationList();
        this.updateBadge();
        this.saveNotifications();
        this.notifyObservers('all-read');
    }

    toggleImportant(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.important = !notification.important;
            this.updateNotificationList();
            this.saveNotifications();
        }
    }

    deleteNotification(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            const notification = this.notifications[index];
            if (!notification.read) {
                this.unreadCount--;
            }
            this.notifications.splice(index, 1);
            this.updateNotificationList();
            this.updateBadge();
            this.saveNotifications();
            this.notifyObservers('notification-deleted', notification);
        }
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all notifications?')) {
            this.notifications = [];
            this.unreadCount = 0;
            this.updateNotificationList();
            this.updateBadge();
            this.saveNotifications();
            this.notifyObservers('all-cleared');
        }
    }

    handleAction(notificationId, actionId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            const action = notification.actions.find(a => a.id === actionId);
            if (action && action.handler) {
                action.handler(notification);
            }
            this.markAsRead(notificationId);
        }
    }

    // UI Controls
    toggleDrawer() {
        if (this.isDrawerOpen) {
            this.closeDrawer();
        } else {
            this.openDrawer();
        }
    }

    openDrawer() {
        this.isDrawerOpen = true;
        this.drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
        
        // Mark visible notifications as read after a delay
        setTimeout(() => {
            const unreadItems = this.drawer.querySelectorAll('.notification-item.unread');
            unreadItems.forEach(item => {
                const id = item.dataset.id;
                this.markAsRead(id);
            });
        }, 1000);
    }

    closeDrawer() {
        this.isDrawerOpen = false;
        this.drawer.classList.remove('open');
        document.body.style.overflow = '';
    }

    toggleItemMenu(notificationId) {
        const item = this.drawer.querySelector(`[data-id="${notificationId}"]`);
        if (item) {
            item.classList.toggle('menu-open');
        }
    }

    updateBadge() {
        if (this.unreadCount > 0) {
            this.badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            this.badge.style.display = 'flex';
        } else {
            this.badge.style.display = 'none';
        }
    }

    // Preferences
    openPreferences() {
        const modal = document.createElement('div');
        modal.className = 'notification-preferences-modal modal-overlay active';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Notification Preferences</h3>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="preference-group">
                        <label class="preference-toggle">
                            <input type="checkbox" id="pref-sound" ${this.preferences.sound ? 'checked' : ''}>
                            <span>Sound notifications</span>
                        </label>
                    </div>
                    <div class="preference-group">
                        <label class="preference-toggle">
                            <input type="checkbox" id="pref-desktop" ${this.preferences.desktop ? 'checked' : ''}>
                            <span>Desktop notifications</span>
                        </label>
                    </div>
                    <div class="preference-group">
                        <label class="preference-toggle">
                            <input type="checkbox" id="pref-autohide" ${this.preferences.autoHide ? 'checked' : ''}>
                            <span>Auto-hide toast notifications</span>
                        </label>
                    </div>
                    <div class="preference-group">
                        <label>Auto-hide delay (seconds)</label>
                        <input type="number" id="pref-delay" class="form-input" 
                               value="${this.preferences.autoHideDelay / 1000}" min="1" max="30">
                    </div>
                    <div class="preference-group">
                        <label>Toast position</label>
                        <select id="pref-position" class="form-select">
                            <option value="top-right" ${this.preferences.position === 'top-right' ? 'selected' : ''}>Top Right</option>
                            <option value="top-left" ${this.preferences.position === 'top-left' ? 'selected' : ''}>Top Left</option>
                            <option value="bottom-right" ${this.preferences.position === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
                            <option value="bottom-left" ${this.preferences.position === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="notificationCenter.savePreferences()">
                        Save Preferences
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    savePreferences() {
        this.preferences = {
            sound: document.getElementById('pref-sound').checked,
            desktop: document.getElementById('pref-desktop').checked,
            autoHide: document.getElementById('pref-autohide').checked,
            autoHideDelay: parseInt(document.getElementById('pref-delay').value) * 1000,
            position: document.getElementById('pref-position').value
        };

        // Update toast container position
        this.toastContainer.className = `notification-toast-container ${this.preferences.position}`;

        // Check desktop permission if enabled
        if (this.preferences.desktop) {
            this.checkDesktopPermission();
        }

        localStorage.setItem('notification-preferences', JSON.stringify(this.preferences));
        document.querySelector('.notification-preferences-modal').remove();
    }

    loadPreferences() {
        const saved = localStorage.getItem('notification-preferences');
        if (saved) {
            this.preferences = JSON.parse(saved);
        }
    }

    // Persistence
    saveNotifications() {
        const toSave = this.notifications.slice(0, 50); // Save only recent 50
        localStorage.setItem('notifications', JSON.stringify(toSave));
        localStorage.setItem('notification-unread-count', this.unreadCount);
    }

    loadNotifications() {
        const saved = localStorage.getItem('notifications');
        if (saved) {
            this.notifications = JSON.parse(saved);
            this.notifications.forEach(n => {
                n.timestamp = new Date(n.timestamp);
            });
        }
        
        const unreadCount = localStorage.getItem('notification-unread-count');
        if (unreadCount) {
            this.unreadCount = parseInt(unreadCount);
        }

        this.updateNotificationList();
        this.updateBadge();
    }

    // Event handling
    registerEventListeners() {
        // Tab switching
        this.drawer.querySelectorAll('.notification-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.drawer.querySelectorAll('.notification-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateNotificationList();
            });
        });

        // Close drawer on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDrawerOpen) {
                this.closeDrawer();
            }
        });

        // Close menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-item-menu')) {
                this.drawer.querySelectorAll('.notification-item.menu-open').forEach(item => {
                    item.classList.remove('menu-open');
                });
            }
        });
    }

    // Observer pattern for external integrations
    subscribe(callback) {
        this.observers.add(callback);
    }

    unsubscribe(callback) {
        this.observers.delete(callback);
    }

    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            callback(event, data);
        });
    }

    // Backend integration (ready when backend implements the endpoint)
    async startNotificationPolling() {
        // Only poll if we have a valid auth token
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        // Poll every 30 seconds
        setInterval(async () => {
            try {
                const response = await fetch('/api/notifications/latest', {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.notifications && Array.isArray(data.notifications)) {
                        data.notifications.forEach(notif => {
                            // Check if we already have this notification
                            if (!this.notifications.find(n => n.id === notif.id)) {
                                this.notify(notif);
                            }
                        });
                    }
                }
            } catch (error) {
                // Silently fail - backend not ready yet
                console.debug('Notification polling failed:', error);
            }
        }, 30000);
    }

    // Demo notifications for testing
    showDemoNotifications() {
        setTimeout(() => {
            this.notify({
                type: 'success',
                title: 'Welcome to Notification Center!',
                message: 'Your notification system is now active.',
                important: true
            });
        }, 1000);

        setTimeout(() => {
            this.notify({
                type: 'info',
                title: 'New Lead Assigned',
                message: 'John Doe has been assigned to you.',
                actions: [
                    {
                        id: 'view',
                        label: 'View Lead',
                        handler: () => console.log('View lead')
                    },
                    {
                        id: 'contact',
                        label: 'Contact',
                        handler: () => console.log('Contact lead')
                    }
                ]
            });
        }, 3000);

        setTimeout(() => {
            this.notify({
                type: 'warning',
                title: 'Action Required',
                message: 'You have 3 leads pending follow-up.',
                persistent: true
            });
        }, 5000);
    }
}

// Initialize notification center
let notificationCenter;
document.addEventListener('DOMContentLoaded', () => {
    notificationCenter = new NotificationCenter();
    
    // Expose to global scope
    window.notificationCenter = notificationCenter;
    
    // Show demo notifications in development
    if (window.location.hostname === 'localhost') {
        notificationCenter.showDemoNotifications();
    }
}); 