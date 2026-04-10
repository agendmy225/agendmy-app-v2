// Polyfill para variÃ¡veis globais necessÃ¡rias para evitar crashes
// Este arquivo deve ser importado antes de qualquer outro cÃ³digo

// DeclaraÃ§Ãµes de tipos para variÃ¡veis globais
declare global {
  var $: any;
  var hermes: any;
  var window: any;
}

// Garantir que as variÃ¡veis globais existam
if (typeof global !== 'undefined') {
  // Polyfill para $ se nÃ£o existir
  if (typeof (global as any).$ === 'undefined') {
    (global as any).$ = {};
  }

  // Polyfill para hermes se nÃ£o existir
  if (typeof (global as any).hermes === 'undefined') {
    (global as any).hermes = {};
  }

  // Garantir __DEV__ existe
  if (typeof (global as any).__DEV__ === 'undefined') {
    (global as any).__DEV__ = __DEV__ || false;
  }
}

// Polyfills para window se necessÃ¡rio (para casos de web)
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined') {
  if (typeof (globalThis as any).window.$ === 'undefined') {
    (globalThis as any).window.$ = {};
  }
}

// Garantir que console existe e tem todos os mÃ©todos
if (typeof console === 'undefined') {
  const noop = () => { };
  (global as any).console = {
    log: noop,
    warn: noop,
    error: noop,
    info: noop,
    debug: noop,
    assert: noop,
    clear: noop,
    count: noop,
    countReset: noop,
    dir: noop,
    dirxml: noop,
    group: noop,
    groupCollapsed: noop,
    groupEnd: noop,
    table: noop,
    time: noop,
    timeEnd: noop,
    timeLog: noop,
    trace: noop,
  };
}

export { };
