const { getConfig } = require('./lib/config')
const { isTriggerableReference } = require('./lib/triggerable-reference')
const { richLog } = require('./lib/richLog')
const { drafter } = require('./lib/drafter')

module.exports = (app) => {
  app.on('push', async (context) => {
    const log = richLog(app, context)

    const github = context.github

    const config = await getConfig({
      log,
      github,
      context,
    })

    if (config === null) return

    const ref = context.payload.ref

    if (!isTriggerableReference({ log, ref, config })) {
      return
    }
    config.shouldDraft = true

    await drafter({
      log,
      github,
      context,
      config,
      ref,
    })
  })
}
