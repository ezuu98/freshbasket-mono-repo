import { supabase } from '../config/supabase';
import { SyncMetadata, DataType } from '../types/sync';

export class SyncMetadataService {
  static async getLastSyncTimestamp(dataType: DataType): Promise<Date> {
    try {
      const { data, error } = await supabase
        .from('sync_metadata')
        .select('last_sync_timestamp')
        .eq('data_type', dataType)
        .single();

      if (error) {
        console.error(`Error fetching last sync timestamp for ${dataType}:`, error);
        // Return epoch date if no sync has been done
        return new Date('1970-01-01T00:00:00Z');
      }

      return data?.last_sync_timestamp 
        ? new Date(data.last_sync_timestamp)
        : new Date('1970-01-01T00:00:00Z');
    } catch (error) {
      console.error(`Error in getLastSyncTimestamp for ${dataType}:`, error);
      return new Date('1970-01-01T00:00:00Z');
    }
  }

  static async updateSyncMetadata(
    dataType: DataType,
    timestamp: Date,
    count: number,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('sync_metadata')
        .update({
          last_sync_timestamp: timestamp.toISOString(),
          last_sync_count: count,
          sync_status: status,
          error_message: errorMessage || null,
          updated_at: new Date().toISOString()
        })
        .eq('data_type', dataType);

      if (error) {
        console.error(`Error updating sync metadata for ${dataType}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`Error in updateSyncMetadata for ${dataType}:`, error);
      throw error;
    }
  }

  static async getSyncStatus(dataType: DataType): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('sync_metadata')
        .select('sync_status')
        .eq('data_type', dataType)
        .single();

      if (error) {
        console.error(`Error fetching sync status for ${dataType}:`, error);
        return 'unknown';
      }

      return data?.sync_status || 'unknown';
    } catch (error) {
      console.error(`Error in getSyncStatus for ${dataType}:`, error);
      return 'unknown';
    }
  }

  static async getAllSyncMetadata(): Promise<SyncMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('sync_metadata')
        .select('*')
        .order('data_type');

      if (error) {
        console.error('Error fetching all sync metadata:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllSyncMetadata:', error);
      throw error;
    }
  }

  static async resetSyncMetadata(dataType: DataType): Promise<void> {
    try {
      const { error } = await supabase
        .from('sync_metadata')
        .update({
          last_sync_timestamp: null,
          last_sync_count: 0,
          sync_status: 'pending',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('data_type', dataType);

      if (error) {
        console.error(`Error resetting sync metadata for ${dataType}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`Error in resetSyncMetadata for ${dataType}:`, error);
      throw error;
    }
  }
} 