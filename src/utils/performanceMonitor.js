/**
 * Production-safe Performance Monitoring utility.
 * Captures startup, transition, rendering, database, API, image, and native bridge metrics.
 * Disabled by default in production, enabled via dev-mode, query param, or local storage.
 */

class PerformanceMonitor {
  constructor() {
    this.enabled = false;
    this.metrics = {
      startup: null,
      tti: null,
      transitions: [],
      dbQueries: [],
      rpcs: [],
      fetches: [],
      images: [],
      bridgeCalls: [],
      longTasks: [],
      lcp: null
    };

    this.currentTransition = null;
    this.checkEnabledState();
    
    if (this.enabled) {
      this.initObservers();
      this.initGlobalWrappers();
    }
  }

  checkEnabledState() {
    if (typeof window === 'undefined') return;

    const isDev = import.meta.env.DEV;
    const hasParam = window.location.search.includes('enable-profiling=1');
    const hasStorage = window.localStorage.getItem('enable_profiling') === 'true';

    this.enabled = !!(isDev || hasParam || hasStorage);
  }

  isEnabled() {
    return this.enabled;
  }

  initObservers() {
    if (typeof window === 'undefined' || !this.enabled) return;

    // 1. Long Tasks (>50 ms)
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordLongTask(entry.duration, entry.startTime);
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Ignored if not supported by browser
    }

