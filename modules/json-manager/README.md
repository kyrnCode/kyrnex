# JSON Manager - Documentación Completa

Módulo ES6 profesional para manejo de archivos JSON en Node.js con soporte completo para operaciones CRUD, búsquedas profundas, cache y más.

## 📋 Características

- ✅ **ES6 Puro** - Sin dependencias externas, solo módulos nativos de Node.js
- ✅ **Operaciones CRUD completas** - Create, Read, Update, Delete
- ✅ **Búsqueda profunda** - Buscar en estructuras anidadas de cualquier nivel
- ✅ **Notación de punto** - Acceso fácil a propiedades anidadas (`user.profile.name`)
- ✅ **Claves personalizadas** - No solo `id`, usa cualquier clave (ISBN, SKU, etc.)
- ✅ **Cache inteligente** - Mejora el rendimiento para lecturas frecuentes
- ✅ **Manejo robusto de errores** - No interrumpe la ejecución de tu programa
- ✅ **Múltiples archivos** - Maneja varios JSON simultáneamente
- ✅ **Backups automáticos** - Opcional, para mayor seguridad
- ✅ **TypeScript-friendly** - Aunque es ES6 puro, funciona perfecto con TS

## 🚀 Instalación

```bash
# Copiar el archivo json-manager.mjs a tu proyecto
cp json-manager.mjs ./tu-proyecto/
```

## 📖 Uso Básico

```javascript
import JSONManager from './json-manager.mjs';

// Crear instancia
const db = new JSONManager('./data/users.json', {
  prettify: true,    // JSON formateado
  autoSave: true,    // Guardar automáticamente
  cache: true,       // Habilitar cache
  backup: false      // Crear backups
});

// Escribir datos
await db.write({
  users: [
    { id: 1, name: 'Juan', email: 'juan@email.com' },
    { id: 2, name: 'María', email: 'maria@email.com' }
  ]
});

// Leer datos
const data = await db.read();

// Obtener valor específico
const userName = await db.get('users.0.name'); // "Juan"

// Actualizar valor
await db.set('users.0.age', 25);

// Buscar por ID
const user = await db.findById(1, 'users');

// Actualizar por ID
await db.updateById(1, { age: 26 }, 'users');
```

## 🔧 API Completa

### Constructor

```javascript
new JSONManager(filePath, options)
```

**Parámetros:**
- `filePath` (string): Ruta al archivo JSON
- `options` (object): Configuración opcional
  - `autoSave` (boolean): Auto-guardar cambios (default: true)
  - `prettify` (boolean): Formatear JSON (default: true)
  - `encoding` (string): Codificación (default: 'utf8')
  - `backup` (boolean): Crear backups (default: false)
  - `cache` (boolean): Habilitar cache (default: true)

### Métodos de Lectura

#### `read()`
Lee el archivo JSON completo.

```javascript
const data = await db.read();
```

#### `get(path, defaultValue)`
Obtiene un valor por ruta (notación de punto).

```javascript
const theme = await db.get('settings.theme', 'light');
const firstName = await db.get('users.0.name');
const nested = await db.get('company.departments.0.employees.0.projects.0.name');
```

#### `has(path)`
Verifica si existe una ruta.

```javascript
const exists = await db.has('users.0.email'); // true/false
```

### Métodos de Escritura

#### `write(data, merge)`
Escribe datos en el archivo.

```javascript
// Sobrescribir completamente
await db.write({ users: [] });

// Hacer merge con datos existentes
await db.write({ settings: { theme: 'dark' } }, true);
```

#### `set(path, value)`
Establece un valor en una ruta específica.

```javascript
await db.set('settings.theme', 'dark');
await db.set('users.0.age', 25);
await db.set('new.nested.path', 'value'); // Crea la estructura automáticamente
```

#### `delete(path)`
Elimina una ruta.

```javascript
await db.delete('users.0.temporaryField');
```

#### `clear(initialValue)`
Limpia el archivo JSON.

```javascript
await db.clear(); // Deja {}
await db.clear({ users: [] }); // Establece valor inicial
```

### Métodos de Búsqueda

#### `findBy(key, value, searchPath)`
Busca elementos por clave y valor (búsqueda profunda).

```javascript
// Buscar en todo el archivo
const admins = await db.findBy('role', 'admin');

// Buscar en una ruta específica
const activeProjects = await db.findBy('status', 'active', 'projects');
```

#### `findById(id, searchPath, idKey)`
Busca un elemento por ID.

```javascript
// Buscar con ID por defecto
const user = await db.findById(123, 'users');

// Buscar con clave personalizada
const book = await db.findById('978-1234567890', 'books', 'isbn');
```

### Métodos de Actualización

#### `updateById(id, updates, searchPath, idKey)`
Actualiza un elemento por ID.

```javascript
// Actualizar usuario
await db.updateById(1, { name: 'Nuevo Nombre', age: 30 }, 'users');

// Actualizar con clave personalizada
await db.updateById('SKU001', { price: 99.99 }, 'products', 'sku');
```

### Métodos de Eliminación

#### `deleteById(id, searchPath, idKey)`
Elimina un elemento por ID.

```javascript
// Eliminar usuario
await db.deleteById(1, 'users');

// Eliminar con clave personalizada
await db.deleteById('ISBN-123', 'books', 'isbn');
```

### Métodos para Arrays

#### `push(path, item)`
Agrega un elemento al final de un array.

```javascript
await db.push('users', { id: 3, name: 'Pedro' });
await db.push('tasks', { title: 'Nueva tarea', completed: false });
```

#### `filter(path, predicate)`
Filtra elementos de un array.

```javascript
const pending = await db.filter('tasks', task => !task.completed);
const expensive = await db.filter('products', p => p.price > 100);
```

