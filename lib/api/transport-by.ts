import type { AxiosResponse } from 'axios';
import { http } from './http';
import type {
  ID,
  IReturnList,
  IReturnMessage,
  IReturnObject,
} from '@/types/backend/common';
import type { ITransportBy } from '@/types/backend/transport-by';

const data = <T>(p: Promise<AxiosResponse<T>>) => p.then((r) => r.data);

export const transportByApi = {
  getAll: () => data(http.get<IReturnList<ITransportBy>>('/api/transportby')),
  getById: (id: ID) =>
    data(http.get<IReturnObject<ITransportBy>>(`/api/transportby/${id}`)),
  create: (payload: ITransportBy) =>
    data(http.post<IReturnObject<ITransportBy>>('/api/transportby', payload)),
  update: (payload: ITransportBy) =>
    data(http.put<IReturnObject<ITransportBy>>('/api/transportby', payload)),
  remove: (id: ID) =>
    data(http.delete<IReturnMessage>(`/api/transportby/${id}`)),
};
