const axios = require('axios');
const path = require('path');
const express = require('express');
const { makeCmrSearchUrl } = require('../util');

const provider = require('./provider');
const stac = require('./stac');
const wfs = require('./wfs');

async function getHealth (res) {
  try {
    await axios.get(makeCmrSearchUrl('/health'));
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

routes.use('/docs', express.static(path.join(__dirname, '../../docs/index.html')));
routes.use('/health', (req, res) => getHealth(res));
routes.use(provider.routes);
routes.use(stac.routes);
routes.use(wfs.routes);

const cloudroutes = express.Router();
cloudroutes.use('/docs', express.static(path.join(__dirname, '../../docs/index.html')));
cloudroutes.use('/health', (req, res) => getHealth(res));
cloudroutes.use(provider.cloudroutes);
cloudroutes.use(stac.cloudroutes);
cloudroutes.use(wfs.cloudroutes);

module.exports = {
  routes,
  cloudroutes
};
