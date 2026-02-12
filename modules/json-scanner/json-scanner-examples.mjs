/**
 * EJEMPLOS PRÁCTICOS - JSON Scanner
 * Casos de uso reales del módulo
 */

import JSONScanner from './json-scanner.mjs';
import { promises as fs } from 'fs';
import { join } from 'path';

// ============================================
// EJEMPLO 1: Escaneo Básico Simple
// ============================================

async function ejemplo1_basico() {
  console.log('\n📂 Ejemplo 1: Escaneo Básico\n');

  // Crear estructura de prueba
  await crearEstructuraEjemplo1();

  const scanner = new JSONScanner({
    maxDepth: 2,
    outputFormat: 'array',
    verbose: true
  });

  const result = await scanner.scan('./test-data/ejemplo1');

  console.log('✅ Datos recolectados:', result.data);
  console.log('📊 Estadísticas:', result.stats);

  // Limpiar
  await limpiarEstructura('./test-data');
}

async function crearEstructuraEjemplo1() {
  await fs.mkdir('./test-data/ejemplo1/users', { recursive: true });
  await fs.mkdir('./test-data/ejemplo1/products', { recursive: true });

  await fs.writeFile(
    './test-data/ejemplo1/users/data.json',
    JSON.stringify([
      { id: 1, name: 'Juan', role: 'admin' },
      { id: 2, name: 'María', role: 'user' }
    ])
  );

  await fs.writeFile(
    './test-data/ejemplo1/products/data.json',
    JSON.stringify([
      { id: 1, title: 'Laptop', price: 999 },
      { id: 2, title: 'Mouse', price: 25 }
    ])
  );
}

// ============================================
// EJEMPLO 2: Metadatos de Carpetas
// ============================================

async function ejemplo2_metadatos() {
  console.log('\n📋 Ejemplo 2: Recolectar Metadatos de Carpetas\n');

  await crearEstructuraEjemplo2();

  const scanner = new JSONScanner({
    maxDepth: 3,
    outputFormat: 'array',
    removeDuplicates: true,
    duplicateKey: 'id'
  });

  const result = await scanner.scan('./test-data/ejemplo2');

  console.log('✅ Metadatos recolectados:');
  result.data.forEach(meta => {
    console.log(`  - ${meta.name} (${meta.type})`);
  });

  console.log(`\n📊 Total: ${result.stats.itemsCount} items`);
  console.log(`⏱️ Tiempo: ${result.stats.duration}`);

  await limpiarEstructura('./test-data');
}

async function crearEstructuraEjemplo2() {
  const estructura = {
    'ejemplo2/components/Header': { id: 1, name: 'Header', type: 'component' },
    'ejemplo2/components/Footer': { id: 2, name: 'Footer', type: 'component' },
    'ejemplo2/pages/Home': { id: 3, name: 'Home', type: 'page' },
    'ejemplo2/pages/About': { id: 4, name: 'About', type: 'page' },
  };

  for (const [path, data] of Object.entries(estructura)) {
    await fs.mkdir(`./test-data/${path}`, { recursive: true });
    await fs.writeFile(
      `./test-data/${path}/metadata.json`,
      JSON.stringify(data, null, 2)
    );
  }
}

// ============================================
// EJEMPLO 3: Combinar Arrays y Eliminar Duplicados
// ============================================

async function ejemplo3_duplicados() {
  console.log('\n🔄 Ejemplo 3: Combinar Arrays y Eliminar Duplicados\n');

  await crearEstructuraEjemplo3();

  const scanner = new JSONScanner({
    maxDepth: 2,
    outputFormat: 'array',
    removeDuplicates: true,
    duplicateKey: 'id'
  });

  console.log('Escaneando archivos con duplicados...');
  const result = await scanner.scan('./test-data/ejemplo3');

  console.log(`✅ Items únicos: ${result.data.length}`);
  console.log('Items:', result.data);

  await limpiarEstructura('./test-data');
}

