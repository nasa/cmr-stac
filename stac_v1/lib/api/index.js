const axios = require('axios');
const path = require('path');
const express = require('express');
const { logger, makeCmrSearchLbUrl } = require('../util');

const provider = require('./provider');
const stac = require('./stac');
const wfs = require('./wfs');

async function getHealth (res) {
  try {
    await axios.get(makeCmrSearchLbUrl('/health'));
    res.status(200).json({
      search: {
        'ok?': true
      }
    });
  } catch (error) {
    logger.error(`An error occurred during a healthcheck [${error.messge}]`);
    res.status(503).json({
      search: {
        'ok?': false
      }
    });
  }
}

const routes = express.Router();

routes.use(
  '/docs',
  express.static(path.join(__dirname, '../../docs/index.html'))
);
routes.use('/health', (_, res) => getHealth(res));
routes.use(provider.routes);
routes.use(stac.routes);
routes.use(wfs.routes);

module.exports = {
  routes
};
