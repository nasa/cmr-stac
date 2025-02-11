const concurrently = require('concurrently')

concurrently([{
  command: 'npm run watch',
  name: 'watch'
}, {
  // Due to differences between deployed and local we use a slightly modified `cdk` template
  command: 'sam local start-api -t ./cdk/cmr-stac-dev/cdk.out/cmr-stac-dev.template.json --env-vars=sam_local_envs.json --warm-containers LAZY --port 3000 --docker-network host',
  name: 'api'
}], {
  prefix: 'name',
  padPrefix: true,
  prefixColors: 'auto',
  handleInput: true
})
