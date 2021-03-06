/* eslint-disable @typescript-eslint/no-unused-vars */
import { connect } from '../index'
import { parse, stringify, pairs_to_json } from '../src/pure'
const sample_job_list = require('./sample_job_list')
const blns = require('blns')
require('dotenv').config()

const sample_data = {
    people: [{ name: 'john', settings: { mode: 1, likes_spam_email: false } }, { name: 'sandy', mood: 'unknown' }],
    animals: [{ name: 'cow', age: 2 }, { name: 'sheep', age: 8.2, favorite_color: null }, { name: 'donkey', age: 1 }]
}

const redibase = connect(process.env.redis, { verbose: false })

beforeEach(async () => {
    await redibase.delete('')
})

afterAll(async () => {
    await redibase.quit()
})

test('can change from obj to value', async () => {
    await redibase.set('foo', {mykey: {bar: true}})
    await redibase.set('foo.mykey', 'bar')
    const x = await redibase.get('foo')
    expect(x).toEqual({mykey: 'bar'})   
})

test.skip('can set leaf at root level', async () => {
    await redibase.set('', 1)
    const x = await redibase.get('')
    expect(x).toEqual(1)
})

test('Can use large files', async () => {
    console.time('set')
    await redibase.set('', sample_job_list)
    console.timeEnd('set')
    console.time('get')
    const x = await redibase.get('')
    console.timeEnd('get')
    return x

})

test('Indices are properly merged', async () => {
    const sample_addition = { name: 'chicken', age: 3.14 }

    const r1 = await redibase.set('', sample_data)
    const r2 = await redibase.set('animals.3', sample_addition)
    const r3 = await redibase.get('')
    expect(r3.animals[3]).toEqual(sample_addition)
})


test('can set at locations that do not exist', async () => {
    await redibase.set('my.name.is', 'jeff')
    const result = await redibase.get('my')
    expect(result).toEqual({ name: { is: 'jeff' } })
})

test('Can store and retrieve json', async () => {
    const r1 = await redibase.set('', sample_data)
    const r2 = await redibase.get('people.0.name')
    expect(r2).toEqual('john')
    const r25 = await redibase.get('')
    expect(r25).toEqual(sample_data)

    const r3 = await redibase.set('animals.1.favorite_color', 'white')
    const r4 = await redibase.get('animals.1.favorite_color')
    expect(r4).toEqual('white')

    const change = { name: 'john' }
    const r5 = await redibase.set('people.0', change)
    const r6 = await redibase.get('people.0')
    expect(r6).toEqual(change)

    const r7 = await redibase.delete('animals.0')
    const r8 = await redibase.get('animals.0')
    expect(r8).toEqual(null)
})

test('Can store naughty strings and different types as values', async () => {
    const store_and_retrieve = async (path, value) => {
        const r1 = await redibase.set(path, value)
        const r2 = await redibase.get(path)
        expect(r2).toEqual(value)
    }
    const values_to_try = [

        true, false,
        null, undefined,
        1, -1, 0, 1.11, Infinity, -Infinity,
        'throw new Error("oops")',
        '/', '.', '-', '=', '_',
        'object', 'function', 'string', ...blns.slice(0, 5)

    ]

    for (let i = 0; i < values_to_try.length; i++) {
        await store_and_retrieve('key1', values_to_try[i])
    }


})

test('if no key return null', async () => {
    const delete_response = await redibase.delete('shmey1')
    const get_response = await redibase.get('shmey1')
    expect(get_response).toEqual(null)

})
test('can set on the root layer', async () => {
    const r1 = await redibase.set('', sample_data)
    const r2 = await redibase.set('animals', { likes_chicken: true })
    const r3 = await redibase.get('')
    expect(r3).toEqual({ ...sample_data, animals: { likes_chicken: true } })
})

test('can stringify and parse', () => {
    expect(parse(stringify(1))).toEqual(1)
    expect(parse(stringify(['test.0']))).toEqual(['test.0'])
    expect(parse(stringify([1, 2, 'test.0']))).toEqual([1, 2, 'test.0'])
    expect(parse(stringify(Infinity))).toEqual(Infinity)
    expect(parse(stringify(false))).toEqual(false)
    expect(parse(stringify(true))).toEqual(true)
    expect(parse(stringify(null))).toEqual(null)
    expect(parse(stringify('null'))).toEqual('null')
    expect(parse(stringify(undefined))).toEqual(undefined)
})

test('Should handle objects with funny key names', async () => {
    const r1 = await redibase.set('key1', { 'not.ok': 'mate' }).catch((err) => { return err })
    const r2 = await redibase.set('key1', { 2: 'mate' }).catch((err) => { return err })
    const r3 = await redibase.set('key1', { 'p_p': undefined })
    expect(r1.message).toEqual('"not.ok" is not allowed')
    expect(r2.message).toEqual('"2" is not allowed')
    expect(r3).toEqual(undefined)
})

test('Should pubsub to changes', (done) => {
    (async () => {
        await redibase.on('weather', async (new_val, old_val) => {
            const new_weather = new_val.weather - 1
            console.log('setting weather to', new_weather)
            if (new_weather === 0) {
                console.log('welcome to canada')
                done()
            } else if (new_weather > 0) {
                redibase.set('weather', new_weather)
            }
        })
        const initial_weather = 10
        await redibase.set('weather', initial_weather)
    })()
})

test.skip('delete deletes key indices right away', (done) => {
    (async () => {
        await redibase.set('', { people: { are: { here: true } } })
        redibase.on('', async () => {
            const r1 = await redibase.get('people')
            expect(Object.keys(r1).length).toEqual(0)
            done()
        })
        await redibase.delete('people.are')
    })()
})

test.skip('delete deletes key indices right away', (done) => {
    (async () => {
        await redibase.set('', { people: ['john', 'mary', 'edward'] })
        await redibase.on('', async () => {
            const r1 = await redibase.get('')
            expect(Object.keys(r1).length).toEqual(0)
            done()
        })
        await redibase.delete('')
    })()
})
test.todo('values can become indexes eg my.name = "shmerel" then set my.name.last = "baker" and expect name to turn into an object')
test('can unsubscribe', async () => {
    const subscription_id = redibase.on('popcorn', (new_value, old_value) => new_value)
    redibase.off(subscription_id)
    return
})

test.todo('when subprop changes whole object is sent to on fn')
test.skip('subscribing gives nested data', done => {
    (async () => {
        const test_data = { animals: [{ name: 'cow', age: 16 }] }
        await redibase.set('', test_data)
        redibase.on('animals', (new_value, old_value) => {
            expect(old_value).toEqual(test_data)
            expect(new_value.animals[0]).toEqual({ name: 'sheep', age: 16 })
        })
        await redibase.set('animals.0.name', 'sheep')
    })()
})
test.todo('can store NaN, -0, [], {}')