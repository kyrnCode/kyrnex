# JSON Scanner - Documentación Completa

Módulo ES6 profesional para escanear directorios y recolectar archivos JSON con control de profundidad, procesamiento paralelo y manejo robusto de errores.

## 📋 Características

- ✅ **Control de Profundidad** - Escaneo de 1 a N niveles de carpetas
- ✅ **Formato Flexible** - Combina como array u objeto
- ✅ **Eliminación de Duplicados** - Automática en arrays
- ✅ **Manejo de Errores Robusto** - No se detiene por archivos corruptos
- ✅ **Procesamiento Paralelo** - Optimizado para alto rendimiento
- ✅ **Async/Await** - 100% asíncrono y moderno
- ✅ **Filtros Personalizados** - Filtrar archivos por contenido
- ✅ **Transformaciones** - Modificar datos durante el escaneo
- ✅ **Estadísticas Completas** - Reportes detallados de cada escaneo
- ✅ **Callbacks de Progreso** - Monitorea el progreso en tiempo real
- ✅ **Enlaces Simbólicos** - Opción de seguirlos o ignorarlos

## 🚀 Instalación

```bash
# Copiar el archivo json-scanner.js a tu proyecto
cp json-scanner.js ./tu-proyecto/
```

## 📖 Uso Básico

```javascript
import JSONScanner from './json-scanner.js';

// Crear instancia con configuración
const scanner = new JSONScanner({
  maxDepth: 3,              // Profundidad máxima: 3 niveles
  outputFormat: 'array',    // Combinar como array
  removeDuplicates: true,   // Eliminar duplicados
  ignoreErrors: true        // Continuar si hay errores
});

// Escanear directorio
const result = await scanner.scan('./mi-carpeta');

console.log('Datos:', result.data);
console.log('Estadísticas:', result.stats);
```

## ⚙️ Opciones de Configuración

```javascript
const scanner = new JSONScanner({
  // === BÁSICAS ===
  maxDepth: 5,                    // Profundidad máxima de escaneo (1-∞)
  outputFormat: 'array',          // 'array' o 'object'
  
  // === DUPLICADOS ===
  removeDuplicates: true,         // Eliminar duplicados en arrays
  duplicateKey: 'id',             // Clave para detectar duplicados
  
  // === ERRORES ===
  ignoreErrors: true,             // Continuar si hay archivos con errores
  onError: (error, file) => {},   // Callback de error
  
  // === RENDIMIENTO ===
  parallel: true,                 // Procesar archivos en paralelo
  maxParallel: 10,                // Máximo de archivos simultáneos
  
  // === FILTROS ===
  filePattern: /\.json$/i,        // Patrón de archivos a buscar
  excludeDirs: [                  // Directorios a excluir
    'node_modules',
    '.git',
    'dist',
    'build'
  ],
  
  // === AVANZADAS ===
  followSymlinks: false,          // Seguir enlaces simbólicos
  encoding: 'utf8',               // Codificación de archivos
  verbose: false,                 // Modo verbose para debugging
  
  // === CALLBACKS ===
  onProgress: (current, total) => {
    console.log(`Progreso: ${current}/${total}`);
  },
  
  // === FILTRO PERSONALIZADO ===
  filter: (data, file) => {
    // Retornar true para incluir, false para excluir
    return data.active === true;
  },
  
  // === TRANSFORMACIÓN ===
  transform: (data, file) => {
    // Modificar datos antes de combinar
    return { ...data, source: file };
  }
});
```

## 📚 Métodos Principales

### `scan(rootPath, maxDepth)`
Escanea un directorio y recolecta todos los archivos JSON.

```javascript
const result = await scanner.scan('./data', 3);

// Resultado:
{
  data: [...],           // Datos combinados
  stats: {
    filesScanned: 50,
    filesProcessed: 48,
    filesSkipped: 2,
    errorCount: 2,
    duration: '1250ms',
    totalSize: '2.5 MB',
    itemsCount: 150,
    successRate: '96%'
  }
}
```

