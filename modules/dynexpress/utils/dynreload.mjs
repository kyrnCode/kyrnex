// dynreload.mjs
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { parseSync } from 'es-module-lexer';

class Dynreload {
  constructor(options = {}) {
    this.options = {
      silent: options.silent ?? false,
      cache: new Map(),
      watchedFiles: new Map(),
      routeUpdateCallbacks: new Map(),
      lastValidModules: new Map(), // Store last valid module versions
      dependencyGraph: new Map(), // Track dependencies between modules
      maxDepth: options.maxDepth ?? 1, // Default depth is 1 (only the main module)
      fileExtensions: options.fileExtensions ?? ['.js', '.mjs', '.cjs'] // File extensions to watch
    };
  }

  #validateRouteStructure(routes) {
    if (!Array.isArray(routes)) {
      throw new Error('Routes must be an array');
    }

    const validMethods = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head']);

    for (const route of routes) {
      // Check required properties
      if (!route.method || !route.path || !route.handler) {
        throw new Error('Each route must have method, path, and handler properties');
      }

      // Validate method
      if (!validMethods.has(route.method.toLowerCase())) {
        throw new Error(`Invalid HTTP method: ${route.method}`);
      }

      // Validate path
      if (typeof route.path !== 'string' || !route.path.startsWith('/')) {
        throw new Error(`Invalid path: ${route.path}`);
      }

      // Validate handler
      if (typeof route.handler !== 'function') {
        throw new Error('Route handler must be a function');
      }
    }

