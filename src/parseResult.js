const lowercaseHeaders = (headers) => {
  if (!headers) {
    return {}
  }
  return Object.keys(headers).reduce((acc, key) => {
    acc[key.toLowerCase()] = headers[key]
    return acc
  }, {})
}

const parseResponse = (response) => {
  let { statusCode, headers } = response
  headers = lowercaseHeaders(headers)
  return { statusCode, headers }
}

const parseResult = (result) => {
  if (result && result.statusCode) {
    return parseResponse(result)
  }
}

module.exports = parseResult
