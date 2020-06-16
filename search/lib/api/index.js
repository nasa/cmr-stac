const axios = require('axios');
const path = require('path');
const express = require('express');
const cmr = require('../cmr');

const provider = require('./provider');
const stac = require('./stac');
const wfs = require('./wfs');

async function getHealth (res) {
  try {
    await axios.get(cmr.makeCmrSearchUrl('/health'));
    res.status(200).json({
      search: {
        'ok?': true
      }
    });
  } catch (error) {
    res.status(503).json({
      search: {
        'ok?': false
      }
    });
  }
}

const routes = express.Router();

routes.use(provider.routes);
routes.use(stac.routes);
routes.use(wfs.routes);
routes.use('/health', (req, res) => getHealth(res));
routes.use('/docs', express.static(path.join(__dirname, '../../docs')));
module.exports = {
  routes
};
