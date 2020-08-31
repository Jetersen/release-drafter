const core = require('@actions/core')
const { draft } = require('./lib/actions')

async function run() {
  try {
    const action = core.getInput('action', { required: true })

    switch (action) {
      case 'draft':
        await draft()
        break

      default:
        throw Error(`Unsupported action "${action}"`)
    }
  } catch (error) {
    core.setFailed(error.message)
    throw error
  }
}

run()
