import type React from 'react';

export type LoginPayload = {
  email: string;
  password: string;
};

export type UserModel = {
  id: number;
  email: string;
  firstName_TH: string;
  lastName_TH: string;
  firstName_EN: string;
  lastName_EN: string;
  password?: string;
  employeeId: number;
  role: string;
  createAt: string;
  salesOrg: string;
  salesOffice: string;
  approverTier: number;
};

export type SessionUser = Omit<UserModel, 'password'>;

export type LoginResponse = {
  message: string[];
  is_completed: boolean;
  data_model: UserModel | null;
};

export type SessionGuardProps = {
  children: React.ReactNode;
};
