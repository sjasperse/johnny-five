var MockFirmata = require("./mock-firmata"),
  five = require("../lib/johnny-five.js"),
  sinon = require("sinon"),
  Board = five.Board,
  Barometer = five.Barometer,
  board = new Board({
    io: new MockFirmata(),
    debug: false,
    repl: false
  });

exports["Barometer -- MPL115A2"] = {
  setUp: function(done) {
    this.temperature = new Barometer({
      controller: "MPL115A2",
      board: board,
      freq: 10
    });

    this.instance = [{
      name: "pressure"
    }];

    done();
  },

  tearDown: function(done) {
    done();
  },

  shape: function(test) {
    test.expect(this.instance.length);

    this.instance.forEach(function(property) {
      test.notEqual(typeof this.temperature[property.name], "undefined");
    }, this);

    test.done();
  }
};
exports["Barometer -- MPL115A2"] = {

  setUp: function(done) {

    this.i2cConfig = sinon.spy(board.io, "i2cConfig");
    this.i2cWrite = sinon.spy(board.io, "i2cWrite");
    this.i2cRead = sinon.spy(board.io, "i2cRead");
    this.i2cReadOnce = sinon.spy(board.io, "i2cReadOnce");

    this.temperature = new Barometer({
      controller: "MPL115A2",
      board: board,
      freq: 10
    });

    this.instance = [{
      name: "pressure"
    }];

    done();
  },

  tearDown: function(done) {
    this.i2cConfig.restore();
    this.i2cWrite.restore();
    this.i2cRead.restore();
    this.i2cReadOnce.restore();
    done();
  },

  data: function(test) {
    test.expect(8);

    // var spy = sinon.spy();
    // this.barometer.on("data", spy);

    var readOnce = this.i2cReadOnce.args[0][3];
    readOnce([
      67, 111,  // A0
      176, 56,  // B1
      179, 101, // B2
      56, 116   // C12
    ]);

    setImmediate(function() {
      test.ok(this.i2cConfig.calledOnce);
      test.ok(this.i2cWrite.calledOnce);

      test.equals(this.i2cWrite.args[0][0], 0x60);
      test.deepEqual(this.i2cWrite.args[0][1], [0x12, 0x00]);

      test.ok(this.i2cRead.calledOnce);
      test.equals(this.i2cRead.args[0][0], 0x60);
      test.deepEqual(this.i2cRead.args[0][1], 0x00);
      test.equals(this.i2cRead.args[0][2], 4);

      // In order to handle the Promise used for initialization,
      // there can be no fake timers in this test, which means we
      // can't use the clock.tick to move the interval forward
      // in time.
      //
      //
      // read = this.i2cRead.args[0][3];

      // read([
      //   0, 0, // barometer
      //   129, 64, // temperature
      // ]);

      // this.clock.tick(100);
      // test.ok(spy.called);
      // test.equals(Math.round(spy.args[0][0].barometer), 70);

      test.done();
    }.bind(this));
  }
};
