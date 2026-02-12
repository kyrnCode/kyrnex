import { screen } from 'electron';
import { promises as fsPromises, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Error personalizado para problemas relacionados con el estado de las ventanas
 * @class WindowStateError
 * @extends Error
 */
class WindowStateError extends Error {
  /**
   * Crea una nueva instancia de WindowStateError
   * @param {string} message - Mensaje de error
   * @param {string} windowId - Identificador de la ventana relacionada con el error
   * @param {Error|null} originalError - Error original que causó este error
   */
  constructor(message, windowId, originalError = null) {
    super(message);
    this.name = 'WindowStateError';
    this.windowId = windowId;
    this.originalError = originalError;
  }
}

/**
 * @typedef {Object} WindowState
 * @property {number} x - Posición horizontal de la ventana
 * @property {number} y - Posición vertical de la ventana
 * @property {number} width - Ancho de la ventana
 * @property {number} height - Alto de la ventana
 * @property {boolean} isMaximized - Si la ventana está maximizada
 * @property {boolean} isMinimized - Si la ventana está minimizada
 * @property {Object} [displayBounds] - Límites de la pantalla asociada
 * @property {number} timestamp - Marca de tiempo de cuándo se guardó el estado
 */

/**
 * Gestiona el estado de múltiples ventanas en una aplicación Electron
 * @class MultiWindowStateManager
 */
class MultiWindowStateManager {
  #stateDirectoryPath;
  #windowStates;
  #debounceTimers;
  #saveDelay;

  /**
   * Crea una nueva instancia del gestor de estado de ventanas
   * @param {string} [stateDirectoryPath] - Ruta donde se guardarán los estados
   * @param {number} [saveDelay=100] - Tiempo en ms para el debounce al guardar
   */
  constructor(stateDirectoryPath, saveDelay = 100) {
    this.#stateDirectoryPath = stateDirectoryPath || join(process.cwd(), 'windowStates');
    this.#windowStates = new Map();
    this.#debounceTimers = new Map();
    this.#saveDelay = saveDelay;
    this.#initializeStateDirectory();
  }

  /**
   * Inicializa el directorio para almacenar los estados
   * @private
   * @returns {Promise<void>}
   */
  async #initializeStateDirectory() {
    try {
      if (!existsSync(this.#stateDirectoryPath)) {
        await fsPromises.mkdir(this.#stateDirectoryPath, { recursive: true });
      }
    } catch (error) {
      console.error('Error al crear directorio de estados:', error);
      // Continuar con ejecución incluso si falla la creación del directorio
    }
  }

  /**
   * Obtiene la ruta al archivo de estado para una ventana específica
   * @private
   * @param {string} windowId - Identificador de la ventana
   * @returns {string} Ruta al archivo de estado
   * @throws {WindowStateError} Si no se proporciona un windowId válido
   */
  #getStateFilePath(windowId) {
    if (!windowId) {
      throw new WindowStateError('ID de ventana requerido para obtener ruta de archivo', 'unknown');
    }
    return join(this.#stateDirectoryPath, `windowState_${windowId}.json`);
  }

  /**
   * Valida que un objeto de estado tenga el formato correcto
   * @private
   * @param {WindowState} state - Estado a validar
   * @returns {boolean} true si el estado es válido
   */
  #validateState(state) {
    if (!state) return false;

    // Verificar campos obligatorios
    const requiredFields = ['x', 'y', 'width', 'height'];
    const hasAllFields = requiredFields.every(field => 
      typeof state[field] === 'number' && !isNaN(state[field])
    );

    if (!hasAllFields) return false;

    // Verificar rangos razonables
    return state.width > 50 && 
           state.height > 50 && 
           state.width < 10000 && 
           state.height < 10000;
  }

  /**
   * Guarda el estado de una ventana
   * @param {Electron.BrowserWindow} win - Ventana cuyo estado se guardará
   * @param {string} windowId - Identificador único de la ventana
   * @returns {Promise<boolean>} - true si se guardó correctamente
   */
  async saveState(win, windowId) {
    if (!win || !windowId) {
      console.warn('Se requiere ventana e ID para guardar estado');
      return false;
    }

    // Cancelar timer anterior si existe
    if (this.#debounceTimers.has(windowId)) {
      clearTimeout(this.#debounceTimers.get(windowId));
    }

    // Implementar debounce para evitar múltiples escrituras en disco
    return new Promise(resolve => {
      this.#debounceTimers.set(windowId, setTimeout(async () => {
        try {
          const isMaximized = win.isMaximized();
          const bounds = win.getBounds();
          
          // Validar límites antes de guardar
          if (!this.#validateState(bounds)) {
            console.error('Límites de ventana inválidos:', bounds);
            resolve(false);
            return;
          }

          // Construir objeto de estado
          const state = {
            ...bounds,
            isMaximized,
            isMinimized: win.isMinimized(),
            displayBounds: screen.getDisplayMatching(bounds).bounds,
            timestamp: Date.now()
          };

          const prevState = this.#windowStates.get(windowId);
          const stateFilePath = this.#getStateFilePath(windowId);

          // Si está maximizada, conservar dimensiones anteriores
          if (isMaximized && prevState && this.#validateState(prevState)) {
            prevState.isMaximized = isMaximized;
            writeFileSync(stateFilePath, JSON.stringify(prevState, null, 2));
            this.#windowStates.set(windowId, prevState);
          } else {
            writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
            this.#windowStates.set(windowId, state);
          }
          
          resolve(true);
        } catch (error) {
          console.error(`Error al guardar estado de ventana ${windowId}:`, error);
          resolve(false);
        }
      }, this.#saveDelay));
    });
  }

  /**
   * Carga el estado de una ventana
   * @param {string} windowId - Identificador único de la ventana
   * @returns {WindowState} Estado de la ventana o estado predeterminado
   */
  loadState(windowId) {
    if (!windowId) {
      console.error('ID de ventana requerido para cargar estado');
      return this.#getDefaultState();
    }

    // Intentar obtener estado desde la memoria
    let state = this.#windowStates.get(windowId);
    if (state && this.#validateState(state)) {
      return this.#ensureVisibleOnSomeDisplay(state);
    }

    try {
      const stateFilePath = this.#getStateFilePath(windowId);
      
      // Intentar cargar desde archivo
      if (existsSync(stateFilePath)) {
        const data = readFileSync(stateFilePath, 'utf-8');
        state = JSON.parse(data);
        
        if (this.#validateState(state)) {
          this.#windowStates.set(windowId, state);
          return this.#ensureVisibleOnSomeDisplay(state);
        } else {
          console.warn(`Estado cargado inválido para ventana ${windowId}`, state);
        }
      }
    } catch (error) {
      const stateError = new WindowStateError(
        `Error al cargar estado de ventana ${windowId}`, 
        windowId, 
        error
      );
      console.error(stateError);
    }

    // Si no se pudo cargar, devolver estado predeterminado
    return this.#getDefaultState();
  }

  /**
   * Asegura que el estado sea visible en alguna pantalla
   * @private
   * @param {WindowState} state - Estado a verificar
   * @returns {WindowState} Estado ajustado o predeterminado
   */
  #ensureVisibleOnSomeDisplay(state) {
    if (!this.#validateState(state)) {
      return this.#getDefaultState();
    }

    const displays = screen.getAllDisplays();
    if (!displays || displays.length === 0) {
      return this.#getDefaultState();
    }

    // Encontrar pantalla donde la ventana sea visible
    const visibleOnDisplay = displays.find(display => 
      this.#isVisible(state, display.bounds)
    );

    // Si no es visible en ninguna pantalla, usar la pantalla principal
    const targetDisplay = visibleOnDisplay || screen.getPrimaryDisplay();
    return this.#adjustToDisplay(state, targetDisplay.bounds);
  }

  /**
   * Verifica si un estado es visible en una pantalla específica
   * @private
   * @param {WindowState} state - Estado a verificar
   * @param {Electron.Rectangle} displayBounds - Límites de la pantalla
   * @returns {boolean} true si el estado es visible en la pantalla
   */
  #isVisible(state, displayBounds) {
    if (!state || !displayBounds) return false;
    
    // Verificar intersección con la pantalla
    return !(
      state.x >= displayBounds.x + displayBounds.width ||
      state.x + state.width <= displayBounds.x ||
      state.y >= displayBounds.y + displayBounds.height ||
      state.y + state.height <= displayBounds.y
    );
  }

  /**
   * Ajusta un estado para que sea visible dentro de los límites de una pantalla
   * @private
   * @param {WindowState} state - Estado a ajustar
   * @param {Electron.Rectangle} displayBounds - Límites de la pantalla
   * @returns {WindowState} Estado ajustado
   */
  #adjustToDisplay(state, displayBounds) {
    if (!state || !displayBounds) return this.#getDefaultState();

    // Ajustar coordenadas y dimensiones para que encajen en la pantalla
    const adjustedState = {
      ...state,
      // Asegurar que la ventana esté dentro de los límites horizontales
      x: Math.max(
        displayBounds.x,
        Math.min(state.x, displayBounds.x + displayBounds.width - Math.min(state.width, displayBounds.width))
      ),
      // Asegurar que la ventana esté dentro de los límites verticales
      y: Math.max(
        displayBounds.y,
        Math.min(state.y, displayBounds.y + displayBounds.height - Math.min(state.height, displayBounds.height))
      ),
      // Limitar el ancho al tamaño de la pantalla, con un mínimo razonable
      width: Math.min(Math.max(state.width, 200), displayBounds.width),
      // Limitar la altura al tamaño de la pantalla, con un mínimo razonable
      height: Math.min(Math.max(state.height, 200), displayBounds.height)
    };

    return this.#validateState(adjustedState) ? adjustedState : this.#getDefaultState();
  }

  /**
   * Obtiene un estado predeterminado basado en la pantalla principal
   * @private
   * @returns {WindowState} Estado predeterminado
   */
  #getDefaultState() {
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;
    
    return {
      x: 50,
      y: 50,
      width: Math.min(800, width - 100),
      height: Math.min(600, height - 100),
      isMaximized: false,
      isMinimized: false,
      timestamp: Date.now()
    };
  }

  /**
   * Aplica el estado guardado a las opciones de configuración de una ventana
   * @param {string} windowId - Identificador único de la ventana
   * @param {Object} [options={}] - Opciones adicionales a aplicar
   * @returns {Object} Opciones combinadas con el estado
   */
  applyStateToWindow(windowId, options = {}) {
    if (!windowId) {
      console.error('ID de ventana requerido para aplicar estado');
      return { ...this.#getDefaultState(), ...options };
    }

    const state = this.loadState(windowId);
    
    if (!this.#validateState(state)) {
      console.error('Estado cargado inválido:', state);
      return { ...this.#getDefaultState(), ...options };
    }

    // Estrategia de fusión de opciones y estado
    const result = {
      ...this.#getDefaultState(), // Valores por defecto como fallback
      ...options, // Opciones proporcionadas por el usuario
      // Si está maximizada o minimizada, aplicar todo el estado
      // Si no, asegurar que sea visible en alguna pantalla
      ...(state.isMaximized || state.isMinimized ? 
        state : 
        this.#ensureVisibleOnSomeDisplay(state))
    };

    return result;
  }

  /**
   * Adjunta listeners a una ventana para guardar su estado automáticamente
   * @param {Electron.BrowserWindow} win - Ventana a la que adjuntar listeners
   * @param {string} windowId - Identificador único de la ventana
   * @returns {boolean} true si se adjuntaron correctamente
   */
  attachWindowListeners(win, windowId) {
    if (!win || !windowId) {
      console.warn('Se requiere ventana e ID para adjuntar listeners');
      return false;
    }

    try {
      // Eventos de ventana que deben desencadenar guardado de estado
      const events = [
        'move', 'resize', 'maximize', 'unmaximize', 
        'minimize', 'restore', 'close'
      ];
      
      // Adjuntar listeners a cada evento
      events.forEach(event => {
        win.on(event, () => this.saveState(win, windowId));
      });

      // Manejar cierre de la aplicación
      process.on('exit', () => {
        this.saveState(win, windowId);
      });
      
      return true;
    } catch (error) {
      console.error(`Error al adjuntar listeners a ventana ${windowId}:`, error);
      return false;
    }
  }

  /**
   * Limpia recursos utilizados por el gestor de estado
   * @returns {boolean} true si se completó correctamente
   */
  cleanup() {
    try {
      // Limpiar timers de debounce
      for (const [windowId, timer] of this.#debounceTimers.entries()) {
        clearTimeout(timer);
        this.#debounceTimers.delete(windowId);
      }
      
      // Limpiar estados en memoria
      this.#windowStates.clear();
      
      return true;
    } catch (error) {
      console.error('Error al limpiar gestor de estado:', error);
      return false;
    }
  }
}

/**
 * Fábrica para crear y gestionar instancias de MultiWindowStateManager
 * @class WindowStateManagerFactory
 */
class WindowStateManagerFactory {
  #instances;
  #folderState;

  /**
   * Crea una nueva instancia de la fábrica
   * @param {string} [folderState] - Carpeta donde se guardarán los estados
   */
  constructor(folderState) {
    this.#instances = new Map();
    this.#folderState = folderState || join(process.cwd(), 'windowStates');
  }

  /**
   * Obtiene o crea una instancia de gestor para una ventana específica
   * @param {string} id - Identificador de la ventana
   * @returns {MultiWindowStateManager} Instancia del gestor de estado
   */
  getInstance(id) {
    const windowId = id || 'default';
    
    // Si ya existe una instancia, limpiarla antes de reemplazarla
    if (this.#instances.has(windowId)) {
      const instance = this.#instances.get(windowId);
      instance.cleanup();
      this.#instances.delete(windowId);
    }

    // Crear nueva instancia
    const instance = new MultiWindowStateManager(this.#folderState);
    this.#instances.set(windowId, instance);
    return instance;
  }

  /**
   * Limpia todas las instancias de gestores de estado
   * @returns {boolean} true si se completó correctamente
   */
  cleanupAll() {
    try {
      for (const [id, instance] of this.#instances.entries()) {
        instance.cleanup();
        this.#instances.delete(id);
      }
      return true;
    } catch (error) {
      console.error('Error al limpiar todas las instancias:', error);
      return false;
    }
  }
}

export { MultiWindowStateManager, WindowStateManagerFactory, WindowStateError };
