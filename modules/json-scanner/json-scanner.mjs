/**
 * JSON Scanner - Módulo ES6 para escaneo inteligente de archivos JSON
 * Escanea directorios, recolecta y combina archivos JSON con control de profundidad
 * @module json-scanner
 */

import { promises as fs } from 'fs';
import { join, resolve, relative } from 'path';
import { Worker } from 'worker_threads';

class JSONScanner {
  /**
   * Constructor del JSONScanner
   * @param {Object} options - Opciones de configuración
   */
  constructor(options = {}) {
    this.options = {
      maxDepth: 5,                    // Profundidad máxima de escaneo
      outputFormat: 'array',          // 'array' o 'object'
      removeDuplicates: true,         // Eliminar duplicados en arrays
      duplicateKey: 'id',             // Clave para detectar duplicados
      ignoreErrors: true,             // Continuar si hay archivos con errores
      parallel: true,                 // Procesar archivos en paralelo
      maxParallel: 10,                // Máximo de archivos en paralelo
      filePattern: /\.json$/i,        // Patrón de archivos a buscar
      excludeDirs: ['node_modules', '.git', 'dist', 'build'], // Directorios a excluir
      followSymlinks: false,          // Seguir enlaces simbólicos
      encoding: 'utf8',               // Codificación de archivos
      verbose: false,                 // Modo verbose para debugging
      onProgress: null,               // Callback de progreso: (current, total) => {}
      onError: null,                  // Callback de error: (error, file) => {}
      filter: null,                   // Filtro personalizado: (data, file) => boolean
      transform: null,                // Transformación: (data, file) => data
      ...options
    };

    this.stats = {
      filesScanned: 0,
      filesProcessed: 0,
      filesSkipped: 0,
      errors: [],
      startTime: null,
      endTime: null,
      totalSize: 0
    };
  }

  /**
   * Escanea un directorio y recolecta todos los archivos JSON
   * @param {string} rootPath - Ruta raíz para comenzar el escaneo
   * @param {number} maxDepth - Profundidad máxima (opcional, usa config por defecto)
   * @returns {Promise<Object>} Resultado con datos combinados y estadísticas
   */
  async scan(rootPath, maxDepth = null) {
    this.stats.startTime = Date.now();
    this._resetStats();

    const depth = maxDepth !== null ? maxDepth : this.options.maxDepth;
    const absolutePath = resolve(rootPath);

    this._log(`🔍 Iniciando escaneo en: ${absolutePath}`);
    this._log(`📊 Profundidad máxima: ${depth}`);
    this._log(`📄 Formato de salida: ${this.options.outputFormat}`);

    try {
      // Verificar que el directorio existe
      await this._checkDirectory(absolutePath);

      // Encontrar todos los archivos JSON
      const jsonFiles = await this._findJSONFiles(absolutePath, depth);
      
      this._log(`📁 Archivos JSON encontrados: ${jsonFiles.length}`);

      if (jsonFiles.length === 0) {
        return this._buildResult([]);
      }

      // Procesar archivos JSON
      const data = await this._processJSONFiles(jsonFiles);

      // Combinar datos según formato
      const combined = this._combineData(data);

      this.stats.endTime = Date.now();

      return this._buildResult(combined);

    } catch (error) {
      this.stats.endTime = Date.now();
      throw this._handleError('scan', error, rootPath);
    }
  }

  /**
   * Escanea múltiples directorios
   * @param {Array<string>} paths - Array de rutas a escanear
   * @param {number} maxDepth - Profundidad máxima
   * @returns {Promise<Object>} Resultado combinado de todos los directorios
   */
  async scanMultiple(paths, maxDepth = null) {
    this._log(`🔍 Escaneando ${paths.length} directorios`);

    const results = [];

    for (const path of paths) {
      try {
        const result = await this.scan(path, maxDepth);
        results.push(result.data);
      } catch (error) {
        if (this.options.ignoreErrors) {
          this._logError(`Error escaneando ${path}:`, error);
          this.stats.errors.push({ path, error: error.message });
        } else {
          throw error;
        }
      }
    }

    // Combinar todos los resultados
    const combined = this._combineData(results);
    return this._buildResult(combined);
  }

