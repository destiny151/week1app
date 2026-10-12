const STORAGE_KEY = 'laundry-link-bookings-v1';
const CURRENT_USER = { id: 'you', name: 'You' };
const machines = [
  { id: 'W1', name: 'Washer 1', type: 'Washer' },
  { id: 'W2', name: 'Washer 2', type: 'Washer' },
  { id: 'W3', name: 'Washer 3', type: 'Washer' },
  { id: 'W4', name: 'Washer 4', type: 'Washer' },
  { id: 'D1', name: 'Dryer 1', type: 'Dryer' },
  { id: 'D2', name: 'Dryer 2', type: 'Dryer' },
  { id: 'D3', name: 'Dryer 3', type: 'Dryer' },
  { id: 'D4', name: 'Dryer 4', type: 'Dryer' },
];

const state = loadState();

const elements = {
  clockLabel: document.getElementById('clockLabel'),
  freeNowCount: document.getElementById('freeNowCount'),
  needsPickupCount: document.getElementById('needsPickupCount'),
  openTodayCount: document.getElementById('openTodayCount'),
  myBookingCount: document.getElementById('myBookingCount'),
  machineBoard: document.getElementById('machineBoard'),
  machineSelect: document.getElementById('machineSelect'),
  bookingDate: document.getElementById('bookingDate'),
  timeSelect: document.getElementById('timeSelect'),
  durationSelect: document.getElementById('durationSelect'),
  bookingForm: document.getElementById('bookingForm'),
  bookingMessage: document.getElementById('bookingMessage'),
  weekSchedule: document.getElementById('weekSchedule'),
  myBookings: document.getElementById('myBookings'),
};

initialize();

function initialize() {
  populateMachineOptions();
  elements.bookingDate.value = toDateInputValue(new Date());
  elements.bookingForm.addEventListener('submit', handleBookingSubmit);
  elements.machineSelect.addEventListener('change', refreshTimeOptions);
  elements.bookingDate.addEventListener('change', refreshTimeOptions);
  elements.durationSelect.addEventListener('change', refreshTimeOptions);
  elements.machineBoard.addEventListener('click', handleMachineBoardClick);
  elements.myBookings.addEventListener('click', handleMyBookingAction);

  render();
  setInterval(renderClock, 30000);
  setInterval(() => {
    render();
  }, 60000);
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return { bookings: parsed };
      }
    }
  } catch (error) {
    console.warn('Unable to read saved bookings.', error);
  }

  const initial = createSampleBookings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return { bookings: initial };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bookings));
}

