

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

const supabaseUrl = 'https://jcjkomunegqtjbamfila.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjamtvbXVuZWdxdGpiYW1maWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDA4MTksImV4cCI6MjA3NTc3NjgxOX0.J1KnqllEQ_nSoNaTwhst3xIQ60o9VAPAzq492qnE4rI';

/**
 * Custom fetch implementation to intercept 401 Unauthorized responses.
 * If a 401 is caught, it's likely the user's session is no longer valid
 * (e.g., expired refresh token). This function will clear the session
 * from localStorage and redirect to the login page, providing a robust
 * auto-sign-out mechanism.
 */
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await fetch(input, init);

    // Correctly handle URL object by checking input type, as it has a '.href' property instead of '.url'.
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.href);

    // We only intercept 401s for API calls, not for the auth endpoints themselves,
    // to avoid potential loops or unintended side effects during login/signup.
    if (response.status === 401 && !url.includes('/auth/v1')) {
        console.warn('Caught 401 Unauthorized response. Forcing sign-out.');

        // Clear all Supabase auth tokens from localStorage.
        Object.keys(localStorage)
            .filter(key => key.startsWith('sb-') && key.includes('-auth-token'))
            .forEach(key => localStorage.removeItem(key));
            
        // Redirect to the login page. Using window.location.href for a hard redirect.
        // The app uses HashRouter, so we need to include the hash.
        window.location.href = '/#/login';
    }

    return response;
};


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: customFetch,
    },
});