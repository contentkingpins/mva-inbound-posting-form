const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  ScanCommand,
  QueryCommand
} = require('@aws-sdk/lib-dynamodb');
const { authenticateRequest, CORS_HEADERS } = require('./authMiddleware');

// Initialize DynamoDB client
const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

// Environment variables
const LEADS_TABLE = process.env.LEADS_TABLE || 'Leads';
const USERS_TABLE = process.env.USERS_TABLE || 'Users';

/**
 * GET /admin/stats - Dashboard metrics and KPIs
 */
exports.getStats = async (event) => {
  try {
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    const user = event.requestContext?.authorizer || {};
    
    // Check admin role
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }
    
    console.log('Getting admin stats...');
    
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const startOfMonthISO = startOfMonth.toISOString();
    const endOfMonthISO = endOfMonth.toISOString();
    
    // Get previous month for comparison
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const prevMonthStartISO = prevMonthStart.toISOString();
    const prevMonthEndISO = prevMonthEnd.toISOString();
    
    // Fetch all leads to calculate stats
    const allLeadsResult = await dynamoDB.send(new ScanCommand({
      TableName: LEADS_TABLE
    }));
    
    const allLeads = allLeadsResult.Items || [];
    
    // Filter current month leads
    const currentMonthLeads = allLeads.filter(lead => {
      const createdDate = new Date(lead.created_date || lead.timestamp);
      return createdDate >= startOfMonth && createdDate <= endOfMonth;
    });
    
    // Filter previous month leads  
    const prevMonthLeads = allLeads.filter(lead => {
      const createdDate = new Date(lead.created_date || lead.timestamp);
      return createdDate >= prevMonthStart && createdDate <= prevMonthEnd;
    });
    
    // Calculate current month metrics
    const totalLeads = currentMonthLeads.length;
    const closedLeads = currentMonthLeads.filter(l => 
      l.disposition === 'Closed' || l.disposition === 'completed'
    );
    const newLeads = currentMonthLeads.filter(l => l.disposition === 'New');
    const inProgressLeads = currentMonthLeads.filter(l => 
      l.disposition === 'In Progress' || l.disposition === 'Contacted'
    );
    
    // Calculate revenue (assuming each closed lead = $35)
    const currentRevenue = closedLeads.reduce((sum, lead) => 
      sum + (parseFloat(lead.lead_value) || 35), 0
    );
    
    // Calculate previous month metrics for comparison
    const prevTotalLeads = prevMonthLeads.length;
    const prevClosedLeads = prevMonthLeads.filter(l => 
      l.disposition === 'Closed' || l.disposition === 'completed'
    );
    const prevRevenue = prevClosedLeads.reduce((sum, lead) => 
      sum + (parseFloat(lead.lead_value) || 35), 0
    );
    
    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? (closedLeads.length / totalLeads * 100) : 0;
    const prevConversionRate = prevTotalLeads > 0 ? (prevClosedLeads.length / prevTotalLeads * 100) : 0;
    
    // Calculate average lead value (CPA - Cost Per Acquisition)
    const avgLeadValue = totalLeads > 0 ? (currentRevenue / totalLeads) : 0;
    const prevAvgLeadValue = prevTotalLeads > 0 ? (prevRevenue / prevTotalLeads) : 0;
    
    // Get agent count (try to get from Users table if it exists)
    let agentCount = 0;
    let onlineAgents = 0;
    
    try {
      const agentsResult = await dynamoDB.send(new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: '#role = :role',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: { ':role': 'agent' }
      }));
      
      agentCount = agentsResult.Items ? agentsResult.Items.length : 0;
      onlineAgents = Math.floor(agentCount * 0.6); // Estimate 60% online
    } catch (error) {
      console.log('Could not fetch agents from Users table, using estimates');
      agentCount = 5; // Default estimate
      onlineAgents = 3;
    }
    
    // Calculate percentage changes
    const revenueChange = prevRevenue ? ((currentRevenue - prevRevenue) / prevRevenue * 100) : 0;
    const cpaChange = prevAvgLeadValue ? ((avgLeadValue - prevAvgLeadValue) / prevAvgLeadValue * 100) : 0;
    const conversionChange = prevConversionRate ? (conversionRate - prevConversionRate) : 0;
    
    // Get vendor breakdown
    const vendorStats = {};
    currentMonthLeads.forEach(lead => {
      const vendor = lead.vendor_code || 'Unknown';
      if (!vendorStats[vendor]) {
        vendorStats[vendor] = { total: 0, closed: 0, revenue: 0 };
      }
      vendorStats[vendor].total++;
      if (lead.disposition === 'Closed' || lead.disposition === 'completed') {
        vendorStats[vendor].closed++;
        vendorStats[vendor].revenue += parseFloat(lead.lead_value) || 35;
      }
    });
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        revenue: {
          total: Math.round(currentRevenue * 100) / 100,
          change: Math.round(revenueChange * 10) / 10,
          previous: Math.round(prevRevenue * 100) / 100
        },
        cpa: {
          average: Math.round(avgLeadValue * 100) / 100,
          change: Math.round(cpaChange * 10) / 10,
          previous: Math.round(prevAvgLeadValue * 100) / 100
        },
        agents: {
          total: agentCount,
          online: onlineAgents
        },
        conversion: {
          rate: Math.round(conversionRate * 10) / 10,
          change: Math.round(conversionChange * 10) / 10,
          previous: Math.round(prevConversionRate * 10) / 10
        },
        leads: {
          total: totalLeads,
          new: newLeads.length,
          inProgress: inProgressLeads.length,
          closed: closedLeads.length,
          previous: prevTotalLeads
        },
        vendors: vendorStats,
        period: {
          start: startOfMonthISO,
          end: endOfMonthISO,
          label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
      })
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to fetch stats',
        message: error.message 
      })
    };
  }
};

