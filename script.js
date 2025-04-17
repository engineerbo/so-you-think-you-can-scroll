function checkIntersection(element1, element2) {
  const rect1 = element1.getBoundingClientRect();
  const rect2 = element2.getBoundingClientRect();
  return !(rect1.bottom < rect2.top || rect1.top > rect2.bottom);
}

function getYPos(element) {
  const rect = element.getBoundingClientRect();
  return 0.5 * (rect.bottom + rect.top);
}

const TIMEOUT_MS = 10000;
const MEAN_DISTANCE = 30;
let score = 0;
let timer_id = undefined;
let interval_id = undefined;
let start_time_ms = undefined;

let prev_y_pos = 0;
let curr_y_pos = 0;
let total_distance = 0;

// Standard Normal variate using Box-Muller transform.
function gaussianRandom(mean = 0, stdev = 1) {
  const u = 1 - Math.random(); // Converting [0,1) to (0,1]
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  // Transform to the desired mean and standard deviation:
  return z * stdev + mean;
}

function resetTarget(element) {
  let scale = 1 / window.devicePixelRatio;
  element.style.transform = `translate(-50%, -50%) scale(${scale})`;
  element.style.top = "25vh";
  element.style.left = "50vw";
}

function moveTarget(element) {
  let distance = 0;
  while (Math.abs(distance) < 10) {
    distance = Math.max(-45, Math.min(45, gaussianRandom(MEAN_DISTANCE, 10)));
  }
  let top = parseFloat(element.style.top);
  if (top > 50) {
    distance *= Math.random() < 0.5 ? -1 : 1;
  }

  prev_y_pos = getYPos(element);

  element.style.top = `${top + distance}vh`;
  element.style.left =
    Math.max(40, Math.min(60, gaussianRandom(50, 30))).toString() + "vw";

  curr_y_pos = getYPos(element);
}

function getTimeMs() {
  return new Date().getTime();
}

function updateTimeRemaining() {
  let instructions2 = document.querySelector("#instructions2");
  let time_remaining_ms = TIMEOUT_MS;
  if (start_time_ms != undefined) {
    time_remaining_ms = TIMEOUT_MS - (getTimeMs() - start_time_ms);
  }
  instructions2.innerHTML = `You have ${(time_remaining_ms / 1000).toFixed(3)} seconds`;
}

function showStart() {
  let container = document.querySelector(".container");
  if (container === null) {
    container = document.createElement("div");
    container.classList.add("container");
    document.querySelector(".play-area").appendChild(container);
  }

  let announcement = document.querySelector(".announcement");
  if (announcement === null) {
    announcement = document.createElement("div");
    announcement.classList.add("announcement");
    container.appendChild(announcement);
  }
  announcement.innerHTML = "Scroll to zap the mosquitoes";
  announcement.top = "50%";

  let instructions = document.querySelectorAll(".instructions");
  if (instructions.length == 0) {
    let instructions1 = document.createElement("div");
    instructions1.classList.add("instructions");
    instructions1.id = "instructions1";
    container.insertBefore(instructions1, announcement);

    let instructions2 = document.createElement("div");
    instructions2.classList.add("instructions");
    instructions2.id = "instructions2";
    container.appendChild(instructions2);
  }

  let instructions1 = document.querySelector("#instructions1");
  instructions1.innerHTML = "So You Think You Can Scroll";

  updateTimeRemaining();
}

function initialiseGame() {
  const reducedAnimationInput = document.querySelector("#reduced-animation");
  reducedAnimationInput.addEventListener("change", (event) => {
    if (event.target.checked) {
      document.documentElement.setAttribute("data-reduced-animation", "true");
      localStorage.setItem("reduced-animation", "true");
    } else {
      document.documentElement.removeAttribute("data-reduced-animation");
      localStorage.removeItem("reduced-animation");
    }
  });

  if (localStorage.getItem("reduced-animation") === "true") {
    reducedAnimationInput.checked = true;
    document.documentElement.setAttribute("data-reduced-animation", "true");
  }

  showStart();

  let target = document.createElement("div");
  target.classList.add("target");
  resetTarget(target);

  let graphic = document.createElement("div");
  graphic.classList.add("vibrating");
  graphic.innerHTML = "🦟";
  target.appendChild(graphic);

  let reticle = document.createElement("div");
  reticle.classList.add("reticle");
  target.appendChild(reticle);

  document.querySelector(".play-area").appendChild(target);

  let prev_update_time_ms = undefined;
  let progress = 0;
  let target_scale = 1;

  function updateProgress() {
    let current_time_ms = getTimeMs();
    let time_elapsed_ms = 0;
    if (prev_update_time_ms != undefined) {
      time_elapsed_ms = current_time_ms - prev_update_time_ms;
    }
    prev_update_time_ms = current_time_ms;

    let centerline = document.querySelector(".zapper");
    if (checkIntersection(centerline, target)) {
      graphic.classList.add("zapping");
      if (progress < 100) {
        if (score == 0) {
          progress += time_elapsed_ms / 6;
        } else {
          progress += time_elapsed_ms / 3;
        }
        reticle.style.opacity = 1;
        reticle.style.transform = `translate(-50%, -50%) scale(${(1 - progress / 120) / target_scale
          })`;
      } else {
        if (timer_id === undefined) {
          showStart();
          start_time_ms = current_time_ms;
          timer_id = setTimeout(() => {
            handleGameOver(score, total_distance * window.devicePixelRatio);
            score = 0;
            prev_y_pos = 0;
            curr_y_pos = 0;
            total_distance = 0;
            timer_id = undefined;
            start_time_ms = undefined;
          }, TIMEOUT_MS);
        }

        score++;
        total_distance += Math.abs(curr_y_pos - prev_y_pos);

        progress = 0;
        reticle.style.opacity = 0;

        // Reduce size as game progresses
        target_scale = 0.5 + 0.5 / Math.sqrt(score);
        // Compensate for window scale
        let scale = target_scale / window.devicePixelRatio;
        target.style.transform = `translate(-50%, -50%) scale(${scale})`;

        moveTarget(target);
      }
    } else {
      graphic.classList.remove("zapping");
      progress = 0;
      reticle.style.opacity = 0;
    }

    if (start_time_ms != undefined) {
      updateTimeRemaining();
    }
  }

  if (interval_id === undefined) {
    interval_id = setInterval(updateProgress, 1);
  }
}

function handleGameOver(score, total_distance) {
  window.scrollTo({
    top: 0,
  });

  let target = document.querySelector(".target");
  resetTarget(target);

  let string = `You travelled ${Math.round(total_distance)}px and zapped ${score} ${score > 1 ? "mosquitoes" : "mosquito"}! `;

  let instructions1 = document.querySelector("#instructions1");

  let mean_time_ms = TIMEOUT_MS / score;
  if (mean_time_ms < 750) {
    instructions1.innerHTML = string + "Impressive!";
  } else if (mean_time_ms < 1000) {
    instructions1.innerHTML = string + "Pretty good!";
  } else if (mean_time_ms < 1250) {
    instructions1.innerHTML = string + "Alright I guess.";
  } else if (mean_time_ms < 1500) {
    instructions1.innerHTML = string + "Maybe try again?";
  } else {
    instructions1.innerHTML = string + "Abysmal!";
  }

  instructions1.style.visibility = "visible";

  let announcement = document.querySelector(".announcement");
  announcement.innerHTML = `Final score: ${Math.round(score * total_distance)}`;

  let instructions2 = document.querySelector("#instructions2");
  instructions2.innerHTML = "Zap to try again";
  instructions2.style.visibility = "visible";
}

window.onload = function () {
  initialiseGame();
};
