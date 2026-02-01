import { DocumentNode } from 'graphql';
// Fix: Import 'Reference' type to resolve 'Cannot find name' error.
import { Reference } from '../../../utilities';
import { MissingFieldError, Modifier, Modifiers } from './common';

// Fix: Define DataProxy interface as it is missing.
export interface DataProxy {
  readQuery<TData, TVariables>(
    options: DataProxy.ReadQueryOptions<TData, TVariables>,
    optimistic?: boolean
  ): TData | null;
  readFragment<TData, TVariables>(
    options: DataProxy.ReadFragmentOptions<TData, TVariables>,
    optimistic?: boolean
  ): TData | null;
  writeQuery<TData, TVariables>(
    options: DataProxy.WriteQueryOptions<TData, TVariables>
  ): Reference | undefined;
  writeFragment<TData, TVariables>(
    options: DataProxy.WriteFragmentOptions<TData, TVariables>
  ): Reference | undefined;
}

// Fix: Define DataProxy here since its file is missing.
export declare namespace DataProxy {
    interface Query<TVariables, TData> {
        query: DocumentNode;
        variables?: TVariables;
        id?: string;
    }
    interface Fragment<TVariables, TData> {
        id: string;
        fragment: DocumentNode;
        fragmentName?: string;
        variables?: TVariables;
    }
    interface ReadQueryOptions<TData, TVariables> extends Query<TVariables, TData> {
        rootId?: string;
        optimistic?: boolean;
        returnPartialData?: boolean;
    }
    interface ReadFragmentOptions<TData, TVariables> extends Fragment<TVariables, TData> {
        rootId?: string;
        optimistic?: boolean;
        returnPartialData?: boolean;
    }
    interface WriteQueryOptions<TData, TVariables> extends Query<TVariables, TData> {
        data: TData;
        broadcast?: boolean;
    }
    interface WriteFragmentOptions<TData, TVariables> extends Fragment<TVariables, TData> {
        data: TData;
        broadcast?: boolean;
    }
    interface DiffResult<TData> {
        result?: TData;
        complete?: boolean;
        missing?: MissingFieldError[];
        fromOptimisticTransaction?: boolean;
    }
}


export namespace Cache {
  export type WatchCallback = (diff: Cache.DiffResult<any>) => void;

  export interface ReadOptions<TVariables = any, TData = any>
    extends DataProxy.Query<TVariables, TData> {
    rootId?: string;
    previousResult?: any;
    optimistic: boolean;
    returnPartialData?: boolean;
  }

  export interface WriteOptions<TResult = any, TVariables = any>
    extends DataProxy.Query<TVariables, TResult> {
    dataId?: string;
    result: TResult;
    broadcast?: boolean;
  }

  export interface DiffOptions extends ReadOptions {
    id?: string;
    // The DiffOptions interface is currently just an alias for
    // ReadOptions, though DiffOptions used to be responsible for
    // declaring the returnPartialData option.
  }

  export interface WatchOptions extends ReadOptions {
    immediate?: boolean;
    callback: WatchCallback;
  }

  export interface EvictOptions {
    id?: string;
    fieldName?: string;
    args?: Record<string, any>;
    broadcast?: boolean;
  }

  export interface ModifyOptions {
    id?: string;
    fields: Modifiers | Modifier<any>;
    optimistic?: boolean;
    broadcast?: boolean;
  }

  // A Reference object is a standardized way to refer to a normalized object
  // in the cache.
  export interface Reference {
    __ref: string;
  }

  export import DiffResult = DataProxy.DiffResult;
  export import ReadQueryOptions = DataProxy.ReadQueryOptions;
  export import ReadFragmentOptions = DataProxy.ReadFragmentOptions;
  export import WriteQueryOptions = DataProxy.WriteQueryOptions;
  export import WriteFragmentOptions = DataProxy.WriteFragmentOptions;
  export import Fragment = DataProxy.Fragment;
}
