/**
 * EJEMPLOS DE USO - JSON Manager
 * Ejemplos completos de todas las funcionalidades del módulo
 */

import JSONManager, { JSONManagerMulti } from './json-manager.js';

// ============================================
// EJEMPLO 1: USO BÁSICO
// ============================================

async function ejemploBasico() {
  console.log('\n=== EJEMPLO 1: Uso Básico ===\n');
  
  const db = new JSONManager('./data/users.json', {
    prettify: true,
    autoSave: true,
    cache: true
  });

  // Escribir datos iniciales
  await db.write({
    users: [
      { id: 1, name: 'Juan', email: 'juan@email.com', age: 25 },
      { id: 2, name: 'María', email: 'maria@email.com', age: 30 },
      { id: 3, name: 'Pedro', email: 'pedro@email.com', age: 28 }
    ],
    settings: {
      theme: 'dark',
      language: 'es'
    }
  });

  // Leer todo el archivo
  const data = await db.read();
  console.log('Datos completos:', JSON.stringify(data, null, 2));

  // Obtener valor específico
  const theme = await db.get('settings.theme');
  console.log('Theme:', theme);

  // Establecer valor
  await db.set('settings.notifications', true);
  console.log('Notificaciones activadas');
}

// ============================================
// EJEMPLO 2: BÚSQUEDA Y ACTUALIZACIÓN POR ID
// ============================================

async function ejemploBusquedaYActualizacion() {
  console.log('\n=== EJEMPLO 2: Búsqueda y Actualización por ID ===\n');
  
  const db = new JSONManager('./data/products.json');

  // Datos de productos
  await db.write({
    products: [
      { id: 'P001', name: 'Laptop', price: 999, stock: 10, category: 'electronics' },
      { id: 'P002', name: 'Mouse', price: 25, stock: 50, category: 'electronics' },
      { id: 'P003', name: 'Teclado', price: 75, stock: 30, category: 'electronics' }
    ]
  });

  // Buscar producto por ID
  const product = await db.findById('P002', 'products');
  console.log('Producto encontrado:', product);

  // Actualizar producto
  await db.updateById('P002', { price: 29.99, stock: 45 }, 'products');
  console.log('Producto actualizado');

  // Verificar actualización
  const updated = await db.findById('P002', 'products');
  console.log('Producto después de actualizar:', updated);

  // Eliminar producto
  await db.deleteById('P003', 'products');
  console.log('Producto P003 eliminado');
}

// ============================================
// EJEMPLO 3: TRABAJO CON ARRAYS
// ============================================

async function ejemploArrays() {
  console.log('\n=== EJEMPLO 3: Trabajo con Arrays ===\n');
  
  const db = new JSONManager('./data/tasks.json');

  await db.write({ tasks: [] });

  // Agregar tareas
  await db.push('tasks', {
    id: 1,
    title: 'Completar proyecto',
    completed: false,
    priority: 'high'
  });

  await db.push('tasks', {
    id: 2,
    title: 'Revisar emails',
    completed: false,
    priority: 'medium'
  });

  await db.push('tasks', {
    id: 3,
    title: 'Llamar cliente',
    completed: true,
    priority: 'high'
  });

  // Filtrar tareas no completadas
  const pending = await db.filter('tasks', task => !task.completed);
  console.log('Tareas pendientes:', pending);

  // Buscar tarea específica
  const highPriority = await db.find('tasks', task => 
    task.priority === 'high' && !task.completed
  );
  console.log('Tarea de alta prioridad pendiente:', highPriority);

  // Actualizar tarea
  await db.updateById(1, { completed: true }, 'tasks');
  console.log('Tarea 1 marcada como completada');
}

// ============================================
// EJEMPLO 4: ESTRUCTURAS ANIDADAS PROFUNDAS
// ============================================

