import type { AxiosResponse } from 'axios';
import { http } from './http';
import type {
  ID,
  IReturnList,
  IReturnMessage,
} from '@/types/backend/common';
import type { IIncome } from '@/types/backend/income';

const data = <T>(p: Promise<AxiosResponse<T>>) => p.then((r) => r.data);

export const incomeApi = {
  getAll: () =>
    data(http.get<IReturnList<IIncome>>('/api/income')),
  deleteList: (ids: number[]) =>
    data(
      http.post<IReturnMessage>('/api/Income/DeleteList', ids),
    ),
  createList: (payload: IIncome[]) =>
    data(
      http.post<IReturnMessage>('/api/Income/List', payload),
    ),
};
