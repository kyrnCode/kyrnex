/**
 * SUITE DE TESTS - JSON Manager
 * Tests completos de todas las funcionalidades
 */

import JSONManager, { JSONManagerMulti } from './json-manager.mjs';
import { promises as fs } from 'fs';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

let testsPass = 0;
let testsFail = 0;

// Helper para assertions
function assert(condition, message) {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
    testsPass++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
    testsFail++;
    throw new Error(`Test failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const condition = JSON.stringify(actual) === JSON.stringify(expected);
  assert(condition, message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function cleanupTestFiles() {
  const files = [
    './test-users.json',
    './test-users.json.backup',
    './test-products.json',
    './test-tasks.json',
    './test-company.json',
    './test-config.json',
    './test-books.json',
    './test-multi-1.json',
    './test-multi-2.json',
    './test-cache.json',
    './test-errors.json'
  ];

  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch (error) {
      // Ignorar si el archivo no existe
    }
  }
}

// ============================================
// TEST 1: Operaciones Básicas de Lectura/Escritura
// ============================================

async function testBasicReadWrite() {
  console.log(`\n${colors.blue}TEST 1: Operaciones Básicas${colors.reset}`);
  
  const db = new JSONManager('./test-users.json', { prettify: true });

  // Test: Escribir datos
  await db.write({ users: [{ id: 1, name: 'Test User' }] });
  assert(true, 'Escritura básica');

  // Test: Leer datos
  const data = await db.read();
  assertEqual(data.users[0].name, 'Test User', 'Lectura básica');

  // Test: Leer archivo inexistente
  const db2 = new JSONManager('./nonexistent.json');
  const emptyData = await db2.read();
  assertEqual(emptyData, {}, 'Lectura de archivo inexistente retorna {}');
}

// ============================================
// TEST 2: Operaciones con Get/Set
// ============================================

async function testGetSet() {
  console.log(`\n${colors.blue}TEST 2: Get/Set${colors.reset}`);
  
  const db = new JSONManager('./test-users.json');

  await db.write({
    users: [
      { id: 1, name: 'Juan', profile: { age: 25, city: 'Madrid' } }
    ],
    settings: { theme: 'dark' }
  });

  // Test: Get simple
  const theme = await db.get('settings.theme');
  assertEqual(theme, 'dark', 'Get valor simple');

  // Test: Get anidado
  const age = await db.get('users.0.profile.age');
  assertEqual(age, 25, 'Get valor anidado');

  // Test: Get con default
  const nonExistent = await db.get('nonexistent.path', 'default');
  assertEqual(nonExistent, 'default', 'Get con valor por defecto');

  // Test: Set simple
  await db.set('settings.language', 'es');
  const lang = await db.get('settings.language');
  assertEqual(lang, 'es', 'Set valor simple');

  // Test: Set crear ruta nueva
  await db.set('new.nested.path', 'value');
  const newVal = await db.get('new.nested.path');
  assertEqual(newVal, 'value', 'Set crea ruta nueva');
}

// ============================================
// TEST 3: Búsqueda por ID
// ============================================

async function testFindById() {
  console.log(`\n${colors.blue}TEST 3: Búsqueda por ID${colors.reset}`);
  
  const db = new JSONManager('./test-products.json');

  await db.write({
    products: [
      { id: 1, name: 'Product 1', price: 100 },
      { id: 2, name: 'Product 2', price: 200 },
      { id: 3, name: 'Product 3', price: 300 }
    ]
  });

  // Test: Encontrar por ID
  const product = await db.findById(2, 'products');
  assertEqual(product.name, 'Product 2', 'FindById encuentra elemento');

  // Test: ID no existe
  const notFound = await db.findById(999, 'products');
  assertEqual(notFound, null, 'FindById retorna null si no encuentra');

  // Test: Buscar con clave personalizada
  await db.write({
    books: [
      { isbn: 'ISBN-001', title: 'Book 1' },
      { isbn: 'ISBN-002', title: 'Book 2' }
    ]
  });

  const book = await db.findById('ISBN-001', 'books', 'isbn');
  assertEqual(book.title, 'Book 1', 'FindById con clave personalizada');
}

// ============================================
// TEST 4: Actualización por ID
// ============================================

async function testUpdateById() {
  console.log(`\n${colors.blue}TEST 4: Actualización por ID${colors.reset}`);
  
  const db = new JSONManager('./test-products.json');

  await db.write({
    products: [
      { id: 1, name: 'Product 1', price: 100 },
      { id: 2, name: 'Product 2', price: 200 }
    ]
  });

  // Test: Actualizar
  await db.updateById(1, { price: 150, stock: 50 }, 'products');
  const updated = await db.findById(1, 'products');
  
  assertEqual(updated.price, 150, 'UpdateById actualiza precio');
  assertEqual(updated.stock, 50, 'UpdateById agrega nueva propiedad');
  assertEqual(updated.name, 'Product 1', 'UpdateById mantiene propiedades existentes');
}

// ============================================
// TEST 5: Eliminación por ID
// ============================================

async function testDeleteById() {
  console.log(`\n${colors.blue}TEST 5: Eliminación por ID${colors.reset}`);
  
  const db = new JSONManager('./test-products.json');

  await db.write({
    products: [
      { id: 1, name: 'Product 1' },
      { id: 2, name: 'Product 2' },
      { id: 3, name: 'Product 3' }
    ]
  });

  // Test: Eliminar
  const deleted = await db.deleteById(2, 'products');
  assert(deleted, 'DeleteById retorna true');

  const products = await db.get('products');
  assertEqual(products.length, 2, 'Elemento eliminado del array');

  const notFound = await db.findById(2, 'products');
  assertEqual(notFound, null, 'Elemento ya no existe');
}

// ============================================
// TEST 6: Operaciones con Arrays
// ============================================

async function testArrayOperations() {
  console.log(`\n${colors.blue}TEST 6: Operaciones con Arrays${colors.reset}`);
  
  const db = new JSONManager('./test-tasks.json');

  await db.write({ tasks: [] });

  // Test: Push
  await db.push('tasks', { id: 1, title: 'Task 1', completed: false });
  await db.push('tasks', { id: 2, title: 'Task 2', completed: true });
  
  const tasks = await db.get('tasks');
  assertEqual(tasks.length, 2, 'Push agrega elementos');

  // Test: Filter
  const pending = await db.filter('tasks', t => !t.completed);
  assertEqual(pending.length, 1, 'Filter funciona correctamente');
  assertEqual(pending[0].title, 'Task 1', 'Filter retorna elementos correctos');

  // Test: Find
  const completed = await db.find('tasks', t => t.completed);
  assertEqual(completed.title, 'Task 2', 'Find retorna primer elemento que coincide');
}

// ============================================
// TEST 7: Búsqueda Profunda
// ============================================

async function testDeepSearch() {
  console.log(`\n${colors.blue}TEST 7: Búsqueda Profunda${colors.reset}`);
  
  const db = new JSONManager('./test-company.json');

  await db.write({
    company: {
      departments: [
        {
          id: 'DEP1',
          employees: [
            { id: 'EMP1', name: 'Ana', projects: [{ id: 'PROJ1', status: 'active' }] },
            { id: 'EMP2', name: 'Bob', projects: [{ id: 'PROJ2', status: 'completed' }] }
          ]
        }
      ]
    }
  });

  // Test: FindBy en estructura profunda
  const activeProjects = await db.findBy('status', 'active');
  assert(activeProjects.length > 0, 'FindBy encuentra en estructura profunda');

  // Test: FindById en cualquier nivel
  const employee = await db.findById('EMP2');
  assertEqual(employee.name, 'Bob', 'FindById funciona en estructura anidada');
}

// ============================================
// TEST 8: Has y Delete
// ============================================

async function testHasDelete() {
  console.log(`\n${colors.blue}TEST 8: Has y Delete${colors.reset}`);
  
  const db = new JSONManager('./test-config.json');

  await db.write({
    app: {
      name: 'Test App',
      features: {
        auth: true,
        notifications: false
      }
    }
  });

  // Test: Has
  const hasAuth = await db.has('app.features.auth');
  assert(hasAuth, 'Has retorna true para ruta existente');

  const hasNonExistent = await db.has('app.features.nonexistent');
  assert(!hasNonExistent, 'Has retorna false para ruta inexistente');

  // Test: Delete
  await db.delete('app.features.notifications');
  const hasNotifications = await db.has('app.features.notifications');
  assert(!hasNotifications, 'Delete elimina la ruta');
}

// ============================================
// TEST 9: Merge
// ============================================

async function testMerge() {
  console.log(`\n${colors.blue}TEST 9: Merge${colors.reset}`);
  
  const db = new JSONManager('./test-config.json');

  await db.write({
    app: {
      name: 'App',
      version: '1.0.0',
      features: { auth: true }
    }
  });

  // Test: Merge
  await db.write({
    app: {
      version: '1.1.0',
      features: { notifications: true }
    }
  }, true);

  const config = await db.read();
  
  assertEqual(config.app.name, 'App', 'Merge mantiene propiedades existentes');
  assertEqual(config.app.version, '1.1.0', 'Merge actualiza propiedades');
  assert(config.app.features.auth, 'Merge mantiene nested properties');
  assert(config.app.features.notifications, 'Merge agrega nuevas nested properties');
}

// ============================================
// TEST 10: Clear
// ============================================

async function testClear() {
  console.log(`\n${colors.blue}TEST 10: Clear${colors.reset}`);
  
  const db = new JSONManager('./test-config.json');

  await db.write({ data: 'test' });

  // Test: Clear con valor por defecto
  await db.clear({ initialized: true });
  const data = await db.read();
  
  assert(data.initialized, 'Clear establece valor inicial');
  assert(!data.data, 'Clear elimina datos anteriores');

  // Test: Clear sin parámetros
  await db.clear();
  const empty = await db.read();
  assertEqual(empty, {}, 'Clear sin parámetros deja objeto vacío');
}

// ============================================
// TEST 11: Cache
// ============================================

async function testCache() {
  console.log(`\n${colors.blue}TEST 11: Cache${colors.reset}`);
  
  const db = new JSONManager('./test-cache.json', { cache: true });

  await db.write({ value: 'original' });

  // Primera lectura (desde archivo)
  const first = await db.read();
  
  // Modificar archivo directamente
  await fs.writeFile('./test-cache.json', JSON.stringify({ value: 'modified' }));

  // Segunda lectura (desde cache, debería ser 'original')
  const second = await db.read();
  assertEqual(second.value, 'original', 'Cache retorna valor cacheado');

  // Invalidar cache
  db.invalidateCache();

  // Tercera lectura (desde archivo, debería ser 'modified')
  const third = await db.read();
  assertEqual(third.value, 'modified', 'InvalidateCache fuerza lectura del archivo');
}

// ============================================
// TEST 12: Múltiples Archivos
// ============================================

async function testMultipleFiles() {
  console.log(`\n${colors.blue}TEST 12: Múltiples Archivos${colors.reset}`);
  
  const multi = new JSONManagerMulti();

  const db1 = multi.get('./test-multi-1.json');
  const db2 = multi.get('./test-multi-2.json');

  await db1.write({ file: 1 });
  await db2.write({ file: 2 });

  const data1 = await db1.read();
  const data2 = await db2.read();

  assertEqual(data1.file, 1, 'Primer archivo correcto');
  assertEqual(data2.file, 2, 'Segundo archivo correcto');

  // Test: Mismo manager para mismo archivo
  const db1Again = multi.get('./test-multi-1.json');
  assert(db1 === db1Again, 'Retorna mismo manager para mismo archivo');
}

// ============================================
// TEST 13: Manejo de Errores
// ============================================

async function testErrorHandling() {
  console.log(`\n${colors.blue}TEST 13: Manejo de Errores${colors.reset}`);
  
  const db = new JSONManager('./test-errors.json');

  await db.write({ notArray: 'string' });

  // Test: Push en no-array
  try {
    await db.push('notArray', 'item');
    assert(false, 'Debería lanzar error');
  } catch (error) {
    assert(error.message.includes('not an array'), 'Error correcto para push en no-array');
  }

  // Test: Error personalizado
  try {
    await db.push('notArray', 'item');
  } catch (error) {
    assert(error.operation === 'push', 'Error incluye nombre de operación');
    assert(error.filePath === './test-errors.json', 'Error incluye filepath');
  }
}

// ============================================
// TEST 14: Backup
// ============================================

async function testBackup() {
  console.log(`\n${colors.blue}TEST 14: Backup${colors.reset}`);
  
  const db = new JSONManager('./test-users.json', { backup: true });

  await db.write({ data: 'original' });
  await db.write({ data: 'updated' });

  // Verificar que existe el backup
  try {
    const backup = await fs.readFile('./test-users.json.backup', 'utf8');
    const backupData = JSON.parse(backup);
    assertEqual(backupData.data, 'original', 'Backup contiene datos anteriores');
  } catch (error) {
    assert(false, 'Backup debería existir');
  }
}

// ============================================
// TEST 15: Rutas Complejas
// ============================================

async function testComplexPaths() {
  console.log(`\n${colors.blue}TEST 15: Rutas Complejas${colors.reset}`);
  
  const db = new JSONManager('./test-config.json');

  await db.write({
    level1: {
      level2: {
        level3: {
          level4: {
            value: 'deep'
          }
        }
      }
    },
    array: [
      { nested: [{ value: 'nested-array' }] }
    ]
  });

  // Test: Ruta profunda
  const deep = await db.get('level1.level2.level3.level4.value');
  assertEqual(deep, 'deep', 'Get en ruta profunda');

  // Test: Array anidado
  const nestedArray = await db.get('array.0.nested.0.value');
  assertEqual(nestedArray, 'nested-array', 'Get en array anidado');

  // Test: Set en ruta profunda
  await db.set('level1.level2.level3.level4.newValue', 'added');
  const added = await db.get('level1.level2.level3.level4.newValue');
  assertEqual(added, 'added', 'Set en ruta profunda');
}

// ============================================
// EJECUTAR TODOS LOS TESTS
// ============================================

async function runAllTests() {
  console.log(`${colors.yellow}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.yellow}  JSON MANAGER - SUITE DE TESTS${colors.reset}`);
  console.log(`${colors.yellow}═══════════════════════════════════════${colors.reset}`);

  try {
    // Limpiar archivos de tests anteriores
    await cleanupTestFiles();

    // Ejecutar tests
    await testBasicReadWrite();
    await testGetSet();
    await testFindById();
    await testUpdateById();
    await testDeleteById();
    await testArrayOperations();
    await testDeepSearch();
    await testHasDelete();
    await testMerge();
    await testClear();
    await testCache();
    await testMultipleFiles();
    await testErrorHandling();
    await testBackup();
    await testComplexPaths();

    // Limpiar archivos de test
    await cleanupTestFiles();

    // Resumen
    console.log(`\n${colors.yellow}═══════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ Tests exitosos: ${testsPass}${colors.reset}`);
    
    if (testsFail > 0) {
      console.log(`${colors.red}✗ Tests fallidos: ${testsFail}${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`${colors.green}🎉 TODOS LOS TESTS PASARON${colors.reset}`);
    }
    
    console.log(`${colors.yellow}═══════════════════════════════════════${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}ERROR EN TESTS:${colors.reset}`, error.message);
    await cleanupTestFiles();
    process.exit(1);
  }
}

// Ejecutar tests
runAllTests();