    return true;
  }

  async #tryImportModule(fileUrl, timestamp) {
    try {
      const module = await import(`${fileUrl}?update=${timestamp}`);
      const routes = module.default || module;

      // Validate route structure if it's a routes module
      if (Array.isArray(routes)) {
        // Optional validation
        // this.#validateRouteStructure(routes);
      }

      return { success: true, routes, module };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Extract imports from file content to track dependencies
   */
  async #extractDependencies(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const [imports] = parseSync(fileContent);
      
      const dependencies = [];
      const dirName = path.dirname(filePath);
      
      for (const imp of imports) {
        const importPath = fileContent.substring(imp.s, imp.e);
        
        // Skip built-in modules and node_modules
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          continue;
        }
        
        // Remove quotes from import path
        const cleanImportPath = importPath.replace(/['"]/g, '');
        
        // Resolve the absolute path
        let resolvedPath;
        try {
          // Handle different import styles
          resolvedPath = path.resolve(dirName, cleanImportPath);
          
          // Add file extension if not present
          if (!path.extname(resolvedPath)) {
            for (const ext of this.options.fileExtensions) {
              const testPath = `${resolvedPath}${ext}`;
              if (fs.existsSync(testPath)) {
                resolvedPath = testPath;
                break;
              }
              
              // Check for index files
              const indexPath = path.join(resolvedPath, `index${ext}`);
              if (fs.existsSync(indexPath)) {
                resolvedPath = indexPath;
                break;
              }
            }
          }
          
          // Only add if the file exists
          if (fs.existsSync(resolvedPath)) {
            dependencies.push(resolvedPath);
          }
        } catch (err) {
          if (!this.options.silent) {
            console.warn(`Could not resolve dependency: ${cleanImportPath} in ${filePath}`);
          }
        }
      }
      
      return dependencies;
    } catch (error) {
      if (!this.options.silent) {
        console.error(`Error extracting dependencies from ${filePath}:`, error);
      }
      return [];
    }
  }

  /**
   * Update the dependency graph for all modules
   */
  async #updateDependencyGraph(rootPath, currentDepth = 1) {
    if (currentDepth > this.options.maxDepth) {
      return;
    }
    
    const dependencies = await this.#extractDependencies(rootPath);
    this.options.dependencyGraph.set(rootPath, dependencies);
    
    // Process dependencies recursively if not at max depth
    if (currentDepth < this.options.maxDepth) {
      for (const dependency of dependencies) {
        if (!this.options.dependencyGraph.has(dependency)) {
          await this.#updateDependencyGraph(dependency, currentDepth + 1);
        }
      }
    }
  }

  /**
   * Find all modules that depend on the changed file
   */
  #findAffectedModules(changedFilePath) {
    const affectedModules = new Set([changedFilePath]);
    
    for (const [modulePath, dependencies] of this.options.dependencyGraph.entries()) {
      if (dependencies.includes(changedFilePath)) {
        affectedModules.add(modulePath);
        
        // Find modules that depend on this module (recursive)
        const indirectlyAffected = this.#findAffectedModules(modulePath);
        indirectlyAffected.forEach(m => affectedModules.add(m));
      }
    }
    
    return affectedModules;
  }

  /**
   * Reload a specific module
   */
  async #reloadModule(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      const fileUrl = pathToFileURL(absolutePath).href;
      const timestamp = Date.now();
      
      // Try importing and validating the updated module
      const importResult = await this.#tryImportModule(fileUrl, timestamp);

      if (!importResult.success) {
        if (!this.options.silent) {
          console.error(`Invalid module in ${filePath}. Keeping previous version.`);
          console.error('Error:', importResult.error.message);
        }
        return { success: false, error: importResult.error };
      }

      const newModule = importResult.routes;

      // Update cache and last valid module
      const stats = fs.statSync(absolutePath);
      const moduleInfo = {
        module: newModule,
        lastModified: stats.mtime,
        filePath: absolutePath
      };

      this.options.cache.set(absolutePath, moduleInfo);
      this.options.lastValidModules.set(absolutePath, moduleInfo);

      return { success: true, module: newModule };
    } catch (error) {
      if (!this.options.silent) {
        console.error(`Error reloading module ${filePath}:`, error);
      }
      return { success: false, error };
    }
  }

  /**
   * Configure the depth of dependency tracking
   */
  setDepth(depth) {
    if (typeof depth !== 'number' || depth < 1) {
      throw new Error('Depth must be a positive number');
    }
    
    this.options.maxDepth = depth;
    
    // Rebuild dependency graph with new depth
    for (const filePath of this.options.watchedFiles.keys()) {
      this.#updateDependencyGraph(filePath);
    }
    
    if (!this.options.silent) {
      console.log(`Update depth set to ${depth}`);
    }
  }

  async preload(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      
      const fileUrl = pathToFileURL(absolutePath).href;
      
      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File ${filePath} does not exist`);
      }

      const timestamp = Date.now();
      const importResult = await this.#tryImportModule(fileUrl, timestamp);

      if (!importResult.success) {
        if (!this.options.silent) {
          console.error(`Error loading module ${filePath}:`, importResult.error);
        }
        throw importResult.error;
      }

      const routes = importResult.routes;
      
      // Store in cache and as last valid module
      const stats = fs.statSync(absolutePath);
      const moduleInfo = {
        module: routes,
        lastModified: stats.mtime,
        filePath: absolutePath
      };

      this.options.cache.set(absolutePath, moduleInfo);
      this.options.lastValidModules.set(absolutePath, moduleInfo);
      
      // Build initial dependency graph for this module with the configured depth
      await this.#updateDependencyGraph(absolutePath);

      return routes;
    } catch (error) {
      if (!this.options.silent) {
        console.error(`Error preloading file ${filePath}:`, error);
      }
      throw error;
    }
  }

  async watchFile(filePath) {
    const absolutePath = path.resolve(filePath);
    
    if (this.options.watchedFiles.has(absolutePath)) {
      return;
    }

    try {
      let updateInProgress = false;

      const watcher = fs.watch(absolutePath, async (eventType) => {
        if (eventType === 'change' && !updateInProgress) {
          updateInProgress = true;

          try {
            // Small delay to ensure file writing is complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Update the dependency graph first
            await this.#updateDependencyGraph(absolutePath);
            
            // Find all modules affected by this change based on the dependency graph
            const affectedModules = this.#findAffectedModules(absolutePath);
            
            if (!this.options.silent) {
              console.log(`File changed: ${absolutePath}`);
              console.log(`Affected modules: ${affectedModules.size}`);
            }
            
            // Reload all affected modules in reverse dependency order
            const sortedModules = Array.from(affectedModules).sort((a, b) => {
              // If A depends on B, reload B first
              if (this.options.dependencyGraph.get(a)?.includes(b)) return 1;
              if (this.options.dependencyGraph.get(b)?.includes(a)) return -1;
              return 0;
            });
            
            // Track reload results
            const reloadResults = new Map();
            
            for (const modulePath of sortedModules) {
              const result = await this.#reloadModule(modulePath);
              reloadResults.set(modulePath, result);
              
              // Execute callback if exists and reload was successful
              if (result.success) {
                const callback = this.options.routeUpdateCallbacks.get(modulePath);
                if (callback) {
                  await callback(result.module);
                }
              }
            }
            
            if (!this.options.silent) {
              console.log(`Reload complete for ${absolutePath} and dependencies`);
            }
          } catch (error) {
            if (!this.options.silent) {
              console.error(`Error processing update for ${filePath}:`, error);
              console.log('Keeping previous valid versions');
            }
          } finally {
            updateInProgress = false;
          }
        }
      });

      // Store the watcher
      this.options.watchedFiles.set(absolutePath, watcher);

      // Handle watcher errors
      watcher.on('error', (error) => {
        if (!this.options.silent) {
          console.error(`Watch error for ${filePath}:`, error);
        }
        this.stopWatching(absolutePath);
      });
      
      // Start watching dependencies if depth > 1
      if (this.options.maxDepth > 1) {
        await this.#watchDependencies(absolutePath);
      }

    } catch (error) {
      if (!this.options.silent) {
        console.error(`Error setting up watcher for ${filePath}:`, error);
      }
      this.stopWatching(absolutePath);
    }
  }
  
  /**
   * Watch all dependencies of a file based on current depth setting
   */
  async #watchDependencies(filePath, currentDepth = 1) {
    if (currentDepth >= this.options.maxDepth) {
      return;
    }
    
    const dependencies = this.options.dependencyGraph.get(filePath) || [];
    
    for (const dependency of dependencies) {
      // Only watch if not already watching
      if (!this.options.watchedFiles.has(dependency)) {
        await this.watchFile(dependency);
        
        // Watch recursively with incremented depth
        await this.#watchDependencies(dependency, currentDepth + 1);
      }
    }
  }

  getLastValidModule(filePath) {
    return this.options.lastValidModules.get(path.resolve(filePath))?.module;
  }

  getCached(filePath) {
    return this.options.cache.get(path.resolve(filePath))?.module;
  }

  setRouteUpdateCallback(filePath, callback) {
    const absolutePath = path.resolve(filePath);
    this.options.routeUpdateCallbacks.set(absolutePath, callback);
  }

  stopWatching(filePath) {
    const absolutePath = path.resolve(filePath);
    const watcher = this.options.watchedFiles.get(absolutePath);
    if (watcher) {
      watcher.close();
      this.options.watchedFiles.delete(absolutePath);
      this.options.routeUpdateCallbacks.delete(absolutePath);
    }
  }

  stopWatchingAll() {
    for (const [filePath] of this.options.watchedFiles) {
      this.stopWatching(filePath);
    }
  }

  getDependencyGraph() {
    // Return a copy of the dependency graph
    const graph = {};
    for (const [module, deps] of this.options.dependencyGraph.entries()) {
      graph[module] = [...deps];
    }
    return graph;
  }

  cleanup() {
    this.stopWatchingAll();
    this.options.cache.clear();
    this.options.routeUpdateCallbacks.clear();
    this.options.lastValidModules.clear();
    this.options.dependencyGraph.clear();
  }
}

export default Dynreload;