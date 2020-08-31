const {
  findReleases,
  generateReleaseInfo,
  createRelease,
  updateRelease,
} = require('./releases')
const { findCommitsWithAssociatedPullRequests } = require('./commits')
const { sortPullRequests } = require('./sort-pull-requests')

module.exports.drafter = async ({ log, github, context, config, ref }) => {
  const { draftRelease, lastRelease } = await findReleases({
    log,
    github,
    context,
  })
  const {
    commits,
    pullRequests: mergedPullRequests,
  } = await findCommitsWithAssociatedPullRequests({
    log,
    github,
    context,
    ref,
    lastRelease,
    config,
  })

  const sortedMergedPullRequests = sortPullRequests(
    mergedPullRequests,
    config['sort-by'],
    config['sort-direction']
  )

  const releaseInfo = generateReleaseInfo({
    commits,
    config,
    lastRelease,
    mergedPullRequests: sortedMergedPullRequests,
  })

  let createOrUpdateReleaseResponse
  if (!draftRelease) {
    log.info('Creating new release')
    createOrUpdateReleaseResponse = await createRelease({
      github,
      context,
      releaseInfo,
      config,
    })
  } else {
    log.info('Updating existing release')
    createOrUpdateReleaseResponse = await updateRelease({
      github,
      context,
      draftRelease,
      releaseInfo,
      config,
    })
  }

  return { releaseResponse: createOrUpdateReleaseResponse, releaseInfo }
}
