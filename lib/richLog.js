module.exports.richLog = (app, context) => {
  const repo = context.payload.repository
  const prefix = repo ? `${repo.full_name}: ` : ''

  return {
    warning: (message) => {
      app.log.warn(`${prefix}${message}`)
    },
    info: (message) => {
      app.log.info(`${prefix}${message}`)
    },
  }
}
