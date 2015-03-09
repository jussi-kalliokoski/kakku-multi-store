"use strict";

var { MultiStore } = require("../..");

function MockStore (name, data) {
    function handleError (delegate) {
        var wrapper = sinon.spy(function () {
            return new Promise( (resolve, reject) => {
                const error = wrapper.nextError;
                wrapper.nextError = null;
                if ( error ) { return resolve(Promise.reject(error)); }
                resolve(delegate.apply(this, arguments));
            }).then((value) => {
                if ( this.latency ) {
                    return new Promise(function (resolve) {
                        setTimeout(function () {
                            resolve(value);
                        });
                    });
                }

                return value;
            });
        });

        wrapper.nextError = null;

        return wrapper;
    }

    return {
        latency: 0,
        data: new Map(data),

        get: handleError(function (key) {
            if ( !this.data.has(key) ) { return Promise.resolve(null); }
            var value = JSON.parse(this.data.get(key));
            return Promise.resolve({
                source: name,
                data: value.data,
                ttl: value.ttl,
            });
        }),

        set: handleError(function (key, value) {
            this.data.set(key, JSON.stringify(value));
            return Promise.resolve();
        }),
    };
}


const DEFAULT_VALUE = JSON.stringify({ data: { cat: "foo" }, ttl: 1000 });

describe("MultiStore", function () {
    var storeA;
    var storeB;
    var store;
    var result;

    function getValue () {
        beforeEach(function () {
            return store.get("foo").then(function (data) {
                result = data;
            });
        });
    }

    function setA (data={
        data: { cat: "foo" },
        ttl: 100,
    }) {
        beforeEach(function () {
            storeA.data.set("foo", JSON.stringify(data));
        });
    }

    function setB (data={
        data: { dog: "bark" },
        ttl: 1000,
    }) {
        beforeEach(function () {
            storeB.data.set("foo", JSON.stringify(data));
        });
    }

    function itShouldUseA () {
        it("should use A", function () {
            result.source.should.equal("A");
            result.data.cat.should.equal("foo");
            result.ttl.should.equal(100);
        });
    }

    function itShouldUseB () {
        it("should use B", function () {
            result.source.should.equal("B");
            result.data.dog.should.equal("bark");
            result.ttl.should.equal(1000);
        });
    }

    function gettingValueShouldThrow () {
        var error;

        beforeEach(function () {
            return store.get("foo").then(function () {
                throw new Error("it should've thrown");
            }).catch(function (err) {
                error = err;
            });
        });

        it("should throw", function () {
            error.message.should.equal("testing");
        });
    }

    function setFoo () {
        beforeEach(function () {
            result = new Error("should be undefined");

            return store.set("foo", {
                ttl: 1000,
                data: {
                    cat: "foo",
                },
            }).then(function (data) {
                result = data;
            });
        });
    }

    function settingShouldThrow () {
        var error;

        beforeEach(function () {
            return store.set("foo", {
                ttl: 1000,
                data: {
                    cat: "foo",
                },
            }).then(function (data) {
                throw new Error("it should have thrown");
            }).catch(function (err) {
                error = err;
            });
        });

        it("should throw an error", function () {
            error.message.should.equal("testing");
        });
    }

    function itShouldSetA () {
        it("should set A", function () {
            storeA.data.get("foo").should.equal(JSON.stringify({
                ttl: 1000,
                data: {
                    cat: "foo",
                },
            }));
        });
    }

    function itShouldSetB () {
        it("should set B", function () {
            storeB.data.get("foo").should.equal(JSON.stringify({
                ttl: 1000,
                data: {
                    cat: "foo",
                },
            }));
        });
    }

    function itShouldReturnUndefined () {
        it("should return undefined", function () {
            expect(result).to.equal(undefined);
        });
    }

    beforeEach(function () {
        storeA = new MockStore("A", []);
        storeB = new MockStore("B", []);
        store = new MultiStore({ stores: [storeA, storeB] });
    });

    describe("when initialized without stores", function () {
        var error;

        beforeEach(function () {
            try {
                new MultiStore({ stores: [] });
            } catch (err) {
                error = err;
            }
        });

        it("should throw an error", function () {
            error.should.be.an.instanceOf(Error);
        });
    });

    describe(".set()", function () {
        describe("when both A and B work", function () {
            setFoo();

            itShouldReturnUndefined();
            itShouldSetA();
            itShouldSetB();
        });

        describe("when A throws an error", function () {
            beforeEach(function () {
                storeA.set.nextError = new Error("testing");
            });

            settingShouldThrow();
            itShouldSetB();
        });

        describe("when B throws an error", function () {
            beforeEach(function () {
                storeB.set.nextError = new Error("testing");
            });

            settingShouldThrow();
            itShouldSetA();
        });

        describe("when both throw an error", function () {
            beforeEach(function () {
                storeA.set.nextError = new Error("testing");
                storeB.set.nextError = new Error("testing");
            });

            settingShouldThrow();
        });
    });

    describe(".get()", function () {
        describe("when both return a value", function () {
            setA();
            setB();

            describe("when A returns a value faster than B", function () {
                beforeEach(function () {
                    storeB.latency = 10;
                });

                getValue();

                itShouldUseA();
            });

            describe("when B returns a value faster than A", function () {
                beforeEach(function () {
                    storeA.latency = 10;
                });

                getValue();

                itShouldUseB();
            });
        });

        describe("when A returns null", function () {
            beforeEach(function () {
                storeB.latency = 10;
            });
            setB();

            getValue();

            itShouldUseB();
        });

        describe("when B returns null", function () {
            beforeEach(function () {
                storeA.latency = 10;
            });
            setA();

            getValue();

            itShouldUseA();
        });

        describe("when both return null", function () {
            getValue();

            it("should return null", function () {
                expect(result).to.equal(null);
            });
        });

        describe("when A returns an error and B returns a value", function () {
            beforeEach(function () {
                storeA.get.nextError = new Error("testing");
                storeB.latency = 10;
            });
            setB();

            getValue();

            itShouldUseB();
        });

        describe("when B returns an error and A returns a value", function () {
            beforeEach(function () {
                storeB.get.nextError = new Error("testing");
                storeA.latency = 10;
            });
            setA();

            getValue();

            itShouldUseA();
        });

        describe("when A returns an error and B returns null", function () {
            beforeEach(function () {
                storeA.get.nextError = new Error("testing");
            });

            gettingValueShouldThrow();
        });

        describe("when B returns an error and A returns null", function () {
            beforeEach(function () {
                storeB.get.nextError = new Error("testing");
            });

            gettingValueShouldThrow();
        });

        describe("when both return an error", function () {
            beforeEach(function () {
                storeA.get.nextError = new Error("testing");
                storeB.get.nextError = new Error("testing");
            });

            gettingValueShouldThrow();
        });
    });
});
