/**
 * Centralized resource management service
 * Handles cleanup of event listeners, timers, and async operations
 * Prevents memory leaks and resource accumulation
 */
class ResourceManager {
  private listeners = new Map<string, Set<() => void>>();
  private abortControllers = new Map<string, AbortController>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Add an event listener with automatic cleanup tracking
   */
  addEventListener(
    id: string,
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    // Add the listener
    element.addEventListener(event, handler, options);
    
    // Track cleanup function
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    
    this.listeners.get(id)!.add(() => {
      element.removeEventListener(event, handler, options);
    });
    
    console.log(`📎 Added event listener: ${id} -> ${event}`);
  }

  /**
   * Remove all event listeners for a given component ID
   */
  removeEventListeners(id: string): void {
    const cleanups = this.listeners.get(id);
    if (cleanups) {
      cleanups.forEach(cleanup => cleanup());
      this.listeners.delete(id);
      console.log(`🧹 Removed ${cleanups.size} event listeners for: ${id}`);
    }
  }

  /**
   * Create an AbortController for cancellable operations
   */
  createAbortController(id: string): AbortController {
    // Cancel existing controller if any
    this.cancelRequest(id);
    
    const controller = new AbortController();
    this.abortControllers.set(id, controller);
    console.log(`🎯 Created AbortController: ${id}`);
    
    return controller;
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(id: string): void {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(id);
      console.log(`❌ Cancelled request: ${id}`);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach((controller, id) => {
      controller.abort();
      console.log(`❌ Cancelled request: ${id}`);
    });
    this.abortControllers.clear();
  }

  /**
   * Set an interval with automatic cleanup tracking
   */
  setInterval(id: string, callback: () => void, ms: number): void {
    // Clear existing interval if any
    this.clearInterval(id);
    
    const interval = setInterval(callback, ms);
    this.intervals.set(id, interval);
    console.log(`⏱️ Set interval: ${id} (${ms}ms)`);
  }

  /**
   * Clear a specific interval
   */
  clearInterval(id: string): void {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
      console.log(`⏹️ Cleared interval: ${id}`);
    }
  }

  /**
   * Set a timeout with automatic cleanup tracking
   */
  setTimeout(id: string, callback: () => void, ms: number): void {
    // Clear existing timeout if any
    this.clearTimeout(id);
    
    const timeout = setTimeout(() => {
      callback();
      this.timeouts.delete(id);
    }, ms);
    
    this.timeouts.set(id, timeout);
    console.log(`⏲️ Set timeout: ${id} (${ms}ms)`);
  }

  /**
   * Clear a specific timeout
   */
  clearTimeout(id: string): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
      console.log(`⏹️ Cleared timeout: ${id}`);
    }
  }

  /**
   * Clean up all resources for a specific component
   */
  cleanupComponent(componentId: string): void {
    console.log(`🧹 Cleaning up all resources for: ${componentId}`);
    
    // Remove event listeners
    this.removeEventListeners(componentId);
    
    // Cancel requests
    this.cancelRequest(componentId);
    
    // Clear intervals
    this.clearInterval(componentId);
    
    // Clear timeouts
    this.clearTimeout(componentId);
  }

  /**
   * Global cleanup - remove all tracked resources
   */
  cleanup(): void {
    console.log('🧹 Global resource cleanup initiated');
    
    // Remove all event listeners
    let listenerCount = 0;
    this.listeners.forEach((cleanups, id) => {
      cleanups.forEach(cleanup => cleanup());
      listenerCount += cleanups.size;
    });
    this.listeners.clear();
    
    // Cancel all requests
    const requestCount = this.abortControllers.size;
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    
    // Clear all intervals
    const intervalCount = this.intervals.size;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    
    // Clear all timeouts
    const timeoutCount = this.timeouts.size;
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    
    console.log(`✅ Global cleanup complete:
      - ${listenerCount} event listeners removed
      - ${requestCount} requests cancelled
      - ${intervalCount} intervals cleared
      - ${timeoutCount} timeouts cleared`);
  }

  /**
   * Get current resource usage stats
   */
  getStats(): {
    listeners: number;
    requests: number;
    intervals: number;
    timeouts: number;
  } {
    let listenerCount = 0;
    this.listeners.forEach(cleanups => {
      listenerCount += cleanups.size;
    });
    
    return {
      listeners: listenerCount,
      requests: this.abortControllers.size,
      intervals: this.intervals.size,
      timeouts: this.timeouts.size
    };
  }
}

// Export singleton instance
export const resourceManager = new ResourceManager();

// Clean up on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    resourceManager.cleanup();
  });
}