async function ejemploEstructurasAnidadas() {
  console.log('\n=== EJEMPLO 4: Estructuras Anidadas Profundas ===\n');
  
  const db = new JSONManager('./data/company.json');

  await db.write({
    company: {
      name: 'TechCorp',
      departments: [
        {
          id: 'DEP001',
          name: 'Desarrollo',
          employees: [
            {
              id: 'EMP001',
              name: 'Ana García',
              position: 'Senior Developer',
              projects: [
                { id: 'PROJ001', name: 'App Móvil', status: 'active' },
                { id: 'PROJ002', name: 'API REST', status: 'completed' }
              ]
            },
            {
              id: 'EMP002',
              name: 'Carlos López',
              position: 'Junior Developer',
              projects: [
                { id: 'PROJ003', name: 'Dashboard', status: 'active' }
              ]
            }
          ]
        },
        {
          id: 'DEP002',
          name: 'Marketing',
          employees: [
            {
              id: 'EMP003',
              name: 'Laura Martínez',
              position: 'Marketing Manager',
              projects: [
                { id: 'PROJ004', name: 'Campaña Q1', status: 'active' }
              ]
            }
          ]
        }
      ]
    }
  });

  // Acceder a datos profundamente anidados
  const firstProject = await db.get('company.departments.0.employees.0.projects.0.name');
  console.log('Primer proyecto:', firstProject);

  // Buscar empleado por ID en cualquier nivel
  const employee = await db.findById('EMP002');
  console.log('Empleado encontrado:', employee);

  // Actualizar proyecto anidado
  await db.set('company.departments.0.employees.0.projects.0.status', 'completed');
  console.log('Status del proyecto actualizado');

  // Buscar todos los proyectos activos
  const activeProjects = await db.findBy('status', 'active');
  console.log('Proyectos activos:', activeProjects);
}

// ============================================
// EJEMPLO 5: BÚSQUEDA AVANZADA
// ============================================

async function ejemploBusquedaAvanzada() {
  console.log('\n=== EJEMPLO 5: Búsqueda Avanzada ===\n');
  
  const db = new JSONManager('./data/inventory.json');

  await db.write({
    warehouse: {
      location: 'Madrid',
      items: [
        { sku: 'SKU001', name: 'Widget A', quantity: 100, category: 'hardware', supplier: 'SupplierX' },
        { sku: 'SKU002', name: 'Widget B', quantity: 50, category: 'hardware', supplier: 'SupplierY' },
        { sku: 'SKU003', name: 'Gadget A', quantity: 200, category: 'electronics', supplier: 'SupplierX' },
        { sku: 'SKU004', name: 'Gadget B', quantity: 75, category: 'electronics', supplier: 'SupplierZ' }
      ]
    }
  });

  // Buscar por categoría
  const electronics = await db.findBy('category', 'electronics', 'warehouse.items');
  console.log('Electrónicos:', electronics);

  // Buscar por proveedor
  const supplierX = await db.findBy('supplier', 'SupplierX', 'warehouse.items');
  console.log('Productos de SupplierX:', supplierX);

  // Filtrar con condiciones complejas
  const lowStock = await db.filter('warehouse.items', item => item.quantity < 100);
  console.log('Items con bajo stock:', lowStock);
}

// ============================================
// EJEMPLO 6: OPERACIONES CON CLAVES PERSONALIZADAS
// ============================================

async function ejemploClavesPersonalizadas() {
  console.log('\n=== EJEMPLO 6: Claves Personalizadas ===\n');
  
  const db = new JSONManager('./data/books.json');

  await db.write({
    books: [
      { isbn: '978-1234567890', title: 'JavaScript Avanzado', author: 'John Doe', year: 2023 },
      { isbn: '978-0987654321', title: 'Node.js Profesional', author: 'Jane Smith', year: 2022 },
      { isbn: '978-1111111111', title: 'ES6 Moderno', author: 'Bob Johnson', year: 2024 }
    ]
  });

  // Buscar por ISBN (clave personalizada)
  const book = await db.findById('978-0987654321', 'books', 'isbn');
  console.log('Libro encontrado por ISBN:', book);

  // Actualizar por ISBN
  await db.updateById('978-0987654321', { year: 2023 }, 'books', 'isbn');
  console.log('Año del libro actualizado');

  // Eliminar por ISBN
  await db.deleteById('978-1111111111', 'books', 'isbn');
  console.log('Libro eliminado');
}

// ============================================
// EJEMPLO 7: MÚLTIPLES ARCHIVOS JSON
// ============================================

async function ejemploMultiplesArchivos() {
  console.log('\n=== EJEMPLO 7: Múltiples Archivos JSON ===\n');
  
  const multi = new JSONManagerMulti();

  // Trabajar con diferentes archivos
  const usersDB = multi.get('./data/users.json');
  const productsDB = multi.get('./data/products.json');
  const ordersDB = multi.get('./data/orders.json');

  // Escribir en diferentes archivos
  await usersDB.write({ users: [{ id: 1, name: 'User1' }] });
  await productsDB.write({ products: [{ id: 'P1', name: 'Product1' }] });
  await ordersDB.write({ 
    orders: [
      { 
        id: 'ORD001', 
        userId: 1, 
        products: ['P1'], 
        total: 100,
        date: new Date().toISOString()
      }
    ] 
  });

  // Leer de diferentes archivos
  const users = await usersDB.read();
  const products = await productsDB.read();
  const orders = await ordersDB.read();

  console.log('Users:', users);
  console.log('Products:', products);
  console.log('Orders:', orders);

  // Invalidar todos los caches
  multi.invalidateAllCaches();
  console.log('Caches invalidados');
}