### `scanMultiple(paths, maxDepth)`
Escanea múltiples directorios y combina los resultados.

```javascript
const result = await scanner.scanMultiple([
  './data/users',
  './data/products',
  './data/orders'
], 2);
```

### `getInfo(rootPath, maxDepth)`
Obtiene información sin procesar los archivos.

```javascript
const info = await scanner.getInfo('./data', 3);

// Resultado:
{
  path: '/absolute/path/to/data',
  filesFound: 50,
  totalSize: '2.5 MB',
  depth: 3,
  files: [...]  // Lista de archivos encontrados
}
```

### `scanGrouped(rootPath, maxDepth)`
Escanea y agrupa por directorio padre.

```javascript
const result = await scanner.scanGrouped('./data', 2);

// Resultado:
{
  data: {
    'root': [...],
    'users': [...],
    'products': [...]
  },
  stats: {...}
}
```

## 🎯 Ejemplos de Uso

### Ejemplo 1: Escaneo Básico

```javascript
import JSONScanner from './json-scanner.js';

const scanner = new JSONScanner({
  maxDepth: 2,
  outputFormat: 'array'
});

const result = await scanner.scan('./data');

console.log(`Se procesaron ${result.stats.filesProcessed} archivos`);
console.log(`Total de items: ${result.stats.itemsCount}`);
console.log('Datos:', result.data);
```

### Ejemplo 2: Estructura de Carpetas con Metadatos

```
proyecto/
├── users/
│   └── metadata.json      { id: 1, name: "Users", type: "collection" }
├── products/
│   ├── electronics/
│   │   └── metadata.json  { id: 2, name: "Electronics", category: "products" }
│   └── metadata.json      { id: 3, name: "Products", type: "collection" }
└── orders/
    └── metadata.json      [{ id: 4, date: "2024-01-01" }]
```

```javascript
// Recolectar todos los metadatos como array
const scanner = new JSONScanner({
  maxDepth: 3,
  outputFormat: 'array',
  removeDuplicates: true
});

const result = await scanner.scan('./proyecto');

// Resultado: [
//   { id: 1, name: "Users", type: "collection" },
//   { id: 2, name: "Electronics", category: "products" },
//   { id: 3, name: "Products", type: "collection" },
//   { id: 4, date: "2024-01-01" }
// ]
```

### Ejemplo 3: Arrays en Cada Archivo

```
data/
├── users/
│   └── data.json    [{ id: 1, name: "Juan" }, { id: 2, name: "María" }]
├── products/
│   └── data.json    [{ id: 1, title: "Laptop" }, { id: 2, title: "Mouse" }]
└── orders/
    └── data.json    [{ id: 1, total: 100 }, { id: 1, total: 200 }]
```

```javascript
// Combinar todos los arrays y eliminar duplicados por ID
const scanner = new JSONScanner({
  maxDepth: 2,
  outputFormat: 'array',
  removeDuplicates: true,
  duplicateKey: 'id'
});

const result = await scanner.scan('./data');

// Combina todos los arrays en uno solo y elimina duplicados
```

### Ejemplo 4: Objetos a Array

```
configs/
├── app/
│   └── config.json    { theme: "dark", lang: "es" }
├── user/
│   └── config.json    { name: "Juan", email: "juan@email.com" }
└── system/
    └── config.json    { version: "1.0", env: "prod" }
```

```javascript
// Convertir objetos en array
const scanner = new JSONScanner({
  maxDepth: 2,
  outputFormat: 'array'
});

const result = await scanner.scan('./configs');

// Resultado: [
//   { theme: "dark", lang: "es" },
//   { name: "Juan", email: "juan@email.com" },
//   { version: "1.0", env: "prod" }
// ]
```

### Ejemplo 5: Control de Profundidad

```javascript
// Nivel 1: Solo carpetas inmediatas
const shallow = new JSONScanner({ maxDepth: 1 });
const result1 = await shallow.scan('./data');

// Nivel 3: Hasta 3 niveles de profundidad
const medium = new JSONScanner({ maxDepth: 3 });
const result3 = await medium.scan('./data');

// Nivel 10: Escaneo profundo
const deep = new JSONScanner({ maxDepth: 10 });
const result10 = await deep.scan('./data');
```

