/**
 * Real-time Collaboration Engine
 * Live presence, activity tracking, and collaborative features
 */

class CollaborationEngine {
    constructor() {
        this.userId = null;
        this.userName = null;
        this.userRole = null;
        this.activeUsers = new Map();
        this.userPresence = new Map();
        this.activityLog = [];
        this.changeHistory = new Map();
        this.connections = new Map();
        this.subscriptions = new Map();
        this.conflictQueue = [];
        this.lastActivity = Date.now();
        this.heartbeatInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // WebSocket connection (would connect to real server)
        this.ws = null;
        this.wsUrl = window.APP_CONFIG?.wsUrl || 'wss://api.example.com/collaborate';
        this.isConnected = false;
        
        // Collaboration settings
        this.settings = {
            enablePresence: true,
            enableCursors: true,
            enableTypingIndicators: true,
            enableAutoSave: true,
            autoSaveInterval: 5000,
            presenceTimeout: 30000,
            activityRetention: 7 * 24 * 60 * 60 * 1000 // 7 days
        };
        
        // Event emitter pattern
        this.events = new EventTarget();
        
        // Initialize
        this.init();
    }
    
    init() {
        // Get user info from auth
        this.getUserInfo();
        
        // Create UI components
        this.createPresenceUI();
        this.createActivityUI();
        
        // Setup WebSocket connection
        this.connect();
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load saved data
        this.loadSavedData();
        
        console.log('🤝 Collaboration engine initialized');
    }
    
    getUserInfo() {
        // Get from auth system or localStorage
        const authData = JSON.parse(localStorage.getItem('authUser') || '{}');
        this.userId = authData.sub || `user_${Date.now()}`;
        this.userName = authData.name || authData.email || 'Anonymous User';
        this.userRole = authData.role || 'viewer';
    }
    
