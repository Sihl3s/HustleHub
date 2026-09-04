/**
 * Public health check so operators and Postman can confirm the API is up
 * without needing a token.
 */

const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'hustlehub-api',
  });
});

module.exports = router;
