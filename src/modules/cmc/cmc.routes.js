import express from 'express';
import {
  exportCmcContracts,
  getCmcContract,
  getCmcContracts,
  patchCmcContractStatus,
  postCmcContract,
  putCmcContract,
  removeCmcContract,
} from './cmc.controller.js';

export const cmcRouter = express.Router();

cmcRouter.get('/', getCmcContracts);
cmcRouter.post('/', postCmcContract);
cmcRouter.get('/export', exportCmcContracts);
cmcRouter.get('/:id', getCmcContract);
cmcRouter.put('/:id', putCmcContract);
cmcRouter.patch('/:id/status', patchCmcContractStatus);
cmcRouter.delete('/:id', removeCmcContract);
