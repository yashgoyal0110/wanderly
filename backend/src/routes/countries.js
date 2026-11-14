import { Router } from 'express';
import { handleCountries } from '../web/handlers.js';
import { send } from '../web/respond.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    send(res, await handleCountries({ query: req.query.q || '' }));
  } catch (err) {
    next(err);
  }
});

router.get('/:cca3', async (req, res, next) => {
  try {
    send(res, await handleCountries({ cca3: req.params.cca3 }));
  } catch (err) {
    next(err);
  }
});

export default router;
