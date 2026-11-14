import { Router } from 'express';
import { getIdentity } from '../../../cursor/identity.js';
import { handleChat } from '../web/handlers.js';
import { send } from '../web/respond.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    send(res, await handleChat({ body: req.body, identity: await getIdentity(req) }));
  } catch (err) {
    next(err);
  }
});

export default router;
