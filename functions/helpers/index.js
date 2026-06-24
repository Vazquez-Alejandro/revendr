const { createNotification, sendEmail, sendSimpleEmail, sendTransactionalEmail, sendTelegramMessage } = require('./notifications')
const { calculateLeadScore, getScoreLabel, getTemperature, autoScoreLead, MESSAGE_TEMPLATES, generatePersonalizedMessage, generateEmailTemplate, SEQUENCE_RULES } = require('./scoring')
const { pollApifyRun, processApifyResults } = require('./apify')

module.exports = {
  createNotification,
  pollApifyRun, processApifyResults,
  calculateLeadScore, getScoreLabel, getTemperature, autoScoreLead,
  MESSAGE_TEMPLATES, generatePersonalizedMessage,
  sendEmail, generateEmailTemplate,
  SEQUENCE_RULES,
  sendSimpleEmail, sendTransactionalEmail,
  sendTelegramMessage,
}
