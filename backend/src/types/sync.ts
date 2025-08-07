export interface SyncMetadata {
  id: number;
  data_type: string;
  last_sync_timestamp: string | null;
  last_sync_count: number;
  sync_status: 'pending' | 'in_progress' | 'success' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type DataType = 
  | 'products' 
  | 'categories' 
  | 'warehouses' 
  | 'purchases' 
  | 'purchase_returns' 
  | 'sales' 
  | 'sales_returns' 
  | 'transfers' 
  | 'manufacturing' 
  | 'wastages' 
  | 'stock_movements';

export interface SyncResult {
  success: boolean;
  dataType: DataType;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  duration: number;
  timestamp: string;
}

export interface SyncHandler {
  getDataType(): DataType;
  getLastSyncTimestamp(): Promise<Date>;
  fetchIncrementalData(lastSync: Date): Promise<any[]>;
  transformData(rawData: any[]): Promise<any[]>;
  upsertData(transformedData: any[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
  }>;
  updateSyncMetadata(timestamp: Date, count: number, status: string, errorMessage?: string): Promise<void>;
}

export interface SyncOrchestratorConfig {
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  parallelSyncs: number;
} 