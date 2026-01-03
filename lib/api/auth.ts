import { IReturnList } from '@/types/backend/common';
import type { AxiosResponse } from 'axios';
import { httpAuth } from './http';
import { IPermission } from '@/types/backend/auth';

const data = <T>(p: Promise<AxiosResponse<T>>) => p.then((r) => r.data);

const appID = process.env.NEXT_PUBLIC_API_AUTH_APP_ID || '';

export const authApi = {
  getPermissionByEmpId: (emp_id: string) =>
    data(
      httpAuth.get<IReturnList<IPermission>>(
        `/Permission/clientidempid/${appID}/${emp_id}`,
      ),
    ),
};
