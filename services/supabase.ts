import { createClient } from "@supabase/supabase-js";
import { Database } from "../types";

const supabaseUrl = "https://jcjkomunegqtjbamfila.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjamtvbXVuZWdxdGpiYW1maWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDA4MTksImV4cCI6MjA3NTc3NjgxOX0.J1KnqllEQ_nSoNaTwhst3xIQ60o9VAPAzq492qnE4rI";

const customFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const response = await fetch(input, init);

  const url =
    typeof input === "string"
      ? input
      : input instanceof Request
      ? input.url
      : input.href;

  if (response.status === 401 && !url.includes("/auth/v1")) {
    console.warn("Caught 401 Unauthorized response. Forcing sign-out.");

    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") && key.includes("-auth-token"))
      .forEach((key) => localStorage.removeItem(key));

    window.location.href = "/#/login";
  }
  return response;
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