  /**
   * Encuentra todos los archivos JSON en un directorio
   * @private
   */
  async _findJSONFiles(dirPath, maxDepth, currentDepth = 0) {
    const files = [];

    if (currentDepth >= maxDepth) {
      return files;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        // Verificar si debe ser excluido
        if (this._shouldExclude(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursión para subdirectorios
          const subFiles = await this._findJSONFiles(
            fullPath,
            maxDepth,
            currentDepth + 1
          );
          files.push(...subFiles);

        } else if (entry.isFile() && this.options.filePattern.test(entry.name)) {
          // Archivo JSON encontrado
          files.push(fullPath);
          this.stats.filesScanned++;

        } else if (entry.isSymbolicLink() && this.options.followSymlinks) {
          // Seguir enlace simbólico si está habilitado
          try {
            const realPath = await fs.realpath(fullPath);
            const stat = await fs.stat(realPath);
            
            if (stat.isDirectory()) {
              const subFiles = await this._findJSONFiles(
                realPath,
                maxDepth,
                currentDepth + 1
              );
              files.push(...subFiles);
            } else if (stat.isFile() && this.options.filePattern.test(entry.name)) {
              files.push(realPath);
              this.stats.filesScanned++;
            }
          } catch (error) {
            // Ignorar enlaces simbólicos rotos
            this._logError(`Enlace simbólico roto: ${fullPath}`, error);
          }
        }
      }

    } catch (error) {
      if (this.options.ignoreErrors) {
        this._logError(`Error leyendo directorio ${dirPath}:`, error);
        this.stats.errors.push({ path: dirPath, error: error.message });
      } else {
        throw error;
      }
    }

    return files;
  }