### Ejemplo 6: Filtrado Personalizado

```javascript
// Solo archivos con status "active"
const scanner = new JSONScanner({
  filter: (data, file) => {
    return data.status === 'active';
  }
});

const result = await scanner.scan('./data');
// Solo incluye archivos donde status === 'active'
```

### Ejemplo 7: Transformación de Datos

```javascript
// Agregar metadata a cada item
const scanner = new JSONScanner({
  transform: (data, file) => {
    return {
      ...data,
      _source: file,
      _scannedAt: new Date().toISOString()
    };
  }
});

const result = await scanner.scan('./data');
// Cada item tiene _source y _scannedAt
```

### Ejemplo 8: Monitoreo de Progreso

```javascript
const scanner = new JSONScanner({
  verbose: true,
  onProgress: (current, total) => {
    const percent = ((current / total) * 100).toFixed(0);
    console.log(`Progreso: ${percent}% (${current}/${total})`);
  },
  onError: (error, file) => {
    console.error(`Error en ${file}:`, error.message);
  }
});

const result = await scanner.scan('./data');
```

### Ejemplo 9: Múltiples Directorios

```javascript
const scanner = new JSONScanner({
  maxDepth: 2,
  outputFormat: 'array'
});

const result = await scanner.scanMultiple([
  './data/2023',
  './data/2024',
  './data/2025'
]);

console.log('Datos combinados de todos los años:', result.data);
```

### Ejemplo 10: Escaneo Agrupado

```javascript
const scanner = new JSONScanner({
  maxDepth: 3
});

const result = await scanner.scanGrouped('./data');

// Resultado agrupado por carpeta:
// {
//   'users': [...datos de users...],
//   'products': [...datos de products...],
//   'orders': [...datos de orders...]
// }
```

## 🔥 Casos de Uso Reales

### Caso 1: Recolectar Metadatos de Componentes

```javascript
// Estructura:
// components/
//   Header/metadata.json
//   Footer/metadata.json
//   Sidebar/metadata.json

const scanner = new JSONScanner({
  maxDepth: 2,
  outputFormat: 'array',
  filter: (data) => data.type === 'component'
});

const components = await scanner.scan('./components');
// Array con metadatos de todos los componentes
```

### Caso 2: Consolidar Configuraciones

```javascript
// Múltiples archivos de config en diferentes carpetas
const scanner = new JSONScanner({
  maxDepth: 5,
  outputFormat: 'object',
  transform: (data, file) => {
    const name = file.split('/').slice(-2, -1)[0];
    return { [name]: data };
  }
});

const configs = await scanner.scan('./configs');
// Objeto con todas las configuraciones consolidadas
```

### Caso 3: Migración de Datos

```javascript
// Recolectar datos de sistema antiguo
const scanner = new JSONScanner({
  maxDepth: 10,
  outputFormat: 'array',
  removeDuplicates: true,
  duplicateKey: 'legacyId',
  ignoreErrors: true,  // Muchos archivos pueden estar corruptos
  onError: (error, file) => {
    // Log errores para revisión manual
    console.error(`Archivo corrupto: ${file}`);
  }
});

const legacy = await scanner.scan('./legacy-data');
// Datos limpios para migración
```

### Caso 4: Análisis de Datos

```javascript
// Recolectar logs/datos para análisis
const scanner = new JSONScanner({
  maxDepth: 3,
  outputFormat: 'array',
  filter: (data) => {
    // Solo datos del último mes
    const date = new Date(data.timestamp);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return date > oneMonthAgo;
  },
  parallel: true,
  maxParallel: 20  // Alta concurrencia para archivos grandes
});

const recentData = await scanner.scan('./logs');
```

### Caso 5: Catálogo de Productos

