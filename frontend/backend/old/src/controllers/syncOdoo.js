import { fetchProductsFromOdoo, transformProducts } from "../services/syncDB.service.js";

export async function syncInventoryFromOdoo (req, res) {
  try {
    const rawProducts = await fetchProductsFromOdoo();
    const transformedProducts = transformProducts(rawProducts);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const product of transformedProducts) {
      try {
        if (!product.barcode) {
          console.log(`⚠️ Skipping product without barcode: ${product.product_name}`);
          continue;
        }

        const exists = await db.findInventoryByBarcode(product.barcode);
        if (exists) continue;

        const result = await db.createInventoryItem(product);
        results.push(result);
        successCount++;
      } catch (err) {
        errorCount++;
        results.push({ error: err.message, product: product.product_name });
        console.error(`❌ Error creating ${product.product_name}:`, err.message);
      }
    }

    console.log(`📊 Sync Summary: ${successCount} success, ${errorCount} errors`);

    return res.json({
      success: true,
      message: "Products synced successfully",
      summary: {
        total: transformedProducts.length,
        successful: successCount,
        errors: errorCount,
      },
      data: results,
    });
  } catch (err) {
    console.error("❌ Sync Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Product sync error",
      error: err.message,
    });
  }
};
