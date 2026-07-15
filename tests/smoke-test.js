/**
 * Basic smoke tests for Revendr
 * Run: node tests/smoke-test.js
 */

const tests = []
let passed = 0
let failed = 0

function test(name, fn) {
  tests.push({ name, fn })
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`)
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected non-null value')
  }
}

async function runTests() {
  console.log('🧪 Running Revendr smoke tests...\n')

  // Config tests
  test('config.js loads correctly', () => {
    const config = require('../functions/config')
    assertNotNull(config, 'Config should exist')
    assert(typeof config.checkPlanLimit === 'function', 'checkPlanLimit should be a function')
    assert(typeof config.incrementUsage === 'function', 'incrementUsage should be a function')
    assert(typeof config.checkEmailLimit === 'function', 'checkEmailLimit should be a function')
  })

  test('Plan limits are defined', () => {
    const { PLAN_LIMITS } = require('../functions/config')
    assertNotNull(PLAN_LIMITS, 'PLAN_LIMITS should exist')
    assert(PLAN_LIMITS.starter, 'starter plan should exist')
    assert(PLAN_LIMITS.growth, 'growth plan should exist')
    assert(PLAN_LIMITS.enterprise, 'enterprise plan should exist')
    assertEqual(PLAN_LIMITS.starter.messages, 900, 'Starter messages should be 900')
    assertEqual(PLAN_LIMITS.starter.emails, 500, 'Starter emails should be 500')
    assertEqual(PLAN_LIMITS.growth.messages, 3000, 'Growth messages should be 3000')
    assertEqual(PLAN_LIMITS.growth.emails, 2000, 'Growth emails should be 2000')
  })

  // Warmup tests
  test('warmup.js loads correctly', () => {
    const warmup = require('../functions/services/warmup')
    assert(typeof warmup.canSendToday === 'function', 'canSendToday should exist')
    assert(typeof warmup.incrementDailyUsage === 'function', 'incrementDailyUsage should exist')
    assert(typeof warmup.getQualityScore === 'function', 'getQualityScore should exist')
    assert(typeof warmup.shouldPauseSending === 'function', 'shouldPauseSending should exist')
    assert(typeof warmup.getRandomDelay === 'function', 'getRandomDelay should exist')
    assert(typeof warmup.isBusinessHours === 'function', 'isBusinessHours should exist')
    assertEqual(warmup.DELAY_CONFIG.minSeconds, 30, 'Min delay should be 30')
    assertEqual(warmup.DELAY_CONFIG.maxSeconds, 90, 'Max delay should be 90')
    assertEqual(warmup.BUSINESS_HOURS.start, 9, 'Business hours start at 9')
    assertEqual(warmup.BUSINESS_HOURS.end, 20, 'Business hours end at 20')
  })

  test('Random delay returns value in range', () => {
    const { getRandomDelay } = require('../functions/services/warmup')
    const delay = getRandomDelay()
    assert(delay >= 30 && delay <= 90, `Delay ${delay} should be between 30 and 90`)
  })

  // Engagement tests
  test('engagement.js loads correctly', () => {
    const engagement = require('../functions/services/engagement')
    assert(typeof engagement.categorizeEngagement === 'function', 'categorizeEngagement should exist')
    assert(typeof engagement.getEligibleLeadsForSending === 'function', 'getEligibleLeadsForSending should exist')
    assert(typeof engagement.getReengagedLeads === 'function', 'getReengagedLeads should exist')
  })

  test('Engagement categorization works', () => {
    const { categorizeEngagement } = require('../functions/services/engagement')
    const engaged = categorizeEngagement({ landing_views: 1, cta_clicks: 1 })
    assertEqual(engaged.level, 'engaged', 'Should be engaged')

    const viewed = categorizeEngagement({ landing_views: 1 })
    assertEqual(viewed.level, 'viewed', 'Should be viewed')

    const pending = categorizeEngagement({})
    assertEqual(pending.level, 'pending', 'Should be pending')
  })

  // Message log tests
  test('message-log.js loads correctly', () => {
    const messageLog = require('../functions/services/message-log')
    assert(typeof messageLog.logMessage === 'function', 'logMessage should exist')
    assert(typeof messageLog.getMessageHistory === 'function', 'getMessageHistory should exist')
    assert(typeof messageLog.getMessageStats === 'function', 'getMessageStats should exist')
  })

  // LemonSqueezy tests
  test('lemonsqueezy.js loads correctly', () => {
    const lemon = require('../functions/services/lemonsqueezy')
    assert(typeof lemon.createCheckout === 'function', 'createCheckout should exist')
  })

  // AI message tests
  test('ai-message.js loads correctly', () => {
    const ai = require('../functions/services/ai-message')
    assert(typeof ai.generatePersonalizedMessage === 'function', 'generatePersonalizedMessage should exist')
    assert(typeof ai.generateBulkMessages === 'function', 'generateBulkMessages should exist')
  })

  // Followup tests
  test('followup.js loads correctly', () => {
    const followup = require('../functions/services/followup')
    assert(typeof followup.getFollowupStatus === 'function', 'getFollowupStatus should exist')
    assert(typeof followup.recordFollowupAttempt === 'function', 'recordFollowupAttempt should exist')
    assert(typeof followup.getFollowupMessage === 'function', 'getFollowupMessage should exist')
    assert(typeof followup.getLeadsNeedingFollowup === 'function', 'getLeadsNeedingFollowup should exist')
    assertEqual(followup.FOLLOWUP_CONFIG.maxAttempts, 3, 'Max attempts should be 3')
    assertEqual(followup.FOLLOWUP_CONFIG.daysBetweenAttempts, 3, 'Days between attempts should be 3')
    assertEqual(followup.FOLLOWUP_CONFIG.blockDaysAfterMaxAttempts, 40, 'Block days should be 40')
  })

  test('Followup message generation works', () => {
    const { getFollowupMessage } = require('../functions/services/followup')
    const lead = { nombre_negocio: 'Pizzería Don Juan', url_propuesta: 'https://revendr-9add8.web.app/demo/producto/123' }
    const msg1 = getFollowupMessage(lead, 1)
    assert(msg1.includes('Don Juan'), 'Message should include business name')
    assert(msg1.includes('https://'), 'Message should include URL')
  })

  // Reengagement tests
  test('reengagement.js loads correctly', () => {
    const reengagement = require('../functions/services/reengagement')
    assert(typeof reengagement.checkAndTriggerReengagement === 'function', 'checkAndTriggerReengagement should exist')
    assert(typeof reengagement.markReengagementSent === 'function', 'markReengagementSent should exist')
    assertEqual(reengagement.REENGAGEMENT_CONFIG.hoursAfterVisit, 24, 'Hours after visit should be 24')
  })

  // Run all tests
  for (const t of tests) {
    try {
      await t.fn()
      console.log(`  ✅ ${t.name}`)
      passed++
    } catch (e) {
      console.log(`  ❌ ${t.name}: ${e.message}`)
      failed++
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${tests.length} total`)
  process.exit(failed > 0 ? 1 : 0)
}

runTests()
