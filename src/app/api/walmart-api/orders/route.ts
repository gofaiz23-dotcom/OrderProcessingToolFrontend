import { NextRequest, NextResponse } from 'next/server';

// Build API URL helper
const buildApiUrl = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

/**
 * GET /api/walmart-api/orders
 * Get Walmart orders via backend API
 * Requires WM_SEC.ACCESS_TOKEN header
 */
export async function GET(request: NextRequest) {
  try {
    // Get access token from header
    const accessToken = request.headers.get('WM_SEC.ACCESS_TOKEN') || 
                       request.headers.get('wm_sec.access_token') ||
                       request.headers.get('x-walmart-token');

    if (!accessToken) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'WM_SEC.ACCESS_TOKEN header is required. Please provide your Walmart access token.',
        },
        { status: 400 }
      );
    }

    // Get query parameters from request
    const searchParams = request.nextUrl.searchParams;
    const queryParams = new URLSearchParams();
    
    // Copy all query parameters to pass to backend
    searchParams.forEach((value, key) => {
      queryParams.append(key, value);
    });

    // Build backend URL with query parameters
    const queryString = queryParams.toString();
    const backendUrl = buildApiUrl(`/walmart/orders${queryString ? `?${queryString}` : ''}`);

    // Call backend API
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'WM_SEC.ACCESS_TOKEN': accessToken,
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

    // Backend returns: { success: true, message: "...", data: { ... } }
    // The data contains the parsed JSON from XML (with namespaces like ns3:list)
    // Backend already converted XML to JSON, so use it directly
    const backendData = data.data || {};
    
    // Log the structure for debugging
    console.log('🔍 Backend orders data structure:', {
      keys: Object.keys(backendData),
      hasList: !!backendData['ns3:list'] || !!backendData.list,
      fullData: JSON.stringify(backendData).substring(0, 500), // First 500 chars
    });
    
    // Handle both namespace (ns3:list) and non-namespace (list) structures
    const listData = backendData['ns3:list'] || backendData.list || {};
    const elements = listData['ns3:elements'] || listData.elements || {};
    const orders = elements['ns3:order'] || elements.order || [];
    const meta = listData['ns3:meta'] || listData.meta || {};
    
    // Ensure orders is an array (XML parser might return single object if only one order)
    const ordersArray = Array.isArray(orders) ? orders : (orders ? [orders] : []);
    
    console.log('📦 Extracted orders from backend JSON:', {
      ordersCount: ordersArray.length,
      firstOrderKeys: ordersArray[0] ? Object.keys(ordersArray[0]) : [],
      meta: {
        totalCount: meta['ns3:totalCount'] || meta.totalCount,
        limit: meta['ns3:limit'] || meta.limit,
        nextCursor: meta['ns3:nextCursor'] || meta.nextCursor,
      },
    });
    
    return NextResponse.json({
      success: true,
      orders: ordersArray,
      pagination: {
        page: parseInt(searchParams.get('page') || '1', 10),
        limit: parseInt(searchParams.get('limit') || '100', 10),
        totalCount: meta['ns3:totalCount'] || meta.totalCount || 0,
        totalPages: Math.ceil((meta['ns3:totalCount'] || meta.totalCount || 0) / parseInt(searchParams.get('limit') || '100', 10)),
        hasNextPage: !!(meta['ns3:nextCursor'] || meta.nextCursor),
        hasPreviousPage: parseInt(searchParams.get('page') || '1', 10) > 1,
      },
      data: backendData, // Include full response for flexibility
    });
  } catch (error) {
    console.error('Error fetching Walmart orders via backend:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch Walmart orders',
      },
      { status: 500 }
    );
  }
}