// ============================================
// EJEMPLO 8: MANEJO DE ERRORES
// ============================================

async function ejemploManejoErrores() {
  console.log('\n=== EJEMPLO 8: Manejo de Errores ===\n');
  
  const db = new JSONManager('./data/test.json');

  try {
    // Intentar leer archivo que no existe (no lanza error, retorna {})
    const data = await db.read();
    console.log('Archivo nuevo, datos:', data);

    // Escribir datos
    await db.write({ test: 'value' });

    // Intentar acceder a ruta que no existe
    const nonExistent = await db.get('path.that.does.not.exist', 'valor por defecto');
    console.log('Valor no existente:', nonExistent);

    // Intentar hacer push en algo que no es array
    await db.set('notAnArray', 'string');
    try {
      await db.push('notAnArray', 'item');
    } catch (error) {
      console.log('Error esperado:', error.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Operación:', error.operation);
    console.error('Archivo:', error.filePath);
  }
}

// ============================================
// EJEMPLO 9: MERGE Y OPERACIONES AVANZADAS
// ============================================

async function ejemploMergeAvanzado() {
  console.log('\n=== EJEMPLO 9: Merge y Operaciones Avanzadas ===\n');
  
  const db = new JSONManager('./data/config.json');

  // Escribir configuración inicial
  await db.write({
    app: {
      name: 'Mi App',
      version: '1.0.0',
      features: {
        auth: true,
        notifications: false
      }
    }
  });

  // Hacer merge con nuevos datos
  await db.write({
    app: {
      version: '1.1.0',
      features: {
        notifications: true,
        darkMode: true
      }
    }
  }, true); // merge = true

  const config = await db.read();
  console.log('Configuración después de merge:', JSON.stringify(config, null, 2));

  // Verificar si existe una ruta
  const hasAuth = await db.has('app.features.auth');
  console.log('¿Tiene auth?:', hasAuth);

  // Eliminar una ruta específica
  await db.delete('app.features.darkMode');
  console.log('darkMode eliminado');
}

// ============================================
// EJEMPLO 10: RENDIMIENTO Y CACHE
// ============================================

async function ejemploRendimiento() {
  console.log('\n=== EJEMPLO 10: Rendimiento y Cache ===\n');
  
  // Con cache habilitado
  const dbWithCache = new JSONManager('./data/large.json', {
    cache: true,
    prettify: false // Más rápido sin pretty print
  });

  // Generar datos grandes
  const largeData = {
    records: Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      name: `Record ${i + 1}`,
      data: Math.random().toString(36)
    }))
  };

  await dbWithCache.write(largeData);

  // Primera lectura (desde archivo)
  console.time('Primera lectura');
  await dbWithCache.read();
  console.timeEnd('Primera lectura');

  // Segunda lectura (desde cache)
  console.time('Segunda lectura (cache)');
  await dbWithCache.read();
  console.timeEnd('Segunda lectura (cache)');

  // Invalidar cache
  dbWithCache.invalidateCache();
  console.log('Cache invalidado');

  // Lectura después de invalidar cache
  console.time('Lectura después de invalidar');
  await dbWithCache.read();
  console.timeEnd('Lectura después de invalidar');
}

// ============================================
// EJECUTAR EJEMPLOS
// ============================================

async function ejecutarTodos() {
  try {
    await ejemploBasico();
    await ejemploBusquedaYActualizacion();
    await ejemploArrays();
    await ejemploEstructurasAnidadas();
    await ejemploBusquedaAvanzada();
    await ejemploClavesPersonalizadas();
    await ejemploMultiplesArchivos();
    await ejemploManejoErrores();
    await ejemploMergeAvanzado();
    await ejemploRendimiento();
    
    console.log('\n✅ Todos los ejemplos ejecutados correctamente\n');
  } catch (error) {
    console.error('❌ Error en ejemplos:', error);
  }
}

// Ejecutar todos los ejemplos
ejecutarTodos();

// Exportar para uso individual
export {
  ejemploBasico,
  ejemploBusquedaYActualizacion,
  ejemploArrays,
  ejemploEstructurasAnidadas,
  ejemploBusquedaAvanzada,
  ejemploClavesPersonalizadas,
  ejemploMultiplesArchivos,
  ejemploManejoErrores,
  ejemploMergeAvanzado,
  ejemploRendimiento
};