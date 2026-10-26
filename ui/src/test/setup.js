import '@testing-library/jest-dom/vitest'

class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback
  }

  observe(target) {
    this.callback([{ target, contentRect: { width: 800, height: 430 } }])
  }

  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock
