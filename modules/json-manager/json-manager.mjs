/**
 * JSON Manager - Módulo ES6 para manejo profesional de archivos JSON
 * Soporta operaciones CRUD, búsquedas profundas, transacciones y más
 * @module json-manager
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

class JSONManager {
  /**
   * Constructor del JSONManager
   * @param {string} filePath - Ruta del archivo JSON
   * @param {Object} options - Opciones de configuración
   */
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.options = {
      autoSave: true,
      prettify: true,
      encoding: 'utf8',
      backup: false,
      cache: true,
      ...options
    };
    
    this._cache = null;
    this._isLoading = false;
    this._loadPromise = null;
  }

  /**
   * Lee el archivo JSON completo
   * @returns {Promise<any>} Contenido del archivo JSON
   */
  async read() {
    try {
      // Si hay cache y está habilitado, retornar cache
      if (this.options.cache && this._cache !== null) {
        return this._deepClone(this._cache);
      }

      // Si ya está cargando, esperar a que termine
      if (this._isLoading) {
        return await this._loadPromise;
      }

      this._isLoading = true;
      this._loadPromise = this._performRead();
      
      const data = await this._loadPromise;
      this._isLoading = false;
      
      return data;
    } catch (error) {
      this._isLoading = false;
      throw this._handleError('read', error);
    }
  }

  /**
   * Realiza la lectura del archivo
   * @private
   */
  async _performRead() {
    try {
      const content = await fs.readFile(this.filePath, this.options.encoding);
      const data = JSON.parse(content);
      
      if (this.options.cache) {
        this._cache = this._deepClone(data);
      }
      
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Si el archivo no existe, retornar objeto vacío
        const emptyData = {};
        if (this.options.cache) {
          this._cache = emptyData;
        }
        return emptyData;
      }
      throw error;
    }
  }

  /**
   * Escribe datos en el archivo JSON
   * @param {any} data - Datos a escribir
   * @param {boolean} merge - Si es true, hace merge con datos existentes
   * @returns {Promise<boolean>} True si se escribió correctamente
   */
  async write(data, merge = false) {
    try {
      let finalData = data;

      if (merge) {
        const existing = await this.read();
        finalData = this._deepMerge(existing, data);
      }

      // Crear backup si está habilitado
      if (this.options.backup) {
        await this._createBackup();
      }

      // Asegurar que el directorio existe
      await this._ensureDirectory();

      const content = this.options.prettify 
        ? JSON.stringify(finalData, null, 2)
        : JSON.stringify(finalData);

      await fs.writeFile(this.filePath, content, this.options.encoding);

      // Actualizar cache
      if (this.options.cache) {
        this._cache = this._deepClone(finalData);
      }

      return true;
    } catch (error) {
      throw this._handleError('write', error);
    }
  }

  /**
   * Obtiene un valor por ruta (soporta notación de punto y arrays)
   * @param {string} path - Ruta del valor (ej: "users.0.name" o "settings.theme")
   * @param {any} defaultValue - Valor por defecto si no se encuentra
   * @returns {Promise<any>} Valor encontrado o defaultValue
   */
  async get(path, defaultValue = undefined) {
    try {
      const data = await this.read();
      return this._getByPath(data, path, defaultValue);
    } catch (error) {
      throw this._handleError('get', error);
    }
  }

  /**
   * Establece un valor por ruta
   * @param {string} path - Ruta donde establecer el valor
   * @param {any} value - Valor a establecer
   * @returns {Promise<boolean>} True si se estableció correctamente
   */
  async set(path, value) {
    try {
      const data = await this.read();
      this._setByPath(data, path, value);
      
      if (this.options.autoSave) {
        await this.write(data);
      }
      
      return true;
    } catch (error) {
      throw this._handleError('set', error);
    }
  }

  /**
   * Busca elementos por propiedad y valor
   * @param {string} key - Clave a buscar
   * @param {any} value - Valor a comparar
   * @param {string} searchPath - Ruta donde buscar (opcional)
   * @returns {Promise<Array>} Array de elementos encontrados
   */
  async findBy(key, value, searchPath = null) {
    try {
      const data = await this.read();
      const searchData = searchPath ? this._getByPath(data, searchPath) : data;
      
      return this._findByKey(searchData, key, value);
    } catch (error) {
      throw this._handleError('findBy', error);
    }
  }

  /**
   * Busca un elemento por ID
   * @param {string|number} id - ID a buscar
   * @param {string} searchPath - Ruta donde buscar (opcional)
   * @param {string} idKey - Nombre de la clave ID (default: 'id')
   * @returns {Promise<any>} Elemento encontrado o null
   */
  async findById(id, searchPath = null, idKey = 'id') {
    try {
      const results = await this.findBy(idKey, id, searchPath);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      throw this._handleError('findById', error);
    }
  }

  /**
   * Actualiza elemento por ID
   * @param {string|number} id - ID del elemento
   * @param {Object} updates - Objeto con las actualizaciones
   * @param {string} searchPath - Ruta donde buscar (opcional)
   * @param {string} idKey - Nombre de la clave ID (default: 'id')
   * @returns {Promise<any>} Elemento actualizado o null
   */
  async updateById(id, updates, searchPath = null, idKey = 'id') {
    try {
      const data = await this.read();
      const targetData = searchPath ? this._getByPath(data, searchPath) : data;
      
      const updated = this._updateByKey(targetData, idKey, id, updates);
      
      if (updated && this.options.autoSave) {
        await this.write(data);
      }
      
      return updated;
    } catch (error) {
      throw this._handleError('updateById', error);
    }
  }

  /**
   * Elimina elemento por ID
   * @param {string|number} id - ID del elemento
   * @param {string} searchPath - Ruta donde buscar (opcional)
   * @param {string} idKey - Nombre de la clave ID (default: 'id')
   * @returns {Promise<boolean>} True si se eliminó
   */
  async deleteById(id, searchPath = null, idKey = 'id') {
    try {
      const data = await this.read();
      const targetData = searchPath ? this._getByPath(data, searchPath) : data;
      
      const deleted = this._deleteByKey(targetData, idKey, id);
      
      if (deleted && this.options.autoSave) {
        await this.write(data);
      }
      
      return deleted;
    } catch (error) {
      throw this._handleError('deleteById', error);
    }
  }

  /**
   * Agrega un elemento a un array
   * @param {string} path - Ruta del array
   * @param {any} item - Item a agregar
   * @returns {Promise<boolean>} True si se agregó
   */
  async push(path, item) {
    try {
      const data = await this.read();
      const arr = this._getByPath(data, path, []);
      
      if (!Array.isArray(arr)) {
        throw new Error(`Path "${path}" is not an array`);
      }
      
      arr.push(item);
      this._setByPath(data, path, arr);
      
      if (this.options.autoSave) {
        await this.write(data);
      }
      
      return true;
    } catch (error) {
      throw this._handleError('push', error);
    }
  }

  /**
   * Filtra elementos de un array
   * @param {string} path - Ruta del array
   * @param {Function} predicate - Función de filtrado
   * @returns {Promise<Array>} Array filtrado
   */
  async filter(path, predicate) {
    try {
      const data = await this.read();
      const arr = this._getByPath(data, path, []);
      
      if (!Array.isArray(arr)) {
        throw new Error(`Path "${path}" is not an array`);
      }
      
      return arr.filter(predicate);
    } catch (error) {
      throw this._handleError('filter', error);
    }
  }

  /**
   * Busca un elemento en un array
   * @param {string} path - Ruta del array
   * @param {Function} predicate - Función de búsqueda
   * @returns {Promise<any>} Elemento encontrado o undefined
   */
  async find(path, predicate) {
    try {
      const data = await this.read();
      const arr = this._getByPath(data, path, []);
      
      if (!Array.isArray(arr)) {
        throw new Error(`Path "${path}" is not an array`);
      }
      
      return arr.find(predicate);
    } catch (error) {
      throw this._handleError('find', error);
    }
  }

  /**
   * Verifica si existe una ruta
   * @param {string} path - Ruta a verificar
   * @returns {Promise<boolean>} True si existe
   */
  async has(path) {
    try {
      const data = await this.read();
      return this._hasPath(data, path);
    } catch (error) {
      throw this._handleError('has', error);
    }
  }

  /**
   * Elimina una ruta
   * @param {string} path - Ruta a eliminar
   * @returns {Promise<boolean>} True si se eliminó
   */
  async delete(path) {
    try {
      const data = await this.read();
      const deleted = this._deletePath(data, path);
      
      if (deleted && this.options.autoSave) {
        await this.write(data);
      }
      
      return deleted;
    } catch (error) {
      throw this._handleError('delete', error);
    }
  }

  /**
   * Limpia el archivo JSON
   * @param {any} initialValue - Valor inicial (default: {})
   * @returns {Promise<boolean>} True si se limpió
   */
  async clear(initialValue = {}) {
    try {
      await this.write(initialValue);
      return true;
    } catch (error) {
      throw this._handleError('clear', error);
    }
  }

  /**
   * Invalida el cache
   */
  invalidateCache() {
    this._cache = null;
  }

  /**
   * Crea un backup del archivo
   * @private
   */
  async _createBackup() {
    try {
      const backupPath = `${this.filePath}.backup`;
      const exists = await this._fileExists(this.filePath);
      
      if (exists) {
        await fs.copyFile(this.filePath, backupPath);
      }
    } catch (error) {
      // No lanzar error si falla el backup
      console.warn('Backup creation failed:', error.message);
    }
  }

  /**
   * Verifica si un archivo existe
   * @private
   */
  async _fileExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Asegura que el directorio existe
   * @private
   */
  async _ensureDirectory() {
    try {
      const dir = dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Ignorar error si el directorio ya existe
    }
  }

  /**
   * Obtiene valor por ruta
   * @private
   */
  _getByPath(obj, path, defaultValue = undefined) {
    if (!path) return obj;
    
    const keys = this._parsePath(path);
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
  }

  /**
   * Establece valor por ruta
   * @private
   */
  _setByPath(obj, path, value) {
    const keys = this._parsePath(path);
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const nextKey = keys[i + 1];
      
      if (!(key in current)) {
        // Crear objeto o array según el siguiente key
        current[key] = /^\d+$/.test(nextKey) ? [] : {};
      }
      
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Verifica si existe una ruta
   * @private
   */
  _hasPath(obj, path) {
    const keys = this._parsePath(path);
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return false;
      }
      current = current[key];
    }
    
    return true;
  }

  /**
   * Elimina una ruta
   * @private
   */
  _deletePath(obj, path) {
    const keys = this._parsePath(path);
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (current === null || current === undefined) {
        return false;
      }
      current = current[keys[i]];
    }
    
    const lastKey = keys[keys.length - 1];
    if (current && lastKey in current) {
      delete current[lastKey];
      return true;
    }
    
    return false;
  }

  /**
   * Busca elementos por clave y valor
   * @private
   */
  _findByKey(data, key, value, results = []) {
    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === 'object' && item !== null) {
          if (item[key] === value) {
            results.push(item);
          }
          this._findByKey(item, key, value, results);
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      if (data[key] === value) {
        results.push(data);
      }
      
      for (const val of Object.values(data)) {
        if (typeof val === 'object' && val !== null) {
          this._findByKey(val, key, value, results);
        }
      }
    }
    
    return results;
  }

  /**
   * Actualiza elemento por clave
   * @private
   */
  _updateByKey(data, key, value, updates) {
    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === 'object' && item !== null && item[key] === value) {
          Object.assign(item, updates);
          return item;
        }
        
        const found = this._updateByKey(item, key, value, updates);
        if (found) return found;
      }
    } else if (typeof data === 'object' && data !== null) {
      if (data[key] === value) {
        Object.assign(data, updates);
        return data;
      }
      
      for (const val of Object.values(data)) {
        if (typeof val === 'object' && val !== null) {
          const found = this._updateByKey(val, key, value, updates);
          if (found) return found;
        }
      }
    }
    
    return null;
  }

  /**
   * Elimina elemento por clave
   * @private
   */
  _deleteByKey(data, key, value) {
    if (Array.isArray(data)) {
      for (let i = data.length - 1; i >= 0; i--) {
        const item = data[i];
        if (typeof item === 'object' && item !== null && item[key] === value) {
          data.splice(i, 1);
          return true;
        }
        
        if (typeof item === 'object' && item !== null) {
          if (this._deleteByKey(item, key, value)) {
            return true;
          }
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const [k, val] of Object.entries(data)) {
        if (typeof val === 'object' && val !== null) {
          if (val[key] === value) {
            delete data[k];
            return true;
          }
          
          if (this._deleteByKey(val, key, value)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Parsea una ruta en keys
   * @private
   */
  _parsePath(path) {
    return path.split('.').flatMap(part => 
      part.split(/\[(\d+)\]/).filter(Boolean)
    );
  }

  /**
   * Clona profundamente un objeto
   * @private
   */
  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Merge profundo de objetos
   * @private
   */
  _deepMerge(target, source) {
    const output = { ...target };
    
    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this._isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this._deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  /**
   * Verifica si es un objeto
   * @private
   */
  _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Maneja errores de manera consistente
   * @private
   */
  _handleError(operation, error) {
    const customError = new Error(
      `JSONManager.${operation}() failed: ${error.message}`
    );
    customError.operation = operation;
    customError.originalError = error;
    customError.filePath = this.filePath;
    
    return customError;
  }
}

/**
 * Clase para manejar múltiples archivos JSON
 */
class JSONManagerMulti {
  constructor() {
    this.managers = new Map();
  }

  /**
   * Obtiene o crea un manager para un archivo
   * @param {string} filePath - Ruta del archivo
   * @param {Object} options - Opciones
   * @returns {JSONManager} Manager del archivo
   */
  get(filePath, options = {}) {
    if (!this.managers.has(filePath)) {
      this.managers.set(filePath, new JSONManager(filePath, options));
    }
    return this.managers.get(filePath);
  }

  /**
   * Elimina un manager del cache
   * @param {string} filePath - Ruta del archivo
   */
  remove(filePath) {
    this.managers.delete(filePath);
  }

  /**
   * Limpia todos los managers
   */
  clear() {
    this.managers.clear();
  }

  /**
   * Invalida todos los caches
   */
  invalidateAllCaches() {
    for (const manager of this.managers.values()) {
      manager.invalidateCache();
    }
  }
}

// Exports
export { JSONManager, JSONManagerMulti };
export default JSONManager;
