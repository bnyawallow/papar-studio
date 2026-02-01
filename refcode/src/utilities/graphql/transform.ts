


import {
  DocumentNode,
  SelectionNode,
  SelectionSetNode,
  OperationDefinitionNode,
  FieldNode,
  DirectiveNode,
  FragmentDefinitionNode,
  ArgumentNode,
  FragmentSpreadNode,
  VariableDefinitionNode,
  VariableNode,
  visit,
  // Fix: Import Kind enum
  Kind,
} from 'graphql';
import { invariant } from 'ts-invariant';

import {
  checkDocument,
  getOperationDefinition,
  getFragmentDefinition,
  getFragmentDefinitions,
  getMainDefinition,
} from './getFromAST';
import { filterInPlace } from '../common/filterInPlace';
import { isField, isInlineFragment } from './storeUtils';
import {
  createFragmentMap,
  FragmentMap,
} from './fragments';

export type RemoveNodeConfig<N> = {
  name?: string;
  test?: (node: N) => boolean;
  remove?: boolean;
};

export type GetNodeConfig<N> = {
  name?: string;
  test?: (node: N) => boolean;
};

export type RemoveDirectiveConfig = RemoveNodeConfig<DirectiveNode>;
export type GetDirectiveConfig = GetNodeConfig<DirectiveNode>;
export type RemoveArgumentsConfig = RemoveNodeConfig<ArgumentNode>;
export type GetFragmentSpreadConfig = GetNodeConfig<FragmentSpreadNode>;
export type RemoveFragmentSpreadConfig = RemoveNodeConfig<FragmentSpreadNode>;
export type RemoveFragmentDefinitionConfig = RemoveNodeConfig<
  FragmentDefinitionNode
>;
export type RemoveVariableDefinitionConfig = RemoveNodeConfig<
  VariableDefinitionNode
>;

const TYPENAME_FIELD: FieldNode = {
  kind: Kind.FIELD,
  name: {
    kind: Kind.NAME,
    value: '__typename',
  },
};

function isEmpty(
  op: OperationDefinitionNode | FragmentDefinitionNode,
  fragments: FragmentMap,
): boolean {
  return op.selectionSet.selections.every(
    selection =>
      selection.kind === 'FragmentSpread' &&
      isEmpty(fragments[selection.name.value], fragments),
  );
}

function nullIfDocIsEmpty(doc: DocumentNode) {
  return isEmpty(
    getOperationDefinition(doc) || getFragmentDefinition(doc),
    createFragmentMap(getFragmentDefinitions(doc)),
  )
    ? null
    : doc;
}

function getDirectiveMatcher(
  directives: (RemoveDirectiveConfig | GetDirectiveConfig)[],
) {
  return function directiveMatcher(directive: DirectiveNode) {
    return directives.some(
      dir =>
        (dir.name && dir.name === directive.name.value) ||
        (dir.test && dir.test(directive)),
    );
  };
}

function getAllFragmentSpreadsFromSelectionSet(
  selectionSet: SelectionSetNode,
): FragmentSpreadNode[] {
  const allFragments: FragmentSpreadNode[] = [];
  visit(selectionSet, {
    FragmentSpread(node) {
      allFragments.push(node);
    },
  });
  return allFragments;
}

