const hll = require('../src/index')
const honeycomb = require('../src/honeycomb')

jest.mock('../src/honeycomb')

beforeEach(() => {
  jest.resetAllMocks()
})

const newContext = () => {
  return {
    getRemainingTimeInMillis: () => 3000,
    awsRequestId: 'fe549ea7-670c-402f-a3c8-26e3815d813c',
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'some-test-lambda',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:some-test-lambda',
    invokeid: 'fe549ea7-670c-402f-a3c8-26e3815d813c',
    logGroupName: '/aws/lambda/some-test-lambda',
    logStreamName: '2019/02/15/[$LATEST]fff41893f3da45fc9b6d45ec4fa07a92',
    memoryLimitInMB: 256,
  }
}

test('simple event', async () => {
  const event = { testing: true }
  const context = newContext()
  const fn = hll(async () => {})
  await fn(event, context)
  expect(honeycomb.sendEvent).toBeCalledTimes(1)
  let trace = honeycomb.sendEvent.mock.calls[0][0]
  trace = JSON.parse(JSON.stringify(trace))

  expect(trace.context).toEqual({
    accountId: '123456789012',
    awsRequestId: 'fe549ea7-670c-402f-a3c8-26e3815d813c',
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'some-test-lambda',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:some-test-lambda',
    invokeid: 'fe549ea7-670c-402f-a3c8-26e3815d813c',
    logGroupName: '/aws/lambda/some-test-lambda',
    logStreamName: '2019/02/15/[$LATEST]fff41893f3da45fc9b6d45ec4fa07a92',
    logUrl:
      'https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logEventViewer:group=/aws/lambda/some-test-lambda;stream=2019/02/15/[$LATEST]fff41893f3da45fc9b6d45ec4fa07a92;filter="fe549ea7-670c-402f-a3c8-26e3815d813c"',
    memoryLimitInMB: 256,
    region: 'us-east-1',
  })
  expect(trace.costUnits).toEqual(2)
  expect(trace.costInMicroDollar).toBeCloseTo(0.6)
})

test('Error should be included in trace', async () => {
  const event = { testing: true }
  const context = newContext()
  const fn = hll(async () => {
    const err = new Error('test')
    err.customProp = 'foobar'
    throw err
  })
  try {
    await fn(event, context)
  } catch (err) {
    expect(honeycomb.sendEvent).toBeCalledTimes(1)
    let trace = honeycomb.sendEvent.mock.calls[0][0]
    trace = JSON.parse(JSON.stringify(trace))
    expect(trace.err.message).toEqual('test')
    expect(trace.err.customProp).toEqual('foobar')
  }
})

test('Error should not be included in trace with ignoreErr', async () => {
  const event = { testing: true }
  const context = newContext()
  const fn = hll(
    async () => {
      const err = new Error('test')
      err.customProp = 'foobar'
      throw err
    },
    { ignoreErr: true }
  )
  try {
    await fn(event, context)
  } catch (err) {
    expect(honeycomb.sendEvent).toBeCalledTimes(1)
    let trace = honeycomb.sendEvent.mock.calls[0][0]
    trace = JSON.parse(JSON.stringify(trace))
    expect(trace.err).toBeUndefined()
  }
})

test('Return of the wrapped function must be returned', async () => {
  const event = { testing: true }
  const context = newContext()
  const fn = hll(async () => {
    return event
  })
  const result = await fn(event, context)
  expect(result).toEqual(event)
})

test('Should work without context', async () => {
  const event = { testing: true }
  const fn = hll(async () => {
    return event
  })
  const result = await fn(event)
  expect(honeycomb.sendEvent).toBeCalledTimes(1)
  expect(result).toEqual(event)
})

test('global setting object should be included', async () => {
  const event = { testing: true }
  const fn = hll(async () => {
    global.hll_handle_log = { this: 'works' }
    return event
  })
  const result = await fn(event)
  expect(honeycomb.sendEvent).toBeCalledTimes(1)
  const trace = honeycomb.sendEvent.mock.calls[0][0]
  expect(trace.handle.this).toEqual('works')

  expect(result).toEqual(event)
})
