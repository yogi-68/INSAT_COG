import { NextResponse } from 'next/server';
import * as path from 'path';
import * as crypto from 'crypto';

// Store temporary token mappings
const tokenMappings = new Map<string, { key: string, expiry: number }>();

// Local storage paths
const TIFF_STORAGE_PATH = '/temp_tiff';
const PNG_STORAGE_PATH = '/temp_png';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      );
    }

    // Determine file extension and appropriate folder
    const fileExt = path.extname(key).toLowerCase();

    // Create a unique token for this file
    const token = crypto.randomBytes(16).toString('hex');
    
    // Set expiry time (1 hour from now)
    const expiry = Date.now() + 3600 * 1000;
    
    // Store the mapping
    tokenMappings.set(token, { key, expiry });
    
    // Clean up expired tokens
    for (const [t, data] of tokenMappings.entries()) {
      if (data.expiry < Date.now()) {
        tokenMappings.delete(t);
      }
    }

    // Create a URL that includes the token
    const baseUrl = new URL(request.url).origin;
    const signedUrl = `${baseUrl}/api/local-file/${token}`;

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error('Error generating local file access URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate file access URL' },
      { status: 500 }
    );
  }
}
