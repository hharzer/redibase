import { assocPath, chain, compose, concat, is, keys, map, pathOr, reduce, split, type, uniq, unnest, curry, fromPairs, adjust, toPairs } from "ramda";
var serialize = require('serialize-javascript')

const is_numeric_string = el => !isNaN(Number(el))
export const path_to_key = path => type(path) === "Array" ? path.join('.') : path
export const key_to_path = path => type(path) === "String" ? compose(map(el => is_numeric_string(el) ? Number(el) : el), split('.'))(path) : path
export const decorate = (value: any): string => serialize(value, { ignoreFunction: true });
export const undecorate = (serializedJavascript: string): any => eval('(' + serializedJavascript + ')')

export const concat_if_nonexistent = (array, append_array) => compose(uniq, concat(array))(append_array)

const json_to_path_list = (val) => {
    if (Array.isArray(val)) {
        const child_paths = unnest(val.map((child, i) =>
            json_to_path_list(child).map(path => [i, ...path])
        ))
         
        return concat([[]], child_paths)
    }

    if (is(Object, val)) {
        const child_paths = compose(
            concat([[]]),
            chain((key, i) =>
                json_to_path_list(val[key]).map(path => [key, ...path])
            )
        )(keys(val))
        return child_paths
    }
    return [[]]
}

export const json_to_pairs = (json) => {
    const path_list = json_to_path_list(json)
    return reduce((acc, val) => ({ ...acc, [path_to_key(val)]: pathOr(undefined, val, json) }), {})(path_list)
}

export const pairs_to_json = pairs => {
    let output = {}
    const paths = compose(map(key => ({ path: key_to_path(key), val: pairs[key] })), keys)(pairs)
    paths.map(path_el => output = assocPath(path_el.path, path_el.val, output))
    return output
}

export const mapKeys = curry((fn, obj) => fromPairs(map(adjust(0, fn), toPairs(obj))));