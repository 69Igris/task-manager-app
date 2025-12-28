// Script to delete all existing notifications (run once to clean up old data)
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

async function cleanNotifications() {
  const client = new MongoClient(envVars.DATABASE_URL);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('Notification');
    
    // Delete all notifications
    const result = await collection.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} old notifications`);
    console.log('Database is now clean. New notifications will have the expiresAt field.');
    
  } catch (error) {
    console.error('Error cleaning notifications:', error);
  } finally {
    await client.close();
  }
}

cleanNotifications();
