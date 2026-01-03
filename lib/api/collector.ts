import type { AxiosResponse } from 'axios';
import { http } from './http';
import type {
  ID,
  IReturnList,
  IReturnMessage,
  IReturnObject,
} from '@/types/backend/common';
import type { ICollector } from '@/types/backend/collector';

const data = <T>(p: Promise<AxiosResponse<T>>) => p.then((r) => r.data);

export const collectorApi = {
  getAll: () => data(http.get<IReturnList<ICollector>>('/api/collector')),
  getById: (id: ID) =>
    data(http.get<IReturnObject<ICollector>>(`/api/collector/${id}`)),
  getByBillDoc: (billDoc: string) =>
    data(
      http.get<IReturnObject<ICollector>>(
        `/api/Collector/GetByBillDoc/${billDoc}`,
      ),
    ),
  create: (payload: ICollector) =>
    data(http.post<IReturnObject<ICollector>>('/api/collector', payload)),
  update: (payload: ICollector) =>
    data(http.put<IReturnObject<ICollector>>('/api/collector', payload)),
  remove: (id: ID) => data(http.delete<IReturnMessage>(`/api/collector/${id}`)),
};
