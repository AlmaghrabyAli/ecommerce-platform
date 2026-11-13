import {
  NETWORK_ERROR_MESSAGE,
  SERVER_ERROR_MESSAGE,
  translateServerMessage,
} from './messages.js'

function lowerFirst(key) {
  if (!key) return key
  return key.charAt(0).toLowerCase() + key.slice(1)
}

export function parseApiError(error) {
  if (!error || !error.response) {
    return {
      status: 0,
      message: NETWORK_ERROR_MESSAGE,
      fieldErrors: {},
      isNetwork: true,
    }
  }

  const { status, data } = error.response
  const fieldErrors = {}
  let hasInvalidJsonKey = false

  if (data && typeof data === 'object' && data.errors && typeof data.errors === 'object') {
    for (const [key, messages] of Object.entries(data.errors)) {
      if (key === '$' || key.toLowerCase() === 'request') {
        hasInvalidJsonKey = true
        continue
      }
      if (Array.isArray(messages) && messages.length > 0) {
        fieldErrors[lowerFirst(key)] = String(messages[0])
      }
    }

    const firstFieldMessage = Object.values(fieldErrors)[0]
    const message = hasInvalidJsonKey && !firstFieldMessage
      ? 'The request was not valid.'
      : firstFieldMessage || 'Please check the highlighted fields.'

    return {
      status,
      message,
      fieldErrors,
      isNetwork: false,
    }
  }

  const rawMessage =
    data && typeof data === 'object'
      ? data.detail || data.title || ''
      : ''

  if (!rawMessage && status >= 500) {
    return {
      status,
      message: SERVER_ERROR_MESSAGE,
      fieldErrors,
      isNetwork: false,
    }
  }

  return {
    status,
    message: translateServerMessage(rawMessage, status),
    fieldErrors,
    isNetwork: false,
  }
}
