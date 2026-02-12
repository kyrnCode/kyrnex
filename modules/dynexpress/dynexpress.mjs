/**
 * DynExpress - Advanced Dynamic Express Server Manager
 * A sophisticated library for creating and managing Express.js servers with hot-reloading capabilities.
 *
 * @module DynExpress
 * @author NodeCreativo
 * @license MIT
 */

import path from "path";
import fs from "fs";
import express from "express";
import { createServer } from "net";
import Dynreload from "./utils/dynreload.mjs";

/**
 * Configuration types for input validation
 * @typedef {Object} ServerConfig
 * @property {string} name - Unique identifier for the server instance
 * @property {Array|string} routers - Array of route objects or path to router file
 * @property {number} port - Base port to attempt connection on
 * @property {string} [pathViews=null] - Custom path for view templates
 * @property {string|Array} [pathPublic=null] - Custom path(s) for static files
 * @property {boolean} [watchFile=false] - Enable hot-reloading for router file
 * @property {string|boolean} [launch=false] - Property name to extract from module or false
 */

/**
 * @typedef {Object} RouteConfig
 * @property {string} method - HTTP method (GET, POST, etc.)
 * @property {string} path - URL path for the route
 * @property {Function} [middleware] - Optional middleware function
 * @property {Function} handler - Route handler function
 */

/**
 * Enhanced Express server manager with dynamic reloading capabilities
 */
class DynExpress {
  /** @private {Map<string, Object>} Map of running server instances */
  #instances = new Map();

  /** @private {Dynreload} Dynamic module reloader */
  #dynreload;

  /** @private {string} Default views directory */
  #defaultViewsPath;

  /** @private {string} Default public directory */
  #defaultPublicPath;

