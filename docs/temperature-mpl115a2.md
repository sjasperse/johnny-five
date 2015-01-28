<!--remove-start-->
# Temperature Mpl115a2

Run with:
```bash
node eg/temperature-mpl115a2.js
```
<!--remove-end-->

```javascript
var five = require("johnny-five");
var board = new five.Board();

board.on("ready", function() {
  var temperature = new five.Temperature({
    controller: "MPL115A2"
  });

  temperature.on("data", function() {
    console.log("temperature");
    console.log("  celsius      : ", this.celsius);
    console.log("  fahrenheit   : ", this.fahrenheit);
    console.log("  kelvin       : ", this.kelvin);
    console.log("--------------------------------------");
  });
});


```


## Breadboard/Illustration


![docs/breadboard/temperature-mpl115a2.png](breadboard/temperature-mpl115a2.png)

- [MPL115A2 - I2C Barometric Pressure/Temperature Sensor](https://www.adafruit.com/product/992)


<!--remove-start-->
## License
Copyright (c) 2012, 2013, 2014 Rick Waldron <waldron.rick@gmail.com>
Licensed under the MIT license.
Copyright (c) 2014, 2015 The Johnny-Five Contributors
Licensed under the MIT license.
<!--remove-end-->
