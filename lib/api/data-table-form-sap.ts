import type { AxiosResponse } from 'axios';
import { http } from './http';
import type {
  ID,
  IReturnList,
  IReturnMessage,
  IReturnObject,
} from '@/types/backend/common';
import type {
  IDataTableFormSap,
  IDataTableFormSapJoined,
} from '@/types/backend/data-table-form-sap';

const data = <T>(p: Promise<AxiosResponse<T>>) => p.then((r) => r.data);

export const dataTableForSapApi = {
  getAllJoined: () =>
    data(
      http.get<IReturnList<IDataTableFormSapJoined>>(
        '/api/DataTableFormSap/JoinedData/All',
      ),
    ),
  searchByBillingDateJoined: (start?: string, end?: string) =>
    data(
      http.get<IReturnList<IDataTableFormSapJoined>>(
        '/api/DataTableFormSap/Description/Search/BillingDate/JoinedData',
        { params: { start, end } },
      ),
    ),
  getAll: () =>
    data(http.get<IReturnList<IDataTableFormSap>>('/api/datatableformsap')),
  getById: (id: ID) =>
    data(
      http.get<IReturnObject<IDataTableFormSap>>(`/api/datatableformsap/${id}`),
    ),
  searchByBillingDate: (start?: string, end?: string) =>
    data(
      http.get<IReturnList<IDataTableFormSap>>(
        '/api/DataTableFormSap/Description/Search/BillingDate',
        { params: { start, end } },
      ),
    ),
  create: (payload: IDataTableFormSap) =>
    data(
      http.post<IReturnObject<IDataTableFormSap>>(
        '/api/datatableforsap',
        payload,
      ),
    ),
  update: (payload: IDataTableFormSap) =>
    data(
      http.put<IReturnObject<IDataTableFormSap>>(
        '/api/datatableformsap',
        payload,
      ),
    ),
  remove: (id: ID) =>
    data(http.delete<IReturnMessage>(`/api/datatableformsap/${id}`)),
  deleteList: (ids: number[]) =>
    data(
      http.post<IReturnMessage>('/api/DataTableFormSap/DeleteList', ids),
    ),
  createList: (payload: IDataTableFormSap[]) =>
    data(
      http.post<IReturnMessage>('/api/DataTableFormSap/List', payload),
    ),
};
