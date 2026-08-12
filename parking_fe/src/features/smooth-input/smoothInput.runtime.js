const TEXT_FIELD_SELECTOR = [
  'input:not([type])',
  'input[type="email"]',
  'input[type="password"]',
  'input[type="search"]',
  'input[type="tel"]',
  'input[type="text"]',
  'input[type="url"]',
  'textarea',
].join(',');

const PASSWORD_CHAR = /\b(firefox|fxios)\b/i.test(navigator.userAgent) ? '\u25cf' : '\u2022';

let activeField = null;
let caretElement = null;
let mirrorElement = null;
let frameId = 0;

function isTextField(element) {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

function canUseSmoothCaret(element) {
  return isTextField(element)
    && element.matches(TEXT_FIELD_SELECTOR)
    && !element.disabled
    && !element.readOnly
    && !element.dataset.noSmoothInput
    && !element.closest('.login-input-wrap');
}

function ensureElements() {
  if (!caretElement) {
    caretElement = document.createElement('span');
    caretElement.className = 'smooth-input-caret';
    caretElement.setAttribute('aria-hidden', 'true');
    document.body.appendChild(caretElement);
  }

  if (!mirrorElement) {
    mirrorElement = document.createElement('div');
    mirrorElement.className = 'smooth-input-mirror';
    mirrorElement.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mirrorElement);
  }
}

function setActiveField(field) {
  ensureElements();
  activeField?.classList.remove('smooth-input-field');
  activeField = field;
  activeField.classList.add('smooth-input-field');
  requestCaretUpdate();
}

function clearActiveField() {
  activeField?.classList.remove('smooth-input-field');
  activeField = null;
  hideCaret();
}

function hideCaret() {
  if (caretElement) {
    caretElement.classList.remove('visible');
  }
}

function requestCaretUpdate() {
  if (!activeField || frameId) {
    return;
  }

  frameId = window.requestAnimationFrame(() => {
    frameId = 0;
    updateCaret();
  });
}

function updateCaret() {
  if (!activeField || document.activeElement !== activeField) {
    hideCaret();
    return;
  }

  const selectionStart = activeField.selectionStart ?? 0;
  const selectionEnd = activeField.selectionEnd ?? 0;

  if (selectionStart !== selectionEnd) {
    hideCaret();
    return;
  }

  const position = activeField instanceof HTMLTextAreaElement
    ? measureTextareaCaret(activeField, selectionEnd)
    : measureInputCaret(activeField, selectionEnd);

  if (!position) {
    hideCaret();
    return;
  }

  caretElement.style.height = `${position.height}px`;
  caretElement.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
  caretElement.classList.add('visible');
}

function getLineHeight(styles) {
  const parsedLineHeight = Number.parseFloat(styles.lineHeight);
  const fontSize = Number.parseFloat(styles.fontSize) || 16;

  return Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.25;
}

function copyTextStyles(target, mirror) {
  const styles = window.getComputedStyle(target);
  const properties = [
    'borderBottomWidth',
    'borderLeftWidth',
    'borderRightWidth',
    'borderTopWidth',
    'boxSizing',
    'fontFamily',
    'fontFeatureSettings',
    'fontKerning',
    'fontSize',
    'fontStretch',
    'fontStyle',
    'fontVariant',
    'fontVariationSettings',
    'fontWeight',
    'letterSpacing',
    'lineHeight',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'tabSize',
    'textIndent',
    'textTransform',
  ];

  properties.forEach((property) => {
    mirror.style[property] = styles[property];
  });

  return styles;
}

function measureInputCaret(input, caretIndex) {
  const rect = input.getBoundingClientRect();
  const styles = window.getComputedStyle(input);
  const lineHeight = getLineHeight(styles);
  const text = input.type === 'password'
    ? PASSWORD_CHAR.repeat(caretIndex)
    : input.value.slice(0, caretIndex);

  mirrorElement.textContent = text || '';
  mirrorElement.style.width = 'auto';
  mirrorElement.style.whiteSpace = 'pre';
  copyTextStyles(input, mirrorElement);

  const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
  const rawX = rect.left + paddingLeft + mirrorElement.offsetWidth - input.scrollLeft;
  const minX = rect.left + paddingLeft - 1;
  const maxX = rect.right - paddingRight;

  if (rawX < minX || rawX > maxX + 1) {
    return null;
  }

  return {
    x: Math.min(rawX, maxX),
    y: rect.top + (rect.height - lineHeight) / 2,
    height: lineHeight * 0.9,
  };
}

function measureTextareaCaret(textarea, caretIndex) {
  const rect = textarea.getBoundingClientRect();
  const styles = copyTextStyles(textarea, mirrorElement);
  const lineHeight = getLineHeight(styles);
  const marker = document.createElement('span');
  const textBeforeCaret = textarea.value.slice(0, caretIndex);

  mirrorElement.textContent = textBeforeCaret || '';
  marker.textContent = '\u200b';
  mirrorElement.appendChild(marker);
  mirrorElement.style.height = 'auto';
  mirrorElement.style.overflow = 'hidden';
  mirrorElement.style.whiteSpace = 'pre-wrap';
  mirrorElement.style.wordBreak = 'break-word';
  mirrorElement.style.wordWrap = 'break-word';
  mirrorElement.style.width = `${textarea.offsetWidth}px`;

  const x = rect.left + marker.offsetLeft - textarea.scrollLeft;
  const y = rect.top + marker.offsetTop - textarea.scrollTop;
  const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(styles.paddingRight) || 0;

  if (x < rect.left + paddingLeft - 1 || x > rect.right - paddingRight + 1) {
    return null;
  }

  return {
    x,
    y,
    height: lineHeight * 0.9,
  };
}

export function initSmoothInputCaret() {
  document.addEventListener('focusin', (event) => {
    if (canUseSmoothCaret(event.target)) {
      setActiveField(event.target);
    }
  });

  document.addEventListener('focusout', (event) => {
    if (event.target === activeField) {
      clearActiveField();
    }
  });

  ['click', 'input', 'keyup', 'mouseup', 'select'].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      if (event.target === activeField) {
        requestCaretUpdate();
      }
    });
  });

  document.addEventListener('selectionchange', requestCaretUpdate);
  document.addEventListener('scroll', requestCaretUpdate, true);
  window.addEventListener('resize', requestCaretUpdate);

  if (document.fonts?.ready) {
    document.fonts.ready.then(requestCaretUpdate).catch(() => {});
  }
}
