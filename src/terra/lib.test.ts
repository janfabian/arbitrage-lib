import { toRaw } from './lib.js'

describe('lib', () => {
  describe('toRaw', () => {
    it('removes kind property', () => {
      const obj = {
        kind: 'foo',
        attr: 1,
      }

      const result = toRaw(obj)

      expect(result).not.toHaveProperty('kind')
      expect(result).toHaveProperty('attr', 1)
    })
  })
})
