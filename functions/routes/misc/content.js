const { db, FIREBASE_APP_URL, FIREBASE_API_URL } = require('../../config')

const CONTENT_TEMPLATES = {
  launch: ['Vengo curioseando {producto} hace unos días y la verdad me está gustando mucho. {descripcion}. Si te sirve, probalo acá → {url}', 'Hace un par de semanas arranqué con {producto} y ya no puedo vivir sin eso. {descripcion}. Te dejo el link → {url}', 'Nadie me pidió opinión igual voy a dejar esto acá: {producto} está buenísimo. {descripcion}. Link: {url}', 'Mirá lo que encontré. {producto}. {descripcion}. Link acá → {url}'],
  feature: ['Sabías que con {producto} podés {beneficio}? No es magia, es tecnología. {url}', 'Si hay algo que me cambió la forma de trabajar fue {producto}. Principalmente porque me permite {beneficio}. {url}', '{producto} te saca un montón de laburo de encima. {beneficio}. {url}'],
  testimonial: ['Hablando con {cliente} me contó que usa {producto} y no cambia más. {testimonial}. {url}', '{cliente} arrancó con {producto} hace unos meses. {testimonial}. {url}'],
  promo: ['Por tiempo limitado, {producto} tiene {descuento} de descuento. {url}', '{producto} está de oferta con un {descuento} off. {url}'],
}
const SOCIAL_PLATFORMS = { twitter: { maxChars: 280, name: 'Twitter/X' }, instagram: { maxChars: 2200, name: 'Instagram' }, linkedin: { maxChars: 3000, name: 'LinkedIn' }, facebook: { maxChars: 63206, name: 'Facebook' } }

module.exports = function(app) {

app.post('/content/generate', async (req, res) => {
  try {
    const { productId, type, platform, customParams } = req.body
    let product = null
    if (productId) { const prodDoc = await db.collection('productos').doc(productId).get(); if (prodDoc.exists) product = prodDoc.data() }
    const templates = CONTENT_TEMPLATES[type] || CONTENT_TEMPLATES.launch
    const template = templates[Math.floor(Math.random() * templates.length)]
    const params = { producto: product?.nombre || customParams?.producto || 'nuestro producto', descripcion: product?.descripcion || customParams?.descripcion || 'una solución innovadora', url: product?.url_propuesta || customParams?.url || FIREBASE_APP_URL, beneficio: customParams?.beneficio || 'multiplicar tus ventas', cliente: customParams?.cliente || 'un cliente satisfecho', testimonial: customParams?.testimonial || 'Es increíble', descuento: customParams?.descuento || '20%' }
    let content = template
    Object.entries(params).forEach(([k, v]) => { content = content.replace(new RegExp(`\\{${k}\\}`, 'g'), v) })
    const platformInfo = SOCIAL_PLATFORMS[platform] || SOCIAL_PLATFORMS.twitter
    if (content.length > platformInfo.maxChars) content = content.substring(0, platformInfo.maxChars - 3) + '...'
    const variations = templates.map(t => { let v = t; Object.entries(params).forEach(([k, val]) => { v = v.replace(new RegExp(`\\{${k}\\}`, 'g'), val) }); if (v.length > platformInfo.maxChars) v = v.substring(0, platformInfo.maxChars - 3) + '...'; return { text: v, charCount: v.length } })
    await db.collection('generated_content').add({ product_id: productId || null, type, platform, content, variations, params, timestamp: new Date() })
    res.json({ success: true, data: { content, variations, platform: platformInfo.name, charCount: content.length } })
  } catch (error) { console.error('Error generating content:', error); res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/content/history', async (req, res) => {
  try {
    const { productId } = req.query
    let query = db.collection('generated_content').orderBy('timestamp', 'desc')
    if (productId) query = query.where('product_id', '==', productId)
    const snapshot = await query.limit(50).get()
    res.json({ success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) })
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }) }
})

app.get('/api-docs', (req, res) => {
  res.json({ name: 'Revendr API', version: '1.0.0', description: 'API pública para integrar Revendr con tu sistema', baseUrl: FIREBASE_API_URL, authentication: { type: 'API Key', header: 'x-api-key' }, endpoints: { leads: { 'GET /leads': 'Listar leads', 'GET /leads/stats': 'Estadísticas', 'POST /leads/score-all': 'Recalcular scores', 'POST /leads/:id/generate-message': 'Generar mensaje', 'POST /leads/:id/send-email': 'Enviar email', 'POST /leads/:id/send-whatsapp': 'Enviar WhatsApp' }, campaigns: { 'GET /campaigns': 'Listar campañas', 'POST /campaigns': 'Crear campaña', 'POST /campaigns/:id/scrape': 'Scraping', 'POST /campaigns/:id/process-demos': 'Generar propuestas', 'POST /campaigns/:id/send-messages': 'Enviar WhatsApp' } }, rateLimits: { default: '100 requests/min', scraping: '5 requests/min' } })
})

}