async function crearEstructuraEjemplo3() {
  await fs.mkdir('./test-data/ejemplo3/folder1', { recursive: true });
  await fs.mkdir('./test-data/ejemplo3/folder2', { recursive: true });
  await fs.mkdir('./test-data/ejemplo3/folder3', { recursive: true });

  // Archivos con algunos IDs duplicados
  await fs.writeFile(
    './test-data/ejemplo3/folder1/data.json',
    JSON.stringify([
      { id: 1, value: 'A' },
      { id: 2, value: 'B' },
      { id: 3, value: 'C' }
    ])
  );

  await fs.writeFile(
    './test-data/ejemplo3/folder2/data.json',
    JSON.stringify([
      { id: 2, value: 'B-duplicado' },  // Duplicado
      { id: 4, value: 'D' },
      { id: 5, value: 'E' }
    ])
  );

  await fs.writeFile(
    './test-data/ejemplo3/folder3/data.json',
    JSON.stringify([
      { id: 1, value: 'A-duplicado' },  // Duplicado
      { id: 6, value: 'F' }
    ])
  );
}

// ============================================
// EJEMPLO 4: Objetos a Array
// ============================================

async function ejemplo4_objetosArray() {
  console.log('\n📦 Ejemplo 4: Convertir Objetos a Array\n');

  await crearEstructuraEjemplo4();

  const scanner = new JSONScanner({
    maxDepth: 2,
    outputFormat: 'array',
    transform: (data, file) => {
      // Agregar el nombre de la carpeta como propiedad
      const folder = file.split('/').slice(-2, -1)[0];
      return { ...data, source: folder };
    }
  });

  const result = await scanner.scan('./test-data/ejemplo4');

  console.log('✅ Objetos convertidos a array:');
  result.data.forEach(item => {
    console.log(`  - ${item.name} (source: ${item.source})`);
  });

  await limpiarEstructura('./test-data');
}

async function crearEstructuraEjemplo4() {
  const configs = {
    'app': { name: 'App Config', theme: 'dark' },
    'user': { name: 'User Config', language: 'es' },
    'system': { name: 'System Config', version: '1.0' }
  };

  for (const [folder, config] of Object.entries(configs)) {
    await fs.mkdir(`./test-data/ejemplo4/${folder}`, { recursive: true });
    await fs.writeFile(
      `./test-data/ejemplo4/${folder}/config.json`,
      JSON.stringify(config, null, 2)
    );
  }
}

// ============================================
// EJEMPLO 5: Control de Profundidad
// ============================================

async function ejemplo5_profundidad() {
  console.log('\n🔍 Ejemplo 5: Control de Profundidad\n');

  await crearEstructuraEjemplo5();

  // Profundidad 1: Solo raíz
  console.log('📊 Profundidad 1:');
  const scanner1 = new JSONScanner({ maxDepth: 1 });
  const result1 = await scanner1.scan('./test-data/ejemplo5');
  console.log(`  Archivos encontrados: ${result1.stats.filesScanned}`);

  // Profundidad 2: Hasta carpetas hijas
  console.log('\n📊 Profundidad 2:');
  const scanner2 = new JSONScanner({ maxDepth: 2 });
  const result2 = await scanner2.scan('./test-data/ejemplo5');
  console.log(`  Archivos encontrados: ${result2.stats.filesScanned}`);

  // Profundidad 3: Hasta nietos
  console.log('\n📊 Profundidad 3:');
  const scanner3 = new JSONScanner({ maxDepth: 3 });
  const result3 = await scanner3.scan('./test-data/ejemplo5');
  console.log(`  Archivos encontrados: ${result3.stats.filesScanned}`);

  await limpiarEstructura('./test-data');
}

async function crearEstructuraEjemplo5() {
  // Nivel 1
  await fs.mkdir('./test-data/ejemplo5', { recursive: true });
  await fs.writeFile(
    './test-data/ejemplo5/root.json',
    JSON.stringify({ level: 1, name: 'Root' })
  );

  // Nivel 2
  await fs.mkdir('./test-data/ejemplo5/level2', { recursive: true });
  await fs.writeFile(
    './test-data/ejemplo5/level2/data.json',
    JSON.stringify({ level: 2, name: 'Level 2' })
  );

  // Nivel 3
  await fs.mkdir('./test-data/ejemplo5/level2/level3', { recursive: true });
  await fs.writeFile(
    './test-data/ejemplo5/level2/level3/data.json',
    JSON.stringify({ level: 3, name: 'Level 3' })
  );

  // Nivel 4
  await fs.mkdir('./test-data/ejemplo5/level2/level3/level4', { recursive: true });
  await fs.writeFile(
    './test-data/ejemplo5/level2/level3/level4/data.json',
    JSON.stringify({ level: 4, name: 'Level 4' })
  );
}

