import { adjust, assocPath, chain, compose, concat, curry, fromPairs, is, keys, map, pathOr, reduce, split, test, toPairs, type, uniq, unnest, join, reject, isEmpty } from "ramda";
var serialize = require('serialize-javascript')

export const is_array = el => type(el) === 'Array'
export const is_object = el => type(el) === 'Object'
export const is_array_or_object = el => type(el) === 'Array' || type(el) === 'Object'

export const is_numeric_string = test(/^0$|^[1-9][0-9]*$/)
export const path_to_key = path => type(path) === "Array" ? path.join('.') : path
export const key_to_path = path => type(path) === "String" ? compose(map(el => is_numeric_string(el) ? Number(el) : el), split('.'))(path) : path

export const stringify = (value: any): string => serialize(value, { ignoreFunction: true })
export const parse = (serializedJavascript: string): any => eval('(' + serializedJavascript + ')')

export const concat_if_nonexistent = (array, append_array) => compose(uniq, concat(array))(append_array)

const json_to_path_list = (val) => {
    if (Array.isArray(val)) {
        const child_paths = unnest(val.map((child, i) =>
            json_to_path_list(child).map(path => [i, ...path])
        ))
         
        return concat([[]], child_paths)
    }

    if (is_object(val)) {
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
    return reduce((acc, val) => {
        const redis_key = path_to_key(val)
        const given_value = pathOr(undefined, val, json)
        const redis_value = is_array_or_object(given_value) ? keys(given_value) : given_value 
        return { ...acc, [redis_key]: redis_value}
    }, {})(path_list)
}

export const pairs_to_json = pairs => {
    let output = {}
    const paths = compose(map(key => ({ path: key_to_path(key), val: pairs[key] })), keys)(pairs)
    paths.map(path_el => output = assocPath(path_el.path, path_el.val, output))
    return output
}

export const map_keys = curry((fn, obj) => fromPairs(map(adjust(0, fn), toPairs(obj))))

export const concat_with_dot = curry((a, b) => compose(
    join('.'),
    reject(isEmpty)
)([a, b]))