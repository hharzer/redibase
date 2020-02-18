## Redibase

This package is the redis based alternative to google's firebase.
The goal is to harness the speed of vanilla redis while adding much loved firebase features.
With this package you can subscribe to data changes, store deeply nested data without stringifying and you can own your stack.


## Usage

Installation:

```
npm i redibase  // Or yarn add redibase
```
Initialise a redis connection

```js
import {connect} from 'redibase'
const redibase = connect('redis://....') // params are sent directly through to redis constructor
export redibase
```
Modify your data

```js
import {redibase} from 'src/config/redibase' // import the instance you created
// give a path and an object to replace at that location
redibase.set(['animals',0], {name: 'cow', age: 2})
redibase.set('people', [{name: 'john'},{name: 'sandy'}])) 

// the set function is curried so you can also pass the second parameter in later
// settings: {mode: 0}
const set_mode = redibase.set('settings.mode')
set_mode(1)
set_mode(2)
```

Retrieve your data

```js
import {redibase} from 'src/config/redibase' // import the instance you created
redibase.get('animals.0') // [{name: 'cow', age: 2}]
redibase.get(['animals',0]) // or with array notation

```
Delete data

```js
import {redibase} from 'src/config/redibase' // import the instance you created
redibase.delete('animals') 
```

Subscribe to data changes

```js
import {redibase} from 'src/config/redibase' // import the instance you created
// give a path and a callback
redibase.on(['animals', 0, 'name'], (new_value) => console.log(new_value))
```

Close the connection

```js
import {redibase} from 'src/config/redibase' // import the instance you created
redibase.quit()
```


