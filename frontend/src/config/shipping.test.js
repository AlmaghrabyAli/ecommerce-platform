import { FLAT_FEE, FREE_THRESHOLD } from './shipping.js'

describe('shipping config', () => {
  it('exports informational backend-matched shipping constants', () => {
    expect(FLAT_FEE).toBe(50)
    expect(FREE_THRESHOLD).toBe(1000)
  })
})
