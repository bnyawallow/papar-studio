
import React from 'react';
import { invariant } from 'ts-invariant';

import { ApolloClient } from '../../core';
import { getApolloContext, ApolloContextValue } from '../context';

export function useApolloClient(): ApolloClient<object> {
  // Fix: Use a type assertion to ensure the context value has the expected 'client' property.
  const { client } = React.useContext(getApolloContext()) as ApolloContextValue;
  invariant(
    client,
    'No Apollo Client instance can be found. Please ensure that you ' +
      'have called `ApolloProvider` higher up in your tree.'
  );
  // Fix: Add a non-null assertion `client!` to satisfy TypeScript's strict null checks, as the invariant below ensures the client exists.
  return client!;
}
