# WindowController - Documentación Completa

## 📋 Tabla de Contenidos
1. [Características Principales](#características-principales)
2. [Instalación](#instalación)
3. [Uso Básico](#uso-básico)
4. [API Completa](#api-completa)
5. [Ejemplos Avanzados](#ejemplos-avanzados)
6. [Mejores Prácticas](#mejores-prácticas)

## ✨ Características Principales

### Mejoras Implementadas

1. **Manejo Robusto de Errores**
   - Try-catch en todas las operaciones críticas
   - Logging centralizado con contexto
   - Validación de entradas
   - Mensajes de error descriptivos

2. **Rendimiento Optimizado**
   - Lazy initialization
   - Caching de estados
   - Watchers eficientes
   - Cleanup automático de recursos

3. **Seguridad Mejorada**
   - `contextIsolation: true` por defecto
   - `nodeIntegration: false` por defecto
   - Prevención de navegación externa
   - Validación de opciones

4. **Nuevas Funcionalidades**
   - Gestión de eventos personalizados
   - Broadcast de mensajes
   - Diálogos integrados
   - Información del sistema
   - Estadísticas en tiempo real

5. **Mejor Organización**
   - Métodos privados claramente identificados
   - Constantes centralizadas
   - Código documentado con JSDoc
   - Arquitectura modular

---

## 🚀 Instalación

```javascript
import { windowController } from './windowController.mjs';
// o
import WindowController from './windowController.mjs';
```

---

## 📖 Uso Básico

### Crear una Ventana Simple

```javascript
import { windowController } from './windowController.mjs';

// Esperar a que la app esté lista
await windowController.whenReady();

// Crear ventana
const mainWindow = await windowController.createWindow({
  id: 'main',
  width: 1024,
  height: 768,
  title: 'Mi Aplicación'
});

// Cargar contenido
await windowController.loadContent('main', './index.html');
```

### Crear Ventana con Preload

```javascript
const win = await windowController.createWindow({
  id: 'secure-window',
  webPreferences: {
    preload: './preload.js', // Se convierte automáticamente a .mjs
    contextIsolation: true,
    nodeIntegration: false
  }
});
```

### Ventana con Estado Persistente

```javascript
const win = await windowController.createWindow({
  id: 'persistent-window',
  stateWin: true, // Guarda posición y tamaño
  width: 800,
  height: 600
});
```

---

## 📚 API Completa

### Métodos de Ventana

#### `createWindow(options)` / `set(options)`
Crea una nueva ventana.

```javascript
const win = await windowController.createWindow({
  id: 'my-window',           // ID único (opcional, se genera automáticamente)
  width: 800,                // Ancho
  height: 600,               // Alto
  title: 'Mi Ventana',       // Título
  stateWin: true,            // Persistir estado (posición, tamaño)
  
  // Eventos personalizados
  onEvent: (event, win, id) => {
    console.log(`Evento ${event} en ventana ${id}`);
  },
  
  // Todas las opciones de BrowserWindow
  webPreferences: {
    preload: './preload.js'
  }
});
```

#### `getWindow(id)` / `get(id)`
Obtiene una ventana por ID.

```javascript
const win = windowController.getWindow('main');
if (win) {
  console.log('Ventana encontrada');
}
```

#### `getAllWindows()` / `getAll()`
Obtiene todas las ventanas.

```javascript
const allWindows = windowController.getAllWindows();
console.log(`Total de ventanas: ${allWindows.length}`);
```

#### `getWindowInfo(id)`
Obtiene información detallada de una ventana.

```javascript
const info = windowController.getWindowInfo('main');
console.log(info);
// {
//   id: 'main',
//   title: 'Mi App',
//   bounds: { x: 100, y: 100, width: 800, height: 600 },
//   isMaximized: false,
//   isMinimized: false,
//   isVisible: true,
//   isFocused: true,
//   isDestroyed: false,
//   created: 1234567890
// }
```

#### `closeWindow(id)` / `remove(id)`
Cierra una ventana específica.

```javascript
await windowController.closeWindow('main');
```

#### `closeAllWindows()`
Cierra todas las ventanas.

```javascript
await windowController.closeAllWindows();
```

### Métodos de Comunicación

#### `send(id, channel, ...args)`
Envía un mensaje a una ventana específica.

```javascript
windowController.send('main', 'update-data', { 
  user: 'Juan',
  status: 'online' 
});
```

#### `broadcast(channel, ...args)`
Envía un mensaje a todas las ventanas.

```javascript
windowController.broadcast('global-update', {
  timestamp: Date.now(),
  message: 'Actualización global'
});
```

### Métodos de Control de Ventana

#### `loadContent(id, path)`
Carga contenido en una ventana.

```javascript
// Cargar archivo HTML
await windowController.loadContent('main', './pages/home.html');

// Cargar URL
await windowController.loadContent('main', 'https://ejemplo.com');
```

#### `maximize(id)`
Maximiza una ventana.

```javascript
windowController.maximize('main');
```

#### `minimize(id)`
Minimiza una ventana.

```javascript
windowController.minimize('main');
```

#### `restore(id)`
Restaura una ventana.

```javascript
windowController.restore('main');
```

#### `focus(id)`
Enfoca una ventana.

```javascript
windowController.focus('main');
```

#### `toggleFullScreen(id)`
Alterna pantalla completa.

```javascript
windowController.toggleFullScreen('main');
```

#### `setMenu(id, menu)`
Establece el menú de una ventana.

```javascript
import { Menu } from 'electron';

const menu = Menu.buildFromTemplate([
  {
    label: 'Archivo',
    submenu: [
      { label: 'Nuevo', click: () => {} },
      { label: 'Abrir', click: () => {} }
    ]
  }
]);

windowController.setMenu('main', menu);
```

### Métodos de Diálogos

#### `showOpenDialog(id, options)`
Muestra diálogo de apertura de archivos.

```javascript
const result = await windowController.showOpenDialog('main', {
  title: 'Seleccionar archivos',
  filters: [
    { name: 'Imágenes', extensions: ['jpg', 'png', 'gif'] },
    { name: 'Todos', extensions: ['*'] }
  ],
  properties: ['openFile', 'multiSelections']
});

if (!result.canceled) {
  console.log('Archivos seleccionados:', result.filePaths);
}
```

#### `showSaveDialog(id, options)`
Muestra diálogo de guardado.

```javascript
const result = await windowController.showSaveDialog('main', {
  title: 'Guardar como',
  defaultPath: 'documento.txt',
  filters: [
    { name: 'Texto', extensions: ['txt'] }
  ]
});

if (!result.canceled) {
  console.log('Guardar en:', result.filePath);
}
```

#### `showMessageBox(id, options)`
Muestra un cuadro de mensaje.

```javascript
const result = await windowController.showMessageBox('main', {
  type: 'question',
  buttons: ['Sí', 'No', 'Cancelar'],
  defaultId: 0,
  title: 'Confirmar',
  message: '¿Deseas continuar?',
  detail: 'Esta acción no se puede deshacer.'
});

console.log('Botón presionado:', result.response);
```

### Métodos de Eventos

#### `on(id, event, callback)`
Registra un listener de eventos.

```javascript
windowController.on('main', 'focus', (win, id) => {
  console.log(`Ventana ${id} enfocada`);
});

windowController.on('main', 'closed', (win, id) => {
  console.log(`Ventana ${id} cerrada`);
});
```

Eventos disponibles:
- `ready` - Ventana lista
- `closed` - Ventana cerrada
- `focus` - Ventana enfocada
- `blur` - Ventana desenfocada
- `maximize` - Ventana maximizada
- `unmaximize` - Ventana des-maximizada
- `minimize` - Ventana minimizada
- `restore` - Ventana restaurada
- `resize` - Ventana redimensionada
- `move` - Ventana movida

#### `off(id, event, callback)`
Elimina un listener.

```javascript
const handler = (win, id) => console.log('Focus');
windowController.on('main', 'focus', handler);
windowController.off('main', 'focus', handler);
```

### Métodos de Utilidad

#### `whenReady(callback)`
Espera a que la aplicación esté lista.

```javascript
await windowController.whenReady(async () => {
  console.log('App lista!');
  // Inicializar ventanas
});
```

#### `isReady()`
Verifica si la app está lista.

```javascript
if (windowController.isReady()) {
  console.log('La aplicación está lista');
}
```

#### `getSystemInfo()`
Obtiene información del sistema.

```javascript
const info = windowController.getSystemInfo();
console.log(info);
// {
//   platform: 'win32',
//   isLinux: false,
//   isWindows: true,
//   isMac: false,
//   arch: 'x64',
//   version: 'v18.0.0',
//   electronVersion: '25.0.0',
//   chromeVersion: '114.0.0'
// }
```

#### `getStats()`
Obtiene estadísticas del controlador.

```javascript
const stats = windowController.getStats();
console.log(stats);
// {
//   totalWindows: 3,
//   watchedFiles: 2,
//   windows: [...]
// }
```

#### `quitApp(exitCode)`
Sale de la aplicación.

```javascript
windowController.quitApp(0); // Salida exitosa
```

#### `at(action)`
Acciones rápidas.

```javascript
windowController.at('quit');      // Salir
windowController.at('closeAll');  // Cerrar todas las ventanas
windowController.at('stats');     // Mostrar estadísticas
```

#### `cleanup()`
Limpia recursos manualmente.

```javascript
windowController.cleanup();
```

---

## 🎯 Ejemplos Avanzados

### Ejemplo 1: Aplicación Multi-Ventana

```javascript
import { windowController } from './windowController.mjs';

await windowController.whenReady();

// Ventana principal
const mainWin = await windowController.createWindow({
  id: 'main',
  width: 1200,
  height: 800,
  title: 'Ventana Principal',
  webPreferences: {
    preload: './preload.js'
  }
});

await windowController.loadContent('main', './main.html');

// Ventana de configuración
const settingsWin = await windowController.createWindow({
  id: 'settings',
  width: 600,
  height: 400,
  title: 'Configuración',
  parent: mainWin, // Ventana modal
  modal: true,
  show: false
});

await windowController.loadContent('settings', './settings.html');

// Mostrar configuración con botón
mainWin.webContents.on('ipc-message', (event, channel) => {
  if (channel === 'open-settings') {
    const settingsWindow = windowController.getWindow('settings');
    settingsWindow.show();
  }
});
```

### Ejemplo 2: Sistema de Notificaciones

```javascript
// Crear ventana de notificación
async function showNotification(message) {
  const notificationWin = await windowController.createWindow({
    id: `notification_${Date.now()}`,
    width: 350,
    height: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    stateWin: false
  });

  await windowController.loadContent(
    notificationWin.id, 
    './notification.html'
  );
  
  // Enviar mensaje
  windowController.send(notificationWin.id, 'show-message', message);
  
  // Auto cerrar después de 5 segundos
  setTimeout(() => {
    windowController.closeWindow(notificationWin.id);
  }, 5000);
}

// Uso
showNotification('¡Tarea completada!');
```

### Ejemplo 3: Sincronización Entre Ventanas

```javascript
// Configurar sincronización
windowController.on('main', 'ready', () => {
  const mainWin = windowController.getWindow('main');
  
  mainWin.webContents.on('ipc-message', (event, channel, data) => {
    if (channel === 'data-update') {
      // Sincronizar con todas las demás ventanas
      windowController.broadcast('sync-data', data);
    }
  });
});

// En el renderer (preload)
ipcRenderer.send('data-update', { user: 'Juan', status: 'online' });

// En otros renderers
ipcRenderer.on('sync-data', (event, data) => {
  console.log('Datos sincronizados:', data);
});
```

### Ejemplo 4: Manejo de Errores Personalizado

```javascript
class CustomWindowController extends WindowController {
  _handleError(context, error) {
    super._handleError(context, error);
    
    // Logging a archivo
    fs.appendFileSync(
      'error.log',
      `[${new Date().toISOString()}] ${context}: ${error.message}\n`
    );
    
    // Enviar a servicio de monitoreo
    sendToMonitoring({
      context,
      error: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
  }
}

const customController = new CustomWindowController();
```

### Ejemplo 5: Ventana con Splash Screen

```javascript
await windowController.whenReady();

// Splash screen
const splash = await windowController.createWindow({
  id: 'splash',
  width: 400,
  height: 300,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  stateWin: false
});

await windowController.loadContent('splash', './splash.html');

// Cargar aplicación principal en segundo plano
const main = await windowController.createWindow({
  id: 'main',
  width: 1024,
  height: 768,
  show: false // No mostrar aún
});

await windowController.loadContent('main', './index.html');

// Cuando la ventana principal esté lista
windowController.on('main', 'ready', () => {
  setTimeout(() => {
    windowController.closeWindow('splash');
    windowController.focus('main');
  }, 2000);
});
```

---

## 🏆 Mejores Prácticas

### 1. Siempre Esperar a `whenReady()`

```javascript
// ❌ Incorrecto
const win = await windowController.createWindow({...});

// ✅ Correcto
await windowController.whenReady();
const win = await windowController.createWindow({...});
```

### 2. Usar IDs Descriptivos

```javascript
// ❌ Evitar
const win1 = await windowController.createWindow({ id: 'w1' });

// ✅ Mejor
const mainWin = await windowController.createWindow({ id: 'main-window' });
const settingsWin = await windowController.createWindow({ id: 'settings-dialog' });
```

### 3. Manejar Errores Apropiadamente

```javascript
try {
  await windowController.loadContent('main', './page.html');
} catch (error) {
  console.error('Error cargando contenido:', error);
  // Mostrar mensaje al usuario
  await windowController.showMessageBox('main', {
    type: 'error',
    message: 'No se pudo cargar el contenido'
  });
}
```

### 4. Limpiar Recursos

```javascript
// Al cerrar la aplicación
app.on('before-quit', () => {
  windowController.cleanup();
});

// O manualmente
windowController.cleanup();
```

### 5. Usar Seguridad por Defecto

```javascript
// ✅ Configuración segura (por defecto)
const win = await windowController.createWindow({
  id: 'secure',
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
});
```

### 6. Eventos en Lugar de Polling

```javascript
// ❌ Evitar
setInterval(() => {
  const win = windowController.getWindow('main');
  if (win.isFocused()) {
    // hacer algo
  }
}, 100);

// ✅ Mejor
windowController.on('main', 'focus', (win, id) => {
  // hacer algo
});
```

### 7. Broadcast Eficiente

```javascript
// Para mensajes frecuentes, usa debounce
import { debounce } from 'lodash';

const broadcastUpdate = debounce((data) => {
  windowController.broadcast('update', data);
}, 100);

// Uso
broadcastUpdate({ status: 'updating' });
```

---

## 🔧 Solución de Problemas Comunes

### Problema: Ventana no se muestra

```javascript
// Verificar que la app esté lista
if (!windowController.isReady()) {
  await windowController.whenReady();
}

// Asegurar show: false y ready-to-show
const win = await windowController.createWindow({
  id: 'test',
  show: false // Se mostrará automáticamente en ready-to-show
});
```

### Problema: Preload no funciona

```javascript
// El sistema convierte automáticamente a .mjs
const win = await windowController.createWindow({
  webPreferences: {
    preload: './preload.js', // Se convierte a preload.mjs
    contextIsolation: true
  }
});
```

### Problema: Memoria crece con el tiempo

```javascript
// Asegurar cleanup de ventanas no usadas
await windowController.closeWindow('temp-window');

// Cleanup manual si es necesario
windowController.cleanup();
```

---

## 📊 Comparación: Antes vs Después

| Característica | Antes | Después |
|---------------|-------|---------|
| Manejo de errores | Básico | Completo con try-catch y logging |
| Validación | Ninguna | Validación de todas las entradas |
| Seguridad | `nodeIntegration: true` | `contextIsolation: true` por defecto |
| Eventos | Básicos | Sistema completo de eventos |
| Documentación | Comentarios mínimos | JSDoc completo |
| Métodos | 7 | 35+ métodos |
| Broadcast | No disponible | Sí |
| Diálogos | No disponible | Integrado |
| Stats | No disponible | Sí |
| Cleanup | Manual | Automático |
