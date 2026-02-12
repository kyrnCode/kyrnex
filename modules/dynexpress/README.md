# DynExpress Documentation

DynExpress is an advanced dynamic Express server manager that provides sophisticated capabilities for creating and managing Express.js servers with hot-reloading functionality.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Examples](#examples)
- [Advanced Usage](#advanced-usage)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Features

- **Dynamic Server Creation**: Create multiple Express servers on-the-fly
- **Hot Reloading**: Automatically reload routes when files change
- **Port Management**: Automatic port detection and allocation
- **Static File Serving**: Support for multiple public directories
- **View Engine Support**: Built-in EJS template engine configuration
- **Security Headers**: Automatic security header configuration
- **Graceful Shutdown**: Proper cleanup on process termination
- **Route Management**: Add routes dynamically to running servers

## Installation

```bash
npm install dynexpress
```

## Quick Start

### Basic Usage

```javascript
import DynExpress from 'dynexpress';

const dynExpress = new DynExpress();

// Define routes
const routes = [
  {
    method: 'GET',
    path: '/',
    handler: (req, res) => {
      res.send('Hello World!');
    }
  }
];

// Create server
const serverUrl = await dynExpress.newServer({
  name: 'my-app',
  routers: routes,
  port: 3000
});

console.log(`Server running at: ${serverUrl}`);
```

### Using the Singleton Instance

```javascript
import { dyn } from 'dynexpress';

const serverUrl = await dyn.newServer({
  name: 'my-app',
  routers: './routes.js',
  port: 3000,
  watchFile: true
});
```

## API Reference

### Constructor

```javascript
new DynExpress(options)
```

Creates a new DynExpress instance.

**Parameters:**
- `options` (Object, optional)
  - `silent` (boolean, default: `true`) - Suppress console output
  - `maxDepth` (number, default: `3`) - Maximum recursion depth for file watching
  - `viewsPath` (string, optional) - Custom default views directory
  - `publicPath` (string, optional) - Custom default public directory

### Methods

#### `newServer(config)`

Creates a new Express server instance.

**Parameters:**
- `config` (ServerConfig)
  - `name` (string, required) - Unique identifier for the server
  - `routers` (Array|string, required) - Array of route objects or path to router file
  - `port` (number, required) - Base port to attempt connection on
  - `pathViews` (string, optional) - Custom path for view templates
  - `pathPublic` (string|Array, optional) - Custom path(s) for static files
  - `watchFile` (boolean, default: `false`) - Enable hot-reloading
  - `launch` (string|boolean, default: `false`) - Property name to extract from module

**Returns:** `Promise<string>` - URL of the new server

**Example:**
```javascript
const serverUrl = await dynExpress.newServer({
  name: 'api-server',
  routers: [
    {
      method: 'GET',
      path: '/api/users',
      handler: (req, res) => res.json({ users: [] })
    }
  ],
  port: 3001,
  pathPublic: ['./public', './assets'],
  watchFile: true
});
```

#### `stopServer(serverName)`

Stops a running server instance.

**Parameters:**
- `serverName` (string) - Name of the server to stop

**Returns:** `Promise<boolean>` - True if server was stopped successfully

**Example:**
```javascript
await dynExpress.stopServer('my-app');
```

#### `resetServer(serverName)`

Stops and restarts a server instance with the same configuration.

**Parameters:**
- `serverName` (string) - Name of the server to reset

**Returns:** `Promise<string>` - URL of the restarted server

**Example:**
```javascript
const newUrl = await dynExpress.resetServer('my-app');
```

#### `addRoute(serverName, routeConfig)`

Adds a new route to an existing server.

**Parameters:**
- `serverName` (string) - Name of the server
- `routeConfig` (RouteConfig)
  - `method` (string) - HTTP method (GET, POST, etc.)
  - `path` (string) - URL path for the route
  - `middleware` (Function, optional) - Middleware function
  - `handler` (Function) - Route handler function

**Example:**
```javascript
dynExpress.addRoute('my-app', {
  method: 'POST',
  path: '/api/data',
  middleware: (req, res, next) => {
    console.log('Middleware executed');
    next();
  },
  handler: (req, res) => {
    res.json({ message: 'Data received' });
  }
});
```

#### `getInstances()`

Returns information about all server instances.

**Returns:** `Array<Object>` - Array of server instance information

**Example:**
```javascript
const instances = dynExpress.getInstances();
console.log(instances);
// [
//   {
//     name: 'my-app',
//     port: 3000,
//     url: 'http://localhost:3000/',
//     startTime: '2023-...',
//     watchingFile: true,
//     routes: [...]
//   }
// ]
```

#### `getInstance(serverName)`

Returns detailed information about a specific server instance.

**Parameters:**
- `serverName` (string) - Name of the server

**Returns:** `Object` - Server instance information

#### `cleanup()`

Cleans up all server instances and watchers.

**Returns:** `Promise<void>`

**Example:**
```javascript
await dynExpress.cleanup();
```

## Configuration

### Route Configuration

Routes can be defined as an array of objects or loaded from a file.

#### Array Format

```javascript
const routes = [
  {
    method: 'GET',
    path: '/',
    handler: (req, res) => res.send('Home')
  },
  {
    method: 'POST',
    path: '/api/users',
    middleware: validateUser,
    handler: createUser
  }
];
```

#### File Format

Create a router file (e.g., `routes.js`):

```javascript
// routes.js
export default [
  {
    method: 'GET',
    path: '/',
    handler: (req, res) => res.send('Home')
  }
];

// Or with named export
export const apiRoutes = [
  {
    method: 'GET',
    path: '/api/status',
    handler: (req, res) => res.json({ status: 'ok' })
  }
];
```

Then reference it in your server configuration:

```javascript
await dynExpress.newServer({
  name: 'my-app',
  routers: './routes.js',
  launch: 'apiRoutes', // Use named export
  port: 3000,
  watchFile: true
});
```

### Static Files and Views

```javascript
await dynExpress.newServer({
  name: 'web-app',
  routers: routes,
  port: 3000,
  pathViews: './views',
  pathPublic: ['./public', './assets', './uploads']
});
```

## Examples

### Basic Web Server

```javascript
import { dyn } from 'dynexpress';

const routes = [
  {
    method: 'GET',
    path: '/',
    handler: (req, res) => {
      res.render('index', { title: 'Welcome' });
    }
  },
  {
    method: 'GET',
    path: '/about',
    handler: (req, res) => {
      res.render('about');
    }
  }
];

const serverUrl = await dyn.newServer({
  name: 'website',
  routers: routes,
  port: 3000,
  pathViews: './views',
  pathPublic: './public'
});
```

### API Server with Hot Reloading

```javascript
// api-routes.js
export const routes = [
  {
    method: 'GET',
    path: '/api/health',
    handler: (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    }
  },
  {
    method: 'GET',
    path: '/api/users',
    handler: async (req, res) => {
      // Your logic here
      res.json({ users: [] });
    }
  }
];
```

```javascript
import { dyn } from 'dynexpress';

const serverUrl = await dyn.newServer({
  name: 'api',
  routers: './api-routes.js',
  launch: 'routes',
  port: 3001,
  watchFile: true // Enable hot reloading
});

console.log(`API Server running at: ${serverUrl}`);
```

### Multiple Servers

```javascript
import DynExpress from 'dynexpress';

const manager = new DynExpress({ silent: false });

// Create multiple servers
const webServer = await manager.newServer({
  name: 'web',
  routers: './web-routes.js',
  port: 3000,
  pathViews: './views',
  pathPublic: './public'
});

const apiServer = await manager.newServer({
  name: 'api',
  routers: './api-routes.js',
  port: 3001,
  watchFile: true
});

console.log('Web Server:', webServer);
console.log('API Server:', apiServer);

// List all instances
console.log('All instances:', manager.getInstances());
```

### Dynamic Route Addition

```javascript
import { dyn } from 'dynexpress';

// Create initial server
await dyn.newServer({
  name: 'dynamic-app',
  routers: [],
  port: 3000
});

// Add routes dynamically
dyn.addRoute('dynamic-app', {
  method: 'GET',
  path: '/dynamic',
  handler: (req, res) => {
    res.json({ message: 'This route was added dynamically!' });
  }
});

// Add route with middleware
dyn.addRoute('dynamic-app', {
  method: 'POST',
  path: '/secure',
  middleware: (req, res, next) => {
    // Authentication logic
    if (req.headers.authorization) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  },
  handler: (req, res) => {
    res.json({ message: 'Secure endpoint' });
  }
});
```

## Advanced Usage

### Custom Middleware Setup

```javascript
// custom-routes.js
const authMiddleware = (req, res, next) => {
  // Your auth logic
  next();
};

const logMiddleware = (req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
};

export default [
  {
    method: 'GET',
    path: '/protected',
    middleware: authMiddleware,
    handler: (req, res) => {
      res.json({ message: 'Protected resource' });
    }
  },
  {
    method: 'POST',
    path: '/log',
    middleware: logMiddleware,
    handler: (req, res) => {
      res.json({ received: req.body });
    }
  }
];
```

### Environment-based Configuration

```javascript
import { dyn } from 'dynexpress';

const isDevelopment = process.env.NODE_ENV === 'development';

const serverUrl = await dyn.newServer({
  name: 'app',
  routers: './routes.js',
  port: process.env.PORT || 3000,
  pathViews: './views',
  pathPublic: isDevelopment ? ['./public', './dev-assets'] : './public',
  watchFile: isDevelopment // Hot reload only in development
});
```

### Graceful Shutdown Handling

```javascript
import DynExpress from 'dynexpress';

const dynExpress = new DynExpress();

// The library automatically handles graceful shutdown, but you can also do it manually
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await dynExpress.cleanup();
  process.exit(0);
});
```

## Error Handling

DynExpress provides comprehensive error handling:

### Common Errors

1. **Port Already in Use**: The library automatically finds the next available port
2. **Invalid Route Configuration**: Detailed error messages for malformed routes
3. **File Not Found**: Clear errors when router files don't exist
4. **Server Not Found**: Explicit errors when referencing non-existent servers

### Error Examples

```javascript
try {
  await dynExpress.newServer({
    name: 'test',
    routers: './non-existent-file.js',
    port: 3000
  });
} catch (error) {
  console.error('Server creation failed:', error.message);
  // "Router file not found: ./non-existent-file.js"
}

try {
  await dynExpress.stopServer('non-existent-server');
} catch (error) {
  console.error('Stop failed:', error.message);
  // "Server 'non-existent-server' not found"
}
```

## Best Practices

### 1. Use Descriptive Server Names

```javascript
// Good
await dyn.newServer({ name: 'user-api', ... });
await dyn.newServer({ name: 'admin-dashboard', ... });

// Avoid
await dyn.newServer({ name: 'server1', ... });
```

### 2. Enable Hot Reloading in Development

```javascript
const isDev = process.env.NODE_ENV === 'development';

await dyn.newServer({
  name: 'app',
  routers: './routes.js',
  port: 3000,
  watchFile: isDev
});
```

### 3. Organize Routes in Separate Files

```javascript
// routes/api.js
export const apiRoutes = [
  // API routes here
];

// routes/web.js
export const webRoutes = [
  // Web routes here
];
```

### 4. Handle Errors Appropriately

```javascript
try {
  const serverUrl = await dyn.newServer(config);
  console.log(`Server started: ${serverUrl}`);
} catch (error) {
  console.error('Failed to start server:', error.message);
  process.exit(1);
}
```

### 5. Clean Up Resources

```javascript
// In your application shutdown logic
await dynExpress.cleanup();
```

### 6. Use Middleware Consistently

```javascript
const routes = [
  {
    method: 'POST',
    path: '/api/*',
    middleware: [authMiddleware, validationMiddleware],
    handler: apiHandler
  }
];
```

### 7. Monitor Server Instances

```javascript
// Periodically check server health
setInterval(() => {
  const instances = dyn.getInstances();
  console.log(`Running servers: ${instances.length}`);
}, 30000);
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: DynExpress automatically finds available ports, but you can specify a range
2. **File watching not working**: Ensure the file path is correct and the file is readable
3. **Routes not updating**: Check that `watchFile: true` is set and the file syntax is correct
4. **Memory leaks**: Always call `cleanup()` when shutting down your application

### Debug Mode

```javascript
const dynExpress = new DynExpress({ silent: false });
```

This will enable detailed logging to help diagnose issues.

---

**License:** MIT  
**Author:** NodeCreativo

For more information and updates, visit the project repository.