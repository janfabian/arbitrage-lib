import { foo } from './index.js'

describe('index', () => {
  it('returns bar', () => {
    expect(foo()).toBe('bar')
  })
})
