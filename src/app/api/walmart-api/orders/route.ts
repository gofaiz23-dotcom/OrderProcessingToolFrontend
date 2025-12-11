import { NextRequest, NextResponse } from 'next/server';

/**
 * Parse XML response from Walmart Orders API
 */
function parseWalmartOrdersXML(xmlString: string): {
  orders: any[];
  totalCount: number;
  limit: number;
} {
  try {
    // Extract totalCount
    const totalCountMatch = xmlString.match(/<ns3:totalCount>(\d+)<\/ns3:totalCount>/);
    const totalCount = totalCountMatch ? parseInt(totalCountMatch[1], 10) : 0;

    // Extract limit
    const limitMatch = xmlString.match(/<ns3:limit>(\d+)<\/ns3:limit>/);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : 100;

    // Extract all orders
    const orderMatches = xmlString.matchAll(/<ns3:order>([\s\S]*?)<\/ns3:order>/g);
    const orders: any[] = [];

    for (const orderMatch of orderMatches) {
      const orderXml = orderMatch[1];
      const order: any = {};

      // Extract purchaseOrderId
      const purchaseOrderIdMatch = orderXml.match(/<ns3:purchaseOrderId>([\s\S]*?)<\/ns3:purchaseOrderId>/);
      if (purchaseOrderIdMatch) order.purchaseOrderId = purchaseOrderIdMatch[1].trim();

      // Extract customerOrderId
      const customerOrderIdMatch = orderXml.match(/<ns3:customerOrderId>([\s\S]*?)<\/ns3:customerOrderId>/);
      if (customerOrderIdMatch) order.customerOrderId = customerOrderIdMatch[1].trim();

      // Extract customerEmailId
      const customerEmailIdMatch = orderXml.match(/<ns3:customerEmailId>([\s\S]*?)<\/ns3:customerEmailId>/);
      if (customerEmailIdMatch) order.customerEmailId = customerEmailIdMatch[1].trim();

      // Extract orderDate
      const orderDateMatch = orderXml.match(/<ns3:orderDate>([\s\S]*?)<\/ns3:orderDate>/);
      if (orderDateMatch) order.orderDate = orderDateMatch[1].trim();

      // Extract shipping info
      const shippingInfoMatch = orderXml.match(/<ns3:shippingInfo>([\s\S]*?)<\/ns3:shippingInfo>/);
      if (shippingInfoMatch) {
        const shippingXml = shippingInfoMatch[1];
        order.shippingInfo = {
          phone: shippingXml.match(/<ns3:phone>([\s\S]*?)<\/ns3:phone>/)?.at(1)?.trim() || '',
          estimatedDeliveryDate: shippingXml.match(/<ns3:estimatedDeliveryDate>([\s\S]*?)<\/ns3:estimatedDeliveryDate>/)?.at(1)?.trim() || '',
          estimatedShipDate: shippingXml.match(/<ns3:estimatedShipDate>([\s\S]*?)<\/ns3:estimatedShipDate>/)?.at(1)?.trim() || '',
          methodCode: shippingXml.match(/<ns3:methodCode>([\s\S]*?)<\/ns3:methodCode>/)?.at(1)?.trim() || '',
        };

        // Extract postal address
        const postalAddressMatch = shippingXml.match(/<ns3:postalAddress>([\s\S]*?)<\/ns3:postalAddress>/);
        if (postalAddressMatch) {
          const addressXml = postalAddressMatch[1];
          order.shippingInfo.postalAddress = {
            name: addressXml.match(/<ns3:name>([\s\S]*?)<\/ns3:name>/)?.at(1)?.trim() || '',
            address1: addressXml.match(/<ns3:address1>([\s\S]*?)<\/ns3:address1>/)?.at(1)?.trim() || '',
            city: addressXml.match(/<ns3:city>([\s\S]*?)<\/ns3:city>/)?.at(1)?.trim() || '',
            state: addressXml.match(/<ns3:state>([\s\S]*?)<\/ns3:state>/)?.at(1)?.trim() || '',
            postalCode: addressXml.match(/<ns3:postalCode>([\s\S]*?)<\/ns3:postalCode>/)?.at(1)?.trim() || '',
            country: addressXml.match(/<ns3:country>([\s\S]*?)<\/ns3:country>/)?.at(1)?.trim() || '',
            addressType: addressXml.match(/<ns3:addressType>([\s\S]*?)<\/ns3:addressType>/)?.at(1)?.trim() || '',
          };
        }
      }

      // Extract order lines
      const orderLinesMatch = orderXml.match(/<ns3:orderLines>([\s\S]*?)<\/ns3:orderLines>/);
      if (orderLinesMatch) {
        const orderLinesXml = orderLinesMatch[1];
        const orderLineMatches = orderLinesXml.matchAll(/<ns3:orderLine>([\s\S]*?)<\/ns3:orderLine>/g);
        order.orderLines = [];

        for (const orderLineMatch of orderLineMatches) {
          const orderLineXml = orderLineMatch[1];
          const orderLine: any = {};

          // Extract lineNumber
          const lineNumberMatch = orderLineXml.match(/<ns3:lineNumber>(\d+)<\/ns3:lineNumber>/);
          if (lineNumberMatch) orderLine.lineNumber = parseInt(lineNumberMatch[1], 10);

          // Extract item
          const itemMatch = orderLineXml.match(/<ns3:item>([\s\S]*?)<\/ns3:item>/);
          if (itemMatch) {
            const itemXml = itemMatch[1];
            orderLine.item = {
              productName: itemXml.match(/<ns3:productName>([\s\S]*?)<\/ns3:productName>/)?.at(1)?.trim() || '',
              sku: itemXml.match(/<ns3:sku>([\s\S]*?)<\/ns3:sku>/)?.at(1)?.trim() || '',
              condition: itemXml.match(/<ns3:condition>([\s\S]*?)<\/ns3:condition>/)?.at(1)?.trim() || '',
            };
          }

          // Extract charges
          const chargesMatch = orderLineXml.match(/<ns3:charges>([\s\S]*?)<\/ns3:charges>/);
          if (chargesMatch) {
            const chargesXml = chargesMatch[1];
            const chargeMatch = chargesXml.match(/<ns3:charge>([\s\S]*?)<\/ns3:charge>/);
            if (chargeMatch) {
              const chargeXml = chargeMatch[1];
              const chargeAmountMatch = chargeXml.match(/<ns3:chargeAmount>([\s\S]*?)<\/ns3:chargeAmount>/);
              if (chargeAmountMatch) {
                const amountXml = chargeAmountMatch[1];
                orderLine.chargeAmount = {
                  currency: amountXml.match(/<ns3:currency>([\s\S]*?)<\/ns3:currency>/)?.at(1)?.trim() || 'USD',
                  amount: amountXml.match(/<ns3:amount>([\s\S]*?)<\/ns3:amount>/)?.at(1)?.trim() || '0',
                };
              }

              const taxMatch = chargeXml.match(/<ns3:tax>([\s\S]*?)<\/ns3:tax>/);
              if (taxMatch) {
                const taxXml = taxMatch[1];
                const taxAmountMatch = taxXml.match(/<ns3:taxAmount>([\s\S]*?)<\/ns3:taxAmount>/);
                if (taxAmountMatch) {
                  const taxAmountXml = taxAmountMatch[1];
                  orderLine.tax = {
                    currency: taxAmountXml.match(/<ns3:currency>([\s\S]*?)<\/ns3:currency>/)?.at(1)?.trim() || 'USD',
                    amount: taxAmountXml.match(/<ns3:amount>([\s\S]*?)<\/ns3:amount>/)?.at(1)?.trim() || '0',
                  };
                }
              }
            }
          }

          // Extract quantity
          const quantityMatch = orderLineXml.match(/<ns3:orderLineQuantity>([\s\S]*?)<\/ns3:orderLineQuantity>/);
          if (quantityMatch) {
            const quantityXml = quantityMatch[1];
            orderLine.quantity = {
              unitOfMeasurement: quantityXml.match(/<ns3:unitOfMeasurement>([\s\S]*?)<\/ns3:unitOfMeasurement>/)?.at(1)?.trim() || '',
              amount: quantityXml.match(/<ns3:amount>(\d+)<\/ns3:amount>/)?.at(1)?.trim() || '1',
            };
          }

          // Extract status
          const statusMatch = orderLineXml.match(/<ns3:orderLineStatuses>([\s\S]*?)<\/ns3:orderLineStatuses>/);
          if (statusMatch) {
            const statusXml = statusMatch[1];
            const orderLineStatusMatch = statusXml.match(/<ns3:orderLineStatus>([\s\S]*?)<\/ns3:orderLineStatus>/);
            if (orderLineStatusMatch) {
              const statusLineXml = orderLineStatusMatch[1];
              orderLine.status = statusLineXml.match(/<ns3:status>([\s\S]*?)<\/ns3:status>/)?.at(1)?.trim() || '';

              // Extract tracking info
              const trackingInfoMatch = statusLineXml.match(/<ns3:trackingInfo>([\s\S]*?)<\/ns3:trackingInfo>/);
              if (trackingInfoMatch) {
                const trackingXml = trackingInfoMatch[1];
                orderLine.trackingInfo = {
                  carrierName: trackingXml.match(/<ns3:carrierName>([\s\S]*?)<\/ns3:carrierName>/)?.at(1)?.trim() || '',
                  carrier: trackingXml.match(/<ns3:carrier>([\s\S]*?)<\/ns3:carrier>/)?.at(1)?.trim() || '',
                  trackingNumber: trackingXml.match(/<ns3:trackingNumber>([\s\S]*?)<\/ns3:trackingNumber>/)?.at(1)?.trim() || '',
                  trackingURL: trackingXml.match(/<ns3:trackingURL>([\s\S]*?)<\/ns3:trackingURL>/)?.at(1)?.trim() || '',
                };
              }
            }
          }

          order.orderLines.push(orderLine);
        }
      }

      // Extract shipNode
      const shipNodeMatch = orderXml.match(/<ns3:shipNode>([\s\S]*?)<\/ns3:shipNode>/);
      if (shipNodeMatch) {
        const shipNodeXml = shipNodeMatch[1];
        order.shipNode = {
          type: shipNodeXml.match(/<ns3:type>([\s\S]*?)<\/ns3:type>/)?.at(1)?.trim() || '',
          name: shipNodeXml.match(/<ns3:name>([\s\S]*?)<\/ns3:name>/)?.at(1)?.trim() || '',
          id: shipNodeXml.match(/<ns3:id>([\s\S]*?)<\/ns3:id>/)?.at(1)?.trim() || '',
        };
      }

      orders.push(order);
    }

    return { orders, totalCount, limit };
  } catch (error) {
    console.error('Error parsing Walmart orders XML:', error);
    return { orders: [], totalCount: 0, limit: 100 };
  }
}

