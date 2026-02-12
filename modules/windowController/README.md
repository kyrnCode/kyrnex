# 🚀 WindowController - Gestor Profesional de Ventanas para Electron

Una solución completa, robusta y profesional para gestionar ventanas en aplicaciones Electron.

## 📦 Contenido del Paquete

```
WindowController/
├── windowController.mjs    # Clase principal mejorada
├── DOCUMENTATION.md         # Documentación completa
├── examples.mjs            # 10 ejemplos prácticos
└── README.md               # Este archivo
```

## ✨ Mejoras Principales

### 🛡️ Seguridad
- ✅ `contextIsolation: true` por defecto
- ✅ `nodeIntegration: false` por defecto  
- ✅ Prevención de navegación externa
- ✅ Validación de todas las entradas

### 🔧 Manejo de Errores
- ✅ Try-catch en todas las operaciones críticas
- ✅ Logging centralizado con contexto
- ✅ Mensajes descriptivos
- ✅ Recuperación automática

### ⚡ Rendimiento
- ✅ Lazy initialization
- ✅ Caching de estados
- ✅ Watchers eficientes
- ✅ Cleanup automático de recursos
- ✅ Gestión optimizada de memoria

### 🎯 Nuevas Funcionalidades

**Gestión de Ventanas:**
- `createWindow()` - Crear ventanas con opciones avanzadas
- `getWindow()` - Obtener ventana por ID
- `getAllWindows()` - Obtener todas las ventanas
- `getWindowInfo()` - Información detallada
- `closeWindow()` - Cerrar ventana específica
- `closeAllWindows()` - Cerrar todas las ventanas

**Comunicación:**
- `send()` - Enviar mensaje a ventana específica
- `broadcast()` - Enviar mensaje a todas las ventanas

**Control de Ventanas:**
- `loadContent()` - Cargar HTML o URL
- `maximize()` / `minimize()` / `restore()` - Control de estado
- `focus()` - Enfocar ventana
- `toggleFullScreen()` - Pantalla completa
- `setMenu()` - Configurar menú

**Diálogos:**
- `showOpenDialog()` - Diálogo de apertura
- `showSaveDialog()` - Diálogo de guardado
- `showMessageBox()` - Cuadros de mensaje

**Eventos:**
- `on()` / `off()` - Gestión de eventos
- Sistema completo de eventos (focus, blur, maximize, etc.)

**Utilidades:**
- `getSystemInfo()` - Información del sistema
- `getStats()` - Estadísticas en tiempo real
- `quitApp()` - Salir de la aplicación
- `cleanup()` - Limpieza de recursos

## 🚀 Inicio Rápido

### Instalación

```javascript
import { windowController } from './windowController.mjs';
```

### Uso Básico

```javascript
import { windowController } from './windowController.mjs';

// 1. Esperar a que la app esté lista
await windowController.whenReady();

// 2. Crear ventana
const mainWin = await windowController.createWindow({
  id: 'main',
  width: 1024,
  height: 768,
  title: 'Mi Aplicación'
});

// 3. Cargar contenido
await windowController.loadContent('main', './index.html');

// 4. Enviar mensajes
windowController.send('main', 'update-data', { user: 'Juan' });

// 5. Escuchar eventos
windowController.on('main', 'focus', (win, id) => {
  console.log('Ventana enfocada');
});
```

## 📊 Comparación: Antes vs Después

| Aspecto | Antes ❌ | Después ✅ |
|---------|---------|-----------|
| Manejo de errores | Básico | Completo con try-catch |
| Seguridad | nodeIntegration: true | contextIsolation: true |
| Validación | Ninguna | Completa |
| Documentación | Mínima | Completa con JSDoc |
| Métodos | 7 | 35+ |
| Eventos | Básicos | Sistema completo |
| Diálogos | ❌ | ✅ Integrado |
| Broadcast | ❌ | ✅ Disponible |
| Stats | ❌ | ✅ Tiempo real |
| Cleanup | Manual | Automático |

## 💡 Ejemplos Incluidos

El archivo `examples.mjs` contiene 10 ejemplos completos:

1. **Aplicación Básica** - Setup inicial simple
2. **Multi-Ventana** - Comunicación entre ventanas
3. **Splash Screen** - Pantalla de carga
4. **Notificaciones** - Sistema de notificaciones
5. **Modal Settings** - Ventana modal de configuración
6. **Menús Dinámicos** - Sistema completo de menús
7. **Sincronización** - Sync de datos entre ventanas
8. **Ventana de Progreso** - Barra de progreso
9. **Eventos Custom** - Sistema de eventos
10. **App Completa** - Aplicación completa con todo integrado

## 📚 Documentación

Consulta `DOCUMENTATION.md` para:
- API completa con todos los métodos
- Ejemplos detallados de cada funcionalidad
- Mejores prácticas
- Solución de problemas comunes
- Guías avanzadas

## 🔑 Características Clave