#### `find(path, predicate)`
Busca un elemento en un array.

```javascript
const admin = await db.find('users', user => user.role === 'admin');
const task = await db.find('tasks', t => t.priority === 'high');
```

### Métodos de Utilidad

#### `invalidateCache()`
Invalida el cache para forzar lectura del archivo.

```javascript
db.invalidateCache();
```

## 🔥 Ejemplos Avanzados

### Estructuras Anidadas Profundas

```javascript
const db = new JSONManager('./company.json');

await db.write({
  company: {
    departments: [
      {
        name: 'IT',
        employees: [
          {
            id: 1,
            name: 'Ana',
            projects: [
              { id: 'P1', name: 'App Mobile' }
            ]
          }
        ]
      }
    ]
  }
});

// Acceder a dato profundamente anidado
const projectName = await db.get('company.departments.0.employees.0.projects.0.name');

// Buscar en cualquier nivel
const employee = await db.findById(1);
const project = await db.findById('P1');
```

### Múltiples Archivos JSON

```javascript
import { JSONManagerMulti } from './json-manager.mjs';

const multi = new JSONManagerMulti();

// Obtener managers para diferentes archivos
const usersDB = multi.get('./users.json');
const productsDB = multi.get('./products.json');
const ordersDB = multi.get('./orders.json');

// Trabajar con cada archivo
await usersDB.write({ users: [...] });
await productsDB.write({ products: [...] });
await ordersDB.write({ orders: [...] });

// Invalidar todos los caches
multi.invalidateAllCaches();

// Limpiar managers
multi.clear();
```

### Claves Personalizadas

```javascript
// Usar ISBN como clave
const books = new JSONManager('./books.json');

await books.write({
  books: [
    { isbn: '978-1234567890', title: 'Libro 1' },
    { isbn: '978-0987654321', title: 'Libro 2' }
  ]
});

// Buscar por ISBN
const book = await books.findById('978-1234567890', 'books', 'isbn');

// Actualizar por ISBN
await books.updateById('978-1234567890', { price: 29.99 }, 'books', 'isbn');

// Eliminar por ISBN
await books.deleteById('978-0987654321', 'books', 'isbn');
```

### Operaciones Complejas

```javascript
const db = new JSONManager('./inventory.json');

// Buscar todos los productos de bajo stock
const lowStock = await db.filter('products', p => p.stock < 10);

// Actualizar precios en lote
for (const product of lowStock) {
  await db.updateById(
    product.id, 
    { discountPrice: product.price * 0.8 },
    'products'
  );
}

// Buscar por múltiples criterios
const filtered = await db.filter('products', p => 
  p.category === 'electronics' && p.price > 100 && p.stock > 0
);
```

## ⚡ Rendimiento

### Cache

El cache mejora significativamente el rendimiento para lecturas frecuentes:

```javascript
const db = new JSONManager('./large.json', { cache: true });

// Primera lectura: ~50ms (desde archivo)
await db.read();

// Segunda lectura: ~0.5ms (desde cache)
await db.read();

// Invalidar cuando sea necesario
db.invalidateCache();
```

### Pretty Print

Para mejor rendimiento en producción:

```javascript
const db = new JSONManager('./data.json', {
  prettify: false  // JSON compacto, más rápido
});
```

## 🛡️ Manejo de Errores

El módulo tiene manejo robusto de errores que no interrumpe la ejecución:

```javascript
try {
  const user = await db.findById(999, 'users');
  
  if (!user) {
    console.log('Usuario no encontrado');
  }
} catch (error) {
  console.error('Error:', error.message);
  console.error('Operación:', error.operation);
  console.error('Archivo:', error.filePath);
  console.error('Error original:', error.originalError);
}
```

### Casos Especiales

```javascript
// Archivo no existe: retorna {} sin error
const data = await db.read();

// Ruta no existe: retorna defaultValue
const value = await db.get('nonexistent.path', 'default');

// Push en no-array: lanza error controlado
try {
  await db.push('notAnArray', 'item');
} catch (error) {
  // Error manejado, programa continúa
}
```

## 🔒 Backups

```javascript
const db = new JSONManager('./important.json', {
  backup: true  // Crea archivo.json.backup antes de cada escritura
});

await db.write(data); // Crea backup automáticamente
```

## 📝 Notación de Rutas

El módulo soporta múltiples formas de acceder a datos:

```javascript
// Notación de punto
await db.get('user.profile.name');

// Arrays con índices
await db.get('users.0.name');

// Combinado
await db.get('company.departments.0.employees.1.projects.0.name');

// Notación de corchetes (se convierte automáticamente)
await db.get('users[0].name');
```

## 🎯 Casos de Uso

### Base de Datos Ligera
```javascript
const db = new JSONManager('./database.json');
// CRUD completo para aplicaciones pequeñas
```

### Configuración de Aplicación
```javascript
const config = new JSONManager('./config.json', { prettify: true });
await config.set('app.theme', 'dark');
```

### Cache de Datos
```javascript
const cache = new JSONManager('./cache.json', { cache: true });
// Lecturas ultra-rápidas
```

### Logs Estructurados
```javascript
const logs = new JSONManager('./logs.json');
await logs.push('entries', { timestamp: Date.now(), message: 'Event' });
```

## 🚨 Limitaciones

- No soporta transacciones atómicas
- Para archivos muy grandes (>100MB) considerar una base de datos real
- Las escrituras concurrentes pueden causar race conditions
- No hay índices, búsquedas lineales en arrays grandes

## 📦 Requisitos

- Node.js 14+
- ES Modules habilitados (type: "module" en package.json)

## 📄 Licencia

MIT - Uso libre

## 🤝 Contribuciones

Este es un módulo standalone, siéntete libre de adaptarlo a tus necesidades.
