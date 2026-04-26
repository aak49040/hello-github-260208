const clockEl = document.getElementById("clock");
const alarmInput = document.getElementById("alarmTime");
const setBtn = document.getElementById("setBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const ringingEl = document.getElementById("ringing");
const stopBtn = document.getElementById("stopBtn");

let alarmTime = null;
let triggered = false;
let audioCtx = null;
let beepInterval = null;

const pad = (n) => String(n).padStart(2, "0");

function updateClock() {
  const now = new Date();
  clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  if (alarmTime && !triggered) {
    if (
      now.getHours() === alarmTime.h &&
      now.getMinutes() === alarmTime.m &&
      now.getSeconds() === 0
    ) {
      triggerAlarm();
    }
  }
}

function setAlarm() {
  const value = alarmInput.value;
  if (!value) {
    statusEl.textContent = "Please pick a time";
    return;
  }
  const [h, m] = value.split(":").map(Number);
  alarmTime = { h, m };
  triggered = false;
  statusEl.textContent = `Alarm set for ${pad(h)}:${pad(m)}`;
  clearBtn.disabled = false;
}

function clearAlarm() {
  alarmTime = null;
  triggered = false;
  statusEl.textContent = "No alarm set";
  clearBtn.disabled = true;
  stopRinging();
}

function triggerAlarm() {
  triggered = true;
  ringingEl.hidden = false;
  statusEl.textContent = "Alarm ringing";
  startBeep();
}

function startBeep() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = () => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    };
    beep();
    beepInterval = setInterval(beep, 700);
  } catch (e) {
    // audio not available; visual alert still works
  }
}

function stopRinging() {
  ringingEl.hidden = true;
  if (beepInterval) {
    clearInterval(beepInterval);
    beepInterval = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}

function stopAlarm() {
  stopRinging();
  clearAlarm();
}

setBtn.addEventListener("click", setAlarm);
clearBtn.addEventListener("click", clearAlarm);
stopBtn.addEventListener("click", stopAlarm);

updateClock();
setInterval(updateClock, 1000);
