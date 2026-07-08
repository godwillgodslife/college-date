import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'Accept': 'application/json',
      },
    },
  }
);

// Performance Profiling Wrapper
import { performanceMonitor } from '../utils/performanceMonitor';

if (performanceMonitor.isEnabled()) {
  const originalFrom = supabase.from;
  supabase.from = function(table) {
    const builder = originalFrom.apply(this, arguments);
    const originalThen = builder.then;
    builder.then = function(onfulfilled, onrejected) {
      const queryStartTime = performance.now();
      return originalThen.call(builder,
        (value) => {
          const duration = performance.now() - queryStartTime;
          performanceMonitor.recordDbQuery(table, builder.toString(), duration);
          if (onfulfilled) return onfulfilled(value);
          return value;
        },
        (reason) => {
          const duration = performance.now() - queryStartTime;
          performanceMonitor.recordDbQuery(table, builder.toString(), duration);
          if (onrejected) return onrejected(reason);
          throw reason;
        }
      );
    };
    return builder;
  };

  const originalRpc = supabase.rpc;
  supabase.rpc = function(name, params, options) {
    const builder = originalRpc.apply(this, arguments);
    const originalThen = builder.then;
    builder.then = function(onfulfilled, onrejected) {
      const queryStartTime = performance.now();
      return originalThen.call(builder,
        (value) => {
          const duration = performance.now() - queryStartTime;
          performanceMonitor.recordDbRpc(name, duration);
          if (onfulfilled) return onfulfilled(value);
          return value;
        },
        (reason) => {
          const duration = performance.now() - queryStartTime;
          performanceMonitor.recordDbRpc(name, duration);
          if (onrejected) return onrejected(reason);
          throw reason;
        }
      );
    };
    return builder;
  };
}