export function removeDirectivesFromDocument(
  directives: RemoveDirectiveConfig[],
  doc: DocumentNode,
): DocumentNode | null {
  const variablesInUse: Record<string, boolean> = Object.create(null);
  let variablesToRemove: RemoveArgumentsConfig[] = [];

  const fragmentSpreadsInUse: Record<string, boolean> = Object.create(null);
  let fragmentSpreadsToRemove: RemoveFragmentSpreadConfig[] = [];

  let modifiedDoc = nullIfDocIsEmpty(
    visit(doc, {
      Variable: {
        enter(node, _key, parent) {
          // Store each variable that's referenced as part of an argument
          // (excluding operation definition variables), so we know which
          // variables are being used. If we later want to remove a variable
          // we'll first check to see if it's being used, before continuing with
          // the removal.
          if (
            (parent as VariableDefinitionNode).kind !== 'VariableDefinition'
          ) {
            variablesInUse[node.name.value] = true;
          }
        },
      },

      Field: {
        enter(node) {
          if (directives && node.directives) {
            // If `remove` is set to true for a directive, and a directive match
            // is found for a field, remove the field as well.
            const shouldRemoveField = directives.some(
              directive => directive.remove,
            );

            if (
              shouldRemoveField &&
              node.directives &&
              node.directives.some(getDirectiveMatcher(directives))
            ) {
              if (node.arguments) {
                // Store field argument variables so they can be removed
                // from the operation definition.
                node.arguments.forEach(arg => {
                  if (arg.value.kind === 'Variable') {
                    variablesToRemove.push({
                      name: (arg.value as VariableNode).name.value,
                    });
                  }
                });
              }

              if (node.selectionSet) {
                // Store fragment spread names so they can be removed from the
                // document.
                getAllFragmentSpreadsFromSelectionSet(node.selectionSet).forEach(
                  frag => {
                    fragmentSpreadsToRemove.push({
                      name: frag.name.value,
                    });
                  },
                );
              }

              // Remove the field.
              return null;
            }
          }
        },
      },

      FragmentSpread: {
        enter(node) {
          // Keep track of referenced fragment spreads. This is used to
          // determine if top level fragment definitions should be removed.
          fragmentSpreadsInUse[node.name.value] = true;
        },
      },

      Directive: {
        enter(node) {
          if (getDirectiveMatcher(directives)(node)) {
            return null;
          }
        },
      },
    }),
  );

  if (variablesToRemove.length) {
    modifiedDoc = removeArgumentsFromDocument(
      variablesToRemove.filter(
        variable => variablesInUse[variable.name!] === undefined,
      ),
      modifiedDoc as DocumentNode,
    );
  }

  if (fragmentSpreadsToRemove.length) {
    modifiedDoc = removeFragmentSpreadFromDocument(
      fragmentSpreadsToRemove,
      modifiedDoc as DocumentNode,
    );
  }

  return modifiedDoc;
}

export function removeArgumentsFromDocument(
  argsToRemove: RemoveArgumentsConfig[],
  doc: DocumentNode,
): DocumentNode | null {
  const argMatcher = (arg: ArgumentNode) =>
    argsToRemove.some(
      (a: RemoveArgumentsConfig) => a.name === arg.name.value,
    );

  return nullIfDocIsEmpty(
    visit(doc, {
      OperationDefinition: {
        enter(node) {
          return {
            ...node,
            variableDefinitions: node.variableDefinitions
              ? node.variableDefinitions.filter(
                  varDef =>
                    !argsToRemove.some(
                      (a: RemoveArgumentsConfig) =>
                        a.name === varDef.variable.name.value,
                    ),
                )
              : [],
          };
        },
      },
      Field: {
        enter(node) {
          if (argsToRemove.length && node.arguments) {
            const newArgs = node.arguments.filter(
              (arg: ArgumentNode) => !argMatcher(arg),
            );
            if (newArgs.length !== node.arguments.length) {
              return {
                ...node,
                arguments: newArgs,
              };
            }
          }
        },
      },
    }),
  );
}

export function removeFragmentSpreadFromDocument(
  spreadsToRemove: RemoveFragmentSpreadConfig[],
  doc: DocumentNode,
): DocumentNode | null {
  return nullIfDocIsEmpty(
    visit(doc, {
      FragmentSpread: {
        enter(node) {
          if (
            spreadsToRemove.some(
              (spread: RemoveFragmentSpreadConfig) => spread.name === node.name.value,
            )
          ) {
            return null;
          }
        },
      },
      FragmentDefinition: {
        enter(node) {
          if (
            spreadsToRemove.some(
              (spread: RemoveFragmentSpreadConfig) => spread.name === node.name.value,
            )
          ) {
            return null;
          }
        },
      },
    }),
  );
}

export function addTypenameToDocument(doc: DocumentNode): DocumentNode {
  return visit(checkDocument(doc), {
    SelectionSet: {
      enter(node, _key, parent) {
        // Don't add __typename to OperationDefinitions.
        if (
          parent &&
          (parent as OperationDefinitionNode).kind === 'OperationDefinition'
        ) {
          return;
        }

        // We only want to add __typename to selection sets that contain
        // fields, not selection sets that contain only fragments.
        const containsField = node.selections.some(
          selection => isField(selection) || isInlineFragment(selection),
        );

        if (containsField) {
          // If a __typename field is already present, don't add another.
          const hasTypename = node.selections.some(selection => {
            return (
              isField(selection) &&
              (selection as FieldNode).name.value === '__typename'
            );
          });

          if (!hasTypename) {
            // Add a __typename field to the selection set.
            const selections = node.selections as SelectionNode[];
            return {
              ...node,
              selections: [...selections, TYPENAME_FIELD],
            };
          }
        }
      },
    },
  });
}