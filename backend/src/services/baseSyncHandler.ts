import { SyncHandler, DataType } from '../types/sync';
import { SyncMetadataService } from './syncMetadata';

export abstract class BaseSyncHandler implements SyncHandler {
  abstract getDataType(): DataType;
  abstract fetchIncrementalData(lastSync: Date): Promise<any[]>;
  abstract transformData(rawData: any[]): Promise<any[]>;
  abstract upsertData(transformedData: any[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
  }>;

  async getLastSyncTimestamp(): Promise<Date> {
    return SyncMetadataService.getLastSyncTimestamp(this.getDataType());
  }

  async updateSyncMetadata(
    timestamp: Date, 
    count: number, 
    status: string, 
    errorMessage?: string
  ): Promise<void> {
    return SyncMetadataService.updateSyncMetadata(
      this.getDataType(),
      timestamp,
      count,
      status,
      errorMessage
    );
  }

  protected validateRequiredFields(data: any[], requiredFields: string[]): void {
    const missingFields: string[] = [];
    
    for (const record of data) {
      for (const field of requiredFields) {
        if (record[field] === undefined || record[field] === null) {
          missingFields.push(`${field} in record ${JSON.stringify(record)}`);
        }
      }
    }

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  protected logSyncProgress(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.getDataType()}] ${message}`, data || '');
  }

  protected handleApiError(error: any, operation: string): never {
    const errorMessage = `Error ${operation} for ${this.getDataType()}: ${error.message}`;
    this.logSyncProgress(`❌ ${errorMessage}`);
    throw new Error(errorMessage);
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        if (attempt < maxRetries) {
          this.logSyncProgress(`⚠️ Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
          await this.delay(delayMs * Math.pow(2, attempt - 1)); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected formatDateForOdoo(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  protected formatDateTimeForOdoo(date: Date): string {
    return date.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:mm:ss format
  }
} 