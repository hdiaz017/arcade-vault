// Teclado de una partida. Las teclas se identifican por `event.code`.

/** Lo que el juego puede consultar sobre el teclado. */
export type KeyboardState = {
  /** `true` mientras la tecla siga pulsada. */
  isDown: (code: string) => boolean;
  /** `true` una sola vez por pulsación: al consultarla se consume. */
  pressed: (code: string) => boolean;
};

export type Keyboard = KeyboardState & {
  /** Olvida las teclas mantenidas y las pulsaciones sin consumir. */
  clear: () => void;
  /** Quita los listeners de la ventana. */
  destroy: () => void;
};

// Teclas con las que el navegador desplazaría la página.
const SCROLL_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

const isTextField = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

/**
 * Empieza a escuchar el teclado.
 * `isCapturing` indica si la partida está en curso y sin pausa; solo entonces
 * se impide que las flechas y Espacio desplacen la página.
 */
export function createKeyboard(isCapturing: () => boolean): Keyboard {
  const held = new Set<string>();
  const justPressed = new Set<string>();
  const listeners = new AbortController();
  const { signal } = listeners;

  const clear = () => {
    held.clear();
    justPressed.clear();
  };

  window.addEventListener(
    "keydown",
    (event) => {
      if (isTextField(event.target)) return;
      if (SCROLL_KEYS.has(event.code) && isCapturing()) event.preventDefault();
      // La autorrepetición mantiene la tecla, pero no cuenta como otra pulsación.
      if (!held.has(event.code) && !event.repeat) justPressed.add(event.code);
      held.add(event.code);
    },
    { signal },
  );

  // Soltar se atiende siempre, aunque el foco haya pasado a un campo de texto.
  window.addEventListener("keyup", (event) => held.delete(event.code), { signal });

  // Sin foco no llegan los `keyup`: se olvida todo para que nada quede pulsado.
  window.addEventListener("blur", clear, { signal });

  return {
    isDown: (code) => held.has(code),
    // `delete` devuelve true solo si la pulsación estaba pendiente.
    pressed: (code) => justPressed.delete(code),
    clear,
    destroy: () => {
      listeners.abort();
      clear();
    },
  };
}
