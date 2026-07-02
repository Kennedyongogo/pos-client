const PREFIX = '[POS Boot]';

export function bootLog(step, detail) {
  if (process.env.NODE_ENV === 'development') {
    if (detail !== undefined) {
      console.log(PREFIX, step, detail);
    } else {
      console.log(PREFIX, step);
    }
  }
}

export function bootWarn(step, detail) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(PREFIX, step, detail !== undefined ? detail : '');
  }
}

export function bootError(step, error) {
  console.error(PREFIX, step, error);
}

export function attachGlobalBootListeners() {
  if (process.env.NODE_ENV !== 'development') return;

  window.addEventListener('error', (event) => {
    bootError('Uncaught window error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    bootError('Unhandled promise rejection', event.reason);
  });
}