### Auto-Conversión de Preload
```javascript
// El sistema convierte automáticamente .js a .mjs
webPreferences: {
  preload: './preload.js'  // ✅ Se convierte a preload.mjs
}
```

### Estado Persistente
```javascript
// Las ventanas recuerdan posición y tamaño
const win = await windowController.createWindow({
  id: 'main',
  stateWin: true  // ✅ Persistencia automática
});
```

### Gestión de Eventos
```javascript
// Sistema robusto de eventos
windowController.on('main', 'focus', (win, id) => {
  console.log('Ventana enfocada');
});
```

### Broadcast de Mensajes
```javascript
// Enviar a todas las ventanas a la vez
windowController.broadcast('global-update', { 
  timestamp: Date.now() 
});
```

### Diálogos Integrados
```javascript
// Mostrar diálogos fácilmente
const result = await windowController.showOpenDialog('main', {
  filters: [{ name: 'Images', extensions: ['jpg', 'png'] }]
});
```

### Estadísticas en Tiempo Real
```javascript
// Monitorear el estado de la aplicación
const stats = windowController.getStats();
console.log(stats);
// {
//   totalWindows: 3,
//   watchedFiles: 2,
//   windows: [...]
// }
```

## 🎯 Casos de Uso

### ✅ Aplicaciones de Escritorio
- Editores de texto
- IDEs
- Herramientas de diseño
- Dashboards

### ✅ Aplicaciones Multi-Ventana
- Sistemas de gestión
- Herramientas de productividad
- Aplicaciones de comunicación

### ✅ Aplicaciones Profesionales
- Software empresarial
- Herramientas de desarrollo
- Aplicaciones médicas
- Software financiero

## 🛠️ Requisitos

- Electron 20.0.0 o superior
- Node.js 16.0.0 o superior
- ES Modules habilitado

## 📝 Mejores Prácticas

### 1. Siempre Esperar a whenReady()
```javascript
await windowController.whenReady();
// Ahora puedes crear ventanas
```

### 2. Usar IDs Descriptivos
```javascript
const mainWin = await windowController.createWindow({ 
  id: 'main-window' 
});
```

### 3. Manejar Errores
```javascript
try {
  await windowController.loadContent('main', './page.html');
} catch (error) {
  console.error('Error:', error);
}
```

### 4. Limpiar Recursos
```javascript
app.on('before-quit', () => {
  windowController.cleanup();
});
```

### 5. Usar Seguridad por Defecto
```javascript
// La configuración por defecto ya es segura
const win = await windowController.createWindow({
  // contextIsolation: true ✅
  // nodeIntegration: false ✅
  // sandbox: true ✅
});
```

## 🐛 Solución de Problemas

### Ventana no se muestra
```javascript
// Asegúrate de que la app esté lista
await windowController.whenReady();
```

### Preload no funciona
```javascript
// La conversión a .mjs es automática
webPreferences: {
  preload: './preload.js'  // ✅ OK
}
```

### Memoria crece
```javascript
// Cerrar ventanas no usadas
await windowController.closeWindow('temp');
windowController.cleanup();
```

## 📈 Performance Tips

1. **Usar show: false** - Evita parpadeo inicial
2. **Cleanup periódico** - Libera recursos
3. **Batch updates** - Agrupa actualizaciones
4. **Lazy loading** - Carga bajo demanda
5. **Debounce events** - Para eventos frecuentes

## 🔐 Seguridad

El WindowController implementa las mejores prácticas de seguridad:

- ✅ Context Isolation habilitado
- ✅ Node Integration deshabilitado
- ✅ Sandbox habilitado
- ✅ Prevención de navegación externa
- ✅ Validación de entradas
- ✅ Manejo seguro de URLs

## 🎓 Recursos Adicionales

- [Documentación Completa](./DOCUMENTATION.md)
- [Ejemplos Prácticos](./examples.mjs)
- [Electron Docs](https://www.electronjs.org/docs)

## 📄 Licencia

Este código es de uso libre. Puedes usarlo, modificarlo y distribuirlo según tus necesidades.

## 🤝 Contribuciones

Las mejoras y sugerencias son bienvenidas. Este código está diseñado para ser:
- Robusto
- Mantenible
- Extensible
- Bien documentado

## 📞 Soporte

Para reportar bugs o solicitar funcionalidades:
1. Revisa la documentación completa
2. Consulta los ejemplos
3. Verifica las mejores prácticas

## 🎉 Conclusión

WindowController es una solución profesional que proporciona:

✅ **Robustez** - Manejo completo de errores  
✅ **Rendimiento** - Optimizado y eficiente  
✅ **Seguridad** - Mejores prácticas por defecto  
✅ **Productividad** - API extensa y fácil de usar  
✅ **Mantenibilidad** - Código limpio y documentado  

**¡Listo para producción!** 🚀

---

**Versión:** 2.0.0  
**Última actualización:** 2026  
**Compatibilidad:** Electron 20+, Node 16+
