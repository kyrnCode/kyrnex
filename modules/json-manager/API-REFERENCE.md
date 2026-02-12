# JSON Manager - Referencia Rápida de API

## 🚀 Importación

```javascript
import JSONManager, { JSONManagerMulti } from './json-manager.mjs';
```

## 📦 Constructor

```javascript
const db = new JSONManager(filePath, options);

// Opciones por defecto:
{
  autoSave: true,    // Auto-guardar después de cambios
  prettify: true,    // JSON formateado con indentación
  encoding: 'utf8',  // Codificación del archivo
  backup: false,     // Crear backup antes de escribir
  cache: true        // Cache en memoria para lecturas
}
```

## 📖 Lectura

| Método | Descripción | Ejemplo |
|--------|-------------|---------|
| `read()` | Lee archivo completo | `await db.read()` |
| `get(path, default)` | Obtiene valor por ruta | `await db.get('users.0.name', 'N/A')` |
| `has(path)` | Verifica si existe ruta | `await db.has('settings.theme')` |

## ✍️ Escritura

| Método | Descripción | Ejemplo |
|--------|-------------|---------|
| `write(data, merge)` | Escribe en archivo | `await db.write({users: []})` |
| `set(path, value)` | Establece valor | `await db.set('config.theme', 'dark')` |
| `delete(path)` | Elimina ruta | `await db.delete('temp.data')` |
| `clear(initial)` | Limpia archivo | `await db.clear({})` |

## 🔍 Búsqueda

| Método | Descripción | Ejemplo |
|--------|-------------|---------|
| `findBy(key, value, path)` | Busca por clave/valor | `await db.findBy('status', 'active')` |
| `findById(id, path, idKey)` | Busca por ID | `await db.findById(123, 'users')` |

## 🔄 Actualización

| Método | Descripción | Ejemplo |
|--------|-------------|---------|
| `updateById(id, updates, path, idKey)` | Actualiza por ID | `await db.updateById(1, {age: 30}, 'users')` |

## 🗑️ Eliminación

| Método | Descripción | Ejemplo |
|--------|-------------|---------|
| `deleteById(id, path, idKey)` | Elimina por ID | `await db.deleteById(1, 'users')` |

## 📚 Arrays

| Método | Descripción | Ejemplo |
|--------|-------------|---------|
| `push(path, item)` | Agrega al final | `await db.push('users', {id: 1})` |
| `filter(path, fn)` | Filtra elementos | `await db.filter('tasks', t => !t.done)` |
| `find(path, fn)` | Busca elemento | `await db.find('users', u => u.admin)` |

## 🔧 Utilidades

| Método | Descripción | Ejemplo |
|--------|-------------|---------|
| `invalidateCache()` | Invalida cache | `db.invalidateCache()` |

## 🎯 Notación de Rutas

```javascript
// Punto simple
'user.name'

// Arrays
'users.0.email'

// Anidado profundo
'company.departments.0.employees.1.projects.0.name'

// Crear rutas automáticamente
await db.set('new.nested.path', 'value');
// Crea: { new: { nested: { path: 'value' } } }
```

## 💡 Claves Personalizadas

```javascript
// Por defecto usa 'id'
await db.findById(123, 'users');

// Usar otra clave
await db.findById('ISBN-001', 'books', 'isbn');
await db.updateById('SKU-001', {price: 99}, 'products', 'sku');
await db.deleteById('john@email.com', 'users', 'email');
```

## 🗂️ Múltiples Archivos

```javascript
import { JSONManagerMulti } from './json-manager.mjs';

const multi = new JSONManagerMulti();

const users = multi.get('./users.json');
const products = multi.get('./products.json');

await users.write({...});
await products.write({...});

// Invalidar todos los caches
multi.invalidateAllCaches();

// Limpiar managers
multi.clear();
```

## 🎨 Ejemplos Rápidos

### Usuario CRUD Completo
```javascript
const db = new JSONManager('./users.json');

// CREATE
await db.push('users', {id: 1, name: 'Juan', email: 'juan@email.com'});

// READ
const user = await db.findById(1, 'users');

// UPDATE
await db.updateById(1, {email: 'nuevo@email.com'}, 'users');

// DELETE
await db.deleteById(1, 'users');
```

### Configuración Simple
```javascript
const config = new JSONManager('./config.json');

// Guardar
await config.set('theme', 'dark');
await config.set('language', 'es');

// Leer
const theme = await config.get('theme');
```

### TODO List
```javascript
const todos = new JSONManager('./todos.json');

// Agregar
await todos.push('tasks', {
  id: 1,
  title: 'Hacer compras',
  done: false
});

// Completar
await todos.updateById(1, {done: true}, 'tasks');

// Ver pendientes
const pending = await todos.filter('tasks', t => !t.done);
```

### Inventario
```javascript
const inv = new JSONManager('./inventory.json');

// Agregar producto
await inv.push('products', {
  sku: 'PROD-001',
  name: 'Laptop',
  price: 999,
  stock: 10
});

// Buscar por SKU
const product = await inv.findById('PROD-001', 'products', 'sku');

// Actualizar stock
await inv.updateById('PROD-001', {stock: 8}, 'products', 'sku');

// Bajo stock
const lowStock = await inv.filter('products', p => p.stock < 10);
```

## ⚠️ Errores Comunes

```javascript
// ❌ Push en algo que no es array
await db.set('value', 'string');
await db.push('value', 'item'); // ERROR

// ✅ Verificar primero
const isArray = Array.isArray(await db.get('path'));
if (isArray) {
  await db.push('path', item);
}

// ❌ ID no encontrado
const user = await db.findById(999, 'users');
// user === null

// ✅ Verificar resultado
if (user) {
  // usar user
} else {
  // manejar no encontrado
}
```

## 🚀 Performance Tips

```javascript
// Cache para lecturas frecuentes
const db = new JSONManager('./data.json', { cache: true });

// Sin prettify para archivos grandes
const db = new JSONManager('./large.json', { prettify: false });

// Invalidar cache cuando sea necesario
db.invalidateCache();

// AutoSave false para operaciones masivas
const db = new JSONManager('./data.json', { autoSave: false });
await db.updateById(1, {...}, 'items');
await db.updateById(2, {...}, 'items');
await db.write(await db.read()); // Guardar una vez al final
```

## 📊 Estructuras Soportadas

```javascript
// Objeto simple
{ key: 'value' }

// Array simple
{ items: [1, 2, 3] }

// Objeto con arrays
{ users: [{id: 1}, {id: 2}] }

// Arrays anidados
{ data: [[1, 2], [3, 4]] }

// Profundamente anidado
{
  company: {
    departments: [
      {
        employees: [
          {
            projects: [...]
          }
        ]
      }
    ]
  }
}
```

## 🔐 Manejo de Errores

```javascript
try {
  await db.updateById(id, updates, 'users');
} catch (error) {
  console.error('Operación:', error.operation);
  console.error('Archivo:', error.filePath);
  console.error('Mensaje:', error.message);
  console.error('Original:', error.originalError);
}
```

---

**Documentación completa:** README.md  
**Ejemplos:** examples.mjs  
**Tests:** test.mjs  
**Inicio rápido:** quick-start.mjs
