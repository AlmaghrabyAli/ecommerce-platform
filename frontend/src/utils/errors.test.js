import { parseApiError } from './errors.js'
import { NETWORK_ERROR_MESSAGE, SERVER_ERROR_MESSAGE } from './messages.js'

describe('parseApiError', () => {
  it('returns network error metadata when response is absent', () => {
    expect(parseApiError(new Error('Network Error'))).toEqual({
      status: 0,
      message: NETWORK_ERROR_MESSAGE,
      fieldErrors: {},
      isNetwork: true,
    })
  })

  it('extracts first validation message per field with lower-cased first letter', () => {
    const err = {
      response: {
        status: 400,
        data: {
          errors: {
            City: ['The City field is required.', 'The field City must be at least 2 chars.'],
            Phone: ['Phone is too short.'],
            status: ["The value 'Bogus' is not valid."],
          },
        },
      },
    }
    const parsed = parseApiError(err)
    expect(parsed.status).toBe(400)
    expect(parsed.isNetwork).toBe(false)
    expect(parsed.fieldErrors).toEqual({
      city: 'The City field is required.',
      phone: 'Phone is too short.',
      status: "The value 'Bogus' is not valid.",
    })
    expect(parsed.message).toBe('The City field is required.')
  })

  it('ignores $ and request malformed JSON keys and returns generic message', () => {
    const err = {
      response: {
        status: 400,
        data: {
          errors: {
            $: ["'b' is invalid JSON."],
            request: ['The request field is required.'],
          },
        },
      },
    }
    expect(parseApiError(err)).toEqual({
      status: 400,
      message: 'The request was not valid.',
      fieldErrors: {},
      isNetwork: false,
    })
  })

  it('reads service business errors from detail and auth errors from title', () => {
    const serviceErr = {
      response: {
        status: 404,
        data: { title: 'Resource not found.', detail: 'Product not found.' },
      },
    }
    expect(parseApiError(serviceErr).message).toBe('This product could not be found.')

    const authErr = {
      response: {
        status: 401,
        data: { title: 'Invalid email or password.' },
      },
    }
    expect(parseApiError(authErr).message).toBe('Incorrect email or password.')
  })

  it('handles empty 401, 403, 500, and unknown shapes cleanly', () => {
    expect(parseApiError({ response: { status: 401, data: '' } }).message).toBe(
      'Something went wrong. Please try again.',
    )
    expect(parseApiError({ response: { status: 403, data: '' } }).status).toBe(403)
    expect(parseApiError({ response: { status: 500, data: null } }).message).toBe(
      SERVER_ERROR_MESSAGE,
    )
    expect(parseApiError({ response: { status: 418, data: 'unexpected' } }).message).toBe(
      'Something went wrong. Please try again.',
    )
  })
})
