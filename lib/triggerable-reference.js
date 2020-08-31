module.exports.isTriggerableReference = ({ log, ref, config }) => {
  const refRegex = /^refs\/(?:heads|tags)\//
  const refernces = config.references.map((r) => r.replace(refRegex, ''))
  const shortRef = ref.replace(refRegex, '')
  const validReference = new RegExp(refernces.join('|'))
  const relevant = validReference.test(shortRef)
  if (!relevant) {
    log.info(
      `Ignoring push. ${shortRef} does not match: ${refernces.join(', ')}`
    )
  }
  return relevant
}
