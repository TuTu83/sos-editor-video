-- Add uploader device identifier to videos
ALTER TABLE videos ADD COLUMN uploader_device_id TEXT;
