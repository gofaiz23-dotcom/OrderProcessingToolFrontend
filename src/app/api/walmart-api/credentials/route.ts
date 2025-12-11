import { NextRequest, NextResponse } from 'next/server';

type WalmartTokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
};

/**
 * Parse XML response from Walmart API
 */
function parseWalmartTokenXML(xmlString: string): WalmartTokenResponse | null {
  try {
    // Extract accessToken
    const accessTokenMatch = xmlString.match(/<accessToken>(.*?)<\/accessToken>/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;

    // Extract tokenType
    const tokenTypeMatch = xmlString.match(/<tokenType>(.*?)<\/tokenType>/);
    const tokenType = tokenTypeMatch ? tokenTypeMatch[1] : 'Bearer';

    // Extract expiresIn
    const expiresInMatch = xmlString.match(/<expiresIn>(.*?)<\/expiresIn>/);
    const expiresIn = expiresInMatch ? parseInt(expiresInMatch[1], 10) : 900;

    if (!accessToken) {
      return null;
    }

    return {
      accessToken,
      tokenType,
      expiresIn,
    };
  } catch (error) {
    console.error('Error parsing Walmart token XML:', error);
    return null;
  }
}

/**
 * POST /api/walmart-api/credentials
 * Get Walmart OAuth token
 */
export async function POST(request: NextRequest) {
  try {
    // Get credentials from environment variables
    const username = process.env.WALMART_CLIENT_ID;
    const password = process.env.WALMART_CLIENT_SECRET;

    if (!username || !password) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Walmart credentials not configured. Please set WALMART_CLIENT_ID and WALMART_CLIENT_SECRET in .env.local' 
        },
        { status: 500 }
      );
    }

    // Generate unique correlation ID
    const correlationId = `walmart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Prepare request body
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
    });

    // Make request to Walmart API
    const response = await fetch('https://marketplace.walmartapis.com/v3/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'WM_SVC.NAME': 'Walmart Marketplace',
        'WM_QOS.CORRELATION_ID': correlationId,
        // Basic Authentication
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
      body: body.toString(),
    });

    // Read response as text (XML format)
    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Walmart API error: ${response.status} ${response.statusText}`,
          error: responseText,
        },
        { status: response.status }
      );
    }

    // Parse XML response
    const tokenData = parseWalmartTokenXML(responseText);

    if (!tokenData) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to parse Walmart token response',
          error: responseText,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tokenData,
    });
  } catch (error) {
    console.error('Error fetching Walmart token:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch Walmart token',
      },
      { status: 500 }
    );
  }
}

