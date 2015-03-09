# kakku-multi-store

[![Build Status](https://travis-ci.org/jussi-kalliokoski/kakku-multi-store.svg)](https://travis-ci.org/jussi-kalliokoski/kakku-multi-store)
[![Coverage Status](https://img.shields.io/coveralls/jussi-kalliokoski/kakku-multi-store.svg)](https://coveralls.io/r/jussi-kalliokoski/kakku-multi-store)

An [multi](https://github.com/isaacs/node-multi)-backed in memory store for [kakku](https://github.com/jussi-kalliokoski/kakku-multi-store).

## Usage

```javascript
var Kakku = require("kakku").Kakku;
var MultiStore = require("kakku-multi-store").MultiStore;

var kakku = new Kakku({
    ...
    store: new MultiStore({ stores: [
        new LruCacheStore(...),
        new RedisStore(...),
    ] }),
});
```

### Development

Development is pretty straightforward, it's all JS and the standard node stuff works:

To install dependencies:

```bash
$ npm install
```

To run the tests:

```bash
$ npm test
```

Then just make your awesome feature and a PR for it. Don't forget to file an issue first, or start with an empty PR so others can see what you're doing and discuss it so there's a a minimal amount of wasted effort.
