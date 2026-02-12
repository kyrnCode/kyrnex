// index.d.ts

declare module 'dynexpress' {
  import { Application, Request, Response, NextFunction, RequestHandler } from 'express';
  import { Server } from 'http';

  /**
   * HTTP methods supported by Express
   */
  export type HttpMethod =
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'PATCH'
    | 'HEAD'
    | 'OPTIONS'
    | 'CONNECT'
    | 'TRACE'
    | 'get'
    | 'post'
    | 'put'
    | 'delete'
    | 'patch'
    | 'head'
    | 'options'
    | 'connect'
    | 'trace';

  /**
   * Route handler function type
   */
  export type RouteHandler = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void | Promise<void>;

  /**
   * Middleware function type
   */
  export type MiddlewareFunction = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void | Promise<void>;

  /**
   * Route configuration object
   */
  export interface RouteConfig {
    /**
     * HTTP method for this route
     * @example 'GET', 'POST', 'PUT', 'DELETE'
     */
    method: HttpMethod;

    /**
     * URL path for this route
     * @example '/', '/api/users', '/api/users/:id'
     */
    path: string;

    /**
     * Optional middleware function(s) to run before the handler
     */
    middleware?: MiddlewareFunction | MiddlewareFunction[];

    /**
     * Route handler function
     */
    handler: RouteHandler;
  }

  /**
   * Constructor options for DynExpress
   */
  export interface DynExpressOptions {
    /**
     * Suppress console output
     * @default true
     */
    silent?: boolean;

    /**
     * Maximum recursion depth for file watching
     * @default 3
     */
    maxDepth?: number;

    /**
     * Custom default views directory path
     * @default './bin/views'
     */
    viewsPath?: string;

    /**
     * Custom default public directory path
     * @default './bin/public'
     */
    publicPath?: string;
  }

  /**
   * Server configuration for creating new servers
   */
  export interface ServerConfig {
    /**
     * Unique identifier for the server instance
     * @example 'my-api-server', 'web-app', 'admin-panel'
     */
    name: string;

    /**
     * Array of route objects or path to router file (.js or .mjs)
     * @example './routes.js' or [{ method: 'GET', path: '/', handler: () => {} }]
     */
    routers: RouteConfig[] | string;

    /**
     * Base port to attempt connection on
     * If occupied, will try port+1, port+2, etc.
     * @example 3000, 8080
     */
    port: number;

    /**
     * Custom path for view templates (EJS)
     * @default null (uses default views path)
     */
    pathViews?: string | null;

    /**
     * Custom path(s) for static files
     * Can be a single path or array of paths
     * @default null (uses default public path)
     * @example './public' or ['./public', './assets', './uploads']
     */
    pathPublic?: string | string[] | null;

    /**
     * Enable hot-reloading for router file
     * Only works when routers is a file path
     * @default false
     */
    watchFile?: boolean;

    /**
     * Property name to extract from module or false
     * Used when router file exports multiple properties
     * @default false
     * @example 'apiRoutes', 'routes', 'default'
     */
    launch?: string | boolean;
  }

  /**
   * Route information returned by getInstance methods
   */
  export interface RouteInfo {
    /**
     * The route path
     */
    path: string;

    /**
     * HTTP methods registered for this route
     */
    methods: string[];

    /**
     * Route parameter keys
     */
    keys: string[];
  }

  /**
   * Server instance information
   */
  export interface ServerInstance {
    /**
     * Server name/identifier
     */
    name: string;

    /**
     * Port the server is running on
     */
    port: number;

    /**
     * Full URL of the server
     * @example 'http://localhost:3000/'
     */
    url: string;

    /**
     * When the server was started
     */
    startTime: Date;

    /**
     * Last time routes were updated (if hot-reloading is enabled)
     */
    lastUpdated: Date;

    /**
     * Whether file watching is enabled
     */
    watchingFile: boolean;

    /**
     * All routes registered on this server
     */
    routes: RouteInfo[];
  }

  /**
   * Internal server instance (private)
   * @internal
   */
  interface InternalServerInstance {
    app: Application;
    server: Server;
    routers: RouteConfig[] | string;
    pathViews: string | null;
    pathPublic: string | string[] | null;
    port: number;
    watchFile: boolean;
    launch: string | boolean;
    moduleLoad?: any;
    startTime: Date;
    lastUpdated?: Date;
  }

  /**
   * Advanced Dynamic Express Server Manager
   * 
   * A sophisticated library for creating and managing Express.js servers
   * with hot-reloading capabilities, automatic port management, and
   * multi-server orchestration.
   * 
   * @example
   * ```typescript
   * import DynExpress from 'dynexpress';
   * 
   * const dynExpress = new DynExpress({ silent: false });
   * 
   * const serverUrl = await dynExpress.newServer({
   *   name: 'my-app',
   *   routers: [{
   *     method: 'GET',
   *     path: '/',
   *     handler: (req, res) => res.send('Hello World!')
   *   }],
   *   port: 3000,
   *   watchFile: true
   * });
   * ```
   */
  export default class DynExpress {
    /**
     * Creates a new DynExpress instance
     * 
     * @param options - Configuration options
     * 
     * @example
     * ```typescript
     * const dynExpress = new DynExpress({
     *   silent: false,
     *   maxDepth: 5,
     *   viewsPath: './custom/views',
     *   publicPath: './custom/public'
     * });
     * ```
     */
    constructor(options?: DynExpressOptions);