// ============================================
// EJEMPLO 6: Filtrado Personalizado
// ============================================

async function ejemplo6_filtrado() {
  console.log('\n🔎 Ejemplo 6: Filtrado Personalizado\n');

  await crearEstructuraEjemplo6();

  const scanner = new JSONScanner({
    maxDepth: 2,
    outputFormat: 'array',
    filter: (data, file) => {
      // Solo incluir items activos
      return data.active === true;
    }
  });

  const result = await scanner.scan('./test-data/ejemplo6');

  console.log(`✅ Items activos encontrados: ${result.data.length}`);
  result.data.forEach(item => {
    console.log(`  - ${item.name} (active: ${item.active})`);
  });

  console.log(`\n📊 Total escaneados: ${result.stats.filesScanned}`);
  console.log(`📊 Procesados: ${result.stats.filesProcessed}`);
  console.log(`📊 Omitidos: ${result.stats.filesSkipped}`);

  await limpiarEstructura('./test-data');
}

async function crearEstructuraEjemplo6() {
  await fs.mkdir('./test-data/ejemplo6/folder1', { recursive: true });
  await fs.mkdir('./test-data/ejemplo6/folder2', { recursive: true });
  await fs.mkdir('./test-data/ejemplo6/folder3', { recursive: true });

  await fs.writeFile(
    './test-data/ejemplo6/folder1/data.json',
    JSON.stringify({ name: 'Item 1', active: true })
  );

  await fs.writeFile(
    './test-data/ejemplo6/folder2/data.json',
    JSON.stringify({ name: 'Item 2', active: false })
  );

  await fs.writeFile(
    './test-data/ejemplo6/folder3/data.json',
    JSON.stringify({ name: 'Item 3', active: true })
  );
}

// ============================================
// EJEMPLO 7: Manejo de Errores
// ============================================

async function ejemplo7_errores() {
  console.log('\n⚠️ Ejemplo 7: Manejo de Errores\n');

  await crearEstructuraEjemplo7();

  const scanner = new JSONScanner({
    maxDepth: 2,
    outputFormat: 'array',
    ignoreErrors: true,
    onError: (error, file) => {
      console.log(`  ❌ Error en ${file.split('/').pop()}: ${error.message}`);
    }
  });

  const result = await scanner.scan('./test-data/ejemplo7');

  console.log(`\n✅ Archivos procesados: ${result.stats.filesProcessed}`);
  console.log(`❌ Archivos con error: ${result.stats.errorCount}`);
  console.log(`📊 Tasa de éxito: ${result.stats.successRate}`);

  await limpiarEstructura('./test-data');
}

async function crearEstructuraEjemplo7() {
  await fs.mkdir('./test-data/ejemplo7', { recursive: true });

  // Archivo válido
  await fs.writeFile(
    './test-data/ejemplo7/valid.json',
    JSON.stringify({ valid: true })
  );

  // Archivo con JSON inválido
  await fs.writeFile(
    './test-data/ejemplo7/invalid.json',
    '{ invalid json syntax'
  );

  // Otro archivo válido
  await fs.writeFile(
    './test-data/ejemplo7/valid2.json',
    JSON.stringify({ valid: true })
  );

  // Otro archivo inválido
  await fs.writeFile(
    './test-data/ejemplo7/invalid2.json',
    'not json at all!'
  );
}

// ============================================
// EJEMPLO 8: Progreso en Tiempo Real
// ============================================

async function ejemplo8_progreso() {
  console.log('\n⏱️ Ejemplo 8: Monitoreo de Progreso\n');

  await crearEstructuraEjemplo8();

  const scanner = new JSONScanner({
    maxDepth: 2,
    outputFormat: 'array',
    onProgress: (current, total) => {
      const percent = ((current / total) * 100).toFixed(0);
      process.stdout.write(`\r  Progreso: ${percent}% (${current}/${total})`);
    }
  });

  const result = await scanner.scan('./test-data/ejemplo8');

  console.log('\n\n✅ Escaneo completado');
  console.log(`📊 Archivos procesados: ${result.stats.filesProcessed}`);
  console.log(`⏱️ Tiempo: ${result.stats.duration}`);

  await limpiarEstructura('./test-data');
}

