// services/scheduledSync.ts
import cron from 'node-cron';
import axios from 'axios';
import { SyncOrchestrator } from './syncOrchestrator';
import { syncHandlers } from './odooSync';

export class ScheduledSyncService {
  private syncOrchestrator: SyncOrchestrator;
  private baseUrl: string;
  private authToken?: string;
  private cronTask?: any;

  constructor(baseUrl: string = 'http://localhost:3001', authToken?: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;

    // Initialize sync orchestrator
    this.syncOrchestrator = new SyncOrchestrator({
      maxRetries: 3,
      retryDelayMs: 1000,
      batchSize: 1000,
      parallelSyncs: 3
    });

    // Register sync handlers
    Object.values(syncHandlers).forEach(handler => {
      this.syncOrchestrator.registerHandler(handler as any);
    });
  }

  public startDirectScheduler() {
    this.cronTask = cron.schedule('20 2 * * *', async () => {
      console.log(`🚀 Starting scheduled sync at ${new Date().toISOString()}`);
      await this.runDirectSync();
    }, {
      timezone: "Asia/Karachi" // Adjust timezone as needed
    });
  }

  private async runDirectSync() {
    try {
      const results = await this.syncOrchestrator.runAllSyncs();

      const summary = {
        totalSyncs: results.length,
        successfulSyncs: results.filter(r => r.success).length,
        totalRecordsProcessed: results.reduce((sum, r) => sum + r.recordsProcessed, 0),
        totalRecordsInserted: results.reduce((sum, r) => sum + r.recordsInserted, 0),
        totalRecordsUpdated: results.reduce((sum, r) => sum + r.recordsUpdated, 0),
        totalRecordsSkipped: results.reduce((sum, r) => sum + r.recordsSkipped, 0),
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
        errors: results.flatMap(r => r.errors)
      };

      console.log('✅ Scheduled sync completed:', {
        success: summary.successfulSyncs === summary.totalSyncs,
        message: `Sync completed: ${summary.successfulSyncs}/${summary.totalSyncs} successful`,
        summary
      });

      await this.notifyAdmin(summary);

    } catch (error: any) {
      console.error('❌ Scheduled sync failed:', error.message);

    }
  }

  private async runApiSync() {
    try {
      console.log('📊 Running API sync...');

      const headers: any = {
        'Content-Type': 'application/json',
      };

      // Add auth header if token is provided
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await axios.post(
        `${this.baseUrl}/api/sync/all`,
        {},
        {
          headers,
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('✅ Scheduled sync completed:', response.data);

      // Optional: Send notification about sync results
      await this.notifyAdmin(response.data);

    } catch (error: any) {
      console.error('❌ Scheduled sync failed:', error.message);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }

      // Optional: Send error notification
      await this.notifyAdminError(error);
    }
  }

  // Optional: Admin notification methods
  private async notifyAdmin(summary: any) {
    // Implement your notification logic here
    // Examples: send email, Slack message, Discord webhook, etc.
    console.log('📧 Notification: Sync completed', summary);
  }

  private async notifyAdminError(error: any) {
    // Implement your error notification logic here
    console.error('📧 Error notification: Sync failed', error.message);
  }

  // Method to stop the scheduler
  public stopScheduler() {
    cron.getTasks().forEach(task => task.stop());
    console.log('⏹️ Scheduled sync service stopped');
  }

  // Method to run sync immediately (for testing)
  public async runSyncNow() {
    console.log('🚀 Running sync immediately...');
    await this.runDirectSync();
  }

  // Method to get next scheduled run time
  public getNextRun() {
    const tasks = cron.getTasks();
    if (tasks.size > 0) {
      const task = Array.from(tasks.values())[0];
      // node-cron does not provide next run time directly, so return null or implement with cron-parser if needed
      return null;
    }
    return null;
  }
}

// Export singleton instance
export const scheduledSyncService = new ScheduledSyncService();