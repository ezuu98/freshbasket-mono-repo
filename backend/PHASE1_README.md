# Phase 1: Sync Infrastructure Setup

## 🎯 Overview

Phase 1 establishes the foundational infrastructure for incremental data synchronization between Odoo and Supabase. This phase focuses on creating a robust, scalable, and maintainable sync system.

## 📁 Files Created/Modified

### Core Infrastructure
- `src/types/sync.ts` - TypeScript interfaces and types for sync operations
- `src/services/syncMetadata.ts` - Service for managing sync metadata and timestamps
- `src/services/syncOrchestrator.ts` - Main orchestrator for coordinating sync operations
- `src/services/baseSyncHandler.ts` - Base class for all sync handlers
- `src/services/odooSync.ts` - Odoo-specific sync handlers (products, categories)

### Database Schema
- `scripts/09-create-sync-metadata.sql` - SQL script to create sync metadata table

### Controllers & Routes
- `src/controllers/sync.ts` - Updated sync controller with new endpoints
- `src/routes/sync.ts` - Updated routes for sync operations

### Testing
- `scripts/test-sync-infrastructure.js` - Test script to verify infrastructure

## 🏗️ Architecture

### Sync Metadata Management
```sql
CREATE TABLE sync_metadata (
  id SERIAL PRIMARY KEY,
  data_type VARCHAR(50) UNIQUE NOT NULL,
  last_sync_timestamp TIMESTAMP WITH TIME ZONE,
  last_sync_count INTEGER DEFAULT 0,
  sync_status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Handler Pattern
Each data type has its own handler implementing:
- `fetchIncrementalData()` - Get data from Odoo since last sync
- `transformData()` - Transform Odoo data to Supabase format
- `upsertData()` - Insert/update data in Supabase
- `getLastSyncTimestamp()` - Get last sync time
- `updateSyncMetadata()` - Update sync status

### Orchestrator Features
- **Incremental Sync**: Only sync data modified since last sync
- **Batch Processing**: Process data in configurable batches
- **Retry Logic**: Exponential backoff for failed operations
- **Parallel Processing**: Run multiple syncs concurrently
- **Error Handling**: Comprehensive error tracking and recovery
- **Monitoring**: Detailed logging and status tracking

## 🚀 Getting Started

### 1. Setup Database
```bash
# Run the sync metadata table creation script
psql -h your-supabase-host -U your-user -d your-database -f scripts/09-create-sync-metadata.sql
```

### 2. Configure Environment
Ensure your `.env` file has all required variables:
```env
# Odoo Configuration
ODOO_URL=https://your-odoo-instance.com
ODOO_DB=your_database
ODOO_USER=your_username
ODOO_PASSWORD=your_password

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Test Infrastructure
```bash
# Run the infrastructure test
node scripts/test-sync-infrastructure.js
```

### 4. Test Sync Endpoints
```bash
# Test individual syncs
curl -X POST http://localhost:3001/api/sync/products
curl -X POST http://localhost:3001/api/sync/categories

# Test sync all
curl -X POST http://localhost:3001/api/sync/all

# Check sync status
curl -X GET http://localhost:3001/api/sync/status
```

## 📊 API Endpoints

### Sync Operations
- `POST /api/sync/products` - Sync products from Odoo
- `POST /api/sync/categories` - Sync categories from Odoo
- `POST /api/sync/all` - Sync all registered data types

### Monitoring
- `GET /api/sync/status` - Get sync status and metadata
- `POST /api/sync/reset/:dataType` - Reset sync metadata for data type
- `GET /api/sync/health` - Health check endpoint

## 🔧 Configuration

### Sync Orchestrator Config
```typescript
const config = {
  maxRetries: 3,           // Maximum retry attempts
  retryDelayMs: 1000,      // Base delay between retries
  batchSize: 1000,         // Records per batch
  parallelSyncs: 3         // Concurrent sync operations
};
```

### Data Types Supported
- `products` - Product catalog from Odoo
- `categories` - Product categories from Odoo
- `warehouses` - Warehouse locations (planned)
- `purchases` - Purchase orders (planned)
- `sales` - Sales orders (planned)
- `transfers` - Stock transfers (planned)

## 📈 Monitoring & Logging

### Sync Status Tracking
- `pending` - Sync not yet started
- `in_progress` - Sync currently running
- `success` - Sync completed successfully
- `failed` - Sync failed with errors

### Logging Features
- Timestamped log messages
- Progress tracking for each operation
- Error details with context
- Performance metrics (duration, record counts)

## 🔄 Incremental Sync Logic

### How It Works
1. **Get Last Sync Time**: Retrieve timestamp from `sync_metadata` table
2. **Fetch Incremental Data**: Query Odoo for records modified since last sync
3. **Transform Data**: Convert Odoo format to Supabase format
4. **Upsert Data**: Insert new records, update existing ones
5. **Update Metadata**: Store new sync timestamp and status

### Deduplication Strategy
- **Master Data**: Use `odoo_id` as unique identifier
- **Transactional Data**: Use combination of fields for uniqueness
- **Conflict Resolution**: Always update with latest Odoo data

## 🛡️ Error Handling

### Retry Logic
- Exponential backoff (1s, 2s, 4s)
- Configurable max retries
- Separate retry queues per data type

### Error Recovery
- Partial failure handling
- Transaction rollback on errors
- Detailed error logging
- Manual intervention capabilities

## 📋 Next Steps (Phase 2)

1. **Implement Remaining Handlers**
   - Warehouses sync handler
   - Purchases sync handler
   - Sales sync handler
   - Transfers sync handler

2. **Add Advanced Features**
   - Scheduled sync jobs
   - Webhook notifications
   - Data validation rules
   - Performance optimization

3. **Production Deployment**
   - Environment-specific configs
   - Monitoring dashboards
   - Alert systems
   - Backup strategies

## 🧪 Testing

### Infrastructure Test
```bash
node scripts/test-sync-infrastructure.js
```

### Manual Testing
```bash
# Test products sync
curl -X POST http://localhost:3001/api/sync/products

# Check results
curl -X GET http://localhost:3001/api/sync/status
```

## 📝 Notes

- All sync operations are idempotent
- Failed syncs can be retried safely
- Sync metadata provides audit trail
- Infrastructure is designed for horizontal scaling
- Error handling prevents data corruption

## 🆘 Troubleshooting

### Common Issues
1. **Odoo Connection Failed**: Check Odoo credentials and network
2. **Supabase Connection Failed**: Verify Supabase URL and keys
3. **Missing Sync Metadata**: Run the SQL script to create tables
4. **Handler Registration Failed**: Check handler implementation

### Debug Commands
```bash
# Check sync metadata
curl -X GET http://localhost:3001/api/sync/status

# Reset sync for testing
curl -X POST http://localhost:3001/api/sync/reset/products

# Test individual components
node scripts/test-sync-infrastructure.js
``` 