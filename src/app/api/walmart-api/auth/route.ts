import { NextRequest, NextResponse } from 'next/server';

// Build API URL helper
const buildApiUrl = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

/**
 * GET /api/walmart-api/auth
 * Get Walmart OAuth token via backend API
 */
export async function GET(request: NextRequest) {
  try {
    // Call backend API to get Walmart token
    const backendUrl = buildApiUrl('/walmart/token');
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || `Backend API error: ${response.status} ${response.statusText}`,
          error: data.error,
        },
        { status: response.status }
      );
    }

    // Backend returns: { success: true, message: "...", data: { accessToken, tokenType, expiresIn } }
    return NextResponse.json({
      success: true,
      data: data.data,
    });
  } catch (error) {
    console.error('Error fetching Walmart token via backend:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch Walmart token',
      },
      { status: 500 }
    );
  }
}