function createSampleBookings() {
  const now = new Date();
  const bookings = [];

  const addBooking = (machineId, dayOffset, hour, minute, durationMinutes, residentId, residentName, options = {}) => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);

    bookings.push({
      id: `${residentId}-${machineId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      machineId,
      residentId,
      residentName,
      start: start.toISOString(),
      end: end.toISOString(),
      collected: false,
      ...options,
    });
  };

  addBooking('W1', 0, 8, 30, 90, 'mila', 'Mila');
  addBooking('W2', 0, 11, 0, 120, 'sami', 'Sami');
  addBooking('W3', 0, 16, 0, 90, 'jules', 'Jules');
  addBooking('D1', 0, 18, 30, 120, 'zoe', 'Zoe');
  addBooking('D3', 0, 19, 0, 90, 'leah', 'Leah');
  addBooking('W4', 0, 20, 0, 90, 'you', 'You');

  addBooking('D2', 1, 9, 0, 90, 'nina', 'Nina');
  addBooking('D4', 1, 13, 30, 120, 'omar', 'Omar');
  addBooking('W1', 2, 10, 0, 90, 'maya', 'Maya');
  addBooking('W2', 2, 15, 0, 90, 'carlos', 'Carlos');
  addBooking('D1', 3, 8, 30, 90, 'rhea', 'Rhea');
  addBooking('D3', 4, 11, 0, 120, 'ava', 'Ava');
  addBooking('W3', 5, 17, 30, 90, 'noah', 'Noah');
  addBooking('D4', 6, 12, 0, 90, 'mia', 'Mia');

  const forgottenStart = new Date(now);
  forgottenStart.setMinutes(forgottenStart.getMinutes() - 100);
  const forgottenEnd = new Date(now);
  forgottenEnd.setMinutes(forgottenEnd.getMinutes() - 15);

  bookings.push({
    id: 'forgotten-dryer-1',
    machineId: 'D2',
    residentId: 'omar',
    residentName: 'Omar',
    start: forgottenStart.toISOString(),
    end: forgottenEnd.toISOString(),
    collected: false,
    reminderSent: true,
  });

  const yourNextBooking = new Date(now);
  yourNextBooking.setHours(yourNextBooking.getHours() + 3, 0, 0, 0);
  const yourEnd = new Date(yourNextBooking);
  yourEnd.setMinutes(yourEnd.getMinutes() + 90);

  bookings.push({
    id: 'your-next-booking',
    machineId: 'W1',
    residentId: CURRENT_USER.id,
    residentName: CURRENT_USER.name,
    start: yourNextBooking.toISOString(),
    end: yourEnd.toISOString(),
    collected: false,
  });

  return bookings;
}

function render() {
  renderClock();
  renderSummaryCards();
  renderMachineBoard();
  renderWeekSchedule();
  renderMyBookings();
  refreshTimeOptions();
}

function renderClock() {
  const now = new Date();
  elements.clockLabel.textContent = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(now);
}

function renderSummaryCards() {
  const now = new Date();
  const freeNow = machines.filter((machine) => getMachineStatus(machine.id, now).state === 'free').length;
  const needsPickup = state.bookings.filter((booking) => !booking.collected && new Date(booking.end) < now).length;
  const openToday = machines.reduce((total, machine) => total + countFreeSlotsForMachine(machine.id, toDateInputValue(now), 90).length, 0);
  const myBookings = state.bookings.filter((booking) => booking.residentId === CURRENT_USER.id && !booking.collected).length;

  elements.freeNowCount.textContent = String(freeNow);
  elements.needsPickupCount.textContent = String(needsPickup);
  elements.openTodayCount.textContent = String(openToday);
  elements.myBookingCount.textContent = String(myBookings);
}

function getMachineStatus(machineId, currentTime = new Date()) {
  const machineBookings = state.bookings.filter((booking) => booking.machineId === machineId && !booking.collected);
  const activeBooking = machineBookings.find((booking) => {
    const start = new Date(booking.start);
    const end = new Date(booking.end);
    return start <= currentTime && end >= currentTime;
  });

  if (activeBooking) {
    return {
      state: 'busy',
      label: 'Busy',
      detail: `Booked by ${activeBooking.residentName} until ${formatTime(activeBooking.end)}`,
      booking: activeBooking,
    };
  }

  const finishedBooking = machineBookings
    .filter((booking) => new Date(booking.end) < currentTime)
    .sort((a, b) => new Date(b.end) - new Date(a.end))[0];

  if (finishedBooking) {
    return {
      state: 'finished',
      label: 'Needs pickup',
      detail: `Finished at ${formatTime(finishedBooking.end)} — ${finishedBooking.residentName} still needs to collect`,
      booking: finishedBooking,
    };
  }

  return {
    state: 'free',
    label: 'Free',
    detail: 'Ready now',
    booking: null,
  };
}

function renderMachineBoard() {
  const now = new Date();
  const cards = machines.map((machine) => {
    const status = getMachineStatus(machine.id, now);
    const next = findNextFreeSlot(machine.id, now, 90);
    const freeToday = countFreeSlotsForMachine(machine.id, toDateInputValue(now), 90);

    return `
      <article class="machine-card ${status.state}">
        <div class="machine-header">
          <div class="machine-name">${machine.name}</div>
          <span class="machine-type">${machine.type}</span>
        </div>

        <span class="machine-status ${status.state}">${status.label}</span>

        <div class="machine-meta">
          <div><strong>${status.detail}</strong></div>
          <div>Next available: ${next ? formatSlotRange(next.start, next.end) : 'No slots left today'}</div>
          <div>${freeToday.length} free time${freeToday.length === 1 ? '' : 's'} left today</div>
        </div>

        <div class="machine-actions">
          ${status.state === 'free'
            ? `<button type="button" class="primary-button" data-machine="${machine.id}">Book now</button>`
            : `<button type="button" class="secondary-button" data-machine="${machine.id}">View slots</button>`}
        </div>
      </article>
    `;
  }).join('');

  elements.machineBoard.innerHTML = cards;
}

function renderWeekSchedule() {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });

  const headerCells = days.map((day) => `<th>${formatDayShort(day)}</th>`).join('');

  const rows = machines.map((machine) => {
    const cells = days.map((day) => {
      const freeSlots = getFreeStartsForDate(machine.id, day, 90);
      const status = freeSlots.length ? 'free' : 'busy';
      const summary = freeSlots.length ? `${freeSlots.length} open` : 'Booked';
      return `<td><div class="slot-badge ${status}">${summary}</div>${freeSlots[0] ? `<div>${formatTime(freeSlots[0].start)}</div>` : '<div>—</div>'}</td>`;
    }).join('');

    return `<tr><th>${machine.name}</th>${cells}</tr>`;
  }).join('');

  elements.weekSchedule.innerHTML = `
    <table class="schedule-table">
      <thead>
        <tr><th>Machine</th>${headerCells}</tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderMyBookings() {
  const myBookings = state.bookings
    .filter((booking) => booking.residentId === CURRENT_USER.id)
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  if (!myBookings.length) {
    elements.myBookings.innerHTML = '<div class="empty-state">You do not have any bookings yet.</div>';
    return;
  }

  const markup = myBookings.map((booking) => {
    const bookingDate = new Date(booking.start);
    const isFinished = new Date(booking.end) < new Date() && !booking.collected;
    const machine = machines.find((item) => item.id === booking.machineId);

    return `
      <div class="booking-item ${isFinished ? 'finished' : ''}">
        <div class="info">
          <strong>${machine ? machine.name : booking.machineId}</strong>
          <small>${formatDateLong(bookingDate)} • ${formatTime(booking.start)} to ${formatTime(booking.end)}</small>
          <small>${isFinished ? 'Finished — collect your laundry' : 'Booked and in progress'}</small>
        </div>
        <div class="actions">
          ${isFinished ? `<button type="button" class="warning-button" data-action="collect" data-id="${booking.id}">Mark collected</button>` : ''}
          <button type="button" class="danger-button" data-action="cancel" data-id="${booking.id}">Cancel</button>
        </div>
      </div>
    `;
  }).join('');

  elements.myBookings.innerHTML = markup;
}

function handleMachineBoardClick(event) {
  const machineId = event.target.dataset.machine;
  if (!machineId) {
    return;
  }

  elements.machineSelect.value = machineId;
  const dateValue = toDateInputValue(new Date());
  elements.bookingDate.value = dateValue;
  refreshTimeOptions();
  window.scrollTo({ top: document.querySelector('.booking-panel').offsetTop - 12, behavior: 'smooth' });
}

function handleMyBookingAction(event) {
  const button = event.target.closest('button');
  if (!button) {
    return;
  }

  const { action, id } = button.dataset;
  const booking = state.bookings.find((item) => item.id === id);
  if (!booking) {
    return;
  }

  if (action === 'cancel') {
    if (booking.residentId !== CURRENT_USER.id) {
      return;
    }
    state.bookings = state.bookings.filter((item) => item.id !== id);
    saveState();
    render();
    return;
  }

  if (action === 'collect') {
    if (new Date(booking.end) >= new Date()) {
      return;
    }
    booking.collected = true;
    saveState();
    render();
  }
}

function handleBookingSubmit(event) {
  event.preventDefault();

  const machineId = elements.machineSelect.value;
  const dateValue = elements.bookingDate.value;
  const timeValue = elements.timeSelect.value;
  const durationMinutes = Number(elements.durationSelect.value);

  if (!machineId || !dateValue || !timeValue) {
    setBookingMessage('Select a machine, date, and time before booking.', 'error');
    return;
  }

  const start = new Date(`${dateValue}T${timeValue}`);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);

  const overlaps = state.bookings.some((booking) => {
    if (booking.machineId !== machineId || booking.collected) {
      return false;
    }

    const bookingStart = new Date(booking.start);
    const bookingEnd = new Date(booking.end);

    return bookingStart < end && bookingEnd > start;
  });

  if (overlaps) {
    setBookingMessage('That time is already taken on that machine. Try another slot.', 'error');
    return;
  }

  state.bookings.push({
    id: `booking-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    machineId,
    residentId: CURRENT_USER.id,
    residentName: CURRENT_USER.name,
    start: start.toISOString(),
    end: end.toISOString(),
    collected: false,
  });

  saveState();
  setBookingMessage(`Booked ${machineId} for ${formatDateLong(start)} at ${formatTime(start)}.`, 'success');
  render();
}

function populateMachineOptions() {
  const options = machines.map((machine) => `<option value="${machine.id}">${machine.name}</option>`).join('');
  elements.machineSelect.innerHTML = options;
  elements.machineSelect.value = 'W1';
}

function refreshTimeOptions() {
  const selectedMachine = elements.machineSelect.value;
  const selectedDate = elements.bookingDate.value || toDateInputValue(new Date());
  const durationMinutes = Number(elements.durationSelect.value);
  const slots = getFreeStartsForDate(selectedMachine, new Date(`${selectedDate}T00:00`), durationMinutes);

  if (!slots.length) {
    elements.timeSelect.innerHTML = '<option value="">No free slots</option>';
    return;
  }

  const options = slots.map((slot) => `<option value="${toTimeInputValue(slot.start)}">${formatTime(slot.start)}</option>`).join('');
  elements.timeSelect.innerHTML = options;
}

function getFreeStartsForDate(machineId, date, durationMinutes) {
  const dayStart = new Date(date);
  dayStart.setHours(7, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(22, 0, 0, 0);
  const slots = [];

  let cursor = new Date(dayStart);
  while (cursor.getTime() + durationMinutes * 60000 <= dayEnd.getTime()) {
    const end = new Date(cursor);
    end.setMinutes(end.getMinutes() + durationMinutes);

    const isFree = !state.bookings.some((booking) => {
      if (booking.machineId !== machineId || booking.collected) {
        return false;
      }

      const bookingStart = new Date(booking.start);
      const bookingEnd = new Date(booking.end);
      return bookingStart < end && bookingEnd > cursor;
    });

    if (isFree) {
      slots.push({ start: new Date(cursor), end });
    }

    cursor.setMinutes(cursor.getMinutes() + 30);
  }

  return slots;
}

function countFreeSlotsForMachine(machineId, dateValue, durationMinutes) {
  return getFreeStartsForDate(machineId, new Date(`${dateValue}T00:00`), durationMinutes);
}

function findNextFreeSlot(machineId, fromDate, durationMinutes) {
  const start = new Date(fromDate);
  const searchWindow = new Date(fromDate);
  searchWindow.setHours(23, 0, 0, 0);
  let cursor = new Date(start);
  cursor.setMinutes(Math.ceil(cursor.getMinutes() / 30) * 30, 0, 0);

  while (cursor <= searchWindow) {
    const end = new Date(cursor);
    end.setMinutes(end.getMinutes() + durationMinutes);

    const isFree = !state.bookings.some((booking) => {
      if (booking.machineId !== machineId || booking.collected) {
        return false;
      }

      const bookingStart = new Date(booking.start);
      const bookingEnd = new Date(booking.end);
      return bookingStart < end && bookingEnd > cursor;
    });

    if (isFree) {
      return { start: new Date(cursor), end };
    }

    cursor.setMinutes(cursor.getMinutes() + 30);
  }

  return null;
}

function setBookingMessage(message, type = 'success') {
  elements.bookingMessage.textContent = message;
  elements.bookingMessage.className = `form-message ${type}`;
}

function toDateInputValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function toTimeInputValue(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDayShort(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }).format(date);
}

function formatDateLong(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

function formatTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatSlotRange(start, end) {
  return `${formatTime(start)}–${formatTime(end)}`;
}
