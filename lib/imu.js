var Board = require("../lib/board.js"),
  Emitter = require("events").EventEmitter,
  util = require("util"),
  __ = require("../lib/fn.js"),
  Accelerometer = require("../lib/accelerometer.js"),
  Barometer = require("../lib/barometer.js"),
  Temperature = require("../lib/temperature.js"),
  Gyro = require("../lib/gyro.js"),
  int16 = __.ToInt16FromTwoBytes,
  uint16 = __.ToUInt16FromTwoBytes;


var priv = new Map();
var activeDrivers = new Map();

var Drivers = {
  // Based on the example code from
  // http://playground.arduino.cc/Main/MPU-6050
  // http://www.invensense.com/mems/gyro/mpu6050.html
  MPU6050: {
    ADDRESSES: {
      value: [0x68, 0x69]
    },
    COMMANDS: {
      value: {
        SETUP: [0x6B, 0x00], // += 250
        READREGISTER: 0x3B
      }
    },
    initialize: {
      value: function(board, opts) {
        var READLENGTH = 14;
        var io = board.io;
        var freq = opts.freq || 100;
        var address = opts.address || this.ADDRESSES[0];

        this.data = {
          accelerometer: {},
          temperature: {},
          gyro: {}
        };

        io.i2cConfig();
        io.i2cWrite(address, this.COMMANDS.SETUP);

        io.i2cRead(address, this.COMMANDS.READREGISTER, READLENGTH, function(data) {
          this.data.accelerometer = {
            x: int16(data[0], data[1]),
            y: int16(data[2], data[3]),
            z: int16(data[4], data[5])
          };

          this.data.temperature = int16(data[6], data[7]);

          this.data.gyro = {
            x: int16(data[8], data[9]),
            y: int16(data[10], data[11]),
            z: int16(data[12], data[13])
          };

          this.emit("data", null, this.data);
        }.bind(this));
      },
    },
    identifier: {
      value: function(opts) {
        var address = opts.address || Drivers["MPU6050"].ADDRESSES.value[0];
        return "mpu-6050-" + address;
      }
    }
  },
  MPL115A2: {
    ADDRESSES: {
      value: [0x60]
    },
    COMMANDS: {
      value: {
        COEFFICIENTS: 0x04,
        READREGISTER: 0x00,
        STARTCONVERSION: 0x12,
      }
    },
    initialize: {
      value: function(board, opts) {
        var READLENGTH = 4;
        var io = board.io;
        var freq = opts.freq || 100;
        var address = opts.address || this.ADDRESSES[0];
        var state = priv.get(this);

        var cof = {
          a0: null,
          b1: null,
          b2: null,
          c12: null
        };

        io.i2cConfig();

        // Gather coefficients
        var pCoefficients = new Promise(function(resolve, _) {
          io.i2cReadOnce(address, this.COMMANDS.COEFFICIENTS, 8, function(data) {
            // a0 is the pressure offset coefficient
            // b1 is the pressure sensitivity coefficient
            // b2 is the temperature coefficient of offset (TCO)
            // c12 is the temperature coefficient of sensitivity (TCS)
            var A0 = int16(data[0], data[1]);
            var B1 = int16(data[2], data[3]);
            var B2 = int16(data[4], data[5]);
            var C12 = int16(data[6], data[7]) >> 2;

            // Source:
            // https://github.com/adafruit/Adafruit_MPL115A2
            cof.a0 = A0 / 8;
            cof.b1 = B1 / 8192;
            cof.b2 = B2 / 16384;
            cof.c12 = C12 / 4194304;

            resolve();
          }.bind(this));
        }.bind(this));

        pCoefficients.then(function() {
          io.i2cWrite(address, [this.COMMANDS.STARTCONVERSION, 0x00]);

          io.i2cRead(address, this.COMMANDS.READREGISTER, READLENGTH, function(data) {
            var padc = uint16(data[0], data[1]) >> 6;
            var tadc = uint16(data[2], data[3]) >> 6;

            var pressure = cof.a0 + (cof.b1 + cof.c12 * tadc) * padc + cof.b2 * tadc;
            var temperature = tadc;

            this.emit("data", {
              pressure: pressure,
              temperature: temperature,
            });
          }.bind(this));
        }.bind(this));
      }
    },
    identifier: {
      value: function(opts) {
        var address = opts.address || Drivers["MPL115A2"].ADDRESSES.value[0];
        return "mpl115a2-" + address;
      }
    }
  }
};