/**
 * GET /admin/analytics - Time series data for charts
 */
exports.getAnalytics = async (event) => {
  try {
    // Authenticate the request
    const authError = await authenticateRequest(event);
    if (authError) return authError;
    
    const user = event.requestContext?.authorizer || {};
    
    // Check admin role
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }
    
    const { period = 'week' } = event.queryStringParameters || {};
    
    console.log('Getting analytics data for period:', period);
    
    // Calculate date range based on period
    const now = new Date();
    const periods = {
      week: { days: 7, format: 'day' },
      month: { days: 30, format: 'day' },
      quarter: { days: 90, format: 'week' },
      year: { days: 365, format: 'month' }
    };
    
    const config = periods[period] || periods.week;
    const days = config.days;
    
    // Get all leads once
    const allLeadsResult = await dynamoDB.send(new ScanCommand({
      TableName: LEADS_TABLE
    }));
    
    const allLeads = allLeadsResult.Items || [];
    
    // Generate time series data
    const labels = [];
    const leadsData = [];
    const revenueData = [];
    const conversionData = [];
    
    // For weekly/monthly view, group by days
    if (period === 'week' || period === 'month') {
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Create label
        if (period === 'week') {
          labels.push(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]);
        } else {
          labels.push(date.getDate().toString());
        }
        
        // Filter leads for this date
        const dayLeads = allLeads.filter(lead => {
          const leadDate = new Date(lead.created_date || lead.timestamp);
          return leadDate.toDateString() === date.toDateString();
        });
        
        const closedDayLeads = dayLeads.filter(l => 
          l.disposition === 'Closed' || l.disposition === 'completed'
        );
        
        const dayRevenue = closedDayLeads.reduce((sum, lead) => 
          sum + (parseFloat(lead.lead_value) || 35), 0
        );
        
        const dayConversion = dayLeads.length > 0 ? 
          (closedDayLeads.length / dayLeads.length * 100) : 0;
        
        leadsData.push(dayLeads.length);
        revenueData.push(Math.round(dayRevenue));
        conversionData.push(Math.round(dayConversion * 10) / 10);
      }
    } else {
      // For quarterly/yearly view, group by weeks/months
      const groupSize = period === 'quarter' ? 7 : 30; // 7 days for quarter, 30 days for year
      const groupCount = Math.floor(days / groupSize);
      
      for (let i = groupCount - 1; i >= 0; i--) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - (i * groupSize));
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - groupSize + 1);
        
        // Create label
        if (period === 'quarter') {
          labels.push(`Week ${groupCount - i}`);
        } else {
          labels.push(startDate.toLocaleDateString('en-US', { month: 'short' }));
        }
        
        // Filter leads for this period
        const periodLeads = allLeads.filter(lead => {
          const leadDate = new Date(lead.created_date || lead.timestamp);
          return leadDate >= startDate && leadDate <= endDate;
        });
        
        const closedPeriodLeads = periodLeads.filter(l => 
          l.disposition === 'Closed' || l.disposition === 'completed'
        );
        
        const periodRevenue = closedPeriodLeads.reduce((sum, lead) => 
          sum + (parseFloat(lead.lead_value) || 35), 0
        );
        
        const periodConversion = periodLeads.length > 0 ? 
          (closedPeriodLeads.length / periodLeads.length * 100) : 0;
        
        leadsData.push(periodLeads.length);
        revenueData.push(Math.round(periodRevenue));
        conversionData.push(Math.round(periodConversion * 10) / 10);
      }
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        labels,
        datasets: {
          leads: leadsData,
          revenue: revenueData,
          conversion: conversionData
        },
        period,
        totalDataPoints: labels.length
      })
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to fetch analytics',
        message: error.message 
      })
    };
  }
}; 