```javascript
// Estructura:
// products/
//   electronics/laptops/items.json
//   electronics/phones/items.json
//   clothing/shirts/items.json

const scanner = new JSONScanner({
  maxDepth: 4,
  outputFormat: 'array',
  removeDuplicates: true,
  duplicateKey: 'sku',
  transform: (data, file) => {
    const category = file.split('/').slice(-3, -2)[0];
    const subcategory = file.split('/').slice(-2, -1)[0];
    
    if (Array.isArray(data)) {
      return data.map(item => ({
        ...item,
        category,
        subcategory
      }));
    }
    return { ...data, category, subcategory };
  }
});

const catalog = await scanner.scan('./products');
// Catálogo completo con categorías asignadas
```

## ⚡ Optimización de Rendimiento

### Ajustar Paralelismo

```javascript
// Para archivos pequeños y muchos archivos
const scanner = new JSONScanner({
  parallel: true,
  maxParallel: 20  // Mayor concurrencia
});

// Para archivos grandes
const scanner = new JSONScanner({
  parallel: true,
  maxParallel: 5   // Menor concurrencia para evitar sobrecarga
});

// Para procesamiento secuencial
const scanner = new JSONScanner({
  parallel: false  // Un archivo a la vez
});
```

### Excluir Directorios Innecesarios

```javascript
const scanner = new JSONScanner({
  excludeDirs: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'temp',
    'cache',
    'logs'
  ]
});
```

### Limitar Profundidad

```javascript
// Solo 2 niveles (más rápido)
const scanner = new JSONScanner({ maxDepth: 2 });
```

## 🛡️ Manejo de Errores

El módulo **nunca se detiene** por archivos corruptos:

```javascript
const scanner = new JSONScanner({
  ignoreErrors: true,  // Continuar ante errores
  onError: (error, file) => {
    // Log personalizado de errores
    console.error(`Error: ${file} - ${error.message}`);
  }
});

const result = await scanner.scan('./data');

// Revisar errores
console.log('Archivos con error:', result.stats.errors);
// [
//   { path: '/path/file.json', error: 'Unexpected token', type: 'SyntaxError' }
// ]
```

## 📊 Estadísticas Detalladas

```javascript
const result = await scanner.scan('./data');

console.log(result.stats);
// {
//   filesScanned: 100,        // Archivos encontrados
//   filesProcessed: 95,       // Procesados exitosamente
//   filesSkipped: 5,          // Omitidos (errores o filtros)
//   totalFiles: 100,
//   successRate: '95%',       // Tasa de éxito
//   errors: [...],            // Array de errores
//   errorCount: 5,            // Cantidad de errores
//   duration: '2500ms',       // Duración en milisegundos
//   durationSeconds: '2.50s', // Duración en segundos
//   totalSize: '10.5 MB',     // Tamaño total procesado
//   itemsCount: 450           // Items en resultado final
// }
```

## 🔍 Patrones de Archivos

```javascript
// Solo archivos JSON
filePattern: /\.json$/i

// JSON y JSONL
filePattern: /\.(json|jsonl)$/i

// Archivos específicos
filePattern: /metadata\.json$/i

// Múltiples nombres
filePattern: /(config|settings|metadata)\.json$/i
```

## 📦 Formato de Salida

### Como Array (default)
```javascript
{ outputFormat: 'array' }

// Objetos → Array de objetos
// Arrays → Array combinado (sin duplicados)
```

### Como Objeto
```javascript
{ outputFormat: 'object' }

// Objetos → Objeto merged
// Arrays → Objeto con claves basadas en duplicateKey
```

## 🚨 Notas Importantes

1. **Archivos Corruptos**: Se omiten automáticamente con `ignoreErrors: true`
2. **Duplicados**: Solo se eliminan en modo `array` con `removeDuplicates: true`
3. **Rendimiento**: Ajustar `maxParallel` según el hardware
4. **Memoria**: Para directorios muy grandes, considerar procesar por lotes
5. **Enlaces Simbólicos**: Por defecto se ignoran para evitar loops infinitos

## 📄 Licencia

MIT - Uso libre

## 🤝 Soporte

Este módulo está diseñado para ser robusto y manejar cualquier situación sin interrumpir tu aplicación.
