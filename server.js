const mqtt = require("mqtt")
const lorapacket = require("lora-packet")
const mapper = require("json-mapper-json")
const crypto = require("crypto")



const MQTT_URL = process.env.MQTT_URL
if (!MQTT_URL) {
  console.error("Missing MQTT_URL environment variable")
  process.exit(1)
}

const MQTT_USERNAME = process.env.MQTT_USERNAME
if (!MQTT_USERNAME) {
  console.error("Missing MQTT_USERNAME environment variable")
  process.exit(1)
}

const MQTT_PASSWORD = process.env.MQTT_PASSWORD
if (!MQTT_PASSWORD) {
  console.error("Missing MQTT_PASSWORD environment variable")
  process.exit(1)
}

const MQTT_INPUT_TOPIC = process.env.MQTT_INPUT_TOPIC || "gateway/+/rx"
const MQTT_OUTPUT_PREFIX = process.env.MQTT_OUTPUT_PREFIX || "anonymised"

const HMAC_SECRET = process.env.HMAC_SECRET
if (!HMAC_SECRET) {
  console.error("Missing HMAC_SECRET environment variable")
  process.exit(1)
}

const HMAC_TYPE = process.env.HMAC_TYPE || "sha256"



// Based on: https://www.thethingsnetwork.org/docs/lorawan/address-space.html
const network = function(devAddr) {
  if ("fc00" == devAddr.slice(0, 2).toString("hex").toLowerCase()) {
    return devAddr.slice(0, 3).toString("hex")
  } else if ("e0" == devAddr.slice(0, 1).toString("hex").toLowerCase()) {
    return devAddr.slice(0, 2).toString("hex")
  }
  return devAddr.slice(0, 1).toString("hex")
}

const hash = function(data) {
  return crypto.createHmac(HMAC_TYPE, HMAC_SECRET).update(data).digest("hex")
}



var client = mqtt.connect(MQTT_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD
})

client.on("connect", function() {
  client.subscribe(MQTT_INPUT_TOPIC)
})

client.on("message", function(topic, message) {
  try {
    mapper(JSON.parse(message.toString()), {
      "rxInfo": { path: "rxInfo" },
      "anonymised": {
        path: "phyPayload",
        formatting: (raw) => {
          var decoded = lorapacket.fromWire(new Buffer(raw, "base64")).getBuffers()
          return {
            "deviceAddress": decoded.DevAddr ? {
              "hash": hash(decoded.DevAddr),
              "network": network(decoded.DevAddr)
            } : null,
            "phyPayload": decoded.PHYPayload ? {
              "hash": hash(decoded.PHYPayload),
              "port": (decoded.FPort && decoded.FPort.length == 1) ? decoded.FPort.readUInt8() : null,
              "counter": (decoded.FCnt && decoded.FCnt.length == 2) ? decoded.FCnt.readUInt16BE() : null
            } : null
          }
        }
      }
    }).then(mapped => {
      var topic_out = MQTT_OUTPUT_PREFIX + "/" + topic
      var message_out = JSON.stringify(mapped)
      client.publish(topic_out, message_out)
      console.log("Published " + message_out + " to " + topic_out)
    })
  } catch (error) {
    console.error("Could not process message '" + message + "' due to " + error);
  }
})
