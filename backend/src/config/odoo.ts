// Fixed OdooClient with corrected parameter handling
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface OdooConfig {
  url: string;
  database: string;
  username: string;
  password: string;
}

export const odooConfig: OdooConfig = {
  url: process.env.ODOO_URL!,
  database: process.env.ODOO_DB!,
  username: process.env.ODOO_USER!,
  password: process.env.ODOO_PASSWORD!,
};

if (!odooConfig.url || !odooConfig.database || !odooConfig.username || !odooConfig.password) {
  console.warn('Missing Odoo configuration. Odoo sync features will be disabled.');
}

export class OdooClient {
  private sessionId: string = '';

  async login(): Promise<string> {
    try {
      const response = await axios.post(odooConfig.url, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'common',
          method: 'login',
          args: [odooConfig.database, odooConfig.username, odooConfig.password],
        },
      });

      if (response.data.result && typeof response.data.result === 'number') {
        this.sessionId = response.data.result.toString();
        return this.sessionId;
      } else {
        throw new Error('Odoo login failed');
      }
    } catch (error) {
      console.error('Odoo login error:', error);
      throw new Error('Failed to authenticate with Odoo');
    }
  }

  async call(model: string, method: string, domain: any[] = [], options: any = {}): Promise<any> {
    if (!this.sessionId) {
      await this.login();
    }

    try {
      // Construct the args array properly for Odoo's execute_kw method
      const args = [
        odooConfig.database,
        parseInt(this.sessionId),
        odooConfig.password,
        model,
        method,
        domain.length > 0 ? [domain] : [], // Domain should be wrapped in array for search methods
        options // Options object comes after domain
      ];

      const response = await axios.post(odooConfig.url, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: args,
        },
      });

      if (response.data.error) {
        throw new Error(`Odoo API error: ${response.data.error.data?.message || response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Odoo API call error:', error);
      throw error;
    }
  }

  // Helper method specifically for search_read calls
  async searchRead(model: string, domain: any[] = [], fields: string[] = [], options: any = {}): Promise<any> {
    const searchOptions = {
      fields: fields,
      ...options
    };
    
    return this.call(model, 'search_read', domain, searchOptions);
  }
}

export const odooClient = new OdooClient();
