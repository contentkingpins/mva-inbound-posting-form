const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  region: 'us-east-1'
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const VENDORS_TABLE = 'Vendors';

async function seedVendors() {
  const vendors = [
    { vendor_code: 'VENDOR1', name: 'Acme Corporation' },
    { vendor_code: 'VENDOR2', name: 'Widget Industries' },
    { vendor_code: 'VENDOR3', name: 'Global Sales Partners' },
    { vendor_code: 'VENDOR4', name: 'Lead Generation Inc.' },
    { vendor_code: 'VENDOR5', name: 'Top Marketing Solutions' }
  ];

  console.log('Starting vendor seed...');
  
  for (const vendor of vendors) {
    const params = {
      TableName: VENDORS_TABLE,
      Item: vendor
    };

    try {
      await dynamoDB.put(params).promise();
      console.log(`Successfully added vendor: ${vendor.vendor_code}`);
    } catch (error) {
      console.error(`Failed to add vendor ${vendor.vendor_code}:`, error);
    }
  }

  console.log('Vendor seed completed!');
}

// Run the seed function
seedVendors().catch(error => {
  console.error('Seeding error:', error);
}); 