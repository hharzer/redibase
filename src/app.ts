import { compose, concat, curry } from 'ramda'
import * as redis from 'redis'
import { json_to_pairs, key_to_path, mapKeys, path_to_key } from './pure'
import { key_or_path_schema, allowable_value_schema } from './schemas'
import { user_delete, user_get, user_set } from './user'

const connect = (connection_args) => {
    const client = redis.createClient(connection_args)
    // client.on('message', (channel, message) => {
    //     if (channel !== 'changes') return
    //     console.log('received message ot changes channel', {message})
    // })
    // client.subscribe('changes')

    return {
        get: (key: string | any[]) => {
            const { error } = key_or_path_schema.validate(key);
            if (error) return Promise.reject(error)
            return user_get(key_to_path(key), client)
        },
        set: curry((path: string | any [], json) => {
            const { path_error } = key_or_path_schema.validate(path);
            const { json_error } = allowable_value_schema.validate(json);
            if (path_error) return Promise.reject(path_error)
            if (json_error) return Promise.reject(json_error)
            return user_set(key_to_path(path), mapKeys(concat(path_to_key(path)))(json_to_pairs(json)), client)
        }),
        delete: (key: string | any[]) => {
            const { error } = key_or_path_schema.validate(key);
            if (error) return Promise.reject(error)
            user_delete(key_to_path(key), client)
        },
        quit: () => client.quit(),
        on: (path: string | any[], cb) => { }
    }
}
export { connect }

