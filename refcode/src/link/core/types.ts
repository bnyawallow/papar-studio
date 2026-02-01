import { DocumentNode, ExecutionResult } from 'graphql';
import { Observable } from '../../utilities';

export interface GraphQLRequest<TVariables = Record<string, any>> {
  query: DocumentNode;
  variables?: TVariables;
  operationName?: string;
  context?: Record<string, any>;
  extensions?: Record<string, any>;
}

export interface Operation<TVariables = Record<string, any>>
  extends GraphQLRequest<TVariables> {
  setContext(context: Record<string, any>): Record<string, any>;
  getContext(): Record<string, any>;
}

export type FetchResult<
  TData = { [key: string]: any },
  TContext = Record<string, any>,
  TExtensions = Record<string, any>
> = ExecutionResult<TData, TExtensions> & {
  context?: TContext;
};

export type NextLink = (operation: Operation) => Observable<FetchResult>;

export type RequestHandler = (
  operation: Operation,
  forward: NextLink,
) => Observable<FetchResult> | null;
