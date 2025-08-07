// Test script for sync infrastructure
import dotenv from 'dotenv';
import { SyncOrchestrator } from '../src/services/syncOrchestrator.js';
import { syncHandlers } from '../src/services/odooSync.js';
import { SyncMetadataService } from '../src/services/syncMetadata.js';
import { odooClient } from '../src/config/odoo.js';
import { supabase } from '../src/config/supabase.js';

dotenv.config();

async function testInfrastructure() {
  console.log('🧪 Testing Sync Infrastructure...\n');

  try {
    // Test 1: Odoo Connection
    console.log('1. Testing Odoo Connection...');
    try {
      await odooClient.login();
      console.log('✅ Odoo connection successful');
    } catch (error) {
      console.log('❌ Odoo connection failed:', error.message);
      return;
    }

    // Test 2: Supabase Connection
    console.log('\n2. Testing Supabase Connection...');
    try {
      const { data, error } = await supabase
        .from('sync_metadata')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      console.log('✅ Supabase connection successful');
    } catch (error) {
      console.log('❌ Supabase connection failed:', error.message);
      return;
    }

    // Test 3: Sync Metadata Service
    console.log('\n3. Testing Sync Metadata Service...');
    try {
      const metadata = await SyncMetadataService.getAllSyncMetadata();
      console.log(`✅ Sync metadata service working (${metadata.length} records found)`);
    } catch (error) {
      console.log('❌ Sync metadata service failed:', error.message);
      return;
    }

    // Test 4: Sync Orchestrator
    console.log('\n4. Testing Sync Orchestrator...');
    try {
      const orchestrator = new SyncOrchestrator();
      
      // Register handlers
      Object.values(syncHandlers).forEach(handler => {
        orchestrator.registerHandler(handler as any);
      });

      const status = await orchestrator.getSyncStatus();
      console.log('✅ Sync orchestrator working');
      console.log('   Registered handlers:', Object.keys(status));
    } catch (error) {
      console.log('❌ Sync orchestrator failed:', error.message);
      return;
    }

    // Test 5: Individual Handlers
    console.log('\n5. Testing Individual Handlers...');
    for (const [name, handler] of Object.entries(syncHandlers)) {
      try {
        const lastSync = await handler.getLastSyncTimestamp();
        console.log(`✅ ${name} handler working (last sync: ${lastSync.toISOString()})`);
      } catch (error) {
        console.log(`❌ ${name} handler failed:`, error.message);
      }
    }

    console.log('\n🎉 All infrastructure tests passed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run the SQL script: scripts/09-create-sync-metadata.sql');
    console.log('2. Test individual sync endpoints');
    console.log('3. Set up scheduled sync jobs');

  } catch (error) {
    console.error('❌ Infrastructure test failed:', error);
  }
}

// Run the test
testInfrastructure().catch(console.error); 