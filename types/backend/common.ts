export type ID = number;

export interface IReturnMessage {
  message: string[];
  is_completed: boolean;
}

export interface IReturnObject<T> extends IReturnMessage {
  data_model?: T | null;
}

export interface IReturnList<T> extends IReturnObject<T[]> {}
