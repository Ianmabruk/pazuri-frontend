import test from 'node:test'
import assert from 'node:assert/strict'

import { getProviderStatus, getProviderConfig, type ProviderStatusSummary, dispatchCampaignMessage } from './providers.js'

test('returns a truthful status when Mailtrap is configured and SMS is not', () => {
  const config = {
    EMAIL_PROVIDER: 'mailtrap',
    MAILTRAP_API_KEY: 'test-key',
    MAILTRAP_SENDER_EMAIL: 'hello@example.com',
    MAILTRAP_SENDER_NAME: 'Example Business',
    SMS_PROVIDER: '',
    SMS_API_KEY: '',
    SMS_SENDER_ID: '',
  }

  const status = getProviderStatus(config)
  const summary: ProviderStatusSummary = {
    email: { status: 'configured', provider: 'mailtrap', sender: 'hello@example.com' },
    sms: {
      status: 'not_configured',
      provider: null,
      sender: null,
      message: 'No valid SMS provider is configured. Messaging is disabled until an approved provider is connected.',
    },
    isFullyConfigured: false,
  }

  assert.deepEqual(status, summary)
  assert.equal(getProviderConfig(config).emailConfigured, true)
})

test('treats invalid Mailtrap sender emails as unconfigured', () => {
  const status = getProviderStatus({
    EMAIL_PROVIDER: 'mailtrap',
    MAILTRAP_API_KEY: 'test-key',
    MAILTRAP_SENDER_EMAIL: 'mabrixel tech',
    MAILTRAP_SENDER_NAME: 'Serve Platform',
    SMS_PROVIDER: '',
    SMS_API_KEY: '',
    SMS_SENDER_ID: '',
  })

  assert.equal(status.email.status, 'not_configured')
  assert.equal(status.email.provider, 'mailtrap')
  assert.equal(getProviderConfig({ EMAIL_PROVIDER: 'mailtrap', MAILTRAP_API_KEY: 'test-key', MAILTRAP_SENDER_EMAIL: 'mabrixel tech' }).emailConfigured, false)
})

test('dispatches through the configured channel and rejects unconfigured ones', async () => {
  const unconfiguredEmail = await dispatchCampaignMessage({
    channel: 'email',
    to: 'hello@example.com',
    subject: 'Welcome',
    text: 'Hello there',
  }, {
    EMAIL_PROVIDER: 'mailtrap',
    MAILTRAP_API_KEY: '',
    MAILTRAP_SENDER_EMAIL: '',
    MAILTRAP_SENDER_NAME: '',
    SMS_PROVIDER: '',
    SMS_API_KEY: '',
    SMS_SENDER_ID: '',
  })

  assert.equal(unconfiguredEmail.status, 'not_configured')

  const configuredEmail = await dispatchCampaignMessage({
    channel: 'email',
    to: 'hello@example.com',
    subject: 'Welcome',
    text: 'Hello there',
  }, {
    EMAIL_PROVIDER: 'mailtrap',
    MAILTRAP_API_KEY: 'test-key',
    MAILTRAP_SENDER_EMAIL: 'hello@example.com',
    MAILTRAP_SENDER_NAME: 'Example Business',
    SMS_PROVIDER: '',
    SMS_API_KEY: '',
    SMS_SENDER_ID: '',
  })

  assert.equal(configuredEmail.provider, 'mailtrap')
  assert.equal(configuredEmail.status, 'failed')
})
