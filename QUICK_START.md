# Quick Start Guide - Frontend Team

## What to Do Right Now (Day 1)

### 1. Enable Mock API (5 minutes)
Add this to your HTML files to enable mock API:
```html
<script src="js/mock-api.js"></script>
```

### 2. Test Mock Endpoints (10 minutes)
Open browser console and test:
```javascript
// Test lead assignment
fetch('/api/leads/lead_123/assign', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
    },
    body: JSON.stringify({
        agentId: 'agent_1',
        priority: 'high'
    })
}).then(r => r.json()).then(console.log);

// Test bulk operations
fetch('/api/leads/bulk-update', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
    },
    body: JSON.stringify({
        leadIds: ['lead_1', 'lead_2'],
        updates: { status: 'qualified' }
    })
}).then(r => r.json()).then(console.log);
```

### 3. Integrate Lead Assignment (30 minutes)

#### Step 1: Add to admin.html
```html
<!-- Add before closing </body> tag -->
<script src="js/lead-assignment.js"></script>
```

#### Step 2: Add assignment button to leads
```javascript
// In your lead rendering code, add:
<button class="btn btn-sm btn-primary" onclick="leadAssignment.openAssignmentModal()">
    Assign
</button>
```

#### Step 3: Test the flow
1. Open admin dashboard
2. Select some leads using checkboxes
3. Click "Assign Selected" in bulk action bar
4. Choose an agent and confirm

### 4. Start Building Filters (Rest of Day)

Create `js/advanced-filters.js`:
```javascript
class AdvancedFilters {
    constructor() {
        this.filters = {
            dateRange: { start: null, end: null },
            status: [],
            source: [],
            assignedTo: []
        };
    }
    
    createFilterPanel() {
        return `
            <div class="advanced-filters-panel">
                <div class="filter-group">
                    <label>Date Range</label>
                    <input type="date" id="filter-date-start">
                    <input type="date" id="filter-date-end">
                </div>
                
                <div class="filter-group">
                    <label>Status</label>
                    <select multiple id="filter-status">
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="retained">Retained</option>
                    </select>
                </div>
                
                <button onclick="advancedFilters.applyFilters()">
                    Apply Filters
                </button>
            </div>
        `;
    }
    
    async applyFilters() {
        const response = await fetch('/api/leads/advanced-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ filters: this.filters })
        });
        
        const results = await response.json();
        this.displayResults(results);
    }
}

window.advancedFilters = new AdvancedFilters();
```

---

## Team Assignments (Suggested)

### Developer 1: Lead Assignment & Bulk Ops
- Complete lead assignment integration
- Add bulk selection to all lead views
- Create bulk operation progress indicators

### Developer 2: Advanced Filtering
- Build date range picker component
- Create multi-select dropdowns
- Implement filter presets

### Developer 3: File Upload System
- Create drag-and-drop component
- Build file preview modal
- Add upload progress tracking

### Developer 4: Real-time Features
- Research WebSocket libraries
- Create notification system mockup
- Design real-time update UI

---

## Communication Channels

### Daily Sync
- **Time**: 9:30 AM
- **Duration**: 15 minutes
- **Focus**: Blockers and progress

### Slack Channels
- `#mva-frontend` - General discussion
- `#mva-backend-api` - API questions
- `#mva-qa` - Testing coordination

### Documentation
- Update `FRONTEND_DEVELOPMENT_ROADMAP.md` daily
- Document all API assumptions in `API_ASSUMPTIONS.md`
- Keep component examples in `/examples` folder

---

## End of Day 1 Checklist

- [ ] Mock API working in browser
- [ ] Lead assignment modal appearing
- [ ] Can select multiple leads
- [ ] Started on one additional feature
- [ ] Updated roadmap with progress
- [ ] Committed code to feature branch

---

## Tomorrow's Goals

1. Complete lead assignment flow
2. Start advanced filtering UI
3. Create component documentation
4. Plan WebSocket architecture
5. Review with team lead

---

## Need Help?

- **Mock API issues**: Check console for errors, ensure script is loaded
- **UI not updating**: Check for missing event listeners
- **API questions**: Document in `API_QUESTIONS.md` for backend team
- **Design questions**: Screenshot and share in Slack

Remember: Build with mock data first, integrate with real API later! 