async function crearEstructuraEjemplo8() {
  // Crear muchos archivos para ver el progreso
  for (let i = 1; i <= 20; i++) {
    await fs.mkdir(`./test-data/ejemplo8/folder${i}`, { recursive: true });
    await fs.writeFile(
      `./test-data/ejemplo8/folder${i}/data.json`,
      JSON.stringify({ id: i, name: `Item ${i}` })
    );
  }
}

// ============================================
// EJEMPLO 9: Escaneo Agrupado
// ============================================

async function ejemplo9_agrupado() {
  console.log('\n📁 Ejemplo 9: Escaneo Agrupado por Carpeta\n');

  await crearEstructuraEjemplo9();

  const scanner = new JSONScanner({
    maxDepth: 3
  });

  const result = await scanner.scanGrouped('./test-data/ejemplo9');

  console.log('✅ Datos agrupados por carpeta:');
  for (const [folder, items] of Object.entries(result.data)) {
    console.log(`  📁 ${folder}: ${items.length} items`);
  }

  await limpiarEstructura('./test-data');
}

async function crearEstructuraEjemplo9() {
  const folders = ['users', 'products', 'orders'];

  for (const folder of folders) {
    await fs.mkdir(`./test-data/ejemplo9/${folder}`, { recursive: true });
    await fs.writeFile(
      `./test-data/ejemplo9/${folder}/data.json`,
      JSON.stringify([
        { id: 1, type: folder },
        { id: 2, type: folder }
      ])
    );
  }
}

// ============================================
// EJEMPLO 10: Obtener Info Sin Procesar
// ============================================

async function ejemplo10_info() {
  console.log('\n📊 Ejemplo 10: Obtener Información Sin Procesar\n');

  await crearEstructuraEjemplo10();

  const scanner = new JSONScanner({
    maxDepth: 3
  });

  const info = await scanner.getInfo('./test-data/ejemplo10');

  console.log('📊 Información del directorio:');
  console.log(`  📁 Ruta: ${info.path}`);
  console.log(`  📄 Archivos JSON: ${info.filesFound}`);
  console.log(`  💾 Tamaño total: ${info.totalSize}`);
  console.log(`  🔍 Profundidad: ${info.depth}`);
  console.log(`\n  📝 Archivos encontrados:`);
  info.files.forEach(file => {
    console.log(`    - ${file.split('/').slice(-2).join('/')}`);
  });

  await limpiarEstructura('./test-data');
}

async function crearEstructuraEjemplo10() {
  const estructura = {
    'ejemplo10/users': [{ id: 1 }, { id: 2 }],
    'ejemplo10/products': [{ id: 1 }, { id: 2 }, { id: 3 }],
    'ejemplo10/orders': [{ id: 1 }]
  };

  for (const [path, data] of Object.entries(estructura)) {
    await fs.mkdir(`./test-data/${path}`, { recursive: true });
    await fs.writeFile(
      `./test-data/${path}/data.json`,
      JSON.stringify(data)
    );
  }
}

// ============================================
// UTILIDADES
// ============================================

async function limpiarEstructura(path) {
  try {
    await fs.rm(path, { recursive: true, force: true });
  } catch (error) {
    // Ignorar errores de limpieza
  }
}

// ============================================
// EJECUTAR EJEMPLOS
// ============================================

async function ejecutarTodos() {
  console.log('\n🚀 JSON Scanner - Ejemplos Prácticos\n');
  console.log('════════════════════════════════════════\n');

  try {
    // Descomentar el ejemplo que quieras ejecutar
    
    await ejemplo1_basico();
    // await ejemplo2_metadatos();
    // await ejemplo3_duplicados();
    // await ejemplo4_objetosArray();
    // await ejemplo5_profundidad();
    // await ejemplo6_filtrado();
    // await ejemplo7_errores();
    // await ejemplo8_progreso();
    // await ejemplo9_agrupado();
    // await ejemplo10_info();

    console.log('\n════════════════════════════════════════');
    console.log('✅ Ejemplos completados\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Ejecutar
ejecutarTodos();
