var topKey = 0;
var uuid = Math.floor(Math.random() * 10000).toString(); //  Don't use a random number for your UUID in production, you will artificially increase your monthly active users (MAU) which will result in a higher bill than desired.
var pubnub;

async function load() 
{
  pubnub = new PubNub({
    publishKey: PUBNUB_PUBLISH_KEY,
    subscribeKey: PUBNUB_SUBSCRIBE_KEY,
    userId: "" + uuid
  });
  var accessManagerToken = await requestAccessManagerToken(uuid);
  if (accessManagerToken == null)
  {
    //  No Access Manager Token
  }
  else {
    pubnub.setToken(accessManagerToken)
  }
  pubnub.addListener({
    status: async function (statusEvent) {
      if (statusEvent.category == "PNConnectedCategory") {
        await init();
      }
    },
    signal: function (signalEvent) {
      //  Use signals for typing for cost / efficiency
      updateKeyCount(signalEvent.message.k, signalEvent.message.c);
    },
    message: async function (messageEvent) {
      //  Use messages for initialization for reliability
      updateKeyCount(messageEvent.message.k, messageEvent.message.c);
    },
  });
  pubnub.subscribe({
    channels: ["functionsdemo-counter-result"],
  });
  document.addEventListener("keydown", async function (event) {
    const key = event.keyCode;
    const keyElement = document.querySelector(`.key[data-key="${key}"]`);
    if (keyElement) {
      keyElement.classList.add("pressed");
    }
    const signalResult = await pubnub.signal({
      message: { keypress: key.toString() },
      channel: "functionsdemo-counter-vote",
    });
  });
  
  document.addEventListener("keyup", function (event) {
    const key = event.keyCode;
    const keyElement = document.querySelector(`.key[data-key="${key}"]`);
  
    if (keyElement) {
      keyElement.classList.remove("pressed");
    }
  });
}


async function init() {
  topKey = 0;
  for (var i = 1; i <= 5; i++) {
    const result = await pubnub.signal({
      message: { init: true, batch: i },
      channel: "functionsdemo-counter-vote",
    });
  }
}
function updateKeyCount(keyId, count) {
  const key = keyId;
  const countElement = document.querySelector(`.count[data-key="${key}"]`);
  countElement.innerHTML = count;
  if (count > topKey) {
    var currentValue = document.querySelector(`.key[data-key="${key}"]`).innerHTML
    document.getElementById("topKey").innerText = currentValue.substring(0, currentValue.indexOf('<'));
    topKey = count;
  }
}

//  IN PRODUCTION: Replace with your own logic to request an Access Manager token
async function requestAccessManagerToken(userId) {
  try {
    const TOKEN_SERVER = "https://devrel-demos-access-manager.netlify.app/.netlify/functions/api/distributed-counter";
    const response = await fetch(`${TOKEN_SERVER}/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ UUID: userId }),
    });

    const token = (await response.json()).body.token;

    return token;
  } catch (e) {
    console.log("failed to create token " + e);
    return null;
  }
}