/**
 * Transform Walmart order to our Order type format
 */
function transformWalmartOrderToOrder(walmartOrder: any, index: number): any {
  // Get first order line for main product info
  const firstOrderLine = walmartOrder.orderLines?.[0];
  const shippingInfo = walmartOrder.shippingInfo;
  const postalAddress = shippingInfo?.postalAddress;

  // Build jsonb object matching our format
  const jsonb: Record<string, unknown> = {
    'PO#': walmartOrder.purchaseOrderId || '',
    'Order#': walmartOrder.customerOrderId || '',
    'Customer Order ID': walmartOrder.customerOrderId || '',
    'Purchase Order ID': walmartOrder.purchaseOrderId || '',
    'Order Date': walmartOrder.orderDate || '',
    'Customer Email': walmartOrder.customerEmailId || '',
    'Customer Name': postalAddress?.name || '',
    'Customer Phone Number': shippingInfo?.phone || '',
    'Shipping Address': postalAddress 
      ? `${postalAddress.name}, ${postalAddress.address1}, ${postalAddress.city}, ${postalAddress.state} ${postalAddress.postalCode}, Phone: ${shippingInfo?.phone || ''}`
      : '',
    'Address': postalAddress?.address1 || '',
    'City': postalAddress?.city || '',
    'State': postalAddress?.state || '',
    'Zip': postalAddress?.postalCode || '',
    'Country': postalAddress?.country || '',
    'SKU': firstOrderLine?.item?.sku || '',
    'Product Name': firstOrderLine?.item?.productName || '',
    'Item Description': firstOrderLine?.item?.productName || '',
    'Quantity': firstOrderLine?.quantity?.amount || '1',
    'Qty': firstOrderLine?.quantity?.amount || '1',
    'Item Cost': firstOrderLine?.chargeAmount?.amount || '0',
    'Price': firstOrderLine?.chargeAmount?.amount || '0',
    'Tax': firstOrderLine?.tax?.amount || '0',
    'Status': firstOrderLine?.status || '',
    'Carrier': firstOrderLine?.trackingInfo?.carrier || '',
    'Tracking Number': firstOrderLine?.trackingInfo?.trackingNumber || '',
    'Tracking Url': firstOrderLine?.trackingInfo?.trackingURL || '',
    'Shipping Method': shippingInfo?.methodCode || '',
    'Estimated Ship Date': shippingInfo?.estimatedShipDate || '',
    'Estimated Delivery Date': shippingInfo?.estimatedDeliveryDate || '',
    'Ship Node': walmartOrder.shipNode?.name || '',
    'Ship Node ID': walmartOrder.shipNode?.id || '',
    'Condition': firstOrderLine?.item?.condition || 'New',
  };

  return {
    id: parseInt(walmartOrder.purchaseOrderId || `${Date.now()}${index}`, 10),
    orderOnMarketPlace: 'Walmart',
    jsonb,
    createdAt: walmartOrder.orderDate || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * GET /api/walmart-api/orders
 * Get Walmart orders from Walmart API
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from header
    const token = request.headers.get('x-walmart-token');
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Walmart token not provided. Please ensure token is available.' 
        },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = new URLSearchParams();
    
    // Add all query parameters
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    // Generate unique correlation ID
    const correlationId = `walmart-orders-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Build URL with query parameters
    const url = `https://marketplace.walmartapis.com/v3/orders${params.toString() ? `?${params.toString()}` : ''}`;

    // Make request to Walmart API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'WM_SVC.NAME': 'Walmart Marketplace',
        'WM_QOS.CORRELATION_ID': correlationId,
        'WM_SEC.ACCESS_TOKEN': token,
      },
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
    const { orders: walmartOrders, totalCount, limit } = parseWalmartOrdersXML(responseText);

    // Transform to our Order format
    const orders = walmartOrders.map((order, index) => transformWalmartOrderToOrder(order, index));

    // Calculate pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('limit') || String(limit), 10);
    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit: pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching Walmart orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch Walmart orders',
      },
      { status: 500 }
    );
  }
}

