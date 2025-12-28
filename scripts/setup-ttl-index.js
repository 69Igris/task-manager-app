// Script to set TTL on the notification_ttl index
// Run this once: node scripts/setup-ttl-index.js

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
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

console.log('Using DATABASE_URL:', envVars.DATABASE_URL?.substring(0, 30) + '...');

async function setupTTLIndex() {
  const client = new MongoClient(envVars.DATABASE_URL);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('Notification');
    
    // Drop existing index if it exists
    try {
      await collection.dropIndex('notification_ttl');
      console.log('Dropped existing notification_ttl index');
    } catch (error) {
      console.log('No existing notification_ttl index to drop');
    }
    
    // Create TTL index that expires documents at the expiresAt time
    await collection.createIndex(
      { expiresAt: 1 },
      { name: 'notification_ttl', expireAfterSeconds: 0 }
    );
    
    console.log('✅ TTL index created successfully!');
    console.log('Notifications will automatically be deleted when expiresAt time is reached (6 hours after creation)');
    
  } catch (error) {
    console.error('Error setting up TTL index:', error);
  } finally {
    await client.close();
  }
}

setupTTLIndex();
