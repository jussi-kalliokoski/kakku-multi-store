"use strict";

class MultiStore {
    constructor ({ stores }) {
        if ( stores.length < 1 ) {
            throw new Error("At least one store must be specified for MultiStore");
        }

        this.stores = stores;
    }

    set (key, value) {
        return Promise.all(this.stores.map(function (store) {
            return store.set(key, value);
        })).then(function () {
            return;
        });
    }

    get (key) {
        return new Promise((resolve, reject) => {
            var storesRemaining = this.stores.length;
            var firstError;

            function bail () {
                storesRemaining -= 1;

                if ( storesRemaining > 0 ) { return; }

                if ( firstError ) { reject(firstError); }

                resolve(null);
            }

            this.stores.forEach(function (store) {
                store.get(key)
                    .then(function (result) {
                        if ( result != null ) { return resolve(result); }
                        bail();
                    }).catch(function (error) {
                        firstError = firstError || error;
                        bail();
                    });
            });
        });
    }
}

export { MultiStore };
