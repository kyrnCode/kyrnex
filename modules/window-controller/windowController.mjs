import { app, BrowserWindow, Menu, shell, dialog } from "electron";
import { join, extname, parse, isAbsolute } from "path";
import { promises as fs, watch, existsSync } from "fs";
import { WindowStateManagerFactory } from "./utils/electron-window-state.mjs";

/**
 * WindowController - Gestor profesional de ventanas para Electron
 * Maneja la creación, configuración y ciclo de vida de ventanas
 */
class WindowController {
  // Configuraciones por defecto
  static DEFAULT_OPTIONS = {
    width: 800,
    height: 600,
    show: false, // Evitar parpadeo inicial
    webPreferences: {
      nodeIntegration: false, // Más seguro
      contextIsolation: true, // Seguridad mejorada
      sandbox: true,
      spellcheck: false,
    },
  };

  static EVENTS = {
    READY: "ready",
    CLOSED: "closed",
    FOCUS: "focus",
    BLUR: "blur",
    MAXIMIZE: "maximize",
    UNMAXIMIZE: "unmaximize",
    MINIMIZE: "minimize",
    RESTORE: "restore",
    RESIZE: "resize",
    MOVE: "move",
  };

  constructor() {
    this._initializeProperties();
    this._setupAppHandlers();
  }

  /**
   * Inicializa las propiedades de la clase
   * @private
   */
  _initializeProperties() {
    this.winstate = new WindowStateManagerFactory();
    this.windows = new Map();
    this.watchedFiles = new Map();
    this.eventListeners = new Map();
    this.platform = process.platform;
    this.isLinux = this.platform === "linux";
    this.isWindows = this.platform === "win32";
    this.isMac = this.platform === "darwin";
    this._isReady = false;
  }

  /**
   * Configura los handlers globales de la aplicación
   * @private
   */
  _setupAppHandlers() {
    // Cuando todas las ventanas están cerradas
    app.on("window-all-closed", () => {
      if (!this.isMac) {
        this.quitApp();
      }
    });

    // Cuando la app está lista
    app.on("ready", () => {
      this._isReady = true;
    });

    // Activación en macOS
    app.on("activate", () => {
      if (this.windows.size === 0 && this.isMac) {
        this.emit("activate");
      }
    });

    // Cleanup antes de cerrar
    app.on("before-quit", () => {
      this.cleanup();
    });
  }

  /**
   * Espera a que la aplicación esté lista
   * @param {Function} callback - Función a ejecutar cuando esté lista
   * @returns {Promise<void>}
   */
  async whenReady(callback) {
    try {
      await app.whenReady();
      if (callback && typeof callback === "function") {
        await callback();
      }
    } catch (error) {
      this._handleError("whenReady", error);
      throw error;
    }
  }

  /**
   * Verifica si la aplicación está lista
   * @returns {boolean}
   */
  isReady() {
    return this._isReady && app.isReady();
  }

  /**
   * Asegura que el archivo preload tenga extensión .mjs
   * @private
   * @param {string} preloadPath - Ruta del archivo preload
   * @returns {Promise<string>} Ruta del archivo .mjs
   */
  async _ensureMjsExtension(preloadPath) {
    if (!preloadPath) return preloadPath;

    const ext = extname(preloadPath);
    if (ext === ".mjs") return preloadPath;

    const { dir, name } = parse(preloadPath);
    const mjsPath = join(dir, `${name}.mjs`);

    const updateMjsCopy = async () => {
      try {
        const originalContent = await fs.readFile(preloadPath, "utf-8");
        await fs.writeFile(mjsPath, originalContent, "utf-8");
        console.log(`✓ Copia .mjs actualizada: ${mjsPath}`);
      } catch (error) {
        throw new Error(
          `Error al actualizar copia .mjs de ${preloadPath}: ${error.message}`
        );
      }
    };

    try {
      // Verificar si existe el archivo original
      if (!existsSync(preloadPath)) {
        throw new Error(`Archivo preload no encontrado: ${preloadPath}`);
      }

      const [originalStat, mjsStat] = await Promise.all([
        fs.stat(preloadPath),
        fs.stat(mjsPath).catch(() => null),
      ]);

      if (!mjsStat || originalStat.mtime > mjsStat.mtime) {
        await updateMjsCopy();
      }

      // Configurar watcher si no existe
      if (!this.watchedFiles.has(preloadPath)) {
        const watcher = watch(preloadPath, async (eventType) => {
          if (eventType === "change") {
            try {
              await updateMjsCopy();
            } catch (error) {
              this._handleError("fileWatcher", error);
            }
          }
        });

        this.watchedFiles.set(preloadPath, watcher);
        console.log(`👁 Watching: ${preloadPath}`);
      }

      return mjsPath;
    } catch (error) {
      this._handleError("ensureMjsExtension", error);
      return preloadPath;
    }
  }

