import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';

// This should match the Map in the get-signed-url route
// In a real app, you'd use a database or Redis for this
// This is just for demonstration purposes
declare global {
  var tokenMappings: Map<string, { key: string, expiry: number }>;
}

// Initialize global token mappings if it doesn't exist
if (!global.tokenMappings) {
  global.tokenMappings = new Map();
}

// Local storage paths
const TIFF_STORAGE_PATH = path.join(process.cwd(), 'public', 'temp_tiff');
const PNG_STORAGE_PATH = path.join(process.cwd(), 'public', 'temp_png');

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    
    // Check if token exists and is valid
    const mapping = global.tokenMappings.get(token);
    if (!mapping) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 403 }
      );
    }
    
    // Check if token is expired
    if (mapping.expiry < Date.now()) {
      global.tokenMappings.delete(token);
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 403 }
      );
    }
    
    const { key } = mapping;
    
    // Determine file extension and appropriate folder
    const fileExt = path.extname(key).toLowerCase();
    const storagePath = fileExt === '.tiff' || fileExt === '.tif' 
      ? TIFF_STORAGE_PATH 
      : PNG_STORAGE_PATH;
    
    // Combine storage path with key (filename)
    const filePath = path.join(storagePath, path.basename(key));
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type
    let contentType = 'application/octet-stream'; // Default
    if (fileExt === '.tiff' || fileExt === '.tif') {
      contentType = 'image/tiff';
    } else if (fileExt === '.png') {
      contentType = 'image/png';
    } else if (fileExt === '.jpg' || fileExt === '.jpeg') {
      contentType = 'image/jpeg';
    }
    
    // Return the file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(key)}"`,
      },
    });
  } catch (error) {
    console.error('Error serving local file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
