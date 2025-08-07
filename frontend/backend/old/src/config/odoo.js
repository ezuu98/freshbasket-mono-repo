import axios from "axios"
import { logger } from "../utils/logger.js"

class OdooAPI {
  constructor() {
    this.baseURL = process.env.ODOO_URL
    this.database = process.env.ODOO_DATABASE
    this.username = process.env.ODOO_USERNAME
    this.password = process.env.ODOO_PASSWORD
    this.uid = null
    this.sessionId = null
  }

  async authenticate() {
    try {
      logger.info(`Attempting to authenticate with Odoo at ${this.baseURL}`)

      const response = await axios.post(this.baseURL, {
        jsonrpc: "2.0",
        method: "call",
        params: {
          db: this.database,
          login: this.username,
          password: this.password,
        },
      })

      if (response.data.result && response.data.result.uid) {
        this.uid = response.data.result.uid
        this.sessionId = response.data.result.session_id
        logger.info(`Odoo authentication successful. UID: ${this.uid}`)
        return true
      } else {
        throw new Error("Authentication failed - no UID returned")
      }
    } catch (error) {
      logger.error("Odoo authentication error:", error.message)
      throw error
    }
  }

  async callMethod(model, method, args = [], kwargs = {}) {
    if (!this.uid) {
      await this.authenticate()
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/web/dataset/call_kw`,
        {
          jsonrpc: "2.0",
          method: "call",
          params: {
            model,
            method,
            args,
            kwargs: {
              context: {},
              ...kwargs,
            },
          },
        },
        {
          headers: {
            Cookie: `session_id=${this.sessionId}`,
          },
        },
      )

      if (response.data.error) {
        throw new Error(`Odoo API Error: ${response.data.error.message}`)
      }

      return response.data.result
    } catch (error) {
      logger.error(`Odoo API call failed for ${model}.${method}:`, error.message)
      throw error
    }
  }

  // Get 100 products with essential fields
  async getProducts(limit = 100) {
    try {
      logger.info(`Fetching ${limit} products from Odoo`)

      const products = await this.callMethod("product.product", "search_read", [[["active", "=", true]]], {
        fields: [
          "id",
          "name",
          "default_code", // barcode
          "barcode",
          "categ_id", // category
        ],
        limit: limit,
        order: "create_date desc",
      })

      logger.info(`Successfully retrieved ${products.length} products from Odoo`)

      // Log first few products for debugging
      if (products.length > 0) {
        logger.info(
          "Sample products:",
          products.slice(0, 3).map((p) => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode || p.default_code,
            category: p.categ_id?.[1],
          })),
        )
      }

      return products
    } catch (error) {
      logger.error("Error fetching products from Odoo:", error)
      throw error
    }
  }

  // Get categories
  async getCategories() {
    try {
      logger.info("Fetching categories from Odoo")

      const categories = await this.callMethod("product.category", "search_read", [[]], {
        fields: ["id", "name", "parent_id", "complete_name"],
      })

      logger.info(`Retrieved ${categories.length} categories from Odoo`)
      return categories
    } catch (error) {
      logger.error("Error fetching categories from Odoo:", error)
      throw error
    }
  }

  // Get warehouses
  async getWarehouses() {
    try {
      logger.info("Fetching warehouses from Odoo")

      const warehouses = await this.callMethod("stock.warehouse", "search_read", [[]], {
        fields: ["id", "name", "code"],
      })

      logger.info(`Retrieved ${warehouses.length} warehouses from Odoo`)
      return warehouses
    } catch (error) {
      logger.error("Error fetching warehouses from Odoo:", error)
      throw error
    }
  }

  // Get stock quantities for products in all warehouses
  async getStockQuantities(productIds) {
    try {
      logger.info(`Fetching stock quantities for ${productIds.length} products`)

      const quants = await this.callMethod(
        "stock.quant",
        "search_read",
        [
          [
            ["product_id", "in", productIds],
            ["location_id.usage", "=", "internal"],
          ],
        ],
        {
          fields: ["product_id", "location_id", "quantity", "reserved_quantity"],
        },
      )

      // Get location details to map to warehouses
      const locationIds = [...new Set(quants.map((q) => q.location_id[0]))]

      let locations = []
      if (locationIds.length > 0) {
        locations = await this.callMethod("stock.location", "search_read", [[["id", "in", locationIds]]], {
          fields: ["id", "name", "warehouse_id"],
        })
      }

      logger.info(`Retrieved ${quants.length} stock quants and ${locations.length} locations`)
      return { quants, locations }
    } catch (error) {
      logger.error("Error fetching stock quantities from Odoo:", error)
      throw error
    }
  }

  // Main method to get all required data
  async getInventoryData() {
    try {
      logger.info("Starting to fetch complete inventory data from Odoo")

      // Get products (100 limit)
      const products = await this.getProducts(100)

      if (products.length === 0) {
        logger.warn("No products found in Odoo")
        return {
          products: [],
          categories: [],
          warehouses: [],
          quants: [],
          locations: [],
        }
      }

      const productIds = products.map((p) => p.id)

      // Get categories
      const categories = await this.getCategories()

      // Get warehouses
      const warehouses = await this.getWarehouses()

      // Get stock quantities
      const { quants, locations } = await this.getStockQuantities(productIds)

      logger.info(
        `Complete inventory data retrieved: ${products.length} products, ${categories.length} categories, ${warehouses.length} warehouses, ${quants.length} stock records`,
      )

      return {
        products,
        categories,
        warehouses,
        quants,
        locations,
      }
    } catch (error) {
      logger.error("Failed to get inventory data from Odoo:", error)
      throw error
    }
  }
}

export const odooAPI = new OdooAPI()
