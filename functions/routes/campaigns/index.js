module.exports = function(app) {
  require('./crud')(app)
  require('./scraping')(app)
  require('./messaging')(app)
}
