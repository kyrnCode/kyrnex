/**
 * EJEMPLOS PRÁCTICOS DE USO - WindowController
 * 
 * Este archivo contiene ejemplos completos y funcionales
 * para diferentes casos de uso del WindowController mejorado
 */

import { windowController } from './windowController.mjs';
import { Menu, ipcMain, app } from 'electron';
import { join } from 'path';

// ============================================
// EJEMPLO 1: Aplicación Básica
// ============================================

async function example1_BasicApp() {
  console.log('\n=== EJEMPLO 1: Aplicación Básica ===\n');
  
  await windowController.whenReady();

  const mainWindow = await windowController.createWindow({
    id: 'main',
    width: 1024,
    height: 768,
    title: 'Mi Aplicación',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await windowController.loadContent('main', './index.html');
  
  console.log('✓ Aplicación básica iniciada');
}

// ============================================
// EJEMPLO 2: Multi-Ventana con Comunicación
// ============================================

async function example2_MultiWindow() {
  console.log('\n=== EJEMPLO 2: Multi-Ventana ===\n');
  
  await windowController.whenReady();

  // Ventana principal
  const mainWin = await windowController.createWindow({
    id: 'main',
    width: 1200,
    height: 800,
    title: 'Ventana Principal'
  });

  // Ventana secundaria
  const secondaryWin = await windowController.createWindow({
    id: 'secondary',
    width: 600,
    height: 400,
    title: 'Ventana Secundaria',
    x: 100,
    y: 100
  });

  await windowController.loadContent('main', './main.html');
  await windowController.loadContent('secondary', './secondary.html');

  // Comunicación entre ventanas
  ipcMain.on('message-from-main', (event, data) => {
    console.log('Mensaje desde main:', data);
    windowController.send('secondary', 'message-to-secondary', data);
  });

  ipcMain.on('message-from-secondary', (event, data) => {
    console.log('Mensaje desde secondary:', data);
    windowController.send('main', 'message-to-main', data);
  });

  console.log('✓ Sistema multi-ventana iniciado');
}

// ============================================
// EJEMPLO 3: Ventana con Splash Screen
// ============================================

async function example3_SplashScreen() {
  console.log('\n=== EJEMPLO 3: Splash Screen ===\n');
  
  await windowController.whenReady();

  // Crear splash screen
  const splash = await windowController.createWindow({
    id: 'splash',
    width: 500,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    stateWin: false
  });

  await windowController.loadContent('splash', './splash.html');
  console.log('✓ Splash screen mostrado');

  // Cargar ventana principal en segundo plano
  const main = await windowController.createWindow({
    id: 'main',
    width: 1024,
    height: 768,
    show: false
  });

  await windowController.loadContent('main', './index.html');

  // Simular carga de recursos
  setTimeout(async () => {
    await windowController.closeWindow('splash');
    windowController.focus('main');
    console.log('✓ Aplicación principal mostrada');
  }, 3000);
}

// ============================================
// EJEMPLO 4: Sistema de Notificaciones
// ============================================

class NotificationSystem {
  constructor() {
    this.notifications = new Map();
    this.notificationCount = 0;
  }

  async show(options = {}) {
    const {
      message = 'Notificación',
      type = 'info', // info, success, warning, error
      duration = 5000,
      position = 'bottom-right'
    } = options;

    const id = `notification_${this.notificationCount++}`;
    
    const notificationWin = await windowController.createWindow({
      id,
      width: 350,
      height: 100,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      stateWin: false,
      ...this._getPositionCoords(position)
    });

    await windowController.loadContent(id, './notification.html');
    
    windowController.send(id, 'configure-notification', {
      message,
      type
    });

    this.notifications.set(id, notificationWin);

    // Auto cerrar
    setTimeout(async () => {
      await this.close(id);
    }, duration);

    return id;
  }

  async close(id) {
    if (this.notifications.has(id)) {
      await windowController.closeWindow(id);
      this.notifications.delete(id);
    }
  }

  async closeAll() {
    const ids = Array.from(this.notifications.keys());
    await Promise.all(ids.map(id => this.close(id)));
  }

  _getPositionCoords(position) {
    const { screen } = require('electron');
    const display = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = display.workAreaSize;
    
    const margin = 20;
    const winWidth = 350;
    const winHeight = 100;

    const positions = {
      'top-right': { x: screenWidth - winWidth - margin, y: margin },
      'top-left': { x: margin, y: margin },
      'bottom-right': { x: screenWidth - winWidth - margin, y: screenHeight - winHeight - margin },
      'bottom-left': { x: margin, y: screenHeight - winHeight - margin },
    };

    return positions[position] || positions['bottom-right'];
  }
}

async function example4_Notifications() {
  console.log('\n=== EJEMPLO 4: Sistema de Notificaciones ===\n');
  
  await windowController.whenReady();
  
  const notifications = new NotificationSystem();

  // Mostrar diferentes tipos de notificaciones
  await notifications.show({
    message: 'Operación completada exitosamente',
    type: 'success',
    duration: 3000
  });

  setTimeout(() => {
    notifications.show({
      message: 'Advertencia: Revisa tu configuración',
      type: 'warning',
      duration: 4000
    });
  }, 1000);

  setTimeout(() => {
    notifications.show({
      message: 'Error al procesar la solicitud',
      type: 'error',
      duration: 5000
    });
  }, 2000);

  console.log('✓ Sistema de notificaciones activo');
}

// ============================================
// EJEMPLO 5: Ventana de Configuración Modal
// ============================================

async function example5_SettingsModal() {
  console.log('\n=== EJEMPLO 5: Ventana Modal de Configuración ===\n');
  
  await windowController.whenReady();

  // Ventana principal
  const mainWin = await windowController.createWindow({
    id: 'main',
    width: 1024,
    height: 768,
    title: 'Aplicación Principal'
  });

  await windowController.loadContent('main', './main.html');

  // Handler para abrir configuración
  ipcMain.on('open-settings', async () => {
    const existingSettings = windowController.getWindow('settings');
    
    if (existingSettings) {
      windowController.focus('settings');
      return;
    }

    const settingsWin = await windowController.createWindow({
      id: 'settings',
      width: 600,
      height: 500,
      title: 'Configuración',
      parent: mainWin,
      modal: true,
      resizable: false,
      webPreferences: {
        preload: join(__dirname, 'preload.js')
      }
    });

    await windowController.loadContent('settings', './settings.html');
    console.log('✓ Ventana de configuración abierta');
  });

  // Handler para guardar configuración
  ipcMain.on('save-settings', async (event, settings) => {
    console.log('Guardando configuración:', settings);
    
    // Guardar en archivo o base de datos
    // await saveSettings(settings);
    
    // Notificar a la ventana principal
    windowController.send('main', 'settings-updated', settings);
    
    // Cerrar ventana de configuración
    await windowController.closeWindow('settings');
    console.log('✓ Configuración guardada y ventana cerrada');
  });
}

// ============================================
// EJEMPLO 6: Sistema de Menús Dinámicos
// ============================================

class MenuManager {
  constructor() {
    this.menuTemplate = [];
  }

  buildMenu() {
    this.menuTemplate = [
      {
        label: 'Archivo',
        submenu: [
          {
            label: 'Nuevo',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.onNewFile()
          },
          {
            label: 'Abrir',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.onOpenFile()
          },
          { type: 'separator' },
          {
            label: 'Guardar',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.onSaveFile()
          },
          { type: 'separator' },
          {
            label: 'Salir',
            accelerator: 'CmdOrCtrl+Q',
            click: () => windowController.quitApp()
          }
        ]
      },
      {
        label: 'Editar',
        submenu: [
          { role: 'undo', label: 'Deshacer' },
          { role: 'redo', label: 'Rehacer' },
          { type: 'separator' },
          { role: 'cut', label: 'Cortar' },
          { role: 'copy', label: 'Copiar' },
          { role: 'paste', label: 'Pegar' }
        ]
      },
      {
        label: 'Ver',
        submenu: [
          { role: 'reload', label: 'Recargar' },
          { role: 'toggleDevTools', label: 'Herramientas de Desarrollo' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Zoom Normal' },
          { role: 'zoomIn', label: 'Acercar' },
          { role: 'zoomOut', label: 'Alejar' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Pantalla Completa' }
        ]
      },
      {
        label: 'Ventana',
        submenu: [
          {
            label: 'Minimizar',
            click: () => windowController.minimize('main')
          },
          {
            label: 'Maximizar',
            click: () => windowController.maximize('main')
          },
          { type: 'separator' },
          {
            label: 'Configuración',
            click: () => this.onOpenSettings()
          }
        ]
      },
      {
        label: 'Ayuda',
        submenu: [
          {
            label: 'Documentación',
            click: () => this.onOpenDocs()
          },
          {
            label: 'Acerca de',
            click: () => this.onAbout()
          }
        ]
      }
    ];

    return Menu.buildFromTemplate(this.menuTemplate);
  }

  async onNewFile() {
    windowController.send('main', 'new-file');
  }

  async onOpenFile() {
    const result = await windowController.showOpenDialog('main', {
      properties: ['openFile'],
      filters: [
        { name: 'Documentos', extensions: ['txt', 'md'] },
        { name: 'Todos', extensions: ['*'] }
      ]
    });

    if (!result.canceled) {
      windowController.send('main', 'open-file', result.filePaths[0]);
    }
  }

  async onSaveFile() {
    const result = await windowController.showSaveDialog('main', {
      filters: [
        { name: 'Documentos', extensions: ['txt', 'md'] }
      ]
    });

    if (!result.canceled) {
      windowController.send('main', 'save-file', result.filePath);
    }
  }

  onOpenSettings() {
    ipcMain.emit('open-settings');
  }

  async onOpenDocs() {
    const { shell } = require('electron');
    await shell.openExternal('https://docs.ejemplo.com');
  }

  async onAbout() {
    await windowController.showMessageBox('main', {
      type: 'info',
      title: 'Acerca de',
      message: 'Mi Aplicación v1.0.0',
      detail: 'Creado con Electron y WindowController'
    });
  }
}

async function example6_DynamicMenus() {
  console.log('\n=== EJEMPLO 6: Menús Dinámicos ===\n');
  
  await windowController.whenReady();

  const mainWin = await windowController.createWindow({
    id: 'main',
    width: 1024,
    height: 768,
    title: 'App con Menús'
  });

  await windowController.loadContent('main', './index.html');

  const menuManager = new MenuManager();
  const menu = menuManager.buildMenu();
  
  windowController.setMenu('main', menu);
  Menu.setApplicationMenu(menu);

  console.log('✓ Sistema de menús configurado');
}

// ============================================
// EJEMPLO 7: Sincronización de Datos
// ============================================

class DataSync {
  constructor() {
    this.data = new Map();
    this.setupListeners();
  }

  setupListeners() {
    ipcMain.on('data-update', (event, { key, value }) => {
      this.updateData(key, value);
    });

    ipcMain.on('data-request', (event, key) => {
      const value = this.data.get(key);
      event.reply('data-response', { key, value });
    });
  }

  updateData(key, value) {
    this.data.set(key, value);
    console.log(`Dato actualizado: ${key} = ${JSON.stringify(value)}`);
    
    // Broadcast a todas las ventanas
    windowController.broadcast('data-sync', { key, value });
  }

  getData(key) {
    return this.data.get(key);
  }

  getAllData() {
    return Object.fromEntries(this.data);
  }
}

async function example7_DataSync() {
  console.log('\n=== EJEMPLO 7: Sincronización de Datos ===\n');
  
  await windowController.whenReady();

  const dataSync = new DataSync();

  // Crear múltiples ventanas
  const windows = ['window1', 'window2', 'window3'];
  
  for (const id of windows) {
    const win = await windowController.createWindow({
      id,
      width: 400,
      height: 300,
      title: `Ventana ${id}`,
      webPreferences: {
        preload: join(__dirname, 'preload.js')
      }
    });

    await windowController.loadContent(id, './sync-window.html');
  }

  // Simular actualizaciones de datos
  setTimeout(() => {
    dataSync.updateData('user', { name: 'Juan', status: 'online' });
  }, 2000);

  setTimeout(() => {
    dataSync.updateData('config', { theme: 'dark', language: 'es' });
  }, 4000);

  console.log('✓ Sistema de sincronización activo');
}

// ============================================
// EJEMPLO 8: Ventana de Carga con Progreso
// ============================================

async function example8_ProgressWindow() {
  console.log('\n=== EJEMPLO 8: Ventana de Progreso ===\n');
  
  await windowController.whenReady();

  const progressWin = await windowController.createWindow({
    id: 'progress',
    width: 400,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    stateWin: false
  });

  await windowController.loadContent('progress', './progress.html');

  // Simular progreso
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    windowController.send('progress', 'update-progress', {
      percentage: progress,
      message: `Procesando... ${progress}%`
    });

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(async () => {
        await windowController.closeWindow('progress');
        console.log('✓ Proceso completado');
      }, 1000);
    }
  }, 500);
}

// ============================================
// EJEMPLO 9: Sistema de Eventos Personalizados
// ============================================

async function example9_CustomEvents() {
  console.log('\n=== EJEMPLO 9: Eventos Personalizados ===\n');
  
  await windowController.whenReady();

  const mainWin = await windowController.createWindow({
    id: 'main',
    width: 800,
    height: 600,
    title: 'Sistema de Eventos'
  });

  await windowController.loadContent('main', './index.html');

  // Registrar listeners
  windowController.on('main', 'focus', (win, id) => {
    console.log(`✓ Ventana ${id} enfocada`);
    windowController.send(id, 'window-focused');
  });

  windowController.on('main', 'blur', (win, id) => {
    console.log(`✓ Ventana ${id} desenfocada`);
    windowController.send(id, 'window-blurred');
  });

  windowController.on('main', 'maximize', (win, id) => {
    console.log(`✓ Ventana ${id} maximizada`);
    windowController.send(id, 'window-maximized');
  });

  windowController.on('main', 'minimize', (win, id) => {
    console.log(`✓ Ventana ${id} minimizada`);
    windowController.send(id, 'window-minimized');
  });

  windowController.on('main', 'closed', (win, id) => {
    console.log(`✓ Ventana ${id} cerrada`);
  });

  console.log('✓ Listeners de eventos registrados');
}

// ============================================
// EJEMPLO 10: Aplicación Completa
// ============================================

async function example10_CompleteApp() {
  console.log('\n=== EJEMPLO 10: Aplicación Completa ===\n');
  
  // Esperar a que la app esté lista
  await windowController.whenReady();

  // Inicializar sistemas
  const dataSync = new DataSync();
  const notifications = new NotificationSystem();
  const menuManager = new MenuManager();

  // Ventana principal
  const mainWin = await windowController.createWindow({
    id: 'main',
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Mi Aplicación Completa',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await windowController.loadContent('main', './index.html');

  // Configurar menú
  const menu = menuManager.buildMenu();
  windowController.setMenu('main', menu);
  Menu.setApplicationMenu(menu);

  // Configurar eventos
  windowController.on('main', 'ready', () => {
    console.log('✓ Aplicación lista');
    notifications.show({
      message: 'Aplicación iniciada correctamente',
      type: 'success'
    });
  });

  // Handlers IPC
  ipcMain.on('show-notification', (event, options) => {
    notifications.show(options);
  });

  ipcMain.on('data-update', (event, data) => {
    dataSync.updateData(data.key, data.value);
  });

  // Mostrar estadísticas en consola
  setInterval(() => {
    const stats = windowController.getStats();
    console.log('📊 Estadísticas:', {
      ventanas: stats.totalWindows,
      archivos: stats.watchedFiles
    });
  }, 30000);

  console.log('✓ Aplicación completa iniciada');
}

// ============================================
// EJECUTAR EJEMPLOS
// ============================================

// Descomentar el ejemplo que quieras ejecutar:

// example1_BasicApp();
// example2_MultiWindow();
// example3_SplashScreen();
// example4_Notifications();
// example5_SettingsModal();
// example6_DynamicMenus();
// example7_DataSync();
// example8_ProgressWindow();
// example9_CustomEvents();
// example10_CompleteApp();

// O ejecutar todos en secuencia (con delay)
async function runAllExamples() {
  const examples = [
    { fn: example1_BasicApp, delay: 5000 },
    { fn: example2_MultiWindow, delay: 5000 },
    { fn: example3_SplashScreen, delay: 5000 },
    { fn: example4_Notifications, delay: 8000 },
    { fn: example5_SettingsModal, delay: 5000 },
    { fn: example6_DynamicMenus, delay: 5000 },
    { fn: example7_DataSync, delay: 8000 },
    { fn: example8_ProgressWindow, delay: 8000 },
    { fn: example9_CustomEvents, delay: 5000 },
    { fn: example10_CompleteApp, delay: 10000 },
  ];

  for (const { fn, delay } of examples) {
    await fn();
    await new Promise(resolve => setTimeout(resolve, delay));
    await windowController.closeAllWindows();
    console.log('\n' + '='.repeat(50) + '\n');
  }
}

// runAllExamples();

export {
  example1_BasicApp,
  example2_MultiWindow,
  example3_SplashScreen,
  example4_Notifications,
  example5_SettingsModal,
  example6_DynamicMenus,
  example7_DataSync,
  example8_ProgressWindow,
  example9_CustomEvents,
  example10_CompleteApp,
  NotificationSystem,
  MenuManager,
  DataSync
};
