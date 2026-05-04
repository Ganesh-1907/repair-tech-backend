import express from 'express';
import {
  exportAmcContracts,
  getAmcContract,
  getAmcContracts,
  patchAmcContractStatus,
  postAmcContract,
  putAmcContract,
  removeAmcContract,
} from './amc.controller.js';

export const amcRouter = express.Router();

amcRouter.get('/', getAmcContracts);
amcRouter.post('/', postAmcContract);
amcRouter.get('/export', exportAmcContracts);
amcRouter.get('/:id', getAmcContract);
amcRouter.put('/:id', putAmcContract);
amcRouter.patch('/:id/status', patchAmcContractStatus);
amcRouter.delete('/:id', removeAmcContract);
