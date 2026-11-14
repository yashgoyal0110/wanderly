import { Router } from 'express';
import { getIdentity } from '../../../cursor/identity.js';
import { handleAiItinerary, handleDeleteTrip, handleEstimate, handleListTrips, handleSaveTrip } from '../web/handlers.js';
import { send } from '../web/respond.js';

const router = Router();

router.post('/estimate', async (req, res, next) => {
  try {
    send(res, await handleEstimate({ body: req.body, identity: await getIdentity(req) }));
  } catch (err) {
    next(err);
  }
});

router.post('/itinerary/ai', async (req, res, next) => {
  try {
    send(res, await handleAiItinerary({ body: req.body, identity: await getIdentity(req) }));
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    send(res, await handleListTrips({ query: req.query, identity: await getIdentity(req) }));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    send(res, await handleSaveTrip({ body: req.body, identity: await getIdentity(req) }));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    send(res, await handleDeleteTrip({ id: req.params.id, identity: await getIdentity(req) }));
  } catch (err) {
    next(err);
  }
});

export default router;
