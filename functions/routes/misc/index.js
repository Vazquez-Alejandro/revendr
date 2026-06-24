module.exports = function(app) {
  require('./support')(app)
  require('./analytics')(app)
  require('./team')(app)
  require('./crm')(app)
  require('./admin')(app)
  require('./content')(app)
  require('./social')(app)
  require('./whatsapp')(app)
  require('./apikeys')(app)
}