  /**
   * Procesa archivos JSON en paralelo o secuencial
   * @private
   */
  async _processJSONFiles(files) {
    const data = [];

    if (this.options.parallel) {
      // Procesamiento en paralelo con límite de concurrencia
      const chunks = this._chunkArray(files, this.options.maxParallel);
      
      for (const chunk of chunks) {
        const promises = chunk.map(file => this._readAndParseJSON(file));
        const results = await Promise.allSettled(promises);

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value !== null) {
            data.push(result.value);
          }
        }

        // Callback de progreso
        if (this.options.onProgress) {
          this.options.onProgress(this.stats.filesProcessed, files.length);
        }
      }

    } else {
      // Procesamiento secuencial
      for (const file of files) {
        const content = await this._readAndParseJSON(file);
        if (content !== null) {
          data.push(content);
        }

        if (this.options.onProgress) {
          this.options.onProgress(this.stats.filesProcessed, files.length);
        }
      }
    }

    return data;
  }

  /**
   * Lee y parsea un archivo JSON
   * @private
   */
  async _readAndParseJSON(filePath) {
    try {
      const content = await fs.readFile(filePath, this.options.encoding);
      const stat = await fs.stat(filePath);
      this.stats.totalSize += stat.size;

      let parsed = JSON.parse(content);

      // Aplicar filtro si existe
      if (this.options.filter && !this.options.filter(parsed, filePath)) {
        this.stats.filesSkipped++;
        return null;
      }

      // Aplicar transformación si existe
      if (this.options.transform) {
        parsed = this.options.transform(parsed, filePath);
      }

      this.stats.filesProcessed++;

      return {
        data: parsed,
        file: filePath,
        size: stat.size
      };

    } catch (error) {
      if (this.options.ignoreErrors) {
        this._logError(`Error procesando ${filePath}:`, error);
        this.stats.errors.push({ 
          path: filePath, 
          error: error.message,
          type: error.name
        });
        this.stats.filesSkipped++;

        if (this.options.onError) {
          this.options.onError(error, filePath);
        }

        return null;
      } else {
        throw error;
      }
    }
  }

  /**
   * Combina los datos según el formato de salida
   * @private
   */
  _combineData(dataArray) {
    if (dataArray.length === 0) {
      return this.options.outputFormat === 'array' ? [] : {};
    }

    // Extraer solo los datos (sin metadata)
    const contents = dataArray.map(item => 
      item.data !== undefined ? item.data : item
    );

    if (this.options.outputFormat === 'array') {
      return this._combineAsArray(contents);
    } else {
      return this._combineAsObject(contents);
    }
  }

  /**
   * Combina datos como array
   * @private
   */
  _combineAsArray(contents) {
    const result = [];

    for (const content of contents) {
      if (Array.isArray(content)) {
        // Si el contenido es un array, agregar sus elementos
        result.push(...content);
      } else if (typeof content === 'object' && content !== null) {
        // Si es un objeto, agregarlo como elemento
        result.push(content);
      }
    }

    // Eliminar duplicados si está habilitado
    if (this.options.removeDuplicates && result.length > 0) {
      return this._removeDuplicates(result);
    }

    return result;
  }

  /**
   * Combina datos como objeto
   * @private
   */
  _combineAsObject(contents) {
    const result = {};

    for (const content of contents) {
      if (Array.isArray(content)) {
        // Si es array, convertir a objeto con índices
        content.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            const key = item[this.options.duplicateKey] || `item_${index}`;
            result[key] = item;
          }
        });
      } else if (typeof content === 'object' && content !== null) {
        // Merge de objetos
        Object.assign(result, content);
      }
    }

    return result;
  }

  /**
   * Elimina duplicados del array
   * @private
   */
  _removeDuplicates(array) {
    if (array.length === 0) return array;

    // Si los elementos son objetos con una clave específica
    const firstItem = array[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      const key = this.options.duplicateKey;
      
      if (key in firstItem) {
        // Usar Map para eliminar duplicados por clave
        const map = new Map();
        for (const item of array) {
          if (item && typeof item === 'object' && key in item) {
            map.set(item[key], item);
          }
        }
        return Array.from(map.values());
      }
    }

    // Para primitivos o sin clave, usar Set con JSON.stringify
    const seen = new Set();
    return array.filter(item => {
      const serialized = JSON.stringify(item);
      if (seen.has(serialized)) {
        return false;
      }
      seen.add(serialized);
      return true;
    });
  }

  /**
   * Verifica si un directorio debe ser excluido
   * @private
   */
  _shouldExclude(name) {
    return this.options.excludeDirs.includes(name) || name.startsWith('.');
  }

  /**
   * Verifica que el directorio existe y es accesible
   * @private
   */
  async _checkDirectory(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      if (!stat.isDirectory()) {
        throw new Error(`La ruta no es un directorio: ${dirPath}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Directorio no encontrado: ${dirPath}`);
      }
      throw error;
    }
  }

  /**
   * Divide un array en chunks
   * @private
   */
  _chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Construye el resultado final
   * @private
   */
  _buildResult(data) {
    const duration = this.stats.endTime - this.stats.startTime;

    return {
      data,
      stats: {
        filesScanned: this.stats.filesScanned,
        filesProcessed: this.stats.filesProcessed,
        filesSkipped: this.stats.filesSkipped,
        totalFiles: this.stats.filesScanned,
        successRate: this.stats.filesScanned > 0 
          ? ((this.stats.filesProcessed / this.stats.filesScanned) * 100).toFixed(2) + '%'
          : '0%',
        errors: this.stats.errors,
        errorCount: this.stats.errors.length,
        duration: `${duration}ms`,
        durationSeconds: (duration / 1000).toFixed(2) + 's',
        totalSize: this._formatBytes(this.stats.totalSize),
        itemsCount: Array.isArray(data) ? data.length : Object.keys(data).length
      }
    };
  }

  /**
   * Resetea las estadísticas
   * @private
   */
  _resetStats() {
    this.stats = {
      filesScanned: 0,
      filesProcessed: 0,
      filesSkipped: 0,
      errors: [],
      startTime: null,
      endTime: null,
      totalSize: 0
    };
  }

  /**
   * Formatea bytes a formato legible
   * @private
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Log de mensajes en modo verbose
   * @private
   */
  _log(message) {
    if (this.options.verbose) {
      console.log(`[JSONScanner] ${message}`);
    }
  }

  /**
   * Log de errores
   * @private
   */
  _logError(message, error) {
    if (this.options.verbose || !this.options.ignoreErrors) {
      console.error(`[JSONScanner] ${message}`, error.message);
    }
  }

  /**
   * Maneja errores de manera consistente
   * @private
   */
  _handleError(operation, error, context) {
    const customError = new Error(
      `JSONScanner.${operation}() failed: ${error.message}`
    );
    customError.operation = operation;
    customError.originalError = error;
    customError.context = context;
    
    return customError;
  }

  /**
   * Obtiene información de un directorio sin escanear
   * @param {string} rootPath - Ruta del directorio
   * @param {number} maxDepth - Profundidad máxima
   * @returns {Promise<Object>} Información del directorio
   */
  async getInfo(rootPath, maxDepth = null) {
    const depth = maxDepth !== null ? maxDepth : this.options.maxDepth;
    const absolutePath = resolve(rootPath);

    await this._checkDirectory(absolutePath);

    const jsonFiles = await this._findJSONFiles(absolutePath, depth);

    let totalSize = 0;
    for (const file of jsonFiles) {
      try {
        const stat = await fs.stat(file);
        totalSize += stat.size;
      } catch (error) {
        // Ignorar errores en archivos individuales
      }
    }

    return {
      path: absolutePath,
      filesFound: jsonFiles.length,
      totalSize: this._formatBytes(totalSize),
      depth: depth,
      files: jsonFiles
    };
  }

  /**
   * Escanea y agrupa por directorio padre
   * @param {string} rootPath - Ruta raíz
   * @param {number} maxDepth - Profundidad máxima
   * @returns {Promise<Object>} Datos agrupados por directorio
   */
  async scanGrouped(rootPath, maxDepth = null) {
    const depth = maxDepth !== null ? maxDepth : this.options.maxDepth;
    const absolutePath = resolve(rootPath);

    const jsonFiles = await this._findJSONFiles(absolutePath, depth);
    const grouped = {};

    for (const file of jsonFiles) {
      const dir = relative(absolutePath, file).split('/').slice(0, -1).join('/') || 'root';
      
      if (!grouped[dir]) {
        grouped[dir] = [];
      }

      const content = await this._readAndParseJSON(file);
      if (content !== null) {
        grouped[dir].push(content.data);
      }
    }

    return {
      data: grouped,
      stats: this.stats
    };
  }
}

// Exportar
export default JSONScanner;
export { JSONScanner };
