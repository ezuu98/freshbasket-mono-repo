-- Create sync metadata table for tracking sync operations
CREATE TABLE IF NOT EXISTS sync_metadata (
  id SERIAL PRIMARY KEY,
  data_type VARCHAR(50) UNIQUE NOT NULL,
  last_sync_timestamp TIMESTAMP WITH TIME ZONE,
  last_sync_count INTEGER DEFAULT 0,
  sync_status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial sync metadata records for each data type
INSERT INTO sync_metadata (data_type, sync_status) VALUES
  ('products', 'pending'),
  ('categories', 'pending'),
  ('warehouses', 'pending'),
  ('purchases', 'pending'),
  ('purchase_returns', 'pending'),
  ('sales', 'pending'),
  ('sales_returns', 'pending'),
  ('transfers', 'pending'),
  ('manufacturing', 'pending'),
  ('wastages', 'pending'),
  ('stock_movements', 'pending')
ON CONFLICT (data_type) DO NOTHING;

-- Create function to update sync metadata
CREATE OR REPLACE FUNCTION update_sync_metadata(
  p_data_type VARCHAR(50),
  p_timestamp TIMESTAMP WITH TIME ZONE,
  p_count INTEGER,
  p_status VARCHAR(20),
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE sync_metadata 
  SET 
    last_sync_timestamp = p_timestamp,
    last_sync_count = p_count,
    sync_status = p_status,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE data_type = p_data_type;
END;
$$ LANGUAGE plpgsql;

-- Create function to get last sync timestamp
CREATE OR REPLACE FUNCTION get_last_sync_timestamp(p_data_type VARCHAR(50))
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  last_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT last_sync_timestamp INTO last_timestamp
  FROM sync_metadata 
  WHERE data_type = p_data_type;
  
  RETURN COALESCE(last_timestamp, '1970-01-01 00:00:00 UTC'::TIMESTAMP WITH TIME ZONE);
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_metadata_data_type ON sync_metadata(data_type);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_status ON sync_metadata(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_updated_at ON sync_metadata(updated_at); 