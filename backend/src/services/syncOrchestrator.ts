import { SyncHandler, SyncResult, SyncOrchestratorConfig, DataType } from '../types/sync';
import { SyncMetadataService } from './syncMetadata';

export class SyncOrchestrator {
  private config: SyncOrchestratorConfig;
  private handlers: Map<DataType, SyncHandler>;

  constructor(config: Partial<SyncOrchestratorConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      batchSize: 1000,
      parallelSyncs: 3,
      ...config
    };
    this.handlers = new Map();
  }

  registerHandler(handler: SyncHandler): void {
    this.handlers.set(handler.getDataType(), handler);
  }

  async runSync(dataType: DataType): Promise<SyncResult> {
    const startTime = Date.now();
    const handler = this.handlers.get(dataType);
    
    if (!handler) {
      throw new Error(`No handler registered for data type: ${dataType}`);
    }

    const result: SyncResult = {
      success: false,
      dataType,
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString()
    };

    try {
      console.log(`🔄 Starting sync for ${dataType}...`);
      
      // Update status to in_progress
      await SyncMetadataService.updateSyncMetadata(
        dataType,
        new Date(),
        0,
        'in_progress'
      );

      // Get last sync timestamp
      const lastSync = await handler.getLastSyncTimestamp();
      console.log(`📅 Last sync for ${dataType}: ${lastSync.toISOString()}`);

      // Fetch incremental data
      const rawData = await this.retryOperation(
        () => handler.fetchIncrementalData(lastSync),
        `fetching ${dataType} data`
      );

      if (rawData.length === 0) {
        console.log(`✅ No new data to sync for ${dataType}`);
        result.success = true;
        result.recordsSkipped = 0;
        await SyncMetadataService.updateSyncMetadata(
          dataType,
          new Date(),
          0,
          'success'
        );
        return result;
      }

      console.log(`📊 Found ${rawData.length} records to sync for ${dataType}`);

      // Transform data
      const transformedData = await this.retryOperation(
        () => handler.transformData(rawData),
        `transforming ${dataType} data`
      );

      // Upsert data in batches
      const batchResults = await this.processBatches(
        transformedData,
        handler,
        this.config.batchSize
      );

      // Update result
      result.recordsProcessed = rawData.length;
      result.recordsInserted = batchResults.inserted;
      result.recordsUpdated = batchResults.updated;
      result.recordsSkipped = batchResults.skipped;
      result.success = true;

      // Update sync metadata
      await SyncMetadataService.updateSyncMetadata(
        dataType,
        new Date(),
        result.recordsProcessed,
        'success'
      );

      console.log(`✅ Successfully synced ${dataType}: ${result.recordsInserted} inserted, ${result.recordsUpdated} updated, ${result.recordsSkipped} skipped`);

    } catch (error: any) {
      console.error(`❌ Error syncing ${dataType}:`, error);
      result.errors.push(error.message);
      
      // Update sync metadata with error
      await SyncMetadataService.updateSyncMetadata(
        dataType,
        new Date(),
        result.recordsProcessed,
        'failed',
        error.message
      );
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  async runAllSyncs(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    const dataTypes = Array.from(this.handlers.keys());

    console.log(`🚀 Starting sync for all data types: ${dataTypes.join(', ')}`);

    // Run syncs in parallel with concurrency limit
    const chunks = this.chunkArray(dataTypes, this.config.parallelSyncs);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(dataType => this.runSync(dataType));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    const successCount = results.filter(r => r.success).length;
    const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
    
    console.log(`🎉 Sync completed: ${successCount}/${results.length} successful, ${totalRecords} total records processed`);

    return results;
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (retryCount < this.config.maxRetries) {
        console.log(`⚠️ Retrying ${operationName} (attempt ${retryCount + 1}/${this.config.maxRetries})`);
        await this.delay(this.config.retryDelayMs * Math.pow(2, retryCount));
        return this.retryOperation(operation, operationName, retryCount + 1);
      }
      throw error;
    }
  }

  private async processBatches(
    data: any[],
    handler: SyncHandler,
    batchSize: number
  ): Promise<{ inserted: number; updated: number; skipped: number }> {
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    const batches = this.chunkArray(data, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} records)`);
      
      const batchResult = await this.retryOperation(
        () => handler.upsertData(batch),
        `upserting batch ${i + 1}`
      );

      totalInserted += batchResult.inserted;
      totalUpdated += batchResult.updated;
      totalSkipped += batchResult.skipped;
    }

    return { inserted: totalInserted, updated: totalUpdated, skipped: totalSkipped };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getSyncStatus(): Promise<{ [key in DataType]?: string }> {
    const status: { [key in DataType]?: string } = {};
    
    for (const dataType of this.handlers.keys()) {
      status[dataType] = await SyncMetadataService.getSyncStatus(dataType);
    }
    
    return status;
  }

  async resetSync(dataType: DataType): Promise<void> {
    await SyncMetadataService.resetSyncMetadata(dataType);
    console.log(`🔄 Reset sync metadata for ${dataType}`);
  }
} 