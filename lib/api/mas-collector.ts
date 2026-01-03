import type { AxiosResponse } from 'axios';
import { http } from './http';
import type {
  ID,
  IReturnList,
  IReturnMessage,
  IReturnObject,
} from '@/types/backend/common';
import type { IMasCollector } from '@/types/backend/mas-collector';

const data = <T>(p: Promise<AxiosResponse<T>>) => p.then((r) => r.data);

export const masCollectorApi = {
  getAll: () => data(http.get<IReturnList<IMasCollector>>('/api/mascollector')),
  getById: (id: ID) =>
    data(http.get<IReturnObject<IMasCollector>>(`/api/mascollector/${id}`)),
  getByCode: (code: string) =>
    data(
      http.get<IReturnObject<IMasCollector>>(
        `/api/mascollector/getByCode/${code}`,
      ),
    ),
  create: (payload: IMasCollector) =>
    data(http.post<IReturnObject<IMasCollector>>('/api/mascollector', payload)),
  update: (payload: IMasCollector) =>
    data(http.put<IReturnObject<IMasCollector>>('/api/mascollector', payload)),
  remove: (id: ID) =>
    data(http.delete<IReturnMessage>(`/api/mascollector/${id}`)),
};
