
import { useState, useCallback } from 'react';
import { equal } from '@wry/equality';

// Maximum number of history states to keep to prevent memory leaks
const MAX_HISTORY_SIZE = 50;

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export const useHistoryState = <T>(initialPresent: T): [
    T,
    (newPresent: T | ((curr: T) => T)) => void,
    () => void,
    () => void,
    boolean,
    boolean
] => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const set = useCallback((newPresent: T | ((curr: T) => T)) => {
    setState(currentState => {
      const resolvedPresent = typeof newPresent === 'function' 
        ? (newPresent as (curr: T) => T)(currentState.present)
        : newPresent;

      if (equal(resolvedPresent, currentState.present)) {
        return currentState;
      }
      
      // Limit history size to prevent memory leaks
      const newPast = [...currentState.past, currentState.present];
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift(); // Remove oldest entry
      }
      
      return {
        past: newPast,
        present: resolvedPresent,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    if (!canUndo) return;
    setState(currentState => {
      const newPresent = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);
      return {
        past: newPast,
        present: newPresent,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    setState(currentState => {
      const newPresent = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      return {
        past: [...currentState.past, currentState.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, [canRedo]);

  return [state.present, set, undo, redo, canUndo, canRedo];
};