// Otherwise known as...
Drivers["MPU-6050"] = Drivers.MPU6050;

Drivers.get = function(board, driverName, opts) {
  var drivers, driverKey, driver;

  if (!activeDrivers.has(board)) {
    activeDrivers.set(board, {});
  }

  drivers = activeDrivers.get(board);

  driverKey = Drivers[driverName].identifier.value(opts);

  if (!drivers[driverKey]) {
    driver = new Emitter();
    Object.defineProperties(driver, Drivers[driverName]);
    driver.initialize(board, opts);
    drivers[driverKey] = driver;
  }

  return drivers[driverKey];
};

Drivers.clear = function() {
  activeDrivers.clear();
};

var Controllers = {
  /**
   * MPU-6050 3-axis Gyro/Accelerometer and Temperature
   *
   * http://playground.arduino.cc/Main/MPU-6050
   */

  MPU6050: {
    initialize: {
      value: function(opts) {
        var state = priv.get(this);

        state.accelerometer = new Accelerometer({
          controller: "MPU6050",
          freq: opts.freq,
          board: this.board
        });

        state.temperature = new Temperature({
          controller: "MPU6050",
          freq: opts.freq,
          board: this.board
        });

        state.gyro = new Gyro({
          controller: "MPU6050",
          freq: opts.freq,
          board: this.board
        });
      }
    },
    components: {
      value: ["accelerometer", "temperature", "gyro"]
    },
    accelerometer: {
      get: function() {
        return priv.get(this).accelerometer;
      }
    },
    temperature: {
      get: function() {
        return priv.get(this).temperature;
      }
    },
    gyro: {
      get: function() {
        return priv.get(this).gyro;
      }
    }
  },
  MPL115A2: {
    initialize: {
      value: function(opts) {
        var state = priv.get(this);

        state.barometer = new Barometer({
          controller: "MPL115A2",
          freq: opts.freq,
          board: this.board
        });

        state.temperature = new Temperature({
          controller: "MPL115A2",
          freq: opts.freq,
          board: this.board
        });
      }
    },
    components: {
      value: ["barometer", "temperature"]
    },
    barometer: {
      get: function() {
        return priv.get(this).barometer;
      }
    },
    temperature: {
      get: function() {
        return priv.get(this).temperature;
      }
    }
  }
};

// Otherwise known as...
Controllers["MPU-6050"] = Controllers.MPU6050;
Controllers["GY521"] = Controllers["GY-521"] = Controllers.MPU6050;

function IMU(opts) {

  if (!(this instanceof IMU)) {
    return new IMU(opts);
  }

  var controller, state;

  Board.Component.call(
    this, opts = Board.Options(opts)
  );

  if (opts.controller && typeof opts.controller === "string") {
    controller = Controllers[opts.controller.toUpperCase()];
  } else {
    controller = opts.controller;
  }

  if (controller == null) {
    controller = Controllers["MPU6050"];
  }

  this.freq = opts.freq || 500;

  state = {};
  priv.set(this, state);

  Object.defineProperties(this, controller);

  if (typeof this.initialize === "function") {
    this.initialize(opts);
  }

  setInterval(function() {
    this.emit("data", null, this);
  }.bind(this), this.freq);

  if (this.components && this.components.length > 0) {
    this.components.forEach(function(component) {
      if (!(this[component] instanceof Emitter)) {
        return;
      }

      this[component].on("change", function() {
        this.emit("change", null, this, component);
      }.bind(this));
    }, this);
  }
}

util.inherits(IMU, Emitter);

IMU.Drivers = Drivers;

module.exports = IMU;
