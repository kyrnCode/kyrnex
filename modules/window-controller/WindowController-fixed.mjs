import { app, BrowserWindow, Menu } from "electron";
import PathUtils from "./js/pathUtils.mjs";
import { join, extname, parse } from "path";
import { promises as fs, watch } from "fs";
import { WindowStateManagerFactory } from "./utils/electron-window-state.mjs";

const { __dirname, __filename } = PathUtils.getFileDetails(import.meta.url);

class WindowController {
  constructor() {
    this.winstate = new WindowStateManagerFactory();
    // Ventanas
    this.winlinux = new Map();
    this.watchedFiles = new Map();

    // Configuraciones de la ventana
    this.isSistem = this.getSistem();
    this.options = {
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        // preload: join(__dirname, this.isSistem, "preload.mjs"),
      },
    };
  }

  whenReady(...argsReady) {
    app.whenReady().then(...argsReady);
  }

  at(at) {
    switch (at) {
      case "quit":
        app.quit();
        break;

      default:
        console.log(null);
        break;
    }
  }

  getSistem() {
    // Verificar si el sistema operativo es Linux o Windows
    const platform = process.platform;
    return platform === "linux" ? "linux" : "win";
  }

  async ensureMjsExtension(preloadPath) {
    const ext = extname(preloadPath);
    if (ext === ".mjs") {
      return preloadPath;
    }

    const { dir, name } = parse(preloadPath);
    const mjsPath = join(dir, `${name}.mjs`);

    // Función para actualizar la copia .mjs
    const updateMjsCopy = async () => {
      try {
        const originalContent = await fs.readFile(preloadPath, "utf-8");
        await fs.writeFile(mjsPath, originalContent, "utf-8");
      } catch (error) {
        console.error(
          `Error al actualizar la copia .mjs de ${preloadPath}:`,
          error
        );
      }
    };

    // Verificar si la copia .mjs está desactualizada o no existe
    try {
      const [originalStat, mjsStat] = await Promise.all([
        fs.stat(preloadPath),
        fs.stat(mjsPath).catch(() => null), // Si no existe el archivo `.mjs`, devuelve `null`
      ]);

      if (!mjsStat || originalStat.mtime > mjsStat.mtime) {
        await updateMjsCopy(); // Crear o actualizar la copia .mjs
      }
    } catch (error) {
      console.error("Error al asegurar la extensión .mjs:", error);
      return preloadPath;
    }

    // Configurar el watcher para monitorear cambios en el archivo original
    if (!this.watchedFiles.has(preloadPath)) {
      const watcher = watch(preloadPath, async (eventType) => {
        if (eventType === "change") {
          await updateMjsCopy(); // Actualizar la copia .mjs al detectar cambios
        }
      });

      this.watchedFiles.set(preloadPath, watcher);
    }

    return mjsPath;
  }

  createWindowState(windowName) {
    const winState = this.winstate.getInstance(windowName);
    return winState.applyStateToWindow(windowName);
  }

  async set(options = {}) {
    // id de la ventana
    const { id = "main_win", stateWin = true, ...allOptions } = options;

    // WindowState
    let winState = {};
    if (stateWin) {
      winState = this.createWindowState(id);
    }


    // Esto permite que las opciones del usuario sobrescriban el estado guardado
    const newConfig = { ...this.options, ...allOptions, ...winState};

    // Modificar `options` y asegurar que `preload` termine en `.mjs`
    if (newConfig.webPreferences && newConfig.webPreferences.preload) {
      newConfig.webPreferences.preload = await this.ensureMjsExtension(
        newConfig.webPreferences.preload
      );
    }

    const win = new BrowserWindow(newConfig);
    this.winlinux.set(id, win); // Guardar la ventana en el Map

    if (stateWin) {
      this.winstate.getInstance(id).attachWindowListeners(win, id);
    }

    // MEJORA: Limpiar watcher cuando se cierra la ventana
    win.on('closed', () => {
      this.winlinux.delete(id);
    });

    return win;
  }

  async remove(id) {
    const win = this.winlinux.get(id);
    if (win) {
      win.close(); // Cerrar la ventana si existe
      this.winlinux.delete(id); // Eliminarla del Map
    }
  }

  // MEJORA: Método para limpiar watchers
  closeWatcher(preloadPath) {
    const watcher = this.watchedFiles.get(preloadPath);
    if (watcher) {
      watcher.close();
      this.watchedFiles.delete(preloadPath);
    }
  }

  // MEJORA: Método para limpiar todos los watchers
  closeAllWatchers() {
    for (const [path, watcher] of this.watchedFiles) {
      watcher.close();
    }
    this.watchedFiles.clear();
  }

  get(id) {
    // Obtener una ventana por su ID
    return this.winlinux.get(id);
  }

  getAll() {
    // Obtener todas las ventanas en un array
    return Array.from(this.winlinux.values());
  }

  send(mainWindow, ...args) {
    const getwin = this.get(mainWindow);
    // CORRECCIÓN: Validar que la ventana existe y webContents está disponible
    if (getwin && !getwin.isDestroyed() && getwin.webContents) {
      getwin.webContents.send(...args);
    }
  }
}

// MEJORA: Limpiar watchers al cerrar la aplicación
app.on('before-quit', () => {
  if (windowcontroller) {
    windowcontroller.closeAllWatchers();
  }
});

export const windowcontroller = new WindowController();
export default WindowController;
