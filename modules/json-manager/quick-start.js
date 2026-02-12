/**
 * GUÍA DE INICIO RÁPIDO - JSON Manager
 * Ejemplos simples para empezar a usar el módulo
 */

import JSONManager from './json-manager.mjs';

// ==========================================
// EJEMPLO 1: Mi Primera Base de Datos JSON
// ==========================================

async function ejemplo1() {
  console.log('\n📝 Ejemplo 1: Mi Primera Base de Datos JSON\n');
  
  // Crear instancia
  const db = new JSONManager('./mi-base-datos.json');

  // Guardar datos
  await db.write({
    nombre: 'Mi App',
    version: '1.0.0',
    usuarios: [],
    configuracion: {
      tema: 'claro',
      idioma: 'es'
    }
  });

  console.log('✅ Base de datos creada');
}

// ==========================================
// EJEMPLO 2: CRUD Básico con Usuarios
// ==========================================

async function ejemplo2() {
  console.log('\n👥 Ejemplo 2: CRUD con Usuarios\n');
  
  const db = new JSONManager('./usuarios.json');

  // CREATE - Agregar usuarios
  await db.write({ usuarios: [] });
  
  await db.push('usuarios', {
    id: 1,
    nombre: 'Juan Pérez',
    email: 'juan@email.com',
    activo: true
  });

  await db.push('usuarios', {
    id: 2,
    nombre: 'María García',
    email: 'maria@email.com',
    activo: true
  });

  console.log('✅ Usuarios creados');

  // READ - Leer usuario
  const usuario = await db.findById(1, 'usuarios');
  console.log('📖 Usuario encontrado:', usuario);

  // UPDATE - Actualizar usuario
  await db.updateById(1, { email: 'nuevo@email.com' }, 'usuarios');
  console.log('✏️ Email actualizado');

  // DELETE - Eliminar usuario
  await db.deleteById(2, 'usuarios');
  console.log('🗑️ Usuario eliminado');

  // Mostrar resultado final
  const usuarios = await db.get('usuarios');
  console.log('📋 Usuarios finales:', usuarios);
}

// ==========================================
// EJEMPLO 3: Lista de Tareas (TODO List)
// ==========================================

async function ejemplo3() {
  console.log('\n✓ Ejemplo 3: Lista de Tareas\n');
  
  const db = new JSONManager('./tareas.json');

  // Inicializar
  await db.write({ tareas: [] });

  // Agregar tareas
  const tareas = [
    { id: 1, titulo: 'Comprar pan', completada: false, prioridad: 'baja' },
    { id: 2, titulo: 'Terminar proyecto', completada: false, prioridad: 'alta' },
    { id: 3, titulo: 'Llamar al dentista', completada: false, prioridad: 'media' }
  ];

  for (const tarea of tareas) {
    await db.push('tareas', tarea);
  }

  console.log('✅ Tareas creadas');

  // Completar una tarea
  await db.updateById(1, { completada: true }, 'tareas');
  console.log('✓ Tarea 1 completada');

  // Ver tareas pendientes
  const pendientes = await db.filter('tareas', t => !t.completada);
  console.log('📝 Tareas pendientes:', pendientes.length);

  // Ver tareas de alta prioridad
  const urgentes = await db.filter('tareas', t => t.prioridad === 'alta' && !t.completada);
  console.log('🔥 Tareas urgentes:', urgentes);
}

// ==========================================
// EJEMPLO 4: Inventario de Productos
// ==========================================

async function ejemplo4() {
  console.log('\n📦 Ejemplo 4: Inventario de Productos\n');
  
  const db = new JSONManager('./inventario.json');

  // Crear inventario
  await db.write({
    tienda: 'Mi Tienda',
    productos: [
      { sku: 'PROD-001', nombre: 'Laptop', precio: 999, stock: 10 },
      { sku: 'PROD-002', nombre: 'Mouse', precio: 25, stock: 50 },
      { sku: 'PROD-003', nombre: 'Teclado', precio: 75, stock: 5 }
    ]
  });

  console.log('✅ Inventario creado');

  // Buscar productos con poco stock
  const bajoStock = await db.filter('productos', p => p.stock < 10);
  console.log('⚠️ Productos con bajo stock:', bajoStock);

  // Actualizar precio
  await db.updateById('PROD-002', { precio: 29.99 }, 'productos', 'sku');
  console.log('💰 Precio actualizado');

  // Agregar nuevo producto
  await db.push('productos', {
    sku: 'PROD-004',
    nombre: 'Monitor',
    precio: 299,
    stock: 8
  });
  console.log('➕ Nuevo producto agregado');
}

// ==========================================
// EJEMPLO 5: Configuración de Aplicación
// ==========================================

async function ejemplo5() {
  console.log('\n⚙️ Ejemplo 5: Configuración de App\n');
  
  const db = new JSONManager('./config.json');

  // Configuración inicial
  await db.write({
    app: {
      nombre: 'Mi Aplicación',
      version: '1.0.0',
      configuracion: {
        tema: 'oscuro',
        idioma: 'es',
        notificaciones: true,
        sonido: false
      },
      usuario: {
        nombre: 'Usuario Demo',
        ultimoAcceso: new Date().toISOString()
      }
    }
  });

  console.log('✅ Configuración creada');

  // Leer configuración específica
  const tema = await db.get('app.configuracion.tema');
  console.log('🎨 Tema actual:', tema);

  // Cambiar configuración
  await db.set('app.configuracion.tema', 'claro');
  await db.set('app.configuracion.sonido', true);
  console.log('✏️ Configuración actualizada');

  // Actualizar último acceso
  await db.set('app.usuario.ultimoAcceso', new Date().toISOString());
  console.log('🕐 Último acceso actualizado');

  // Mostrar configuración completa
  const config = await db.read();
  console.log('📋 Configuración completa:', JSON.stringify(config, null, 2));
}

// ==========================================
// EJECUTAR EJEMPLOS
// ==========================================

async function ejecutarEjemplos() {
  console.log('\n🚀 JSON Manager - Inicio Rápido\n');
  console.log('════════════════════════════════════════\n');

  try {
    // Descomentar el ejemplo que quieras probar
    
    // await ejemplo1(); // Base de datos simple
    // await ejemplo2(); // CRUD con usuarios
    // await ejemplo3(); // Lista de tareas
    // await ejemplo4(); // Inventario
    await ejemplo5(); // Configuración

    console.log('\n════════════════════════════════════════');
    console.log('✅ Ejemplo completado con éxito\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar
ejecutarEjemplos();