    // 2. Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = {
          duration: lastEntry.startTime,
          element: lastEntry.element?.tagName || 'unknown'
        };
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // Ignored if not supported by browser
    }
  }

  initGlobalWrappers() {
    if (typeof window === 'undefined' || !this.enabled) return;

    // 1. Intercept window.fetch for API request latency
    const originalFetch = window.fetch;
    const self = this;
    window.fetch = async function(...args) {
      const startTime = performance.now();
      try {
        const response = await originalFetch.apply(this, args);
        const duration = performance.now() - startTime;
        self.recordFetch(args[0], duration, response.status);
        return response;
      } catch (err) {
        const duration = performance.now() - startTime;
        self.recordFetch(args[0], duration, 'Error');
        throw err;
      }
    };

    // 2. Intercept Capacitor Bridge calls
    // Defer check to after page load in case window.Capacitor is loaded asynchronously
    setTimeout(() => {
      if (window.Capacitor) {
        // Intercept native callbacks
        const originalFromNative = window.Capacitor.fromNative;
        if (typeof originalFromNative === 'function') {
          window.Capacitor.fromNative = function(result) {
            try {
              const callbackId = result?.callbackId;
              if (callbackId && window.__capacitor_calls && window.__capacitor_calls[callbackId]) {
                const callInfo = window.__capacitor_calls[callbackId];
                const duration = performance.now() - callInfo.startTime;
                self.recordBridgeCall(callInfo.pluginId, callInfo.methodName, duration);
                delete window.__capacitor_calls[callbackId];
              }
            } catch (e) {
              console.warn('[Perf] Capacitor response intercept error:', e);
            }
            return originalFromNative.apply(this, arguments);
          };
        }

        // Intercept native calls
        const originalToNative = window.Capacitor.toNative;
        if (typeof originalToNative === 'function') {
          window.Capacitor.toNative = function(pluginId, methodName, callId, options) {
            try {
              window.__capacitor_calls = window.__capacitor_calls || {};
              window.__capacitor_calls[callId] = {
                pluginId,
                methodName,
                startTime: performance.now()
              };
            } catch (e) {
              console.warn('[Perf] Capacitor request intercept error:', e);
            }
            return originalToNative.apply(this, arguments);
          };
        }
      }
    }, 100);
  }

  // Record metrics
  recordLongTask(duration, startTime) {
    const entry = { type: 'JavaScript Long Task (>50ms)', name: 'Main Thread Block', duration, timestamp: Date.now() };
    this.metrics.longTasks.push(entry);
    
    // Associate with current transition if active
    if (this.currentTransition && !this.currentTransition.ended) {
      this.currentTransition.longTasks = this.currentTransition.longTasks || [];
      this.currentTransition.longTasks.push(entry);
    }
  }

  recordFetch(url, duration, status) {
    const cleanUrl = typeof url === 'string' ? url.split('?')[0] : String(url);
    const entry = { type: 'API Request', name: `Fetch: ${cleanUrl}`, duration, status, timestamp: Date.now() };
    this.metrics.fetches.push(entry);

    if (this.currentTransition && !this.currentTransition.ended) {
      this.currentTransition.fetches.push(entry);
    }
  }

  recordBridgeCall(pluginId, methodName, duration) {
    const entry = { type: 'Capacitor Bridge', name: `Native: ${pluginId}.${methodName}`, duration, timestamp: Date.now() };
    this.metrics.bridgeCalls.push(entry);

    if (this.currentTransition && !this.currentTransition.ended) {
      this.currentTransition.bridgeCalls.push(entry);
    }
  }

  recordDbQuery(table, query, duration) {
    const entry = { type: 'Supabase Query', name: `DB Query: ${table}`, query, duration, timestamp: Date.now() };
    this.metrics.dbQueries.push(entry);

    if (this.currentTransition && !this.currentTransition.ended) {
      this.currentTransition.dbQueries.push(entry);
    }
  }

  recordDbRpc(name, duration) {
    const entry = { type: 'Supabase RPC', name: `RPC: ${name}`, duration, timestamp: Date.now() };
    this.metrics.rpcs.push(entry);

    if (this.currentTransition && !this.currentTransition.ended) {
      this.currentTransition.rpcs.push(entry);
    }
  }

  recordImageLoad(src, duration) {
    const cleanSrc = typeof src === 'string' ? src.split('/').pop().split('?')[0] : 'Image';
    const entry = { type: 'Image Load', name: `Image: ${cleanSrc}`, duration, timestamp: Date.now() };
    this.metrics.images.push(entry);

    if (this.currentTransition && !this.currentTransition.ended) {
      this.currentTransition.images.push(entry);
    }
  }

  // Lifecycle of a route transition
  startRouteTransition(route) {
    if (!this.enabled) return;

    // End any lingering transition
    if (this.currentTransition && !this.currentTransition.ended) {
      this.finalizeTransition();
    }

    this.currentTransition = {
      name: route,
      startTime: performance.now(),
      dbQueries: [],
      rpcs: [],
      fetches: [],
      images: [],
      bridgeCalls: [],
      longTasks: [],
      renderDuration: 0,
      ended: false,
      settled: false
    };
  }

  endRouteTransition(route, renderDuration) {
    if (!this.enabled || !this.currentTransition) return;
    if (this.currentTransition.name !== route) return;

    this.currentTransition.renderDuration = renderDuration;
    this.currentTransition.ended = true;

    // Wait a brief settling period (500ms) for late requests / images triggered by the first render to finish,
    // then print the navigation summary report.
    setTimeout(() => {
      if (this.currentTransition && this.currentTransition.name === route && !this.currentTransition.settled) {
        this.finalizeTransition();
      }
    }, 500);
  }

  finalizeTransition() {
    if (!this.currentTransition) return;

    const t = this.currentTransition;
    t.settled = true;
    
    // If cold startup hasn't been set, set it now
    if (this.metrics.startup === null) {
      this.metrics.startup = performance.now();
      this.metrics.tti = this.metrics.startup; // TTI is when first screen is interactive
    }

    const totalInteractive = performance.now() - t.startTime;
    t.totalInteractiveTime = totalInteractive;

    this.metrics.transitions.push(t);
    this.printNavigationReport(t);
  }

  printNavigationReport(t) {
    console.log(`%c[Performance Log] Navigation to ${t.name} completed`, 'color: #6C63FF; font-weight: bold; font-size: 13px;');
    console.log(`${t.name}: ${t.renderDuration.toFixed(1)} ms`);

    if (t.fetches.length > 0) {
      t.fetches.forEach(f => {
        console.log(`  - API Request: ${f.name.replace('Fetch: ', '')} (${f.duration.toFixed(1)} ms)`);
      });
    }

    if (t.dbQueries.length > 0) {
      t.dbQueries.forEach(q => {
        console.log(`  - DB Query: ${q.name.replace('DB Query: ', '')} (${q.duration.toFixed(1)} ms)`);
      });
    }

    if (t.rpcs.length > 0) {
      t.rpcs.forEach(r => {
        console.log(`  - RPC: ${r.name.replace('RPC: ', '')} (${r.duration.toFixed(1)} ms)`);
      });
    }

    if (t.bridgeCalls.length > 0) {
      t.bridgeCalls.forEach(b => {
        console.log(`  - Bridge: ${b.name.replace('Native: ', '')} (${b.duration.toFixed(1)} ms)`);
      });
    }

    if (t.images.length > 0) {
      t.images.forEach(img => {
        console.log(`  - Image: ${img.name.replace('Image: ', '')} (${img.duration.toFixed(1)} ms)`);
      });
    }

    if (t.longTasks.length > 0) {
      console.log(`  - JavaScript Long Tasks: ${t.longTasks.length} task(s) >50ms`);
    }

    console.log(`Total Interactive Time: ${(t.totalInteractiveTime / 1000).toFixed(2)} s`);
    console.log('──────────────────────────────────');
  }

  // Get ranked list of slowest operations
  getSlowestOperations() {
    const list = [];

    // Aggregate all measured elements
    this.metrics.dbQueries.forEach(q => list.push({ ...q, label: q.name, detail: q.query }));
    this.metrics.rpcs.forEach(r => list.push({ ...r, label: r.name }));
    this.metrics.fetches.forEach(f => list.push({ ...f, label: f.name, detail: `Status: ${f.status}` }));
    this.metrics.bridgeCalls.forEach(b => list.push({ ...b, label: b.name }));
    this.metrics.images.forEach(img => list.push({ ...img, label: img.name }));
    this.metrics.transitions.forEach(t => list.push({
      type: 'Route Render',
      label: `Render: ${t.name}`,
      duration: t.renderDuration,
      timestamp: t.startTime
    }));

    // Sort by duration descending
    return list.sort((a, b) => b.duration - a.duration).slice(0, 10);
  }

  getMetrics() {
    return {
      ...this.metrics,
      currentTransition: this.currentTransition
    };
  }

  clearMetrics() {
    this.metrics = {
      startup: null,
      tti: null,
      transitions: [],
      dbQueries: [],
      rpcs: [],
      fetches: [],
      images: [],
      bridgeCalls: [],
      longTasks: [],
      lcp: null
    };
    this.currentTransition = null;
  }
}

export const performanceMonitor = new PerformanceMonitor();