    /**
     * Create a new Express server instance
     * 
     * @param config - Server configuration
     * @returns Promise resolving to the server URL, or false on failure
     * @throws {Error} If configuration is invalid or server fails to start
     * 
     * @example
     * ```typescript
     * // With route array
     * const url = await dynExpress.newServer({
     *   name: 'api-server',
     *   routers: [
     *     {
     *       method: 'GET',
     *       path: '/api/users',
     *       handler: (req, res) => res.json({ users: [] })
     *     }
     *   ],
     *   port: 3001
     * });
     * 
     * // With router file
     * const url = await dynExpress.newServer({
     *   name: 'web-app',
     *   routers: './routes.js',
     *   port: 3000,
     *   watchFile: true,
     *   pathPublic: ['./public', './assets']
     * });
     * ```
     */
    newServer(config: ServerConfig): Promise<string | boolean>;

    /**
     * Stop a running server instance
     * 
     * @param serverName - Name of the server to stop
     * @returns Promise resolving to true if successful
     * @throws {Error} If server not found
     * 
     * @example
     * ```typescript
     * await dynExpress.stopServer('my-app');
     * ```
     */
    stopServer(serverName: string): Promise<boolean>;

    /**
     * Reset a server instance (stop and restart with same configuration)
     * 
     * @param serverName - Name of the server to reset
     * @returns Promise resolving to the new server URL
     * @throws {Error} If server not found or reset fails
     * 
     * @example
     * ```typescript
     * const newUrl = await dynExpress.resetServer('my-app');
     * console.log('Server restarted at:', newUrl);
     * ```
     */
    resetServer(serverName: string): Promise<string>;

    /**
     * Add a new route to an existing server dynamically
     * 
     * @param serverName - Name of the server
     * @param routeConfig - Route configuration to add
     * @throws {Error} If server not found or route config is invalid
     * 
     * @example
     * ```typescript
     * dynExpress.addRoute('my-app', {
     *   method: 'POST',
     *   path: '/api/data',
     *   middleware: (req, res, next) => {
     *     console.log('Processing request');
     *     next();
     *   },
     *   handler: (req, res) => {
     *     res.json({ success: true, data: req.body });
     *   }
     * });
     * ```
     */
    addRoute(serverName: string, routeConfig: RouteConfig): void;

    /**
     * Get information about all running server instances
     * 
     * @returns Array of server instance information
     * 
     * @example
     * ```typescript
     * const instances = dynExpress.getInstances();
     * instances.forEach(instance => {
     *   console.log(`${instance.name} running on port ${instance.port}`);
     * });
     * ```
     */
    getInstances(): ServerInstance[];

    /**
     * Get detailed information about a specific server instance
     * 
     * @param serverName - Name of the server
     * @returns Server instance information
     * @throws {Error} If server not found
     * 
     * @example
     * ```typescript
     * const instance = dynExpress.getInstance('my-app');
     * console.log('Server URL:', instance.url);
     * console.log('Routes:', instance.routes);
     * ```
     */
    getInstance(serverName: string): ServerInstance;

    /**
     * Clean up all server instances and file watchers
     * 
     * Gracefully shuts down all running servers and stops file watching.
     * This is automatically called on process termination signals.
     * 
     * @returns Promise that resolves when cleanup is complete
     * 
     * @example
     * ```typescript
     * // Manual cleanup
     * await dynExpress.cleanup();
     * 
     * // Or use in shutdown handler
     * process.on('SIGTERM', async () => {
     *   await dynExpress.cleanup();
     *   process.exit(0);
     * });
     * ```
     */
    cleanup(): Promise<void>;
  }

  /**
   * Singleton instance of DynExpress for convenient usage
   * 
   * @example
   * ```typescript
   * import { dyn } from 'dynexpress';
   * 
   * const serverUrl = await dyn.newServer({
   *   name: 'quick-server',
   *   routers: './routes.js',
   *   port: 3000
   * });
   * ```
   */
  export const dyn: DynExpress;
}

/**
 * Type augmentation for router files
 * Use this in your router files for better type checking
 * 
 * @example
 * ```typescript
 * // routes.ts
 * import type { RouteConfig } from 'dynexpress';
 * 
 * export const routes: RouteConfig[] = [
 *   {
 *     method: 'GET',
 *     path: '/',
 *     handler: (req, res) => res.send('Hello')
 *   }
 * ];
 * ```
 */
declare module 'dynexpress/routes' {
  export type { RouteConfig, RouteHandler, MiddlewareFunction, HttpMethod } from 'dynexpress';
}