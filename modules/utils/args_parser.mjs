/**
 * Extrae el valor de un argumento de línea de comandos por su prefijo.
 *
 * @param {string} prefix - El prefijo del argumento (ej. '--wmclass', '--app', '--url')
 * @param {Array<string>|null} [args=null] - Array de argumentos, usa process.argv si es null
 * @param {string|null} [defaultValue=null] - Valor por defecto si no se encuentra el argumento
 * @returns {string|null} El valor del argumento o el valor por defecto
 * 
 * @example
 * // process.argv = ['node', 'script.js', '--wmclass=MyApp', '--port=3000']
 * const wmClass = extractArgValue('--wmclass'); // 'MyApp'
 * const port = extractArgValue('--port'); // '3000'
 * const missing = extractArgValue('--missing', null, 'default'); // 'default'
 */
function extractArgValue(prefix, args = null, defaultValue = null) {
  // Usar process.argv si no se proporcionan argumentos
  const argArray = args || process.argv;
  
  // Validar entrada
  if (!Array.isArray(argArray)) {
    throw new TypeError('Los argumentos deben ser un array');
  }
  
  if (typeof prefix !== 'string') {
    throw new TypeError('El prefijo debe ser una cadena de texto');
  }

  // Asegurar que el prefijo termine con '='
  const searchPrefix = prefix.endsWith('=') ? prefix : `${prefix}=`;

  // Buscar el argumento que comienza con el prefijo
  const matchedArg = argArray.find(arg => 
    typeof arg === 'string' && arg.startsWith(searchPrefix)
  );

  // Si se encuentra, extraer el valor después del '='
  if (matchedArg) {
    const value = matchedArg.slice(searchPrefix.length);
    return value.trim() || defaultValue;
  }

  // Retornar valor por defecto si no se encuentra
  return defaultValue;
}

/**
 * Obtiene el último elemento de un array de forma segura.
 * 
 * @param {Array} arr - El array del cual obtener el último elemento
 * @returns {*} El último elemento del array o `undefined` si el array está vacío
 * @throws {TypeError} Si el argumento no es un array
 * 
 * @example
 * arrLastElm([1, 2, 3]); // 3
 * arrLastElm([]); // undefined
 * arrLastElm(['a', 'b']); // 'b'
 */