    // WebSocket Connection Management
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }
        
        console.log('🔌 Connecting to collaboration server...');
        
        // Simulate WebSocket for demo (in production, use real WebSocket)
        this.simulateWebSocket();
        
        // In production:
        // this.ws = new WebSocket(this.wsUrl);
        // this.setupWebSocketHandlers();
    }
    
    simulateWebSocket() {
        // Simulate WebSocket behavior for demo
        this.isConnected = true;
        
        // Simulate connection
        setTimeout(() => {
            this.handleConnect();
            
            // Simulate other users
            this.simulateOtherUsers();
        }, 500);
    }
    
    simulateOtherUsers() {
        // Add some fake active users for demo
        const fakeUsers = [
            { id: 'user_jane', name: 'Jane Smith', role: 'agent', status: 'active', location: '/leads' },
            { id: 'user_bob', name: 'Bob Johnson', role: 'admin', status: 'idle', location: '/admin' }
        ];
        
        fakeUsers.forEach(user => {
            this.handleUserJoined(user);
        });
        
        // Simulate activity
        setInterval(() => {
            const randomUser = fakeUsers[Math.floor(Math.random() * fakeUsers.length)];
            const activities = ['viewed_lead', 'updated_status', 'added_note', 'assigned_lead'];
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            
            this.handleActivity({
                userId: randomUser.id,
                userName: randomUser.name,
                action: randomActivity,
                target: `Lead #${Math.floor(Math.random() * 1000) + 1000}`,
                timestamp: new Date().toISOString()
            });
        }, 10000);
    }
    
    setupWebSocketHandlers() {
        this.ws.onopen = () => this.handleConnect();
        this.ws.onclose = () => this.handleDisconnect();
        this.ws.onerror = (error) => this.handleError(error);
        this.ws.onmessage = (event) => this.handleMessage(event);
    }
    
    handleConnect() {
        console.log('✅ Connected to collaboration server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send presence
        this.sendPresence();
        
        // Subscribe to relevant channels
        this.subscribeToChannels();
        
        // Emit connection event
        this.emit('connected');
    }
    
    handleDisconnect() {
        console.log('❌ Disconnected from collaboration server');
        this.isConnected = false;
        
        // Try to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), 1000 * Math.pow(2, this.reconnectAttempts));
        }
        
        // Emit disconnection event
        this.emit('disconnected');
    }
    
    handleError(error) {
        console.error('WebSocket error:', error);
        this.emit('error', error);
    }
    
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'presence':
                    this.handlePresenceUpdate(message.data);
                    break;
                case 'user_joined':
                    this.handleUserJoined(message.data);
                    break;
                case 'user_left':
                    this.handleUserLeft(message.data);
                    break;
                case 'activity':
                    this.handleActivity(message.data);
                    break;
                case 'data_update':
                    this.handleDataUpdate(message.data);
                    break;
                case 'cursor_move':
                    this.handleCursorMove(message.data);
                    break;
                case 'typing':
                    this.handleTyping(message.data);
                    break;
                case 'conflict':
                    this.handleConflict(message.data);
                    break;
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }
    
    // Presence Management
    sendPresence() {
        const presence = {
            userId: this.userId,
            userName: this.userName,
            userRole: this.userRole,
            status: this.getStatus(),
            location: window.location.pathname,
            timestamp: new Date().toISOString()
        };
        
        this.send('presence', presence);
        
        // Update local presence
        this.userPresence.set(this.userId, presence);
    }
    
    getStatus() {
        const idleTime = Date.now() - this.lastActivity;
        if (idleTime > 5 * 60 * 1000) return 'away'; // 5 minutes
        if (idleTime > 30 * 1000) return 'idle'; // 30 seconds
        return 'active';
    }
    
    handlePresenceUpdate(data) {
        this.userPresence.set(data.userId, data);
        this.updatePresenceUI();
        this.emit('presenceUpdate', data);
    }
    
    handleUserJoined(data) {
        this.activeUsers.set(data.id, data);
        this.addActivityLog({
            type: 'user_joined',
            user: data.name,
            timestamp: new Date().toISOString()
        });
        
        this.updatePresenceUI();
        this.showToast(`${data.name} joined`, 'info');
        this.emit('userJoined', data);
    }
    
    handleUserLeft(data) {
        this.activeUsers.delete(data.id);
        this.userPresence.delete(data.id);
        
        this.addActivityLog({
            type: 'user_left',
            user: data.name,
            timestamp: new Date().toISOString()
        });
        
        this.updatePresenceUI();
        this.emit('userLeft', data);
    }
    
    // Activity Tracking
    trackActivity(action, target, metadata = {}) {
        const activity = {
            id: `activity_${Date.now()}`,
            userId: this.userId,
            userName: this.userName,
            action: action,
            target: target,
            metadata: metadata,
            timestamp: new Date().toISOString()
        };
        
        // Send to server
        this.send('activity', activity);
        
        // Add to local log
        this.addActivityLog(activity);
        
        // Update last activity
        this.lastActivity = Date.now();
        
        return activity;
    }
    
    handleActivity(data) {
        this.addActivityLog(data);
        this.updateActivityUI(data);
        this.emit('activity', data);
    }
    
    addActivityLog(activity) {
        this.activityLog.unshift(activity);
        
        // Limit log size
        if (this.activityLog.length > 1000) {
            this.activityLog = this.activityLog.slice(0, 1000);
        }
        
        // Save to localStorage
        this.saveActivityLog();
    }
    
    // Data Synchronization
    subscribeToEntity(entityType, entityId) {
        const key = `${entityType}:${entityId}`;
        
        if (!this.subscriptions.has(key)) {
            this.subscriptions.set(key, {
                entityType,
                entityId,
                subscribers: new Set([this.userId])
            });
            
            this.send('subscribe', { entityType, entityId });
        }
    }
    
    unsubscribeFromEntity(entityType, entityId) {
        const key = `${entityType}:${entityId}`;
        this.subscriptions.delete(key);
        this.send('unsubscribe', { entityType, entityId });
    }
    
    handleDataUpdate(data) {
        const { entityType, entityId, changes, userId, userName } = data;
        
        // Check if we're subscribed to this entity
        const key = `${entityType}:${entityId}`;
        if (!this.subscriptions.has(key)) return;
        
        // Apply changes if not from self
        if (userId !== this.userId) {
            this.applyChanges(entityType, entityId, changes);
            
            // Show notification
            this.showToast(`${userName} updated ${entityType} #${entityId}`, 'info');
        }
        
        // Add to change history
        this.addToHistory(entityType, entityId, changes, userId, userName);
        
        this.emit('dataUpdate', data);
    }
    
    applyChanges(entityType, entityId, changes) {
        // This would integrate with your data management system
        // For now, emit event for other modules to handle
        this.emit('applyChanges', { entityType, entityId, changes });
    }
    
    // Conflict Resolution
    detectConflict(entityType, entityId, localChanges, remoteChanges) {
        const conflicts = [];
        
        Object.keys(localChanges).forEach(key => {
            if (key in remoteChanges && localChanges[key] !== remoteChanges[key]) {
                conflicts.push({
                    field: key,
                    localValue: localChanges[key],
                    remoteValue: remoteChanges[key]
                });
            }
        });
        
        return conflicts.length > 0 ? conflicts : null;
    }
    
    handleConflict(data) {
        const { entityType, entityId, conflicts, remoteUser } = data;
        
        // Add to conflict queue
        this.conflictQueue.push({
            id: `conflict_${Date.now()}`,
            entityType,
            entityId,
            conflicts,
            remoteUser,
            timestamp: new Date().toISOString(),
            resolved: false
        });
        
        // Show conflict resolution UI
        this.showConflictModal(data);
        
        this.emit('conflict', data);
    }
    
    resolveConflict(conflictId, resolution) {
        const conflict = this.conflictQueue.find(c => c.id === conflictId);
        if (!conflict) return;
        
        // Apply resolution
        const changes = {};
        resolution.forEach(r => {
            changes[r.field] = r.chosenValue;
        });
        
        // Send resolution to server
        this.send('resolve_conflict', {
            conflictId,
            entityType: conflict.entityType,
            entityId: conflict.entityId,
            changes
        });
        
        // Mark as resolved
        conflict.resolved = true;
        conflict.resolution = resolution;
        
        // Apply changes locally
        this.applyChanges(conflict.entityType, conflict.entityId, changes);
    }
    
    // Cursor Tracking
    trackCursor(x, y, elementId = null) {
        if (!this.settings.enableCursors) return;
        
        const cursorData = {
            userId: this.userId,
            userName: this.userName,
            x: x,
            y: y,
            elementId: elementId,
            timestamp: Date.now()
        };
        
        // Throttle cursor updates
        if (!this.cursorThrottle) {
            this.cursorThrottle = setTimeout(() => {
                this.send('cursor_move', cursorData);
                this.cursorThrottle = null;
            }, 50);
        }
    }
    
    handleCursorMove(data) {
        if (data.userId === this.userId) return;
        
        this.updateCursorUI(data);
        this.emit('cursorMove', data);
    }
    
    // Typing Indicators
    startTyping(elementId) {
        if (!this.settings.enableTypingIndicators) return;
        
        this.send('typing', {
            userId: this.userId,
            userName: this.userName,
            elementId: elementId,
            isTyping: true
        });
        
        // Auto-stop typing after 3 seconds
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping(elementId);
        }, 3000);
    }
    
    stopTyping(elementId) {
        this.send('typing', {
            userId: this.userId,
            userName: this.userName,
            elementId: elementId,
            isTyping: false
        });
    }
    
    handleTyping(data) {
        if (data.userId === this.userId) return;
        
        this.updateTypingUI(data);
        this.emit('typing', data);
    }
    
    // UI Components
    createPresenceUI() {
        // Create presence indicator
        const presenceContainer = document.createElement('div');
        presenceContainer.className = 'collaboration-presence';
        presenceContainer.id = 'collaboration-presence';
        presenceContainer.innerHTML = `
            <div class="presence-header">
                <span class="presence-icon">👥</span>
                <span class="presence-count">0 online</span>
            </div>
            <div class="presence-list" id="presence-list">
                <!-- Active users will be listed here -->
            </div>
        `;
        
        // Add to page
        document.body.appendChild(presenceContainer);
        
        // Create cursor container
        const cursorContainer = document.createElement('div');
        cursorContainer.className = 'cursor-container';
        cursorContainer.id = 'cursor-container';
        document.body.appendChild(cursorContainer);
        
        // Add styles
        this.addStyles();
    }
    
    createActivityUI() {
        // Create activity timeline
        const activityPanel = document.createElement('div');
        activityPanel.className = 'activity-panel';
        activityPanel.id = 'activity-panel';
        activityPanel.innerHTML = `
            <div class="activity-header">
                <h3>📊 Activity Timeline</h3>
                <button class="btn-icon" onclick="collaborationEngine.toggleActivityPanel()">×</button>
            </div>
            <div class="activity-filters">
                <select id="activity-filter-user" class="filter-select">
                    <option value="">All Users</option>
                </select>
                <select id="activity-filter-action" class="filter-select">
                    <option value="">All Actions</option>
                    <option value="created">Created</option>
                    <option value="updated">Updated</option>
                    <option value="deleted">Deleted</option>
                    <option value="assigned">Assigned</option>
                </select>
            </div>
            <div class="activity-timeline" id="activity-timeline">
                <!-- Activities will be listed here -->
            </div>
        `;
        
        document.body.appendChild(activityPanel);
    }
    
    updatePresenceUI() {
        const container = document.getElementById('presence-list');
        const countElement = document.querySelector('.presence-count');
        
        if (!container) return;
        
        const activeCount = this.activeUsers.size;
        countElement.textContent = `${activeCount} online`;
        
        container.innerHTML = Array.from(this.activeUsers.values()).map(user => `
            <div class="presence-user ${user.status || 'active'}">
                <div class="presence-avatar" style="background-color: ${this.getAvatarColor(user.id)}">
                    ${this.getInitials(user.name)}
                </div>
                <div class="presence-info">
                    <div class="presence-name">${user.name}</div>
                    <div class="presence-location">${this.getLocationName(user.location)}</div>
                </div>
                <div class="presence-status ${user.status || 'active'}"></div>
            </div>
        `).join('');
    }
    
    updateActivityUI(activity) {
        const timeline = document.getElementById('activity-timeline');
        if (!timeline) return;
        
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        activityElement.innerHTML = `
            <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
            <div class="activity-content">
                <div class="activity-user">${activity.userName || 'System'}</div>
                <div class="activity-action">${this.formatAction(activity.action)} ${activity.target || ''}</div>
            </div>
        `;
        
        timeline.insertBefore(activityElement, timeline.firstChild);
        
        // Limit displayed activities
        while (timeline.children.length > 50) {
            timeline.removeChild(timeline.lastChild);
        }
    }
    
    updateCursorUI(data) {
        let cursor = document.getElementById(`cursor-${data.userId}`);
        
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'remote-cursor';
            cursor.id = `cursor-${data.userId}`;
            cursor.innerHTML = `
                <div class="cursor-pointer" style="color: ${this.getAvatarColor(data.userId)}">➤</div>
                <div class="cursor-label">${data.userName}</div>
            `;
            document.getElementById('cursor-container').appendChild(cursor);
        }
        
        cursor.style.left = `${data.x}px`;
        cursor.style.top = `${data.y}px`;
        
        // Remove cursor after inactivity
        clearTimeout(cursor.hideTimeout);
        cursor.hideTimeout = setTimeout(() => {
            cursor.remove();
        }, 5000);
    }
    
    updateTypingUI(data) {
        const element = document.getElementById(data.elementId);
        if (!element) return;
        
        let indicator = element.querySelector('.typing-indicator');
        
        if (data.isTyping) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'typing-indicator';
                element.appendChild(indicator);
            }
            
            indicator.textContent = `${data.userName} is typing...`;
        } else {
            indicator?.remove();
        }
    }
    
    showConflictModal(data) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal conflict-modal">
                <div class="modal-header">
                    <h3>⚠️ Merge Conflict</h3>
                </div>
                <div class="modal-body">
                    <p>${data.remoteUser.name} made changes to the same data. Please resolve conflicts:</p>
                    
                    <div class="conflict-list">
                        ${data.conflicts.map((conflict, index) => `
                            <div class="conflict-item">
                                <h4>${conflict.field}</h4>
                                <div class="conflict-options">
                                    <label class="conflict-option">
                                        <input type="radio" name="conflict-${index}" value="local">
                                        <span class="option-label">Your change:</span>
                                        <span class="option-value">${conflict.localValue}</span>
                                    </label>
                                    <label class="conflict-option">
                                        <input type="radio" name="conflict-${index}" value="remote" checked>
                                        <span class="option-label">${data.remoteUser.name}'s change:</span>
                                        <span class="option-value">${conflict.remoteValue}</span>
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="collaborationEngine.applyConflictResolution('${data.id}', this)">
                        Apply Resolution
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    applyConflictResolution(conflictId, button) {
        const modal = button.closest('.modal-overlay');
        const resolution = [];
        
        modal.querySelectorAll('.conflict-item').forEach((item, index) => {
            const selected = item.querySelector(`input[name="conflict-${index}"]:checked`);
            const conflict = this.conflictQueue.find(c => c.id === conflictId).conflicts[index];
            
            resolution.push({
                field: conflict.field,
                chosenValue: selected.value === 'local' ? conflict.localValue : conflict.remoteValue
            });
        });
        
        this.resolveConflict(conflictId, resolution);
        modal.remove();
    }
    
    // Change History
    addToHistory(entityType, entityId, changes, userId, userName) {
        const key = `${entityType}:${entityId}`;
        
        if (!this.changeHistory.has(key)) {
            this.changeHistory.set(key, []);
        }
        
        const history = this.changeHistory.get(key);
        history.unshift({
            id: `change_${Date.now()}`,
            userId,
            userName,
            changes,
            timestamp: new Date().toISOString()
        });
        
        // Limit history size
        if (history.length > 100) {
            history.length = 100;
        }
        
        this.saveChangeHistory();
    }
    
    getHistory(entityType, entityId) {
        const key = `${entityType}:${entityId}`;
        return this.changeHistory.get(key) || [];
    }
    
    // Heartbeat & Connection Management
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.sendPresence();
                this.cleanupInactiveUsers();
            }
        }, 10000); // Every 10 seconds
    }
    
    cleanupInactiveUsers() {
        const now = Date.now();
        const timeout = this.settings.presenceTimeout;
        
        this.userPresence.forEach((presence, userId) => {
            const lastSeen = new Date(presence.timestamp).getTime();
            if (now - lastSeen > timeout && userId !== this.userId) {
                this.handleUserLeft({ id: userId, name: presence.userName });
            }
        });
    }
    
    // Event Listeners
    setupEventListeners() {
        // Track user activity
        ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.lastActivity = Date.now();
            });
        });
        
        // Track cursor movement (throttled)
        document.addEventListener('mousemove', (e) => {
            this.trackCursor(e.clientX, e.clientY);
        });
        
        // Track typing
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea')) {
                this.startTyping(e.target.id);
            }
        });
        
        // Page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.sendPresence(); // Update status to away
            } else {
                this.lastActivity = Date.now();
                this.sendPresence();
            }
        });
        
        // Before unload
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });
    }
    
    // Data Persistence
    saveActivityLog() {
        const recentActivity = this.activityLog.slice(0, 100);
        localStorage.setItem('collaborationActivity', JSON.stringify(recentActivity));
    }
    
    saveChangeHistory() {
        const historyObj = Object.fromEntries(this.changeHistory);
        localStorage.setItem('collaborationHistory', JSON.stringify(historyObj));
    }
    
    loadSavedData() {
        // Load activity log
        const savedActivity = localStorage.getItem('collaborationActivity');
        if (savedActivity) {
            this.activityLog = JSON.parse(savedActivity);
            this.activityLog.forEach(activity => this.updateActivityUI(activity));
        }
        
        // Load change history
        const savedHistory = localStorage.getItem('collaborationHistory');
        if (savedHistory) {
            const historyObj = JSON.parse(savedHistory);
            Object.entries(historyObj).forEach(([key, value]) => {
                this.changeHistory.set(key, value);
            });
        }
    }
    
    // Helper Methods
    send(type, data) {
        if (!this.isConnected) return;
        
        const message = {
            type,
            data,
            timestamp: new Date().toISOString()
        };
        
        // In production, send via WebSocket
        // this.ws.send(JSON.stringify(message));
        
        // For demo, simulate some responses
        this.simulateServerResponse(type, data);
    }
    
    simulateServerResponse(type, data) {
        // Simulate server responses for demo
        switch (type) {
            case 'presence':
                // Broadcast to other users
                this.activeUsers.forEach(user => {
                    if (user.id !== this.userId) {
                        setTimeout(() => {
                            this.handlePresenceUpdate({
                                userId: user.id,
                                ...user,
                                status: Math.random() > 0.7 ? 'idle' : 'active'
                            });
                        }, Math.random() * 1000);
                    }
                });
                break;
        }
    }
    
    emit(eventName, data) {
        this.events.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
    
    on(eventName, handler) {
        this.events.addEventListener(eventName, handler);
    }
    
    off(eventName, handler) {
        this.events.removeEventListener(eventName, handler);
    }
    
    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    
    getAvatarColor(userId) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#48C9B0', '#6C5CE7'];
        const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    }
    
    getLocationName(path) {
        const routes = {
            '/': 'Dashboard',
            '/admin': 'Admin Panel',
            '/leads': 'Leads',
            '/agents': 'Agents',
            '/vendors': 'Vendors',
            '/analytics': 'Analytics'
        };
        return routes[path] || path;
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return date.toLocaleDateString();
    }
    
    formatAction(action) {
        const actionMap = {
            created: '➕ created',
            updated: '✏️ updated',
            deleted: '🗑️ deleted',
            assigned: '👤 assigned',
            viewed: '👁️ viewed',
            commented: '💬 commented on',
            status_changed: '🔄 changed status of',
            user_joined: '👋 joined',
            user_left: '👋 left'
        };
        return actionMap[action] || action;
    }
    
    showToast(message, type = 'info') {
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'collaboration',
                title: 'Collaboration',
                message: message
            });
        }
    }
    
    toggleActivityPanel() {
        const panel = document.getElementById('activity-panel');
        panel.classList.toggle('expanded');
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        clearInterval(this.heartbeatInterval);
    }
    
    // Public API
    
    // Track specific actions
    trackLeadView(leadId) {
        this.trackActivity('viewed', `Lead #${leadId}`);
        this.subscribeToEntity('lead', leadId);
    }
    
    trackLeadUpdate(leadId, changes) {
        this.trackActivity('updated', `Lead #${leadId}`, { changes });
        this.send('data_update', {
            entityType: 'lead',
            entityId: leadId,
            changes,
            userId: this.userId,
            userName: this.userName
        });
    }
    
    trackLeadAssignment(leadId, agentName) {
        this.trackActivity('assigned', `Lead #${leadId} to ${agentName}`);
    }
    
    // Comments & Mentions
    addComment(entityType, entityId, comment, mentions = []) {
        const commentData = {
            id: `comment_${Date.now()}`,
            entityType,
            entityId,
            userId: this.userId,
            userName: this.userName,
            comment,
            mentions,
            timestamp: new Date().toISOString()
        };
        
        this.send('comment', commentData);
        
        // Track activity
        this.trackActivity('commented', `${entityType} #${entityId}`);
        
        // Notify mentioned users
        mentions.forEach(userId => {
            this.send('mention', {
                userId,
                mentionedBy: this.userName,
                entityType,
                entityId,
                comment
            });
        });
        
        return commentData;
    }
    
    // Styles
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Collaboration Presence */
            .collaboration-presence {
                position: fixed;
                top: 80px;
                right: 20px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 1rem;
                min-width: 250px;
                max-width: 300px;
                box-shadow: var(--shadow-lg);
                z-index: 1000;
            }
            
            .presence-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .presence-icon {
                font-size: 1.25rem;
            }
            
            .presence-count {
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .presence-list {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .presence-user {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem;
                border-radius: 8px;
                transition: all 0.2s ease;
            }
            
            .presence-user:hover {
                background: var(--bg-primary);
            }
            
            .presence-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 600;
                font-size: 0.75rem;
            }
            
            .presence-info {
                flex: 1;
                min-width: 0;
            }
            
            .presence-name {
                font-weight: 500;
                color: var(--text-primary);
                font-size: 0.875rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .presence-location {
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .presence-status {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            
            .presence-status.active {
                background: var(--success);
            }
            
            .presence-status.idle {
                background: var(--warning);
            }
            
            .presence-status.away {
                background: var(--text-secondary);
            }
            
            /* Activity Panel */
            .activity-panel {
                position: fixed;
                top: 0;
                right: -400px;
                width: 400px;
                height: 100%;
                background: var(--bg-secondary);
                border-left: 1px solid var(--border-color);
                box-shadow: var(--shadow-lg);
                transition: right 0.3s ease;
                z-index: 999;
                display: flex;
                flex-direction: column;
            }
            
            .activity-panel.expanded {
                right: 0;
            }
            
            .activity-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .activity-header h3 {
                margin: 0;
                color: var(--text-primary);
            }
            
            .activity-filters {
                display: flex;
                gap: 0.5rem;
                padding: 1rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .filter-select {
                flex: 1;
                padding: 0.5rem;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                color: var(--text-primary);
                font-size: 0.875rem;
            }
            
            .activity-timeline {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }
            
            .activity-item {
                display: flex;
                gap: 1rem;
                padding: 0.75rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .activity-time {
                font-size: 0.75rem;
                color: var(--text-secondary);
                min-width: 60px;
            }
            
            .activity-content {
                flex: 1;
            }
            
            .activity-user {
                font-weight: 600;
                color: var(--primary);
                font-size: 0.875rem;
            }
            
            .activity-action {
                font-size: 0.875rem;
                color: var(--text-primary);
                margin-top: 0.25rem;
            }
            
            /* Remote Cursors */
            .cursor-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
            }
            
            .remote-cursor {
                position: absolute;
                transition: all 0.1s ease;
                pointer-events: none;
            }
            
            .cursor-pointer {
                font-size: 20px;
                transform: rotate(-45deg);
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
            }
            
            .cursor-label {
                position: absolute;
                top: 20px;
                left: 10px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
                white-space: nowrap;
                box-shadow: var(--shadow-sm);
            }
            
            /* Typing Indicators */
            .typing-indicator {
                position: absolute;
                bottom: -20px;
                left: 0;
                font-size: 0.75rem;
                color: var(--text-secondary);
                font-style: italic;
            }
            
            /* Conflict Modal */
            .conflict-modal {
                max-width: 600px;
            }
            
            .conflict-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-top: 1rem;
            }
            
            .conflict-item {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
            }
            
            .conflict-item h4 {
                margin: 0 0 0.5rem 0;
                color: var(--text-primary);
                text-transform: capitalize;
            }
            
            .conflict-options {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .conflict-option {
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
                padding: 0.5rem;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .conflict-option:hover {
                border-color: var(--primary);
                background: rgba(66, 153, 225, 0.05);
            }
            
            .conflict-option input[type="radio"] {
                margin-top: 2px;
            }
            
            .option-label {
                font-weight: 500;
                color: var(--text-secondary);
                font-size: 0.875rem;
            }
            
            .option-value {
                color: var(--text-primary);
                margin-left: 0.5rem;
            }
            
            /* Activity Toggle Button */
            .activity-toggle {
                position: fixed;
                top: 50%;
                right: 0;
                transform: translateY(-50%);
                background: var(--primary);
                color: white;
                padding: 0.75rem 0.5rem;
                border-radius: 8px 0 0 8px;
                cursor: pointer;
                box-shadow: var(--shadow-lg);
                z-index: 998;
                transition: all 0.2s ease;
            }
            
            .activity-toggle:hover {
                padding-right: 1rem;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .collaboration-presence {
                    display: none;
                }
                
                .activity-panel {
                    width: 100%;
                    right: -100%;
                }
                
                .activity-panel.expanded {
                    right: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Add activity toggle button
        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'activity-toggle';
        toggleBtn.innerHTML = '📊';
        toggleBtn.onclick = () => this.toggleActivityPanel();
        document.body.appendChild(toggleBtn);
    }
}

// Initialize collaboration engine
window.collaborationEngine = new CollaborationEngine();

// Export for use in other modules
export default CollaborationEngine; 