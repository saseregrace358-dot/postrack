export function playNotificationSound() {
  const audioCtx = new (window.AudioContext ||
    (window as any).webkitAudioContext)();

  const G5 = 783.99;
  const C6 = 1046.5;

  const startTime = audioCtx.currentTime;
  const noteLength = 0.12;
  const secondNoteDelay = 0.1;
  const echoDelayTime = 0.08;

  function playNote(frequency: number, time: number) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.25, time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      time + noteLength
    );

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const delay = audioCtx.createDelay();
    delay.delayTime.value = echoDelayTime;

    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.3;

    gainNode.connect(delay);
    delay.connect(feedback);
    feedback.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + noteLength);
  }

  playNote(G5, startTime);
  playNote(C6, startTime + secondNoteDelay);
}