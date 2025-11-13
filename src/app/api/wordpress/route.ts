import { NextResponse } from 'next/server';

// Only allow specific paths to prevent API abuse
const ALLOWED_PATHS = [
  'posts',
  'pages',
  'media',
  'categories',
  'tags'
  // Add other WordPress endpoints you need
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return NextResponse.json(
      { error: 'Missing path parameter' },
      { status: 400 }
    );
  }

  // Validate the requested path
  const pathSegments = path.split('/').filter(Boolean);
  const basePath = pathSegments[0];
  
  if (!basePath || !ALLOWED_PATHS.includes(basePath)) {
    return NextResponse.json(
      { error: 'Invalid path parameter' },
      { status: 400 }
    );
  }

  // Only allow specific query parameters to prevent injection
  const allowedParams = [
    'per_page',
    'page',
    'search',
    'slug',
    'include',
    '_embed',
    // Add other allowed parameters as needed
  ];
  
  const params: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'path' && allowedParams.includes(key)) {
      params[key] = value;
    }
  }

  // Use NEXT_PUBLIC_WORDPRESS_URL as the primary variable, with fallback to NEXT_PUBLIC_WORDPRESS_API_URL
  const WORDPRESS_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 
                           process.env.NEXT_PUBLIC_WORDPRESS_API_URL;
  
  if (!WORDPRESS_API_URL) {
    console.error('WordPress API URL is not configured. Please set NEXT_PUBLIC_WORDPRESS_URL or NEXT_PUBLIC_WORDPRESS_API_URL');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'WordPress API URL is not configured',
        status: 500
      },
      { status: 500 }
    );
  }

  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${WORDPRESS_API_URL}/wp-json/wp/v2/${path}${queryString ? `?${queryString}` : ''}`;
    
    console.log('WordPress API Request:', {
      url,
      method: 'GET',
      params,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });
    
    const responseTime = Date.now() - startTime;
    
    // Log response details
    console.log('WordPress API Response:', {
      url,
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        url,
        error: errorText
      });
      throw new Error(`WordPress API request failed with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('WordPress API Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError'
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch from WordPress API',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
