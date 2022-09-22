'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #workouts = [];
  #map;
  #curMarker;

  constructor() {
    // Get user position
    this.#getPosition();

    // Get local storage
    this.#getWorkouts();

    // Attach handlers
    form.addEventListener('submit', this.#newWorkout.bind(this));
    inputType.addEventListener('change', this.#toggleElevationField);
    containerWorkouts.addEventListener('click', this.#moveToMarker.bind(this));
  }

  #getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this.#loadMap.bind(this), () => {
        alert('Could not get current position');
      });
  }

  #loadMap(position) {
    // Set initial position
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    // Leaflet Library
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling click on map event
    this.#map.on('click', this.#showForm.bind(this));

    // Render workouts on map
    this.#workouts.forEach(workout =>
      this.#renderMarker(workout, workout.coords)
    );
  }

  #showForm(mapE) {
    // Display marker
    const { lat: latitude, lng: longitude } = mapE.latlng;
    this.#curMarker = L.marker([latitude, longitude]).addTo(this.#map);

    // Display form
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #hideForm() {
    // Clear inputs
    inputDistance.value =
      inputElevation.value =
      inputCadence.value =
      inputDuration.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  #toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    // Get data
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#curMarker.getLatLng();
    let workout;

    // If running, get cadence
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Guard
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Values has to be positive numbers');
      //prettier-ignore
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If running, get cadence
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Guard
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Values has to be positive numbers');
      //prettier-ignore
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // save workouts
    this.#workouts.push(workout);

    // Render workouts list
    this.#renderWorkout(workout);

    // Display marker popup
    this.#renderMarker(workout);

    // hide form
    this.#hideForm();

    // Save workout to local storage
    this.#saveWorkouts();
  }

  #renderMarker(workout, coords) {
    if (coords) this.#curMarker = L.marker(coords).addTo(this.#map);

    this.#curMarker
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.name}-popup`,
        })
      )
      .setPopupContent(
        `${workout.name === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.name}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.name === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.name === 'running')
      html += `
     <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;

    if (workout.name === 'cycling')
      html += `
       <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  #moveToMarker(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);
    this.#map.flyTo(workout.coords, 13);
  }

  #saveWorkouts() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  #getWorkouts() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(workout => this.#renderWorkout(workout));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // km
    this.duration = duration; // min
    // this.marker = marker;
  }

  setDescription() {
    // prettier-ignore
    this.description = `${this.name.replace(this.name[0],this.name[0].toUpperCase())} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  name = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.pace = this.duration / this.distance; // min/km
    this.setDescription();
  }
}

class Cycling extends Workout {
  name = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.speed = this.distance / (this.duration / 60);
    this.setDescription();
  }
}

const app = new App();
