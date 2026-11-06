// Playback controls for the licensed Pixabay anime piano background track.
// The original MP3 is stored locally; playback requires a user click.
(() => {
  const toggle = document.getElementById("audio-toggle");
  const volumeControl = document.getElementById("audio-volume");
  const indicator = document.getElementById("audio-indicator");
  const caption = document.getElementById("audio-caption");
  if (!toggle || !volumeControl || !indicator) return;

  const defaultVolume = 0.42;
  const music = document.createElement("audio");
  music.id = "pixabay-anime-piano-player";
  music.setAttribute("data-track", "anime-piano-1-3amaudio");
  music.src = new URL("music/anime-piano-1-3amaudio.mp3?v=20261104-2", document.baseURI).href;
  music.loop = true;
  music.preload = "auto";
  music.crossOrigin = "same-origin";
  music.hidden = true;
  document.body.append(music);
  music.volume = defaultVolume;
  let isPlaying = false;

  music.addEventListener("play", () => setInterface(true));
  music.addEventListener("pause", () => setInterface(false));
  music.addEventListener("ended", () => setInterface(false));
  music.addEventListener("canplaythrough", () => {
    if (caption && !isPlaying) caption.textContent = "재생 준비 완료 · Anime Piano 1";
  }, { once: true });
  music.addEventListener("error", () => {
    setInterface(false, "음원 로드 실패");
    if (caption) caption.textContent = "음원을 불러오지 못했습니다. 새로고침해 주세요.";
  });

  const setInterface = (playing, message = "") => {
    isPlaying = playing;
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.textContent = message || (playing ? "음악 정지" : "Anime Piano 1 재생");
    indicator.classList.toggle("is-playing", playing);
    if (caption) {
      caption.textContent = playing
        ? "재생 중 · 3AMAudio — Anime Piano 1"
        : "재생 대기 · Anime Piano 1 — Pixabay";
    }
  };

  const startPlayback = async () => {
    music.volume = Number(volumeControl.value) > 0 ? Number(volumeControl.value) : defaultVolume;
    try {
      music.load();
      await music.play();
      setInterface(true);
    } catch (error) {
      throw new Error(`음악을 재생할 수 없어요. 기기 음소거와 인터넷 연결을 확인해 주세요. (${error.message})`);
    }
  };

  const stopPlayback = () => {
    music.pause();
    music.currentTime = 0;
    setInterface(false);
  };

  toggle.addEventListener("click", async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    try {
      await startPlayback();
    } catch (error) {
      setInterface(false, "재생 오류 · 다시 눌러 주세요");
      toggle.title = error.message || "배경음악 재생을 시작하지 못했습니다.";
      if (caption) caption.textContent = "다시 눌러 재생하거나 기기 음량을 확인해 주세요.";
    }
  });

  volumeControl.addEventListener("input", () => {
    music.volume = Number(volumeControl.value);
  });

  volumeControl.addEventListener("change", () => {
    if (Number(volumeControl.value) === 0 && !isPlaying) volumeControl.value = String(defaultVolume);
  });

})();