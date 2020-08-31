const { validateSchema } = require('./schema')
const { DEFAULT_CONFIG } = require('./default-config')
const Table = require('cli-table3')
const path = require('path')
const merge = require('deepmerge')
const yaml = require('js-yaml')

const DEFAULT_CONFIG_NAME = 'release-drafter.yml'
const CONFIG_PATH = '.github'
const DEFAULT_BASE = '.github'
const BASE_KEY = '_extends'
const BASE_REGEX = new RegExp(
  '^' +
  '(?:([a-z\\d](?:[a-z\\d]|-(?=[a-z\\d])){0,38})/)?' + // org
  '([-_.\\w\\d]+)' + // project
  '(?::([-_./\\w\\d]+\\.ya?ml))?' + // filename
    '$',
  'i'
)

module.exports.getConfig = async function getConfig({
  log,
  github,
  context,
  configName = DEFAULT_CONFIG_NAME,
}) {
  try {
    if (!configName.endsWith('.yml') && !configName.endsWith('.yaml')) {
      configName = `${configName}.yml`
    }
    const repoConfig = await fetchConfig(
      configName,
      DEFAULT_CONFIG,
      github,
      context
    )

    let config = validateSchema(log, context, repoConfig)

    return config
  } catch (error) {
    log.info('Invalid config file')

    if (error.isJoi) {
      log.info(
        'Config validation errors, please fix the following issues in release-drafter.yml:\n' +
          joiValidationErrorsAsTable(error)
      )
    }

    return null
  }
}

function joiValidationErrorsAsTable(error) {
  const table = new Table({ head: ['Property', 'Error'] })
  error.details.forEach(({ path, message }) => {
    const prettyPath = path
      .map((pathPart) =>
        Number.isInteger(pathPart) ? `[${pathPart}]` : pathPart
      )
      .join('.')
    table.push([prettyPath, message])
  })
  return table.toString()
}

async function fetchConfig(fileName, defaultConfig, github, context) {
  const params = {
    ...context.repo(),
    path: path.posix.join(CONFIG_PATH, fileName),
  }
  const config = await loadYaml(params, github)

  let baseRepo
  if (config == null) {
    baseRepo = DEFAULT_BASE
  } else if (config != null && BASE_KEY in config) {
    baseRepo = config[BASE_KEY]
    delete config[BASE_KEY]
  }

  let baseConfig
  if (baseRepo) {
    if (typeof baseRepo !== 'string') {
      throw new Error(`Invalid repository name in key "${BASE_KEY}"`)
    }

    const baseParams = getBaseParams(params, baseRepo)
    baseConfig = await loadYaml(baseParams)
  }

  if (config == null && baseConfig == null && !defaultConfig) {
    return null
  }

  return merge.all(
    // filter out null configs
    [defaultConfig, baseConfig, config].filter((conf) => conf)
  )
}

async function loadYaml(params, github) {
  try {
    const response = await github.repos.getContents(params)

    // Ignore in case path is a folder
    // - https://developer.github.com/v3/repos/contents/#response-if-content-is-a-directory
    if (Array.isArray(response.data)) {
      return null
    }

    // we don't handle symlinks or submodule
    // - https://developer.github.com/v3/repos/contents/#response-if-content-is-a-symlink
    // - https://developer.github.com/v3/repos/contents/#response-if-content-is-a-submodule
    if (typeof response.data.content !== 'string') {
      return
    }

    return (
      yaml.safeLoad(Buffer.from(response.data.content, 'base64').toString()) ||
      {}
    )
  } catch (e) {
    if (e.status === 404) {
      return null
    }

    throw e
  }
}

function getBaseParams(params, base) {
  const match = base.match(BASE_REGEX)
  if (match === null) {
    throw new Error(`Invalid repository name in key "${BASE_KEY}": ${base}`)
  }

  return {
    owner: match[1] || params.owner,
    path: match[3] || params.path,
    repo: match[2],
  }
}