function arrLastElm(arr) {
  if (!Array.isArray(arr)) {
    throw new TypeError('El argumento debe ser un array');
  }
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

/**
 * Convierte argumentos de línea de comando en un objeto con tipado automático.
 * Soporta múltiples formatos y tipos de datos.
 * 
 * @param {string|Array<string>} [args] - String o array con argumentos. Si no se especifica, usa process.argv
 * @param {Object} [options={}] - Opciones de configuración
 * @param {boolean} [options.includePositional=false] - Incluir argumentos posicionales (sin --)
 * @param {boolean} [options.camelCase=false] - Convertir claves a camelCase
 * @param {Object} [options.defaults={}] - Valores por defecto para argumentos específicos
 * @param {Array<string>} [options.booleanArgs=[]] - Lista de argumentos que deben tratarse como booleanos
 * @returns {Object} Objeto con los argumentos procesados y tipados
 * 
 * @example
 * // Uso básico
 * parseArgsMain('--port=3000 --debug --name="Mi App"');
 * // { port: 3000, debug: true, name: "Mi App" }
 * 
 * // Con opciones
 * parseArgsMain(process.argv, {
 *   includePositional: true,
 *   camelCase: true,
 *   defaults: { port: 8080, debug: false }
 * });
 */
function parseArgsMain(args, options = {}) {
  const {
    includePositional = false,
    camelCase = false,
    defaults = {},
    booleanArgs = []
  } = options;

  // Determinar la fuente de argumentos
  let argArray;
  
  if (typeof args === 'string') {
    // Si es string, dividir por espacios respetando comillas
    argArray = args.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  } else if (Array.isArray(args)) {
    argArray = args.slice(); // Copia para no modificar el original
  } else if (args === undefined || args === null) {
    // Omitir el ejecutable de Electron y el script, mantener solo argumentos del usuario
    const rawArgs = process.argv;
    const electronIndex = rawArgs.findIndex(arg => arg.includes('electron'));
    const startIndex = electronIndex >= 0 ? Math.min(electronIndex + 2, rawArgs.length) : 2;
    argArray = rawArgs.slice(startIndex);
  } else {
    throw new TypeError('Los argumentos deben ser string, array o undefined');
  }

  const result = { ...defaults }; // Aplicar valores por defecto
  const positional = [];

  for (let i = 0; i < argArray.length; i++) {
    const arg = argArray[i];
    
    if (typeof arg !== 'string') continue;

    // Manejar argumentos que comienzan con --
    if (arg.startsWith('--')) {
      const cleanArg = arg.slice(2);
      
      if (cleanArg.includes('=')) {
        // Formato: --key=value
        const [rawKey, ...valueParts] = cleanArg.split('=');
        const value = valueParts.join('='); // Manejar valores con '=' internos
        const key = camelCase ? toCamelCase(rawKey) : rawKey;
        
        result[key] = parseValue(value, rawKey, booleanArgs);
      } else {
        // Formato: --key value o --flag
        const key = camelCase ? toCamelCase(cleanArg) : cleanArg;
        
        // Verificar si es un argumento booleano conocido
        if (booleanArgs.includes(cleanArg)) {
          result[key] = true;
        } else {
          // Verificar si el siguiente argumento es un valor
          const nextArg = argArray[i + 1];
          if (nextArg && !nextArg.startsWith('-')) {
            result[key] = parseValue(nextArg, cleanArg, booleanArgs);
            i++; // Saltar el siguiente argumento ya que es el valor
          } else {
            // Es un flag booleano
            result[key] = true;
          }
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1 && !arg.startsWith('--')) {
      // Manejar argumentos cortos como -p, -v, etc. (solo letras)
      const shortFlags = arg.slice(1);
      for (const flag of shortFlags) {
        // Solo procesar letras como flags, ignorar números y símbolos
        if (/[a-zA-Z]/.test(flag)) {
          const key = camelCase ? flag : flag;
          result[key] = true;
        }
      }
    } else if (includePositional) {
      // Argumentos posicionales
      positional.push(parseValue(arg));
    }
  }

  // Incluir argumentos posicionales si se solicita
  if (includePositional && positional.length > 0) {
    result._positional = positional;
  }

  return result;
}

/**
 * Parsea un valor individual aplicando el tipo correcto
 * @private
 * @param {string} value - Valor a parsear
 * @param {string} [key] - Clave del argumento (para contexto)
 * @param {Array<string>} [booleanArgs=[]] - Lista de argumentos booleanos
 * @returns {*} Valor parseado con el tipo correcto
 */
function parseValue(value, key = '', booleanArgs = []) {
  if (typeof value !== 'string') return value;
  
  // Remover comillas si las tiene
  const cleanValue = value.replace(/^["']|["']$/g, '');
  
  // Verificar si debe ser booleano
  if (booleanArgs.includes(key) || 
      cleanValue.toLowerCase() === 'true' || 
      cleanValue.toLowerCase() === 'false') {
    return cleanValue.toLowerCase() === 'true';
  }
  
  // Verificar si es un número
  if (/^-?\d+(\.\d+)?$/.test(cleanValue)) {
    const num = Number(cleanValue);
    return Number.isInteger(num) ? num : parseFloat(cleanValue);
  }
  
  // Verificar si es null o undefined
  if (cleanValue.toLowerCase() === 'null') return null;
  if (cleanValue.toLowerCase() === 'undefined') return undefined;
  
  // Verificar si es un array JSON
  if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
    try {
      return JSON.parse(cleanValue);
    } catch {
      return cleanValue; // Si falla el parsing, mantener como string
    }
  }
  
  // Verificar si es un objeto JSON
  if (cleanValue.startsWith('{') && cleanValue.endsWith('}')) {
    try {
      return JSON.parse(cleanValue);
    } catch {
      return cleanValue; // Si falla el parsing, mantener como string
    }
  }
  
  return cleanValue;
}

/**
 * Convierte una cadena a camelCase
 * @private
 * @param {string} str - Cadena a convertir
 * @returns {string} Cadena en camelCase
 */
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Obtiene todos los argumentos como un objeto completo con información adicional
 * 
 * @param {string|Array<string>} [args] - Argumentos a procesar
 * @param {Object} [options={}] - Opciones de configuración
 * @returns {Object} Objeto completo con argumentos procesados, raw args, y metadatos
 * 
 * @example
 * const result = getAllArgs();
 * console.log(result.parsed); // Argumentos parseados
 * console.log(result.raw); // Argumentos originales
 * console.log(result.count); // Número de argumentos
 */
function getAllArgs(args, options = {}) {
  const rawArgs = args || process.argv;
  const parsed = parseArgsMain(args, { includePositional: true, ...options });
  
  return {
    parsed,
    raw: Array.isArray(rawArgs) ? rawArgs : rawArgs.split(' '),
    count: Array.isArray(rawArgs) ? rawArgs.length : rawArgs.split(' ').length,
    hasArgs: Object.keys(parsed).length > 0,
    positional: parsed._positional || [],
    flags: Object.keys(parsed).filter(key => 
      key !== '_positional' && typeof parsed[key] === 'boolean' && parsed[key]
    )
  };
}

export { 
  extractArgValue, 
  arrLastElm, 
  parseArgsMain, 
  getAllArgs 
};

// Ejemplos de uso:
/*
// Extracción individual
const wmClass = extractArgValue('--wmclass');
const port = extractArgValue('--port', null, '3000');

// Parsing completo
const args = parseArgsMain('--port=3000 --debug --name="Mi App" --items=[1,2,3]');
// { port: 3000, debug: true, name: "Mi App", items: [1, 2, 3] }

// Con opciones avanzadas
const advancedArgs = parseArgsMain(process.argv, {
  includePositional: true,
  camelCase: true,
  defaults: { port: 8080, debug: false },
  booleanArgs: ['verbose', 'quiet']
});

// Obtener todo
const allArgs = getAllArgs();
console.log('Argumentos parseados:', allArgs.parsed);
console.log('Flags activos:', allArgs.flags);
console.log('Argumentos posicionales:', allArgs.positional);
*/