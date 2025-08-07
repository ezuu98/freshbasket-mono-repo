import axios from "axios";
import { logger } from "../utils/logger.js"

const { ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD } = process.env;

export async function checkOdooStatus(req, res) {
  try {
    const response = await axios.post(ODOO_URL, {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "login",
        args: [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD],
      },
    });

    const ODOO_UID = response.data.result;

    if (!ODOO_UID) {
      logger.warn("Failed to get UID from Odoo");
      return res.status(500).json({ success: false, message: "Failed to connect to Odoo" });
    }

    logger.info("Odoo connection successful");
    return res.json({ success: true });
  } catch (error) {
    logger.error("Odoo connection failed", error.message);
    return res.status(500).json({
      success: false,
      message: "Odoo connection error",
      error: error.message,
    });
  }
}
