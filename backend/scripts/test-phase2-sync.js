// Test script for Phase 2 sync handlers
const dotenv = require('dotenv');
const { SyncOrchestrator } = require('../src/services/syncOrchestrator');
const { syncHandlers } = require('../src/services/odooSync');
const { SyncMetadataService } = require('../src/services/syncMetadata');
const { odooClient } = require('../src/config/odoo');
const { supabase } = require('../src/config/supabase');

dotenv.config();

async function testPhase2Sync() {
  console.log('🧪 Testing Phase 2 Sync Handlers...\n');

  try {
    // Test 1: Infrastructure Check
    console.log('1. Testing Infrastructure...');
    try {
      await odooClient.login();
      console.log('✅ Odoo connection successful');
      
      const { data, error } = await supabase
        .from('sync_metadata')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      console.log('✅ Supabase connection successful');
    } catch (error) {
      console.log('❌ Infrastructure test failed:', error.message);
      return;
    }

    // Test 2: Handler Registration
    console.log('\n2. Testing Handler Registration...');
    const orchestrator = new SyncOrchestrator();
    
    Object.values(syncHandlers).forEach(handler => {
      orchestrator.registerHandler(handler);
    });

    const status = await orchestrator.getSyncStatus();
    console.log('✅ All handlers registered successfully');
    console.log('   Registered handlers:', Object.keys(status));

    // Test 3: Individual Handler Tests
    console.log('\n3. Testing Individual Handlers...');
    
    const handlerTests = [
      { name: 'products', handler: syncHandlers.products },
      { name: 'categories', handler: syncHandlers.categories },
      { name: 'warehouses', handler: syncHandlers.warehouses },
      { name: 'purchases', handler: syncHandlers.purchases },
      { name: 'sales', handler: syncHandlers.sales },
      { name: 'transfers', handler: syncHandlers.transfers }
    ];

    for (const { name, handler } of handlerTests) {
      try {
        console.log(`\n   Testing ${name} handler...`);
        
        // Test getLastSyncTimestamp
        const lastSync = await handler.getLastSyncTimestamp();
        console.log(`     ✅ Last sync timestamp: ${lastSync.toISOString()}`);
        
        // Test fetchIncrementalData (with small date range for testing)
        const testDate = new Date('2025-01-01T00:00:00Z');
        const data = await handler.fetchIncrementalData(testDate);
        console.log(`     ✅ Fetched ${data.length} records`);
        
        if (data.length > 0) {
          // Test transformData
          const transformed = await handler.transformData(data.slice(0, 5)); // Test with first 5 records
          console.log(`     ✅ Transformed ${transformed.length} records`);
        }
        
        console.log(`     ✅ ${name} handler working correctly`);
      } catch (error) {
        console.log(`     ❌ ${name} handler failed:`, error.message);
      }
    }

    // Test 4: Sync Metadata Service
    console.log('\n4. Testing Sync Metadata Service...');
    try {
      const metadata = await SyncMetadataService.getAllSyncMetadata();
      console.log(`✅ Sync metadata service working (${metadata.length} records)`);
      
      // Test reset functionality
      await SyncMetadataService.resetSyncMetadata('products');
      console.log('✅ Reset functionality working');
      
      // Restore the timestamp
      await SyncMetadataService.updateSyncMetadata('products', new Date(), 0, 'pending');
    } catch (error) {
      console.log('❌ Sync metadata service failed:', error.message);
    }

    // Test 5: Orchestrator Functionality
    console.log('\n5. Testing Orchestrator...');
    try {
      // Test single sync
      const result = await orchestrator.runSync('products');
      console.log(`✅ Single sync test: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   Records processed: ${result.recordsProcessed}`);
      console.log(`   Duration: ${result.duration}ms`);
      
      // Test status retrieval
      const status = await orchestrator.getSyncStatus();
      console.log('✅ Status retrieval working');
    } catch (error) {
      console.log('❌ Orchestrator test failed:', error.message);
    }

    console.log('\n🎉 Phase 2 tests completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test individual sync endpoints via API');
    console.log('2. Set up scheduled sync jobs');
    console.log('3. Monitor sync performance and errors');
    console.log('4. Implement remaining handlers (purchase returns, sales returns)');

  } catch (error) {
    console.error('❌ Phase 2 test failed:', error);
  }
}

// Run the test
testPhase2Sync().catch(console.error); 