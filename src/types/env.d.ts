namespace NodeJS {
  interface ProcessEnv {
    // Next.js built-in environment variables
    NODE_ENV: 'development' | 'production' | 'test';
    
    // Application configuration
    NEXT_PUBLIC_SITE_URL: string;
    NEXT_PUBLIC_API_BASE_URL: string;
    
    // WordPress configuration
    WORDPRESS_API_URL: string;
    NEXT_PUBLIC_WORDPRESS_URL: string;
    NEXT_PUBLIC_WORDPRESS_API_URL: string;
    
    // reCAPTCHA (if used)
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: string;
    RECAPTCHA_SECRET_KEY: string;
    
    // Analytics (if used)
    NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;
    
    // Other environment variables
    [key: string]: string | undefined;
  }
}
