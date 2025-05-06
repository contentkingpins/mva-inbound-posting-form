// Script to load mock lead data for demo purposes
(function() {
    // Check if we need to load mock data
    const mockDataLoaded = localStorage.getItem('mockDataLoaded');
    
    if (!mockDataLoaded) {
        console.log('Loading mock lead data...');
        
        // Fetch the mock data JSON file
        fetch('mock_leads.json')
            .then(response => response.json())
            .then(mockLeads => {
                // Store in localStorage to simulate persistence
                localStorage.setItem('leads', JSON.stringify(mockLeads));
                localStorage.setItem('mockDataLoaded', 'true');
                console.log('Mock data loaded successfully!');
                
                // Refresh the page to show the data
                window.location.reload();
            })
            .catch(error => {
                console.error('Error loading mock data:', error);
            });
    }
})(); 