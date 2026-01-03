import type { ID } from './common';

export interface ITransportBy {
  id: ID;
  transport_code?: string | null;
  transport_name?: string | null;
}