  /**
   * Creates a new DynExpress instance
   * @param {Object} [options] - Configuration options
   * @param {boolean} [options.silent=true] - Suppress console output
   * @param {number} [options.maxDepth=3] - Maximum recursion depth for file watching
   * @param {string} [options.viewsPath] - Custom default views directory
   * @param {string} [options.publicPath] - Custom default public directory
   */
  constructor(options = {}) {
    this.#dynreload = new Dynreload({
      silent: options.silent ?? true,
      maxDepth: options.maxDepth ?? 3,
    });

    // Initialize default paths
    const rootDir = process.cwd();
    this.#defaultViewsPath =
      options.viewsPath || path.join(rootDir, "bin", "views");
    this.#defaultPublicPath =
      options.publicPath || path.join(rootDir, "bin", "public");

    // Graceful shutdown handling
    this.#registerShutdownHandlers();
  }

  /**
   * Register process signal handlers for graceful shutdown
   * @private
   */
  #registerShutdownHandlers() {
    const signals = ["SIGINT", "SIGTERM", "SIGHUP"];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        try {
          await this.cleanup();
          process.exit(0);
        } catch (error) {
          console.error("Error during graceful shutdown:", error);
          process.exit(1);
        }
      });
    });
  }

  /**
   * Validates router configuration
   * @private
   * @param {Array|string} routers - Router configuration to validate
   * @returns {Object} Validated router information
   * @throws {Error} If router configuration is invalid
   */
  #validateRouters(routers) {
    // Case 1: Array of route objects
    if (Array.isArray(routers)) {
      if (
        !routers.every(
          (route) =>
            route &&
            typeof route === "object" &&
            typeof route.method === "string" &&
            typeof route.path === "string" &&
            typeof route.handler === "function"
        )
      ) {
        throw new Error(
          "Each route must have method, path, and handler properties"
        );
      }
      return { type: "array", value: routers };
    }

    // Case 2: File path
    if (typeof routers === "string") {
      const ext = path.extname(routers);
      if (ext !== ".js" && ext !== ".mjs") {
        throw new Error("Router file must have .js or .mjs extension");
      }

      if (!fs.existsSync(routers)) {
        throw new Error(`Router file not found: ${routers}`);
      }

      return { type: "file", value: routers };
    }

    throw new Error(
      "Routers must be an array of route objects or a valid .js/.mjs file path"
    );
  }

  /**
   * Configure Express middleware and settings
   * @private
   * @param {express.Application} app - Express application instance
   * @param {Object} options - Middleware configuration options
   * @param {string} [options.pathViews] - Path to view templates
   * @param {string|Array} [options.pathPublic] - Path(s) to static files
   */
  #setupMiddleware(app, { pathViews, pathPublic }) {
    // Body parsers
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json({ limit: "100mb" }));

    // View engine setup
    app.set("view engine", "ejs");
    app.set("views", pathViews || this.#defaultViewsPath);

    // Static file directories
    const publicDirs = Array.isArray(pathPublic)
      ? pathPublic
      : [pathPublic || this.#defaultPublicPath];

    // Mount each public directory
    publicDirs.forEach((dir) => {
      if (typeof dir === "string" && fs.existsSync(dir)) {
        app.use(express.static(dir));
      }
    });

    // Add basic security headers
    app.use((req, res, next) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      next();
    });
  }

  /**
   * Register routes with the Express application
   * @private
   * @param {express.Application} app - Express application instance
   * @param {Array<RouteConfig>} routes - Array of route configurations
   */
  #setupRoutes(app, routes) {
    if (!Array.isArray(routes)) {
      throw new TypeError("Routes must be an array");
    }

    routes.forEach(({ method, path: routePath, middleware, handler }) => {
      // Validate route parameters
      if (!method || !routePath || !handler) {
        throw new Error(
          `Invalid route configuration: ${JSON.stringify({
            method,
            path: routePath,
          })}`
        );
      }

      const methodLower = method.toLowerCase();

      // Verify method exists on Express app
      if (typeof app[methodLower] !== "function") {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }

      // Register route with or without middleware
      if (middleware && typeof middleware === "function") {
        app[methodLower](routePath, middleware, handler);
      } else {
        app[methodLower](routePath, handler);
      }
    });
  }

  /**
   * Check if a port is available
   * @private
   * @param {number} port - Port to check
   * @returns {Promise<boolean>} True if port is available
   */
  async #isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = createServer()
        .once("error", () => resolve(false))
        .once("listening", () => {
          server.close(() => resolve(true));
        })
        .listen(port);
    });
  }

  /**
   * Find an available port starting from the provided base port
   * @private
   * @param {number} startPort - Base port to start checking from
   * @param {number} [maxAttempts=10] - Maximum number of ports to check
   * @returns {Promise<number>} First available port found
   * @throws {Error} If no port is available after maxAttempts
   */
  async #findAvailablePort(startPort, maxAttempts = 10) {
    // Validate port number
    const basePort = parseInt(startPort, 10);
    if (isNaN(basePort) || basePort < 1024 || basePort > 65535) {
      throw new Error("Port must be a number between 1024 and 65535");
    }

    for (let i = 0; i < maxAttempts; i++) {
      const port = basePort + i;
      if (await this.#isPortAvailable(port)) {
        return port;
      }
    }

    throw new Error(
      `No available port found after ${maxAttempts} attempts starting from ${startPort}`
    );
  }

  /**
   * Start an Express server on the specified port
   * @private
   * @param {express.Application} app - Express application instance
   * @param {number} port - Port to listen on
   * @returns {Promise<http.Server>} Express server instance
   */
  async #startServer(app, port) {
    return new Promise((resolve, reject) => {
      const server = app.listen(port);

      server.once("listening", () => resolve(server));
      server.once("error", (error) => {
        // Provide more context for common errors
        if (error.code === "EADDRINUSE") {
          reject(new Error(`Port ${port} is already in use`));
        } else if (error.code === "EACCES") {
          reject(new Error(`Insufficient permissions to bind to port ${port}`));
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Create a new Express server instance
   * @async
   * @param {ServerConfig} config - Server configuration
   * @returns {Promise<string|boolean>} URL of the new server or false on failure
   */
  async newServer({
    name,
    routers,
    port,
    pathViews = null,
    pathPublic = null,
    watchFile = false,
    launch = false,
  }) {
    // Validate name
    if (!name || typeof name !== "string") {
      throw new Error("Server name is required and must be a string");
    }

    // Check if server with this name already exists
    if (this.#instances.has(name)) {
      return `http://localhost:${this.#instances.get(name).port}/`;
    }

    try {
      // Validate routers configuration
      const { type, value } = this.#validateRouters(routers);

      let appRoutes;
      let moduleLoad;

      // Load routes based on type
      if (type === "file") {
        // Dynamic import of router file
        moduleLoad = await this.#dynreload.preload(value);

        // Extract routes from module based on launch property
        if (launch && typeof launch === "string") {
          if (!moduleLoad[launch]) {
            throw new Error(`Property '${launch}' not found in router module`);
          }
          appRoutes = moduleLoad[launch];
        } else {
          appRoutes = moduleLoad;
        }
      } else {
        // Direct array of routes
        appRoutes = value;
      }

      // Find available port
      const availablePort = await this.#findAvailablePort(port);

      // Create Express app
      const app = express();

      // Configure middleware
      this.#setupMiddleware(app, { pathViews, pathPublic });

      // Setup routes
      this.#setupRoutes(app, appRoutes);

      // Start server
      const server = await this.#startServer(app, availablePort);

      // Store server instance
      this.#instances.set(name, {
        app,
        server,
        routers,
        pathViews,
        pathPublic,
        port: availablePort,
        watchFile,
        launch,
        moduleLoad,
        startTime: new Date(),
      });

      // Setup hot reloading if enabled
      if (watchFile && type === "file") {
        await this.#setupHotReloading(name, value, launch);
      }

      return `http://localhost:${availablePort}/`;
    } catch (error) {
      if (!this.#dynreload.options?.silent) {
        console.error(`Error creating server '${name}':`, error);
      }
      throw new Error(error.message);
    }
  }

  /**
   * Setup hot reloading for a server instance
   * @private
   * @param {string} serverName - Name of the server instance
   * @param {string} routerFile - Path to the router file
   * @param {string|boolean} launch - Property to extract from module
   * @returns {Promise<void>}
   */
  async #setupHotReloading(serverName, routerFile, launch) {
    // Configure update callback
    this.#dynreload.setRouteUpdateCallback(routerFile, async (newRoutes) => {
      try {
        // Get server instance
        const instance = this.#instances.get(serverName);
        if (!instance) return;

        // Update module reference
        this.#instances.set(serverName, {
          ...instance,
          moduleLoad: newRoutes,
          lastUpdated: new Date(),
        });

        // Extract routes from module
        const routes =
          launch && typeof launch === "string"
            ? newRoutes[launch] || newRoutes
            : newRoutes;

        // Clear existing routes
        instance.app._router.stack = instance.app._router.stack.filter(
          (layer) => !layer.route
        );

        // Setup new routes
        this.#setupRoutes(instance.app, routes);

        if (!this.#dynreload.options?.silent) {
          console.log(
            `[${new Date().toISOString()}] Updated routes for server '${serverName}'`
          );
        }
      } catch (error) {
        if (!this.#dynreload.options?.silent) {
          console.error(
            `[${new Date().toISOString()}] Error updating routes for server '${serverName}':`,
            error
          );
        }
      }
    });

    // Start watching file
    await this.#dynreload.watchFile(routerFile);
  }

  /**
   * Clean up all server instances and watchers
   * @async
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Create array of promises to stop all servers
    const stopPromises = Array.from(this.#instances.keys()).map((name) =>
      this.stopServer(name).catch((err) => {
        if (!this.#dynreload.options?.silent) {
          console.error(`Error stopping server '${name}':`, err);
        }
      })
    );

    // Wait for all servers to stop
    await Promise.all(stopPromises);

    // Clean up dynreload
    this.#dynreload.cleanup();
  }

  /**
   * Stop a server instance
   * @async
   * @param {string} serverName - Name of the server to stop
   * @returns {Promise<boolean>} True if server was stopped successfully
   * @throws {Error} If server not found
   */
  async stopServer(serverName) {
    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new Error(`Server '${serverName}' not found`);
    }

    // Stop file watching if enabled
    if (instance.watchFile && typeof instance.routers === "string") {
      this.#dynreload.stopWatching(instance.routers);
    }

    // Close server
    return new Promise((resolve, reject) => {
      instance.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.#instances.delete(serverName);
          resolve(true);
        }
      });
    });
  }

  /**
   * Reset a server instance (stop and restart)
   * @async
   * @param {string} serverName - Name of the server to reset
   * @returns {Promise<string>} URL of the restarted server
   * @throws {Error} If server not found or reset fails
   */
  async resetServer(serverName) {
    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new Error(`Server '${serverName}' not found`);
    }

    try {
      // Stop server
      await this.stopServer(serverName);

      // Restart with same configuration
      return await this.newServer({
        name: serverName,
        routers: instance.routers,
        port: instance.port,
        pathViews: instance.pathViews,
        pathPublic: instance.pathPublic,
        watchFile: instance.watchFile,
        launch: instance.launch,
      });
    } catch (error) {
      if (!this.#dynreload.options?.silent) {
        console.error(`Error resetting server '${serverName}':`, error);
      }
      throw error;
    }
  }

  /**
   * Add a new route to an existing server
   * @param {string} serverName - Name of the server
   * @param {RouteConfig} routeConfig - Route configuration
   * @throws {Error} If server not found or route config is invalid
   */
  addRoute(serverName, { method, path: routePath, middleware, handler }) {
    // Validate parameters
    if (!method || typeof method !== "string") {
      throw new Error("Route method is required and must be a string");
    }

    if (!routePath || typeof routePath !== "string") {
      throw new Error("Route path is required and must be a string");
    }

    if (!handler || typeof handler !== "function") {
      throw new Error("Route handler is required and must be a function");
    }

    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new Error(`Server '${serverName}' not found`);
    }

    const methodLower = method.toLowerCase();

    // Register route
    if (middleware && typeof middleware === "function") {
      instance.app[methodLower](routePath, middleware, handler);
    } else {
      instance.app[methodLower](routePath, handler);
    }

    if (!this.#dynreload.options?.silent) {
      console.log(
        `New route added to '${serverName}': ${method.toUpperCase()} ${routePath}`
      );
    }
  }

  /**
   * Get information about all server instances
   * @returns {Array<Object>} Array of server instance information
   */
  getInstances() {
    return Array.from(this.#instances.entries()).map(([name, instance]) => ({
      name,
      port: instance.port,
      url: `http://localhost:${instance.port}/`,
      startTime: instance.startTime,
      lastUpdated: instance.lastUpdated || instance.startTime,
      watchingFile: instance.watchFile,
      routes: instance.app._router.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
          keys: layer.keys?.map((key) => key.name) || [],
        })),
    }));
  }

  /**
   * Get detailed information about a specific server instance
   * @param {string} serverName - Name of the server
   * @returns {Object} Server instance information
   * @throws {Error} If server not found
   */
  getInstance(serverName) {
    const instance = this.#instances.get(serverName);
    if (!instance) {
      throw new Error(`Server '${serverName}' not found`);
    }

    return {
      name: serverName,
      port: instance.port,
      url: `http://localhost:${instance.port}/`,
      startTime: instance.startTime,
      lastUpdated: instance.lastUpdated || instance.startTime,
      watchingFile: instance.watchFile,
      routes: instance.app._router.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
          keys: layer.keys?.map((key) => key.name) || [],
        })),
    };
  }
}

// Export class and singleton instance
export default DynExpress;
export const dyn = new DynExpress();