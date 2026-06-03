const axios = require('axios')
const { logger } = require('../utils/logger')

class ApifyService {
  constructor() {
    this.apiToken = process.env.APIFY_API_KEY
    this.baseUrl = 'https://api.apify.com/v2'
    
    if (!this.apiToken) {
      logger.warn('APIFY_API_KEY not configured')
    }
  }

  async startActor(config) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/acts/${config.actor}/runs`,
        config.input,
        {
          params: { token: this.apiToken },
          timeout: 30000,
        }
      )

      logger.info('Apify actor started:', { 
        actorId: config.actor,
        runId: response.data.data.id 
      })

      return response.data.data.id
    } catch (error) {
      logger.error('Error starting Apify actor:', error.response?.data || error.message)
      throw new Error(`Failed to start scraper: ${error.message}`)
    }
  }

  async getDatasetItems(datasetId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/datasets/${datasetId}/items`,
        {
          params: {
            token: this.apiToken,
            format: 'json',
          },
          timeout: 60000,
        }
      )

      logger.info('Dataset items retrieved:', { 
        datasetId, 
        count: response.data.length 
      })

      return response.data
    } catch (error) {
      logger.error('Error getting dataset items:', error.response?.data || error.message)
      throw new Error(`Failed to get dataset: ${error.message}`)
    }
  }

  async getActorRun(runId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/actor-runs/${runId}`,
        {
          params: { token: this.apiToken },
        }
      )

      return response.data.data
    } catch (error) {
      logger.error('Error getting actor run:', error.message)
      throw error
    }
  }

  async waitForCompletion(runId, maxWaitMs = 300000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitMs) {
      const run = await this.getActorRun(runId)
      
      if (run.status === 'SUCCEEDED') {
        return run
      }
      
      if (run.status === 'FAILED' || run.status === 'ABORTED') {
        throw new Error(`Actor run ${run.status}: ${run.statusMessage}`)
      }

      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    throw new Error('Actor run timed out')
  }
}

module.exports = { ApifyService }
