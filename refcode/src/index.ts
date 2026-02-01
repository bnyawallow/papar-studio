
import { __assign } from "tslib";
import { parse, DocumentNode } from 'graphql';
var docCache = new Map();
var fragmentSourceMap = new Map();
var printFragmentWarnings = true;
var experimentalFragmentVariables = false;
function normalize(string) {
    return string.replace(/[\s,]+/g, ' ').trim();
}
function cacheKeyFromLoc(loc) {
    return normalize(loc.source.body.substring(loc.start, loc.end));
}
function processFragments(ast) {
    var seenKeys = new Set();
    var definitions = [];
    ast.definitions.forEach(function (fragmentDefinition) {
        if (fragmentDefinition.kind === 'FragmentDefinition') {
            var fragmentName = fragmentDefinition.name.value;
            var sourceKey = cacheKeyFromLoc(fragmentDefinition.loc);
            var sourceKeySet = fragmentSourceMap.get(fragmentName);
            if (sourceKeySet && !sourceKeySet.has(sourceKey)) {
                if (printFragmentWarnings) {
                    console.warn("Warning: fragment with name " + fragmentName + " already exists.\n"
                        + "graphql-tag enforces all fragment names across your application to be unique; read more about\n"
                        + "this in the docs: http://dev.apollodata.com/core/fragments.html#unique-names");
                }
            }
            else if (!sourceKeySet) {
                fragmentSourceMap.set(fragmentName, sourceKeySet = new Set);
            }
            sourceKeySet.add(sourceKey);
            if (!seenKeys.has(sourceKey)) {
                seenKeys.add(sourceKey);
                definitions.push(fragmentDefinition);
            }
        }
        else {
            definitions.push(fragmentDefinition);
        }
    });
    return __assign(__assign({}, ast), { definitions: definitions });
}
function stripLoc(doc: any) {
    var workSet = new Set(doc.definitions);
    workSet.forEach(function (node: any) {
        if (node.loc)
            delete node.loc;
        Object.keys(node).forEach(function (key) {
            var value = node[key];
            if (value && typeof value === 'object') {
                workSet.add(value);
            }
        });
    });
    var loc = doc.loc;
    if (loc) {
        delete loc.startToken;
        delete loc.endToken;
    }
    return doc;
}
function parseDocument(source: string): DocumentNode {
    var cacheKey = normalize(source);
    if (!docCache.has(cacheKey)) {
        // Remove unsupported 'experimentalFragmentVariables' option.
        var parsed = parse(source);
        if (!parsed || parsed.kind !== 'Document') {
            throw new Error('Not a valid GraphQL document.');
        }
        docCache.set(cacheKey, stripLoc(processFragments(parsed)));
    }
    return docCache.get(cacheKey)!;
}
export function gql(
  literals: TemplateStringsArray | string,
  ...args: any[]
): DocumentNode {
    const literalParts = Array.isArray(literals)
        ? literals
        : [literals];

    let result = literalParts[0];
    // Add explicit 'any' type to 'arg' to avoid it being inferred as 'unknown'.
    args.forEach((arg: any, i) => {
        // Use structural typing to avoid 'unknown' type errors
        const doc = arg as { kind?: string; loc?: { source: { body: string } } };
        if (doc && doc.kind === 'Document' && doc.loc && doc.loc.source && typeof doc.loc.source.body === 'string') {
            result += doc.loc.source.body;
        } else {
            result += arg;
        }
        result += literalParts[i + 1];
    });
    return parseDocument(result);
}
export function resetCaches() {
    docCache.clear();
    fragmentSourceMap.clear();
}
export function disableFragmentWarnings() {
    printFragmentWarnings = false;
}
export function enableExperimentalFragmentVariables() {
    experimentalFragmentVariables = true;
}
export function disableExperimentalFragmentVariables() {
    experimentalFragmentVariables = false;
}
var extras = {
    gql: gql,
    resetCaches: resetCaches,
    disableFragmentWarnings: disableFragmentWarnings,
    enableExperimentalFragmentVariables: enableExperimentalFragmentVariables,
    disableExperimentalFragmentVariables: disableExperimentalFragmentVariables
};
// Correctly handle exports from gql function.
export { gql as default };
(gql as any).gql = extras.gql;
(gql as any).resetCaches = extras.resetCaches;
(gql as any).disableFragmentWarnings = extras.disableFragmentWarnings;
(gql as any).enableExperimentalFragmentVariables = extras.enableExperimentalFragmentVariables;
(gql as any).disableExperimentalFragmentVariables = extras.disableExperimentalFragmentVariables;
(gql as any)["default"] = gql;
// Fix: Removed duplicate default export to resolve "A module cannot have multiple default exports" error.
//# sourceMappingURL=index.js.map
