

import {
  DocumentNode,
  GraphQLError,
} from 'graphql';
import { ApolloError } from '../errors';
import {
  FetchPolicy,
  ErrorPolicy,
  WatchQueryFetchPolicy,
} from './watchQueryOptions';
import { NetworkStatus } from './networkStatus';
import { ApolloCache } from '../cache/index';
import { QueryInfo } from './QueryInfo';
import { FetchResult } from '../link/core';

// Fix: Add dummy type definition for 'MutationUpdaterFn' to fix 'cannot find name' error.
export declare type MutationUpdaterFn<T = {
    [key: string]: any;
}> = (cache: ApolloCache<T>, mutationResult: FetchResult<T>) => void;

// Fix: Define and export QueryListener.
export type QueryListener = (queryInfo: QueryInfo) => void;

export type PureQueryOptions = {
  query: DocumentNode;
  variables?: { [key: string]: any };
  context?: any;
};

export type ApolloQueryResult<T> = {
  data: T;
  errors?: ReadonlyArray<GraphQLError>;
  error?: ApolloError;
  loading: boolean;
  networkStatus: NetworkStatus;
  // If `true`, the `data` property on this result is not complete. This can
  // be used to display a different UI state for partial results.
  partial?: boolean;
  stale?: boolean;
};

// This is the additional state that gets added to the Relay-style
// pagination function arguments.
export interface State {
  [key: string]: any;
}

export type Resolvers = {
  [key: string]: {
    [field: string]: (
      rootValue?: any,
      args?: any,
      context?: any,
      info?: any,
    ) => any;
  };
};

export interface QueryStoreValue {
  document: DocumentNode;
  variables: object;
  previousVariables?: object;
  networkStatus: NetworkStatus;
  networkError?: Error | null;
  graphQLErrors?: ReadonlyArray<GraphQLError>;
  metadata: any;
}

export type OperationVariables = Record<string, any>;