  /**
   * Crea el estado de ventana para persistencia
   * @private
   * @param {string} windowName - Nombre de la ventana
   * @returns {Object} Estado de la ventana
   */
  _createWindowState(windowName) {
    try {
      const winState = this.winstate.getInstance(windowName);
      return winState.applyStateToWindow(windowName);
    } catch (error) {
      this._handleError("createWindowState", error);
      return {};
    }
  }

  /**
   * Configura los listeners de eventos de una ventana
   * @private
   * @param {BrowserWindow} win - Ventana
   * @param {string} id - ID de la ventana
   * @param {Object} options - Opciones
   */
  _setupWindowListeners(win, id, options = {}) {
    const { stateWin = true, onEvent } = options;

    // Estado de ventana
    if (stateWin) {
      try {
        this.winstate.getInstance(id).attachWindowListeners(win, id);
      } catch (error) {
        this._handleError("attachWindowListeners", error);
      }
    }

    // Evento: ventana lista para mostrar
    win.once("ready-to-show", () => {
      try {
        win.show();
        const winState = this.windows.get(id)?.state;
        if (winState?.isMaximized) {
          win.maximize();
        }
        this._emitWindowEvent(id, WindowController.EVENTS.READY);
      } catch (error) {
        this._handleError("ready-to-show", error);
      }
    });

    // Evento: ventana cerrada
    win.on("closed", () => {
      this.windows.delete(id);
      this._emitWindowEvent(id, WindowController.EVENTS.CLOSED);
    });

    // Eventos adicionales
    const events = ["focus", "blur", "maximize", "unmaximize", "minimize", "restore"];
    events.forEach((event) => {
      win.on(event, () => this._emitWindowEvent(id, event));
    });

    // Prevenir navegación externa
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith("http") || url.startsWith("https")) {
        shell.openExternal(url);
        return { action: "deny" };
      }
      return { action: "allow" };
    });

    // Custom event handler
    if (onEvent && typeof onEvent === "function") {
      Object.values(WindowController.EVENTS).forEach((event) => {
        win.on(event, () => onEvent(event, win, id));
      });
    }
  }

  /**
   * Valida las opciones de configuración de ventana
   * @private
   * @param {Object} options - Opciones a validar
   * @returns {Object} Opciones validadas
   */
  _validateOptions(options) {
    const validated = { ...options };

    // Validar dimensiones
    if (validated.width && validated.width < 200) validated.width = 200;
    if (validated.height && validated.height < 200) validated.height = 200;

    // Validar webPreferences
    if (validated.webPreferences) {
      if (!validated.webPreferences.contextIsolation) {
        console.warn("⚠️ Advertencia: contextIsolation deshabilitado no es recomendado");
      }
      if (validated.webPreferences.nodeIntegration) {
        console.warn("⚠️ Advertencia: nodeIntegration habilitado es un riesgo de seguridad");
      }
    }

    return validated;
  }

  /**
   * Crea una nueva ventana de navegador
   * @param {Object} options - Opciones de configuración
   * @returns {Promise<BrowserWindow>} Ventana creada
   */
  async createWindow(options = {}) {
    try {
      if (!this.isReady()) {
        throw new Error("App no está lista. Usa whenReady() primero.");
      }

      const {
        id = `window_${Date.now()}`,
        stateWin = true,
        onEvent,
        ...userOptions
      } = options;

      // Verificar si ya existe
      if (this.windows.has(id)) {
        console.warn(`⚠️ Ventana "${id}" ya existe. Retornando ventana existente.`);
        return this.windows.get(id).window;
      }

      // Crear estado de ventana
      let winState = {};
      if (stateWin) {
        winState = this._createWindowState(id);
      }

      // Combinar opciones
      let finalOptions = {
        ...WindowController.DEFAULT_OPTIONS,
        ...userOptions,
        ...winState,
      };

      // Validar opciones
      finalOptions = this._validateOptions(finalOptions);

      // Asegurar extensión .mjs en preload
      if (finalOptions.webPreferences?.preload) {
        finalOptions.webPreferences.preload = await this._ensureMjsExtension(
          finalOptions.webPreferences.preload
        );
      }

      // Crear ventana
      const win = new BrowserWindow(finalOptions);

      // Guardar referencia
      this.windows.set(id, {
        window: win,
        state: winState,
        created: Date.now(),
        options: finalOptions,
      });

      // Configurar listeners
      this._setupWindowListeners(win, id, { stateWin, onEvent });

      console.log(`✓ Ventana creada: ${id}`);
      return win;
    } catch (error) {
      this._handleError("createWindow", error);
      throw error;
    }
  }

  /**
   * Alias para createWindow (compatibilidad con código anterior)
   */
  async set(options = {}) {
    return this.createWindow(options);
  }

  /**
   * Obtiene una ventana por su ID
   * @param {string} id - ID de la ventana
   * @returns {BrowserWindow|null}
   */
  getWindow(id) {
    const windowData = this.windows.get(id);
    return windowData?.window || null;
  }

  /**
   * Alias para getWindow
   */
  get(id) {
    return this.getWindow(id);
  }

  /**
   * Obtiene todas las ventanas
   * @returns {BrowserWindow[]}
   */
  getAllWindows() {
    return Array.from(this.windows.values()).map((data) => data.window);
  }

  /**
   * Alias para getAllWindows
   */
  getAll() {
    return this.getAllWindows();
  }

  /**
   * Obtiene información detallada de una ventana
   * @param {string} id - ID de la ventana
   * @returns {Object|null}
   */
  getWindowInfo(id) {
    const data = this.windows.get(id);
    if (!data) return null;

    const win = data.window;
    return {
      id,
      title: win.getTitle(),
      bounds: win.getBounds(),
      isMaximized: win.isMaximized(),
      isMinimized: win.isMinimized(),
      isVisible: win.isVisible(),
      isFocused: win.isFocused(),
      isDestroyed: win.isDestroyed(),
      created: data.created,
    };
  }

  /**
   * Cierra y elimina una ventana
   * @param {string} id - ID de la ventana
   * @returns {Promise<boolean>}
   */
  async closeWindow(id) {
    try {
      const windowData = this.windows.get(id);
      if (!windowData) {
        console.warn(`⚠️ Ventana "${id}" no encontrada`);
        return false;
      }

      const win = windowData.window;
      if (!win.isDestroyed()) {
        win.close();
      }

      this.windows.delete(id);
      console.log(`✓ Ventana cerrada: ${id}`);
      return true;
    } catch (error) {
      this._handleError("closeWindow", error);
      return false;
    }
  }

  /**
   * Alias para closeWindow
   */
  async remove(id) {
    return this.closeWindow(id);
  }

  /**
   * Cierra todas las ventanas
   * @returns {Promise<void>}
   */
  async closeAllWindows() {
    const ids = Array.from(this.windows.keys());
    await Promise.all(ids.map((id) => this.closeWindow(id)));
    console.log("✓ Todas las ventanas cerradas");
  }

  /**
   * Envía un mensaje a una ventana específica
   * @param {string} id - ID de la ventana
   * @param {string} channel - Canal IPC
   * @param  {...any} args - Argumentos
   * @returns {boolean}
   */
  send(id, channel, ...args) {
    try {
      const win = this.getWindow(id);
      if (!win || win.isDestroyed()) {
        console.warn(`⚠️ No se puede enviar mensaje a ventana "${id}"`);
        return false;
      }

      win.webContents.send(channel, ...args);
      return true;
    } catch (error) {
      this._handleError("send", error);
      return false;
    }
  }

  /**
   * Envía un mensaje a todas las ventanas
   * @param {string} channel - Canal IPC
   * @param  {...any} args - Argumentos
   */
  broadcast(channel, ...args) {
    this.windows.forEach((data, id) => {
      this.send(id, channel, ...args);
    });
  }

  /**
   * Carga un archivo o URL en una ventana
   * @param {string} id - ID de la ventana
   * @param {string} path - Ruta o URL
   * @returns {Promise<void>}
   */
  async loadContent(id, path) {
    try {
      const win = this.getWindow(id);
      if (!win) {
        throw new Error(`Ventana "${id}" no encontrada`);
      }

      if (path.startsWith("http://") || path.startsWith("https://")) {
        await win.loadURL(path);
      } else {
        const absolutePath = isAbsolute(path) ? path : join(process.cwd(), path);
        await win.loadFile(absolutePath);
      }

      console.log(`✓ Contenido cargado en "${id}": ${path}`);
    } catch (error) {
      this._handleError("loadContent", error);
      throw error;
    }
  }

  /**
   * Maximiza una ventana
   * @param {string} id - ID de la ventana
   */
  maximize(id) {
    const win = this.getWindow(id);
    if (win && !win.isMaximized()) {
      win.maximize();
    }
  }

  /**
   * Minimiza una ventana
   * @param {string} id - ID de la ventana
   */
  minimize(id) {
    const win = this.getWindow(id);
    if (win && !win.isMinimized()) {
      win.minimize();
    }
  }

  /**
   * Restaura una ventana
   * @param {string} id - ID de la ventana
   */
  restore(id) {
    const win = this.getWindow(id);
    if (win) {
      if (win.isMinimized()) {
        win.restore();
      } else if (win.isMaximized()) {
        win.unmaximize();
      }
    }
  }

  /**
   * Enfoca una ventana
   * @param {string} id - ID de la ventana
   */
  focus(id) {
    const win = this.getWindow(id);
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  }

  /**
   * Alterna pantalla completa
   * @param {string} id - ID de la ventana
   */
  toggleFullScreen(id) {
    const win = this.getWindow(id);
    if (win) {
      win.setFullScreen(!win.isFullScreen());
    }
  }

  /**
   * Establece el menú de una ventana
   * @param {string} id - ID de la ventana
   * @param {Menu} menu - Menú a establecer
   */
  setMenu(id, menu) {
    const win = this.getWindow(id);
    if (win) {
      win.setMenu(menu);
    }
  }

  /**
   * Muestra un diálogo de apertura de archivos
   * @param {string} id - ID de la ventana
   * @param {Object} options - Opciones del diálogo
   * @returns {Promise<Object>}
   */
  async showOpenDialog(id, options = {}) {
    const win = this.getWindow(id);
    return dialog.showOpenDialog(win, options);
  }

  /**
   * Muestra un diálogo de guardado de archivos
   * @param {string} id - ID de la ventana
   * @param {Object} options - Opciones del diálogo
   * @returns {Promise<Object>}
   */
  async showSaveDialog(id, options = {}) {
    const win = this.getWindow(id);
    return dialog.showSaveDialog(win, options);
  }

  /**
   * Muestra un cuadro de mensaje
   * @param {string} id - ID de la ventana
   * @param {Object} options - Opciones del mensaje
   * @returns {Promise<Object>}
   */
  async showMessageBox(id, options = {}) {
    const win = this.getWindow(id);
    return dialog.showMessageBox(win, options);
  }

  /**
   * Registra un listener para eventos de ventanas
   * @param {string} id - ID de la ventana
   * @param {string} event - Evento
   * @param {Function} callback - Callback
   */
  on(id, event, callback) {
    if (!this.eventListeners.has(id)) {
      this.eventListeners.set(id, new Map());
    }

    const listeners = this.eventListeners.get(id);
    if (!listeners.has(event)) {
      listeners.set(event, []);
    }

    listeners.get(event).push(callback);
  }

  /**
   * Elimina un listener de eventos
   * @param {string} id - ID de la ventana
   * @param {string} event - Evento
   * @param {Function} callback - Callback
   */
  off(id, event, callback) {
    const listeners = this.eventListeners.get(id)?.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emite un evento de ventana
   * @private
   * @param {string} id - ID de la ventana
   * @param {string} event - Evento
   */
  _emitWindowEvent(id, event) {
    const listeners = this.eventListeners.get(id)?.get(event);
    if (listeners) {
      const win = this.getWindow(id);
      listeners.forEach((callback) => {
        try {
          callback(win, id);
        } catch (error) {
          this._handleError(`eventListener:${event}`, error);
        }
      });
    }
  }

  /**
   * Emite un evento global
   * @param {string} event - Evento
   * @param  {...any} args - Argumentos
   */
  emit(event, ...args) {
    // Implementación básica para eventos globales
    console.log(`Event emitted: ${event}`, args);
  }

  /**
   * Obtiene información del sistema
   * @returns {Object}
   */
  getSystemInfo() {
    return {
      platform: this.platform,
      isLinux: this.isLinux,
      isWindows: this.isWindows,
      isMac: this.isMac,
      arch: process.arch,
      version: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
    };
  }

  /**
   * Obtiene estadísticas del controlador
   * @returns {Object}
   */
  getStats() {
    return {
      totalWindows: this.windows.size,
      watchedFiles: this.watchedFiles.size,
      windows: Array.from(this.windows.keys()).map((id) => ({
        id,
        info: this.getWindowInfo(id),
      })),
    };
  }

  /**
   * Sale de la aplicación
   * @param {number} exitCode - Código de salida
   */
  quitApp(exitCode = 0) {
    console.log("Cerrando aplicación...");
    this.cleanup();
    app.exit(exitCode);
  }

  /**
   * Alias para acciones rápidas
   * @param {string} action - Acción a ejecutar
   */
  at(action) {
    switch (action) {
      case "quit":
        this.quitApp();
        break;
      case "closeAll":
        this.closeAllWindows();
        break;
      case "stats":
        console.log(this.getStats());
        break;
      default:
        console.warn(`⚠️ Acción desconocida: ${action}`);
    }
  }

  /**
   * Limpieza de recursos
   */
  cleanup() {
    try {
      // Cerrar watchers de archivos
      this.watchedFiles.forEach((watcher, path) => {
        try {
          watcher.close();
          console.log(`✓ Watcher cerrado: ${path}`);
        } catch (error) {
          console.error(`Error cerrando watcher ${path}:`, error);
        }
      });
      this.watchedFiles.clear();

      // Limpiar listeners
      this.eventListeners.clear();

      console.log("✓ Recursos limpiados");
    } catch (error) {
      this._handleError("cleanup", error);
    }
  }

  /**
   * Manejo centralizado de errores
   * @private
   * @param {string} context - Contexto del error
   * @param {Error} error - Error
   */
  _handleError(context, error) {
    const errorMessage = `[WindowController:${context}] ${error.message}`;
    console.error(`❌ ${errorMessage}`);
    console.error(error.stack);

    // Aquí podrías agregar logging a archivo, reportes, etc.
  }
}

// Exportar instancia singleton
export const windowController = new WindowController();

// Exportar clase para casos de uso avanzados
export default WindowController;
