const core = require('@actions/core')
const { context, GitHub } = require('@actions/github')
const { drafter } = require('./drafter')
const { getConfig } = require('./config')

async function draft() {
  function getInput() {
    return {
      shouldDraft: core.getInput('publish').toLowerCase() !== 'true',
      configName: core.getInput('config-name'),
      version: core.getInput('version') || undefined,
      tag: core.getInput('tag') || undefined,
      name: core.getInput('name') || undefined,
      preRelease: core.getInput('prerelease').toLowerCase() === 'true',
    }
  }

  function setActionOutput(releaseResponse, { body }) {
    const {
      data: {
        id: releaseId,
        html_url: htmlUrl,
        upload_url: uploadUrl,
        tag_name: tagName,
        name: name,
      },
    } = releaseResponse
    if (releaseId && Number.isInteger(releaseId))
      core.setOutput('id', releaseId.toString())
    if (htmlUrl) core.setOutput('html_url', htmlUrl)
    if (uploadUrl) core.setOutput('upload_url', uploadUrl)
    if (tagName) core.setOutput('tag_name', tagName)
    if (name) core.setOutput('name', name)
    core.setOutput('body', body)
  }

  const { GITHUB_TOKEN, GITHUB_REF: ref } = process.env

  const github = new GitHub(GITHUB_TOKEN)

  const log = {
    warning: core.warning,
    info: core.info,
  }
  const { configName, shouldDraft, preRelease, name, tag, version } = getInput()

  const config = await getConfig({
    log,
    github,
    context,
    configName,
  })

  if (config === null) {
    core.setFailed('Invalid config file')
    return
  }

  config.shouldDraft == shouldDraft
  config.prerelease = preRelease || (!preRelease && config.prerelease)
  config.name = name
  config.version = version
  config.tag = tag

  const { releaseResponse, releaseInfo } = await drafter({
    log,
    github,
    context,
    config,
    ref,
  })

  setActionOutput(releaseResponse, releaseInfo)
}

module.exports.draft = draft
