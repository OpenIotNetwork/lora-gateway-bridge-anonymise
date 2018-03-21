# lora-gateway-bridge-anonymise
Reads messages from the [lora-gateway-bridge](https://github.com/brocaar/lora-gateway-bridge) [gateway receive topic](https://www.loraserver.io/lora-gateway-bridge/use/data/), anonymises them and re-sends them on another topic.

## Basic steps
1. Extracts *network*, *port*, *counter* information from the *phyPayload*.
2. Hashes the *devAddr* as well as the whole *phyPayload* with a choosen HMAC.
3. Remove the original *phyPayload* from the final response message.

## Configuration
All configuration is done using environment variables. They are as follows:
* *MQTT_URL*, *MQTT_USERNAME*, *MQTT_PASSWORD* (see: [module documentation](https://www.npmjs.com/package/mqtt) for their use)
* *MQTT_INPUT_TOPIC* (default: *gateway/+/rx*)
* *MQTT_OUTPUT_PREFIX* (default: *anonymised*)
* *HMAC_SECRET* (**IMPORTANT** This has to be set and if you wish for your hashes to be consistent and comparable for statistics purposes you have to use the same secret)
* *HMAC_TYPE* (default: *sha256*)
