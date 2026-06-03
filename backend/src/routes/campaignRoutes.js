const express = require('express')
const router = express.Router()
const campaignController = require('../controllers/campaignController')

router.get('/', (req, res) => campaignController.getCampaigns(req, res))

router.post('/', (req, res) => campaignController.createCampaign(req, res))

router.patch('/:id/status', (req, res) => campaignController.updateCampaignStatus(req, res))

router.post('/:campaignId/scrape', (req, res) => campaignController.triggerScraping(req, res))

router.post('/:campaignId/process-demos', (req, res) => campaignController.batchProcessDemos(req, res))

router.post('/:campaignId/send-messages', (req, res) => campaignController.batchSendMessages(req, res))

module.exports = router
